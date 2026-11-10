// npm install nodemailer node-cron
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const pool = require('./db');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function enviarRecordatorios() {
  const { rows } = await pool.query(
    `SELECT c.id, c.enlace_videollamada, u.email, u.nombre_usuario,
            d.fecha, d.hora_inicio, d.sede_cita
     FROM citas c
     JOIN disponibilidad d ON d.id = c.disponibilidad_id
     JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.estado = 'confirmada'
       AND d.modalidad = 'online'
       AND c.recordatorio_enviado = false
       AND c.enlace_videollamada IS NOT NULL
       AND d.fecha = CURRENT_DATE + INTERVAL '1 day'`
  );

  for (const c of rows) {
    const hora = c.hora_inicio.slice(0, 5);
    const sede = c.sede_cita === 'malaga' ? 'Málaga' : 'Córdoba';

    try {
      await transporter.sendMail({
        from: `"Antonio Cantillo · Orienta" <${process.env.SMTP_USER}>`,
        to: c.email,
        subject: `Recordatorio: tu consulta es mañana a las ${hora}`,
        html: `
          <p>Hola ${c.nombre_usuario || ''},</p>
          <p>Te recuerdo que mañana, <strong>${c.fecha}</strong>, a las <strong>${hora}</strong>
          tienes tu sesión online (sede ${sede}).</p>
          <p><strong>Enlace de la reunión:</strong>
            <a href="${c.enlace_videollamada}">${c.enlace_videollamada}</a></p>
          <p>Si necesitas cambiar la cita, responde a este correo.</p>
        `,
      });
      
    } catch (err) {
      console.error(`Error enviando recordatorio cita ${c.id}:`, err);
    }
  }
}

// Todos los días a las 18:00
cron.schedule('0 18 * * *', enviarRecordatorios, { timezone: 'Europe/Madrid' });

module.exports = { enviarRecordatorios };
