import crypto from 'node:crypto';
import { json, query, requireAuth } from './_db.js';
import { getAppUrl, positiveInteger, stripeRequest } from './stripe/_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido.' });

  const user = requireAuth(req, res);
  if (!user) return json(res, 401, { error: 'Inicia sesión para continuar.' });

  const cursoId = positiveInteger(req.body?.curso_id);
  if (!cursoId) return json(res, 400, { error: 'El curso indicado no es válido.' });

  try {
    const [usuario] = await query('SELECT id, email FROM usuarios WHERE id = ?', [user.id]);
    if (!usuario) return json(res, 401, { error: 'La cuenta ya no está disponible.' });

    const [curso] = await query(
      `SELECT id, titulo, descripcion, tipo_acceso, precio, moneda
       FROM cursos WHERE id = ? AND publicado = 1`,
      [cursoId]
    );
    if (!curso) return json(res, 404, { error: 'El curso no está disponible.' });
    if (!['pago', 'membresia'].includes(curso.tipo_acceso)) {
      return json(res, 400, { error: 'Este curso no requiere un pago.' });
    }

    const amount = Math.round(Number(curso.precio) * 100);
    const currency = String(curso.moneda || 'EUR').toLowerCase();
    if (!Number.isSafeInteger(amount) || amount < 1 || !/^[a-z]{3}$/.test(currency)) {
      return json(res, 400, { error: 'El precio o la moneda del curso no son válidos.' });
    }

    const [inscripcion] = await query(
      `SELECT estado, stripe_checkout_session_id
       FROM inscripciones WHERE usuario_id = ? AND curso_id = ?`,
      [usuario.id, cursoId]
    );
    if (inscripcion?.estado === 'activa') {
      return json(res, 409, { error: 'Ya tienes acceso a este curso.' });
    }

    if (inscripcion?.estado === 'pendiente' && inscripcion.stripe_checkout_session_id) {
      try {
        const anterior = await stripeRequest(
          `/checkout/sessions/${encodeURIComponent(inscripcion.stripe_checkout_session_id)}`,
          { method: 'GET' }
        );
        if (anterior.status === 'open' && anterior.url) {
          return json(res, 200, { url: anterior.url });
        }
      } catch (error) {
        console.warn('[stripe/checkout] No se pudo reutilizar la sesión pendiente:', error.message);
      }
    }

    const appUrl = getAppUrl();
    const mode = curso.tipo_acceso === 'membresia' ? 'subscription' : 'payment';
    const params = new URLSearchParams({
      mode,
      success_url: `${appUrl}/talleres?pago=correcto`,
      cancel_url: `${appUrl}/talleres?pago=cancelado`,
      client_reference_id: `${usuario.id}:${curso.id}`,
      customer_email: usuario.email,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': currency,
      'line_items[0][price_data][unit_amount]': String(amount),
      'line_items[0][price_data][product_data][name]': curso.titulo,
      'metadata[usuario_id]': String(usuario.id),
      'metadata[curso_id]': String(curso.id),
    });

    if (curso.descripcion) {
      params.set('line_items[0][price_data][product_data][description]', curso.descripcion.slice(0, 500));
    }
    if (mode === 'subscription') {
      params.set('line_items[0][price_data][recurring][interval]', 'month');
      params.set('subscription_data[metadata][usuario_id]', String(usuario.id));
      params.set('subscription_data[metadata][curso_id]', String(curso.id));
    }

    const session = await stripeRequest('/checkout/sessions', {
      body: params,
      idempotencyKey: `curso-${curso.id}-usuario-${usuario.id}-${crypto.randomUUID()}`,
    });
    if (!session.url || !session.id) throw new Error('Stripe no devolvió una sesión válida.');

    await query(
      `INSERT INTO inscripciones
         (usuario_id, curso_id, estado, fecha_inicio, fecha_fin,
          stripe_checkout_session_id, stripe_subscription_id)
       VALUES (?, ?, 'pendiente', NULL, NULL, ?, NULL)
       ON DUPLICATE KEY UPDATE
         estado = 'pendiente', fecha_inicio = NULL, fecha_fin = NULL,
         stripe_checkout_session_id = VALUES(stripe_checkout_session_id),
         stripe_subscription_id = NULL`,
      [usuario.id, curso.id, session.id]
    );

    return json(res, 200, { url: session.url });
  } catch (error) {
    console.error('[stripe/checkout] No se pudo crear el pago:', error.message);
    return json(res, 500, { error: 'No se pudo iniciar el pago. Inténtalo de nuevo más tarde.' });
  }
}
