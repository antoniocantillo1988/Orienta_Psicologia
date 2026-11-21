// api/admin/citas.js
import { query, json, requireAdmin } from './_db.js';
import { cancelarEventoCalendar } from './_calendar.js';
import { enviarActualizacionCita, enviarCancelacionCita } from './_email_cursos.js';

const ESTADOS = ['pendiente', 'confirmada', 'cancelada', 'completada'];

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return; // ya ha respondido (antes la petición se quedaba colgada)

    // GET - listar todas las citas
    if (req.method === 'GET') {
      const citas = await query(
        `SELECT c.*, d.fecha, d.hora_inicio, d.hora_fin,
                u.nombre_usuario, u.email
         FROM citas c
         JOIN disponibilidad d ON c.disponibilidad_id = d.id
         JOIN usuarios u ON c.usuario_id = u.id
         ORDER BY d.fecha ASC, d.hora_inicio ASC`
      );
      return json(res, 200, { citas });
    }

    // PUT - cambiar estado y/o enlace de videollamada
    if (req.method === 'PUT') {
      const { cita_id, enlace_videollamada, estado } = req.body || {};
      if (!cita_id) return json(res, 400, { error: 'Falta cita_id.' });
      if (estado && !ESTADOS.includes(estado)) {
        return json(res, 400, { error: 'Estado no válido.' });
      }

      const [cita] = await query(
        `SELECT c.id, c.usuario_id, c.estado, c.disponibilidad_id, c.google_evento_id,
                c.enlace_videollamada, u.email, u.nombre_usuario,
                d.fecha, d.hora_inicio, d.modalidad, d.sede_cita
         FROM citas c JOIN usuarios u ON u.id = c.usuario_id
         JOIN disponibilidad d ON d.id = c.disponibilidad_id
         WHERE c.id = ?`,
        [cita_id]
      );
      if (!cita) return json(res, 404, { error: 'Cita no encontrada.' });

      const nuevoEstado = estado || cita.estado;
      const nuevoEnlace = enlace_videollamada ?? cita.enlace_videollamada ?? '';

      // Si el admin cancela una cita activa: se libera el hueco y se borra el evento de Google
      if (nuevoEstado === 'cancelada' && cita.estado !== 'cancelada') {
        if (cita.google_evento_id) {
          await cancelarEventoCalendar(cita.google_evento_id).catch((e) =>
            console.error('[admin/citas] Google:', e.message)
          );
        }
        await query('UPDATE disponibilidad SET ocupado = 0 WHERE id = ?', [cita.disponibilidad_id]);
      }
      // Si se reactiva una cita cancelada, el hueco vuelve a quedar ocupado
      if (cita.estado === 'cancelada' && nuevoEstado !== 'cancelada') {
        await query('UPDATE disponibilidad SET ocupado = 1 WHERE id = ?', [cita.disponibilidad_id]);
      }

      await query('UPDATE citas SET estado = ?, enlace_videollamada = ? WHERE id = ?', [
        nuevoEstado,
        nuevoEnlace,
        cita_id,
      ]);

      try {
        if (nuevoEstado === 'cancelada' && cita.estado !== 'cancelada') {
          await enviarCancelacionCita({
            usuarioId: cita.usuario_id, citaId: cita.id, email: cita.email,
            nombre: cita.nombre_usuario, fecha: cita.fecha, hora: cita.hora_inicio,
          });
        } else if (nuevoEstado === 'confirmada'
          && (cita.estado !== 'confirmada' || nuevoEnlace !== cita.enlace_videollamada)) {
          await enviarActualizacionCita({
            usuarioId: cita.usuario_id, citaId: cita.id, email: cita.email,
            nombre: cita.nombre_usuario, fecha: cita.fecha, hora: cita.hora_inicio,
            modalidad: cita.modalidad, sede: cita.sede_cita, enlace: nuevoEnlace,
          });
        }
      } catch (emailError) {
        console.error('[admin/citas] No se pudo encolar el email de actualización:', emailError.message);
      }
      return json(res, 200, { ok: true });
    }

    // DELETE - eliminar cita (y liberar su hueco)
    if (req.method === 'DELETE') {
      const { cita_id } = req.body || {};
      if (!cita_id) return json(res, 400, { error: 'Falta cita_id.' });

      const [cita] = await query(
        `SELECT c.id, c.usuario_id, c.estado, c.disponibilidad_id, c.google_evento_id,
                u.email, u.nombre_usuario, d.fecha, d.hora_inicio
         FROM citas c JOIN usuarios u ON u.id = c.usuario_id
         JOIN disponibilidad d ON d.id = c.disponibilidad_id
         WHERE c.id = ?`,
        [cita_id]
      );
      if (!cita) return json(res, 404, { error: 'Cita no encontrada.' });

      if (cita.google_evento_id && cita.estado !== 'cancelada') {
        await cancelarEventoCalendar(cita.google_evento_id).catch((e) =>
          console.error('[admin/citas] Google:', e.message)
        );
      }
      await query('DELETE FROM citas WHERE id = ?', [cita_id]);
      // CORREGIDO: antes se usaba cita_id como id de disponibilidad (borraba el hueco equivocado)
      await query('UPDATE disponibilidad SET ocupado = 0 WHERE id = ?', [cita.disponibilidad_id]);
      if (cita.estado !== 'cancelada') {
        try {
          await enviarCancelacionCita({
            usuarioId: cita.usuario_id, citaId: cita.id, email: cita.email,
            nombre: cita.nombre_usuario, fecha: cita.fecha, hora: cita.hora_inicio,
          });
        } catch (emailError) {
          console.error('[admin/citas] No se pudo encolar el email de cancelación:', emailError.message);
        }
      }
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Método no permitido' });
  } catch (err) {
    console.error('[admin/citas]', err.message);
    return json(res, 500, { error: err.message });
  }
}
