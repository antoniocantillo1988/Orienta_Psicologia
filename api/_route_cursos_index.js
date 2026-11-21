import { json, query, verifyToken } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido.' });

  try {
    const user = verifyToken(req);
    const cursos = user
      ? await query(
          `SELECT c.id, c.titulo, c.descripcion, c.categoria, c.tipo_acceso,
                  c.precio, c.moneda, i.estado AS inscripcion_estado
           FROM cursos c
           LEFT JOIN inscripciones i ON i.curso_id = c.id AND i.usuario_id = ?
           WHERE c.publicado = 1
           ORDER BY c.fecha_creacion DESC, c.id DESC`,
          [user.id]
        )
      : await query(
          `SELECT id, titulo, descripcion, categoria, tipo_acceso, precio, moneda,
                  NULL AS inscripcion_estado
           FROM cursos
           WHERE publicado = 1
           ORDER BY fecha_creacion DESC, id DESC`
        );

    return json(res, 200, { cursos });
  } catch (error) {
    console.error('[cursos] No se pudo cargar el catálogo:', error.message);
    return json(res, 500, { error: 'No se pudo cargar el catálogo de cursos.' });
  }
}
