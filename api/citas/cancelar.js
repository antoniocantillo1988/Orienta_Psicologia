// api/citas/cancelar.js
import { query, json, requireAuth } from '../_db.js';
import { cancelarEventoCalendar } from '../_calendar.js';
import { enviarAvisoAdminCita, enviarCancelacionCita } from '../_email_cursos.js';

export default async function handler(req, res) {
  // 1. Verificamos autenticación
  const user = requireAuth(req, res);
  if (!user) {
    return json(res, 401, { error: 'No autenticado. Inicia sesión.' });
  }

  // 2. Verificamos método
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Método no permitido' });
  }

  const { cita_id } = req.body || {};
  if (!cita_id) {
    return json(res, 400, { error: 'Falta el ID de la cita.' });
  }

  try {
    // 3. Buscamos la cita y el nombre del usuario para el aviso
    const citas = await query(
      `SELECT c.disponibilidad_id, c.google_evento_id, u.id AS usuario_id,
              u.nombre_usuario, u.email, d.fecha, d.hora_inicio
       FROM citas c 
       JOIN usuarios u ON c.usuario_id = u.id 
       JOIN disponibilidad d ON d.id = c.disponibilidad_id
       WHERE c.id = ? AND c.usuario_id = ? AND c.estado = "confirmada"`,
      [cita_id, user.id]
    );
    
    if (citas.length === 0) {
      return json(res, 404, { error: 'Cita no encontrada o ya está cancelada.' });
    }

    const { disponibilidad_id, google_evento_id, usuario_id, nombre_usuario, email, fecha, hora_inicio } = citas[0];

    // 4. Intentamos cancelar en Google Calendar
    if (google_evento_id) {
      try {
        await cancelarEventoCalendar(google_evento_id);
      } catch (googleErr) {
        console.error('[cancelar] Error al borrar de Google:', googleErr.message);
      }
    }

    // 5. Liberamos el hueco de disponibilidad
    await query('UPDATE disponibilidad SET ocupado = 0 WHERE id = ?', [disponibilidad_id]);

    // 6. Marcamos la cita como cancelada
    await query('UPDATE citas SET estado = "cancelada" WHERE id = ?', [cita_id]);

    // La cancelación queda registrada aunque falle el servicio de correo.
    try {
      await enviarCancelacionCita({
        usuarioId: usuario_id, citaId: cita_id, email, nombre: nombre_usuario,
        fecha, hora: hora_inicio,
      });
      await enviarAvisoAdminCita({
        usuarioId: usuario_id, citaId: cita_id, usuario: nombre_usuario, email,
        fecha, hora: hora_inicio, accion: 'cita cancelada por el usuario',
      });
    } catch (emailErr) {
      console.error('[cancelar] No se pudo encolar el email de cancelación:', emailErr.message);
    }

    return json(res, 200, { mensaje: 'Cita cancelada correctamente.' });

  } catch (err) {
    console.error('[cancelar]', err.message);
    return json(res, 500, { error: 'Error al cancelar la cita: ' + err.message });
  }
};
