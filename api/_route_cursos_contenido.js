import { json, query, requireAuth } from './_db.js';

function enteroPositivo(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido.' });
  const user = requireAuth(req, res);
  if (!user) return json(res, 401, { error: 'Inicia sesión para ver el curso.' });
  const cursoId = enteroPositivo(req.query?.curso_id);
  if (!cursoId) return json(res, 400, { error: 'El curso indicado no es válido.' });

  try {
    const [inscripcion] = await query(
      `SELECT id FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ? AND estado = 'activa'
       LIMIT 1`,
      [user.id, cursoId]
    );
    if (!inscripcion) return json(res, 403, { error: 'Necesitas una inscripción activa para acceder al curso.' });

    const [curso] = await query(
      `SELECT id, titulo, descripcion, categoria, tipo_acceso, duracion_horas
       FROM cursos WHERE id = ?`,
      [cursoId]
    );
    if (!curso) return json(res, 404, { error: 'No se encontró el curso.' });

    const contenidos = await query(
      `SELECT cc.id, cc.tema, cc.titulo, cc.tipo, cc.enlace, cc.instrucciones,
              cc.orden, cc.obligatorio, COALESCE(cp.completado, 0) AS completado,
              cp.respuesta, cp.fecha_completado
       FROM curso_contenidos cc
       LEFT JOIN curso_progreso cp
         ON cp.contenido_id = cc.id AND cp.usuario_id = ?
       WHERE cc.curso_id = ? AND cc.publicado = 1
       ORDER BY cc.orden, cc.id`,
      [user.id, cursoId]
    );
    const obligatorios = contenidos.filter((item) => Number(item.obligatorio) === 1);
    const completados = obligatorios.filter((item) => Number(item.completado) === 1).length;
    const progreso = obligatorios.length ? Math.round((completados / obligatorios.length) * 100) : 0;
    return json(res, 200, { curso, contenidos, progreso, completados, total_actividades: obligatorios.length });
  } catch (error) {
    console.error('[cursos/contenido]', error.message);
    return json(res, 500, { error: 'No se pudo cargar el contenido del curso.' });
  }
}
