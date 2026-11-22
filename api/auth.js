import { json } from './_db.js';
import login from './_route_auth_login.js';
import register from './_route_auth_register.js';

const routes = { login, register };

export default async function handler(req, res) {
  const route = Array.isArray(req.query?.route) ? req.query.route[0] : req.query?.route;
  const endpoint = routes[route];
  if (!endpoint) return json(res, 404, { error: 'Ruta de autenticación no encontrada.' });
  return endpoint(req, res);
}
