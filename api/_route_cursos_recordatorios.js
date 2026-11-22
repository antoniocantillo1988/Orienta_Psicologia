import { json, query } from './_db.js';
import {
  enviarRecordatorioCita,
  enviarRecordatorioSemanal,
  procesarCorreosPendientes,
} from './_email_cursos.js';

function semanaUTC() {
  const lunes = new Date();
  lunes.setUTCHours(0, 0, 0, 0);
  lunes.setUTCDate(lunes.getUTCDate() - ((lunes.getUTCDay() + 6) % 7));
  return lunes.toISOString().slice(0, 10);
}

function mananaEnMadrid() {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map((parte) => [parte.type, parte.value]));
  return new Date(Date.UTC(Number(partes.year), Number(partes.month) - 1, Number(partes.day) + 1))
    .toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido.' });
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) {
    return json(res, 401, { error: 'No autorizado.' });
  }

  try {
    const reintentos = await procesarCorreosPendientes();
    const citas = await query(
      `SELECT c.id AS cita_id, c.usuario_id, c.enlace_videollamada,
              u.email, u.nombre_usuario, d.fecha, d.hora_inicio,
              d.modalidad, d.sede_cita
       FROM citas c
       JOIN usuarios u ON u.id = c.usuario_id
       JOIN disponibilidad d ON d.id = c.disponibilidad_id
       WHERE c.estado = 'confirmada' AND d.fecha = ?
       ORDER BY d.hora_inicio, c.id`,
      [mananaEnMadrid()]
    );

    for (const cita of citas) {
      await enviarRecordatorioCita({
        usuarioId: cita.usuario_id,
        citaId: cita.cita_id,
        email: cita.email,
        nombre: cita.nombre_usuario,
        fecha: cita.fecha,
        hora: cita.hora_inicio,
        modalidad: cita.modalidad,
        sede: cita.sede_cita,
        enlace: cita.enlace_videollamada,
      });
    }

    let inscripciones = [];
    let correos = 0;
    if (new Date().getUTCDay() === 1) {
      const periodo = semanaUTC();
      inscripciones = await query(
        `SELECT i.usuario_id, i.curso_id, u.email, u.nombre_usuario,
              c.titulo, c.duracion_horas,
              COUNT(cc.id) AS total_actividades,
              SUM(CASE WHEN COALESCE(cp.completado, 0) = 1 THEN 1 ELSE 0 END) AS completados
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       JOIN cursos c ON c.id = i.curso_id
       JOIN curso_contenidos cc ON cc.curso_id = c.id AND cc.publicado = 1 AND cc.obligatorio = 1
       LEFT JOIN curso_progreso cp ON cp.contenido_id = cc.id AND cp.usuario_id = i.usuario_id
       WHERE i.estado = 'activa' AND (
         c.tipo_acceso = 'gratis'
         OR (c.tipo_acceso = 'pago' AND i.stripe_checkout_session_id IS NOT NULL)
         OR (c.tipo_acceso = 'membresia' AND i.stripe_subscription_id IS NOT NULL AND i.fecha_fin > NOW())
       )
       GROUP BY i.usuario_id, i.curso_id, u.email, u.nombre_usuario, c.titulo, c.duracion_horas
         HAVING total_actividades > completados`
      );

      for (const curso of inscripciones) {
        const pendientes = await query(
          `SELECT cc.tema, cc.titulo, cc.tipo
           FROM curso_contenidos cc
           LEFT JOIN curso_progreso cp ON cp.contenido_id = cc.id AND cp.usuario_id = ?
           WHERE cc.curso_id = ? AND cc.publicado = 1
             AND COALESCE(cp.completado, 0) <> 1
           ORDER BY cc.orden, cc.id`,
          [curso.usuario_id, curso.curso_id]
        );
        const total = Number(curso.total_actividades) || 0;
        const completados = Number(curso.completados) || 0;
        await enviarRecordatorioSemanal({
          usuarioId: curso.usuario_id,
          cursoId: curso.curso_id,
          email: curso.email,
          nombre: curso.nombre_usuario,
          curso,
          periodo,
          progreso: Math.round((completados / total) * 100),
          pendientes,
        });
        correos += 1;
      }
    }

    return json(res, 200, {
      ok: true,
      citas_recordadas: citas.length,
      inscripciones_revisadas: inscripciones.length,
      recordatorios_cursos: correos,
      reintentos,
    });
  } catch (error) {
    console.error('[cursos/recordatorios]', error.message);
    return json(res, 500, { error: 'No se pudieron procesar los recordatorios.' });
  }
}
