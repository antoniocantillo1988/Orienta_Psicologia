import { json, query, verifyToken } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido.' });

  try {
    const user = verifyToken(req);
    const cursos = user
      ? await query(
          `SELECT c.id, c.titulo, c.descripcion, c.categoria, c.tipo_acceso,
                  CASE WHEN c.tipo_acceso = 'membresia' THEN
                    (SELECT cuota.precio FROM cursos cuota WHERE cuota.tipo_acceso = 'membresia' ORDER BY cuota.id ASC LIMIT 1)
                    ELSE c.precio END AS precio,
                  CASE WHEN c.tipo_acceso = 'membresia' THEN 'EUR' ELSE c.moneda END AS moneda,
                  c.duracion_horas,
                  CASE
                    WHEN c.tipo_acceso = 'membresia' AND EXISTS (
                      SELECT 1
                      FROM inscripciones im
                      JOIN cursos cm ON cm.id = im.curso_id
                      WHERE im.usuario_id = ? AND cm.tipo_acceso = 'membresia'
                        AND im.estado = 'activa' AND im.stripe_subscription_id IS NOT NULL
                        AND im.fecha_fin > NOW()
                    ) THEN 'activa'
                    WHEN i.estado = 'activa' AND (
                      c.tipo_acceso = 'gratis'
                      OR (c.tipo_acceso = 'pago' AND i.stripe_checkout_session_id IS NOT NULL)
                      OR (c.tipo_acceso = 'membresia' AND i.stripe_subscription_id IS NOT NULL AND i.fecha_fin > NOW())
                    ) THEN 'activa'
                    WHEN i.estado IN ('activa', 'pendiente')
                      AND (i.stripe_checkout_session_id IS NOT NULL OR i.stripe_subscription_id IS NOT NULL) THEN 'pendiente'
                    WHEN c.tipo_acceso = 'membresia' THEN NULL
                    ELSE i.estado
                  END AS inscripcion_estado,
                  CASE WHEN i.stripe_subscription_id IS NOT NULL THEN 1 ELSE 0 END AS puede_gestionar_membresia
           FROM cursos c
           LEFT JOIN inscripciones i ON i.curso_id = c.id AND i.usuario_id = ?
           WHERE c.publicado = 1
           ORDER BY c.fecha_creacion DESC, c.id DESC`,
          [user.id, user.id]
        )
      : await query(
        `SELECT c.id, c.titulo, c.descripcion, c.categoria, c.tipo_acceso,
                CASE WHEN c.tipo_acceso = 'membresia' THEN
                  (SELECT cuota.precio FROM cursos cuota WHERE cuota.tipo_acceso = 'membresia' ORDER BY cuota.id ASC LIMIT 1)
                  ELSE c.precio END AS precio,
                CASE WHEN c.tipo_acceso = 'membresia' THEN 'EUR' ELSE c.moneda END AS moneda,
                c.duracion_horas,
                  NULL AS inscripcion_estado
         FROM cursos c
         WHERE c.publicado = 1
         ORDER BY c.fecha_creacion DESC, c.id DESC`
        );

    const proximamente = await query(
      `SELECT id, titulo, duracion_horas
       FROM cursos
       WHERE publicado = 0
       ORDER BY fecha_actualizacion DESC, id DESC`
    );

    return json(res, 200, { cursos, proximamente });
  } catch (error) {
    console.error('[cursos] No se pudo cargar el catálogo:', error.message);
    return json(res, 500, { error: 'No se pudo cargar el catálogo de cursos.' });
  }
}
