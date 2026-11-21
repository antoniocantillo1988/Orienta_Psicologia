import { json, query, requireAuth } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido.' });
  const user = requireAuth(req, res);
  if (!user) return json(res, 401, { error: 'Inicia sesión para consultar tus cursos.' });

  try {
    const cursos = await query(
      `SELECT c.id, c.titulo, c.descripcion, c.categoria, c.tipo_acceso,
              c.precio, c.moneda, c.duracion_horas, i.fecha_inicio,
              i.fecha_finalizacion, i.estado AS inscripcion_estado
       FROM inscripciones i
       JOIN cursos c ON c.id = i.curso_id
       WHERE i.usuario_id = ? AND (i.estado = 'activa' OR i.fecha_finalizacion IS NOT NULL)
       ORDER BY i.fecha_inicio DESC, c.id DESC`,
      [user.id]
    );

    if (!cursos.length) return json(res, 200, { cursos: [] });
    const ids = cursos.map((curso) => Number(curso.id)).filter(Number.isSafeInteger);
    const placeholders = ids.map(() => '?').join(', ');
    const contenidos = await query(
      `SELECT cc.id, cc.curso_id, cc.tema, cc.titulo, cc.tipo, cc.enlace,
              cc.instrucciones, cc.orden, cc.obligatorio,
              COALESCE(cp.completado, 0) AS completado,
              cp.respuesta, cp.fecha_completado
       FROM curso_contenidos cc
       LEFT JOIN curso_progreso cp
         ON cp.contenido_id = cc.id AND cp.usuario_id = ?
       WHERE cc.curso_id IN (${placeholders}) AND cc.publicado = 1
       ORDER BY cc.curso_id, cc.orden, cc.id`,
      [user.id, ...ids]
    );

    const porCurso = new Map(cursos.map((curso) => [String(curso.id), []]));
    for (const item of contenidos) porCurso.get(String(item.curso_id))?.push(item);

    const resultado = cursos.map((curso) => {
      const items = porCurso.get(String(curso.id)) || [];
      const obligatorios = items.filter((item) => Number(item.obligatorio) === 1);
      const completados = obligatorios.filter((item) => Number(item.completado) === 1).length;
      const porcentaje = obligatorios.length ? Math.round((completados / obligatorios.length) * 100) : 0;
      const pendientes = items.filter((item) => Number(item.completado) !== 1);
      return {
        ...curso,
        porcentaje,
        completados,
        total_actividades: obligatorios.length,
        siguiente_actividad: pendientes[0] || null,
        tareas_pendientes: pendientes.filter((item) => ['tarea', 'cuestionario'].includes(item.tipo)),
      };
    });

    return json(res, 200, { cursos: resultado });
  } catch (error) {
    console.error('[cursos/mis-cursos]', error.message);
    return json(res, 500, { error: 'No se pudieron cargar tus cursos.' });
  }
}
