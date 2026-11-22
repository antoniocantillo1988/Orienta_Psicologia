import { json } from './_db.js';
import checkout from './_route_stripe_checkout.js';
import portal from './_route_stripe_portal.js';

const routes = { checkout, portal };

export default async function handler(req, res) {
  const route = Array.isArray(req.query?.route) ? req.query.route[0] : req.query?.route;
  const endpoint = routes[route];
  if (!endpoint) return json(res, 404, { error: 'Ruta de Stripe no encontrada.' });
  return endpoint(req, res);
}
