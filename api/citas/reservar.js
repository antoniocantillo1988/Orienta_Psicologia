// api/citas/reservar.js
import { query, json, requireAuth } from '../_db.js';
import { crearEventoCalendar, cancelarEventoCalendar } from '../_calendar.js';
import nodemailer from 'nodemailer';

const HORAS_ANTELACION = 6;

// Convierte fecha ('YYYY-MM-DD') + hora ('HH:MM:SS') de Madrid a un instante real
function fechaMadridADate(fecha, hora) {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm, ss = 0] = hora.split(':').map(Number);
  const comoUTC = Date.UTC(y, m - 1, d, hh, mm, ss);

  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid', hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(comoUTC));

  const v = Object.fromEntries(partes.map((p) => [p.type, p.value]));
  const madridComoUTC = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second);
  return new Date(comoUTC - (madridComoUTC - comoUTC));
}

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return; // requireAuth ya ha respondido

  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });

  const { disponibilidad_id, motivo_consulta } = req.body || {};
  if (!disponibilidad_id) return json(res, 400, { error: 'Falta el hueco seleccionado.' });

  let google_evento_id_creado = null;

  try {
    // 1. Comprobar que el hueco sigue libre
    const huecos = await query(
      'SELECT * FROM disponibilidad WHERE id = ? AND ocupado = 0',
      [disponibilidad_id]
    );
    if (huecos.length === 0) {
      return json(res, 409, { error: 'Este hueco ya no está disponible.' });
    }
    const hueco = huecos[0];

    // 2. Validar antelación mínima de 6 horas (hora de Madrid)
    const fechaTexto = hueco.fecha instanceof Date
      ? `${hueco.fecha.getFullYear()}-${String(hueco.fecha.getMonth() + 1).padStart(2, '0')}-${String(hueco.fecha.getDate()).padStart(2, '0')}`
      : String(hueco.fecha).slice(0, 10);

    const fechaCita = fechaMadridADate(fechaTexto, hueco.hora_inicio);
    const diferenciaHoras = (fechaCita - new Date()) / (1000 * 60 * 60);

    if (diferenciaHoras < HORAS_ANTELACION) {
      return json(res, 400, {
        error: `Las reservas deben realizarse con al menos ${HORAS_ANTELACION} horas de antelación.`,
      });
    }

    // 3. Datos del usuario
    const usuarios = await query(
      'SELECT nombre_usuario, email FROM usuarios WHERE id = ?',
      [user.id]
    );
    const { nombre_usuario, email } = usuarios[0];

    // 4. Evento en Google Calendar con Meet
    const eventoGoogle = await crearEventoCalendar({
      fecha:         fechaTexto,
      hora_inicio:   hueco.hora_inicio,
      hora_fin:      hueco.hora_fin,
      nombre_usuario,
      email_usuario: email,
      motivo:        motivo_consulta || '',
    });
    google_evento_id_creado = eventoGoogle.evento_id;

    // 5. Guardar la cita
    await query(
      `INSERT INTO citas
        (usuario_id, disponibilidad_id, motivo_consulta, estado, google_evento_id, enlace_videollamada)
       VALUES (?, ?, ?, 'confirmada', ?, ?)`,
      [user.id, disponibilidad_id, motivo_consulta || '', eventoGoogle.evento_id, eventoGoogle.enlace_meet]
    );

    // 6. Marcar el hueco como ocupado
    await query('UPDATE disponibilidad SET ocupado = 1 WHERE id = ?', [disponibilidad_id]);

    // 7. Aviso por email a Antonio (si falla, la reserva sigue siendo válida)
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Sistema de Citas" <${process.env.EMAIL_USER}>`,
        to: 'antonio.es.cantillo@gmail.com',
        subject: 'Nueva reserva de cita',
        html: `
          <h1>Nueva reserva realizada</h1>
          <ul>
            <li><b>Usuario:</b> ${nombre_usuario}</li>
            <li><b>Email:</b> ${email}</li>
            <li><b>Fecha:</b> ${fechaTexto}</li>
            <li><b>Hora:</b> ${hueco.hora_inicio}</li>
            <li><b>Motivo:</b> ${motivo_consulta || 'No especificado'}</li>
          </ul>
        `,
      });
    } catch (emailErr) {
      console.error('[reservar] Error al enviar email de notificación:', emailErr.message);
    }

    return json(res, 201, {
      ok: true,
      enlace_meet: eventoGoogle.enlace_meet,
      mensaje: '✅ Cita confirmada. Recibirás un email con el enlace de Google Meet.',
    });

  } catch (err) {
    console.error('[reservar]', err.message);

    if (google_evento_id_creado) {
      await cancelarEventoCalendar(google_evento_id_creado).catch((revertErr) => {
        console.error('[reservar] Error al revertir el evento de Google:', revertErr.message);
      });
    }
    return json(res, 500, { error: 'Error al crear la cita: ' + err.message });
  }
}