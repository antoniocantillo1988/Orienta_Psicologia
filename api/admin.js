import { json } from './_db.js';
import citas from './_route_admin_citas.js';
import huecos from './_route_admin_huecos.js';
import usuarios from './_route_admin_usuarios.js';

const routes = { citas, huecos, usuarios };

export default async function handler(req, res) {
  const route = Array.isArray(req.query?.route) ? req.query.route[0] : req.query?.route;
  const endpoint = routes[route];
  if (!endpoint) return json(res, 404, { error: 'Ruta de administración no encontrada.' });
  return endpoint(req, res);
}
