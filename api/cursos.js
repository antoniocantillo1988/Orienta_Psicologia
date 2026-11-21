import { json } from './_db.js';
import catalogo from './_route_cursos_index.js';
import inscribirse from './_route_cursos_inscribirse.js';

const routes = { index: catalogo, inscribirse };

export default async function handler(req, res) {
  const route = Array.isArray(req.query?.route) ? req.query.route[0] : req.query?.route || 'index';
  const endpoint = routes[route];
  if (!endpoint) return json(res, 404, { error: 'Ruta de cursos no encontrada.' });
  return endpoint(req, res);
}
