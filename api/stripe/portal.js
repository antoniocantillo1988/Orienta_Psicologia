import { json, query, requireAuth } from '../_db.js';
import { getAppUrl, stripeRequest } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido.' });

  const user = requireAuth(req, res);
  if (!user) return json(res, 401, { error: 'Inicia sesión para gestionar tu membresía.' });

  try {
    const [inscripcion] = await query(
      `SELECT stripe_subscription_id
       FROM inscripciones
       WHERE usuario_id = ? AND estado IN ('activa', 'pendiente') AND stripe_subscription_id IS NOT NULL
       ORDER BY fecha_inscripcion DESC, id DESC LIMIT 1`,
      [user.id]
    );
    if (!inscripcion?.stripe_subscription_id) {
      return json(res, 404, { error: 'No se encontró una membresía activa.' });
    }

    const subscription = await stripeRequest(
      `/subscriptions/${encodeURIComponent(inscripcion.stripe_subscription_id)}`,
      { method: 'GET' }
    );
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;
    if (!customerId) throw new Error('Stripe no devolvió el cliente de la suscripción.');

    const params = new URLSearchParams({
      customer: customerId,
      return_url: `${getAppUrl()}/talleres`,
    });
    const portal = await stripeRequest('/billing_portal/sessions', { body: params });
    if (!portal.url) throw new Error('Stripe no devolvió el enlace del portal.');
    return json(res, 200, { url: portal.url });
  } catch (error) {
    console.error('[stripe/portal] No se pudo abrir el portal:', error.message);
    return json(res, 500, { error: 'No se pudo abrir la gestión de membresía.' });
  }
}
