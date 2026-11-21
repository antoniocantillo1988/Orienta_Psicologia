import { json, query, requireAuth } from '../_db.js';
import { positiveInteger } from '../stripe/_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido.' });

  const user = requireAuth(req, res);
  if (!user) return json(res, 401, { error: 'Inicia sesión para inscribirte.' });

  const cursoId = positiveInteger(req.body?.curso_id);
  if (!cursoId) return json(res, 400, { error: 'El curso indicado no es válido.' });

  try {
    const [curso] = await query(
      'SELECT id, tipo_acceso FROM cursos WHERE id = ? AND publicado = 1',
      [cursoId]
    );
    if (!curso) return json(res, 404, { error: 'El curso no está disponible.' });
    if (curso.tipo_acceso !== 'gratis') {
      return json(res, 400, { error: 'Este curso requiere un pago.' });
    }

    await query(
      `INSERT INTO inscripciones
         (usuario_id, curso_id, estado, fecha_inicio, fecha_fin,
          stripe_checkout_session_id, stripe_subscription_id)
       VALUES (?, ?, 'activa', NOW(), NULL, NULL, NULL)
       ON DUPLICATE KEY UPDATE
         estado = 'activa',
         fecha_inicio = COALESCE(fecha_inicio, NOW()),
         fecha_fin = NULL,
         stripe_checkout_session_id = NULL,
         stripe_subscription_id = NULL`,
      [user.id, cursoId]
    );

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('[cursos/inscribirse] No se pudo guardar la inscripción:', error.message);
    return json(res, 500, { error: 'No se pudo completar la inscripción.' });
  }
}
