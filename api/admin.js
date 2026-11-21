import { json } from './_db.js';
import citas from './_route_admin_citas.js';
import huecos from './_route_admin_huecos.js';
import usuarios from './_route_admin_usuarios.js';
import talleres from './_route_admin_talleres.js';
import talleresContenido from './_route_admin_talleres_contenido.js';

const routes = {
  citas,
  huecos,
  usuarios,
  talleres,
  'talleres-contenidos': talleresContenido,
};

export default async function handler(req, res) {
  const route = Array.isArray(req.query?.route) ? req.query.route[0] : req.query?.route;
  const endpoint = routes[route];
  if (!endpoint) return json(res, 404, { error: 'Ruta de administración no encontrada.' });
  return endpoint(req, res);
}
