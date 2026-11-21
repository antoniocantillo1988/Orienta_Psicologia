import { json } from './_db.js';
import catalogo from './_route_cursos_index.js';
import inscribirse from './_route_cursos_inscribirse.js';
import misCursos from './_route_cursos_mis_cursos.js';
import contenido from './_route_cursos_contenido.js';
import progreso from './_route_cursos_progreso.js';

const routes = {
  index: catalogo,
  inscribirse,
  'mis-cursos': misCursos,
  contenido,
  progreso,
};

export default async function handler(req, res) {
  const route = Array.isArray(req.query?.route) ? req.query.route[0] : req.query?.route || 'index';
  const endpoint = routes[route];
  if (!endpoint) return json(res, 404, { error: 'Ruta de cursos no encontrada.' });
  return endpoint(req, res);
}
