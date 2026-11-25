import { json, query, requireAuth } from './_db.js';
import { positiveInteger } from './stripe/_helpers.js';
import { enviarConfirmacionCurso } from './_email_cursos.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido.' });

  const user = requireAuth(req, res);
  if (!user) return json(res, 401, { error: 'Inicia sesión para inscribirte.' });

  const cursoId = positiveInteger(req.body?.curso_id);
  if (!cursoId) return json(res, 400, { error: 'El curso indicado no es válido.' });

  try {
    const [curso] = await query(
      'SELECT id, titulo, tipo_acceso, precio, moneda, duracion_horas FROM cursos WHERE id = ? AND publicado = 1',
      [cursoId]
    );
    if (!curso) return json(res, 404, { error: 'El curso no está disponible.' });
    if (curso.tipo_acceso === 'membresia') {
      const [membresia] = await query(
        `SELECT i.stripe_subscription_id
         FROM inscripciones i
         JOIN cursos c ON c.id = i.curso_id
         WHERE i.usuario_id = ? AND c.tipo_acceso = 'membresia'
           AND i.estado = 'activa' AND i.stripe_subscription_id IS NOT NULL
           AND i.fecha_fin > NOW()
         ORDER BY i.fecha_fin DESC, i.id DESC
         LIMIT 1`,
        [user.id]
      );
      if (!membresia) {
        return json(res, 403, { error: 'Necesitas una membresía vigente para inscribirte en este curso.' });
      }

      const [inscripcionExistente] = await query(
        `SELECT stripe_subscription_id,
                (estado = 'activa' AND fecha_fin > NOW()) AS suscripcion_vigente
         FROM inscripciones WHERE usuario_id = ? AND curso_id = ?`,
        [user.id, cursoId]
      );
      if (inscripcionExistente?.stripe_subscription_id && Number(inscripcionExistente.suscripcion_vigente) === 1) {
        return json(res, 200, { ok: true, ya_inscrito: true });
      }

      await query(
        `INSERT INTO inscripciones
           (usuario_id, curso_id, estado, fecha_inicio, fecha_fin,
            stripe_checkout_session_id, stripe_subscription_id)
         VALUES (?, ?, 'activa', NOW(), NULL, NULL, NULL)
         ON DUPLICATE KEY UPDATE
           estado = 'activa', fecha_inicio = COALESCE(fecha_inicio, NOW())`,
        [user.id, cursoId]
      );
    } else if (curso.tipo_acceso !== 'gratis') {
      return json(res, 400, { error: 'Este curso requiere un pago.' });
    } else {
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
    }

    try {
      const [[usuario], [inscripcion]] = await Promise.all([
        query('SELECT email, nombre_usuario FROM usuarios WHERE id = ?', [user.id]),
        query('SELECT id, fecha_inicio FROM inscripciones WHERE usuario_id = ? AND curso_id = ?', [user.id, cursoId]),
      ]);
      await enviarConfirmacionCurso({
        usuarioId: user.id,
        cursoId,
        email: usuario?.email,
        nombre: usuario?.nombre_usuario,
        curso,
        periodo: `alta-${inscripcion?.id}-${inscripcion?.fecha_inicio}`,
      });
    } catch (emailError) {
      console.error('[cursos/inscribirse] No se pudo encolar el correo de inscripción:', emailError.message);
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('[cursos/inscribirse] No se pudo guardar la inscripción:', error.message);
    return json(res, 500, { error: 'No se pudo completar la inscripción.' });
  }
}
