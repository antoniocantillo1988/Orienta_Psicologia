import { json } from './_db.js';
import chat from './_route_chat_index.js';
import historial from './_route_chat_historial.js';

const routes = { index: chat, historial };

export default async function handler(req, res) {
  const route = Array.isArray(req.query?.route) ? req.query.route[0] : req.query?.route || 'index';
  const endpoint = routes[route];
  if (!endpoint) return json(res, 404, { error: 'Ruta del chat no encontrada.' });
  return endpoint(req, res);
}
