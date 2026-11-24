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
    const [curso] = await query(
      `SELECT c.id, c.titulo, c.descripcion, c.categoria, c.tipo_acceso, c.duracion_horas,
              i.estado AS inscripcion_estado, i.stripe_checkout_session_id,
              i.stripe_subscription_id,
              (i.fecha_fin IS NOT NULL AND i.fecha_fin > NOW()) AS periodo_vigente,
              EXISTS (
                SELECT 1
                FROM inscripciones im
                JOIN cursos cm ON cm.id = im.curso_id
                WHERE im.usuario_id = ? AND cm.tipo_acceso = 'membresia'
                  AND im.estado = 'activa' AND im.stripe_subscription_id IS NOT NULL
                  AND im.fecha_fin > NOW()
              ) AS membresia_activa
       FROM cursos c
       LEFT JOIN inscripciones i ON i.curso_id = c.id AND i.usuario_id = ?
       WHERE c.id = ? AND c.publicado = 1
       LIMIT 1`,
      [user.id, user.id, cursoId]
    );
    if (!curso) return json(res, 404, { error: 'No se encontró el curso.' });

    const inscritaActiva = curso.inscripcion_estado === 'activa';
    const pagoUnicoValidado = curso.tipo_acceso === 'pago' && Boolean(curso.stripe_checkout_session_id);
    const membresiaVigente = curso.tipo_acceso === 'membresia'
      && inscritaActiva
      && Number(curso.membresia_activa) === 1;
    const accesoGratis = curso.tipo_acceso === 'gratis';
    const tieneAcceso = curso.tipo_acceso === 'membresia'
      ? membresiaVigente
      : inscritaActiva && (accesoGratis || pagoUnicoValidado);
    if (!tieneAcceso) {
      const gestionarMembresia = curso.tipo_acceso === 'membresia'
        && Boolean(curso.stripe_subscription_id)
        && ['activa', 'pendiente'].includes(curso.inscripcion_estado);
      return json(res, 403, {
        error: gestionarMembresia
          ? 'Tu pago mensual necesita revisión. Te llevaremos a Stripe para actualizarlo.'
          : curso.tipo_acceso === 'membresia' && Number(curso.membresia_activa) === 1
            ? 'Tu membresía incluye este curso. Inscríbete desde el catálogo para añadirlo a Campus Orienta.'
          : curso.tipo_acceso === 'gratis'
            ? 'Este curso gratuito requiere inscripción desde el catálogo.'
            : 'Para entrar en este curso, primero debes completar el pago en Stripe.',
        code: 'ACCESO_REQUERIDO',
        tipo_acceso: curso.tipo_acceso,
        gestionar_membresia: gestionarMembresia,
      });
    }

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
    const cursoPublico = {
      id: curso.id,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      categoria: curso.categoria,
      tipo_acceso: curso.tipo_acceso,
      duracion_horas: curso.duracion_horas,
    };
    return json(res, 200, { curso: cursoPublico, contenidos, progreso, completados, total_actividades: obligatorios.length });
  } catch (error) {
    console.error('[cursos/contenido]', error.message);
    return json(res, 500, { error: 'No se pudo cargar el contenido del curso.' });
  }
}
