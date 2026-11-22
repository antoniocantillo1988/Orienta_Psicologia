import { json, query } from '../_db.js';
import {
  positiveInteger,
  readRawBody,
  stripeRequest,
  verifyStripeSignature,
} from './_helpers.js';
import { enviarConfirmacionCurso } from '../_email_cursos.js';

export const config = { api: { bodyParser: false } };

function unixTime(value) {
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : null;
}

function subscriptionIdFromInvoice(invoice) {
  const id = invoice.subscription
    || invoice.parent?.subscription_details?.subscription;
  return typeof id === 'string' ? id : id?.id || null;
}

function subscriptionPeriodEnd(subscription) {
  const itemEnds = (subscription.items?.data || [])
    .map((item) => unixTime(item.current_period_end))
    .filter(Boolean);
  return unixTime(subscription.current_period_end) || (itemEnds.length ? Math.max(...itemEnds) : null);
}

async function saveEnrollment({ userId, courseId, status, checkoutId = null, subscriptionId = null, end = null }) {
  await query(
    `INSERT INTO inscripciones
       (usuario_id, curso_id, estado, fecha_inicio, fecha_fin,
        stripe_checkout_session_id, stripe_subscription_id)
     VALUES (?, ?, ?, IF(? = 'activa', NOW(), NULL), FROM_UNIXTIME(?), ?, ?)
     ON DUPLICATE KEY UPDATE
       estado = VALUES(estado),
       fecha_inicio = IF(VALUES(estado) = 'activa', COALESCE(fecha_inicio, NOW()), fecha_inicio),
       fecha_fin = VALUES(fecha_fin),
       stripe_checkout_session_id = COALESCE(VALUES(stripe_checkout_session_id), stripe_checkout_session_id),
       stripe_subscription_id = COALESCE(VALUES(stripe_subscription_id), stripe_subscription_id)`,
    [userId, courseId, status, status, end, checkoutId, subscriptionId]
  );
}

async function handleEvent(event) {
  const object = event.data?.object;
  if (!object) return;

  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    if (!['paid', 'no_payment_required'].includes(object.payment_status)) return;
    const userId = positiveInteger(object.metadata?.usuario_id);
    const courseId = positiveInteger(object.metadata?.curso_id);
    if (!userId || !courseId) return;

    const subscriptionId = typeof object.subscription === 'string'
      ? object.subscription
      : object.subscription?.id || null;
    let end = null;
    let status = 'activa';
    if (subscriptionId) {
      const subscription = await stripeRequest(
        `/subscriptions/${encodeURIComponent(subscriptionId)}`,
        { method: 'GET' }
      );
      if (!['active', 'trialing'].includes(subscription.status)) status = 'pendiente';
      end = subscriptionPeriodEnd(subscription);
    }
    await saveEnrollment({
      userId,
      courseId,
      status,
      checkoutId: object.id,
      subscriptionId,
      end,
    });
    if (status === 'activa') {
      try {
        const [datos] = await query(
          `SELECT u.email, u.nombre_usuario, c.titulo, c.duracion_horas
           FROM usuarios u JOIN cursos c ON c.id = ? WHERE u.id = ?`,
          [courseId, userId]
        );
        if (datos) await enviarConfirmacionCurso({
          usuarioId: userId,
          cursoId,
          email: datos.email,
          nombre: datos.nombre_usuario,
          curso: datos,
          periodo: `stripe-${object.id}`,
          fechaFin: end ? new Date(end * 1000).toISOString() : null,
        });
      } catch (emailError) {
        console.error('[stripe/webhook] No se pudo encolar el correo de inscripción:', emailError.message);
      }
    }
    return;
  }

  if (event.type === 'checkout.session.async_payment_failed' && object.id) {
    await query(
      `UPDATE inscripciones SET estado = 'cancelada'
       WHERE stripe_checkout_session_id = ? AND estado = 'pendiente'`,
      [object.id]
    );
    return;
  }

  if (event.type.startsWith('customer.subscription.')) {
    const userId = positiveInteger(object.metadata?.usuario_id);
    const courseId = positiveInteger(object.metadata?.curso_id);
    if (!userId || !courseId || !object.id) return;

    const status = ['active', 'trialing'].includes(object.status)
      ? 'activa'
      : ['canceled', 'unpaid', 'incomplete_expired'].includes(object.status)
        ? 'cancelada'
        : 'pendiente';
    await saveEnrollment({
      userId,
      courseId,
      status,
      subscriptionId: object.id,
      end: subscriptionPeriodEnd(object) || unixTime(object.ended_at),
    });
    return;
  }

  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const subscriptionId = subscriptionIdFromInvoice(object);
    if (!subscriptionId) return;

    if (event.type === 'invoice.paid') {
      const subscriptionLine = object.lines?.data?.find((line) => line.type === 'subscription');
      const periodEnd = unixTime(subscriptionLine?.period?.end || object.lines?.data?.[0]?.period?.end);
      await query(
        `UPDATE inscripciones
         SET estado = 'activa', fecha_inicio = COALESCE(fecha_inicio, NOW()),
             fecha_fin = IF(? IS NULL, fecha_fin, FROM_UNIXTIME(?))
         WHERE stripe_subscription_id = ?`,
        [periodEnd, periodEnd, subscriptionId]
      );
    } else {
      await query(
        `UPDATE inscripciones SET estado = 'pendiente'
         WHERE stripe_subscription_id = ? AND estado = 'activa'`,
        [subscriptionId]
      );
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido.' });

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    console.error('[stripe/webhook] No se pudo leer la petición:', error.message);
    return json(res, 400, { error: 'Petición de Stripe no válida.' });
  }

  const signature = req.headers['stripe-signature'];
  if (!verifyStripeSignature(rawBody, signature)) {
    return json(res, 400, { error: 'Firma de Stripe no válida.' });
  }

  try {
    const event = JSON.parse(rawBody.toString('utf8'));
    await handleEvent(event);
    return json(res, 200, { received: true });
  } catch (error) {
    console.error('[stripe/webhook] No se pudo procesar el evento:', error.message);
    return json(res, 500, { error: 'No se pudo procesar el evento.' });
  }
}
