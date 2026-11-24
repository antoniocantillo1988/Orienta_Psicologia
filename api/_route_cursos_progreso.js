import { json, query, requireAuth } from './_db.js';
import { enviarCertificadoCurso } from './_email_cursos.js';

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
      `SELECT cc.id, cc.curso_id, cc.obligatorio, c.tipo_acceso
       FROM curso_contenidos cc
       JOIN cursos c ON c.id = cc.curso_id
       LEFT JOIN inscripciones i ON i.curso_id = cc.curso_id AND i.usuario_id = ?
       WHERE cc.id = ? AND cc.publicado = 1
         AND (
           (c.tipo_acceso = 'gratis' AND i.estado = 'activa')
           OR (c.tipo_acceso = 'pago' AND i.estado = 'activa' AND i.stripe_checkout_session_id IS NOT NULL)
           OR (c.tipo_acceso = 'membresia' AND i.estado = 'activa' AND EXISTS (
             SELECT 1
             FROM inscripciones im
             JOIN cursos cm ON cm.id = im.curso_id
             WHERE im.usuario_id = ? AND cm.tipo_acceso = 'membresia'
               AND im.estado = 'activa' AND im.stripe_subscription_id IS NOT NULL
               AND im.fecha_fin > NOW()
           ))
         )
       LIMIT 1`,
      [user.id, contenidoId, user.id]
    );
    if (!contenido) return json(res, 403, { error: 'No tienes acceso a este contenido.' });

    const [inscripcionInicial] = await query(
      'SELECT fecha_finalizacion, stripe_subscription_id FROM inscripciones WHERE usuario_id = ? AND curso_id = ?',
      [user.id, contenido.curso_id]
    );

    if (contenido.tipo_acceso === 'membresia') {
      const [membresiaVigente] = await query(
        `SELECT im.stripe_subscription_id
         FROM inscripciones im
         JOIN cursos cm ON cm.id = im.curso_id
         WHERE im.usuario_id = ? AND cm.tipo_acceso = 'membresia'
           AND im.estado = 'activa' AND im.stripe_subscription_id IS NOT NULL
           AND im.fecha_fin > NOW()
         ORDER BY im.fecha_fin DESC, im.id DESC
         LIMIT 1`,
        [user.id]
      );
      if (membresiaVigente && inscripcionInicial?.stripe_subscription_id !== membresiaVigente.stripe_subscription_id) {
        await query(
          `INSERT INTO inscripciones
             (usuario_id, curso_id, estado, fecha_inicio, fecha_fin,
              stripe_checkout_session_id, stripe_subscription_id)
           VALUES (?, ?, 'activa', NOW(), NULL, NULL, NULL)
           ON DUPLICATE KEY UPDATE
             estado = 'activa', fecha_inicio = COALESCE(fecha_inicio, NOW()),
             fecha_fin = NULL, stripe_checkout_session_id = NULL,
             stripe_subscription_id = NULL`,
          [user.id, contenido.curso_id]
        );
      }
    }

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

    if (finalizado && !inscripcionInicial?.fecha_finalizacion) {
      try {
        const [datos] = await query(
          `SELECT u.email, u.nombre_usuario, c.id AS curso_id, c.titulo,
                  c.duracion_horas, i.fecha_finalizacion
           FROM inscripciones i
           JOIN usuarios u ON u.id = i.usuario_id
           JOIN cursos c ON c.id = i.curso_id
           WHERE i.usuario_id = ? AND i.curso_id = ?`,
          [user.id, contenido.curso_id]
        );
        if (datos?.fecha_finalizacion) await enviarCertificadoCurso({
          usuarioId: user.id,
          cursoId: datos.curso_id,
          email: datos.email,
          nombre: datos.nombre_usuario,
          curso: datos,
          periodo: `final-${datos.fecha_finalizacion}`,
          fechaFin: datos.fecha_finalizacion,
        });
      } catch (emailError) {
        console.error('[cursos/progreso] No se pudo encolar el certificado por correo:', emailError.message);
      }
    }

    return json(res, 200, { ok: true, porcentaje, completados, total_actividades: total, finalizado });
  } catch (error) {
    console.error('[cursos/progreso]', error.message);
    return json(res, 500, { error: 'No se pudo guardar el progreso.' });
  }
}
