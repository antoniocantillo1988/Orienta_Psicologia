import { json, query, requireAuth } from './_db.js';

function enteroPositivo(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido.' });
  const user = requireAuth(req, res);
  if (!user) return json(res, 401, { error: 'Inicia sesión para actualizar tu progreso.' });

  const contenidoId = enteroPositivo(req.body?.contenido_id);
  const completado = req.body?.completado === false || req.body?.completado === 0 ? 0 : 1;
  const respuesta = String(req.body?.respuesta || '').trim().slice(0, 10000) || null;
  if (!contenidoId) return json(res, 400, { error: 'El contenido indicado no es válido.' });

  try {
    const [contenido] = await query(
      `SELECT cc.id, cc.curso_id, cc.obligatorio
       FROM curso_contenidos cc
       JOIN cursos c ON c.id = cc.curso_id
       JOIN inscripciones i ON i.curso_id = cc.curso_id
       WHERE cc.id = ? AND cc.publicado = 1
         AND i.usuario_id = ? AND i.estado = 'activa'
         AND (
           c.tipo_acceso = 'gratis'
           OR (c.tipo_acceso = 'pago' AND i.stripe_checkout_session_id IS NOT NULL)
           OR (c.tipo_acceso = 'membresia' AND i.stripe_subscription_id IS NOT NULL AND i.fecha_fin > NOW())
         )
       LIMIT 1`,
      [contenidoId, user.id]
    );
    if (!contenido) return json(res, 403, { error: 'No tienes acceso a este contenido.' });

    await query(
      `INSERT INTO curso_progreso (usuario_id, contenido_id, completado, respuesta, fecha_completado)
       VALUES (?, ?, ?, ?, IF(? = 1, NOW(), NULL))
       ON DUPLICATE KEY UPDATE
         completado = VALUES(completado),
         respuesta = COALESCE(VALUES(respuesta), respuesta),
         fecha_completado = IF(VALUES(completado) = 1, COALESCE(fecha_completado, NOW()), NULL)`,
      [user.id, contenidoId, completado, respuesta, completado]
    );

    const [resumen] = await query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN COALESCE(cp.completado, 0) = 1 THEN 1 ELSE 0 END) AS completados
       FROM curso_contenidos cc
       LEFT JOIN curso_progreso cp
         ON cp.contenido_id = cc.id AND cp.usuario_id = ?
       WHERE cc.curso_id = ? AND cc.publicado = 1 AND cc.obligatorio = 1`,
      [user.id, contenido.curso_id]
    );
    const total = Number(resumen?.total || 0);
    const completados = Number(resumen?.completados || 0);
    const porcentaje = total ? Math.round((completados / total) * 100) : 0;
    const finalizado = total > 0 && completados >= total;

    await query(
      `UPDATE inscripciones
       SET fecha_finalizacion = IF(?, COALESCE(fecha_finalizacion, NOW()), NULL)
       WHERE usuario_id = ? AND curso_id = ? AND estado = 'activa'`,
      [finalizado ? 1 : 0, user.id, contenido.curso_id]
    );

    return json(res, 200, { ok: true, porcentaje, completados, total_actividades: total, finalizado });
  } catch (error) {
    console.error('[cursos/progreso]', error.message);
    return json(res, 500, { error: 'No se pudo guardar el progreso.' });
  }
}
