import nodemailer from 'nodemailer';
import { query } from './_db.js';
import { getAppUrl } from './stripe/_helpers.js';

let transportadorCache;
let logoOrientaCache;

function escapar(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function transportador() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Faltan EMAIL_USER o EMAIL_PASS para enviar correos del campus.');
  }
  if (!transportadorCache) transportadorCache = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transportadorCache;
}

function plantilla(titulo, contenido, appUrl) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f7f4ed;font-family:Arial,sans-serif;color:#433a32">
    <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e8e1d6">
      <div style="background:#526b58;color:#fff;padding:24px 32px;text-align:center"><img src="{{ORIENTA_LOGO}}" alt="Orienta Psicología" width="76" height="76" style="display:block;width:76px;height:76px;object-fit:contain;margin:0 auto 12px"><p style="margin:0;font-size:13px;letter-spacing:2px;font-weight:bold">ORIENTA PSICOLOGÍA</p><h1 style="margin:14px 0 0;font-size:25px">${escapar(titulo)}</h1></div>
      <div style="padding:28px 32px;line-height:1.65">${contenido}
        <p style="margin-top:28px"><a href="${escapar(appUrl)}/campus" style="display:inline-block;background:#526b58;color:#fff;text-decoration:none;padding:12px 20px;border-radius:24px;font-weight:bold">Ir a Campus Orienta</a></p>
        <hr style="margin:28px 0 16px;border:0;border-top:1px solid #e8e1d6">
        <p style="margin:0;color:#62513e;font-size:12px;font-weight:bold">Antonio Cantillo Rueda · Psicólogo colegiado COPAO nº AO14923</p>
        <p style="margin:4px 0;color:#777;font-size:12px">Orienta Psicología · <a href="mailto:info@orientapsicologia.es" style="color:#526b58">info@orientapsicologia.es</a></p>
        <p style="margin:4px 0;color:#777;font-size:12px"><a href="https://www.orientapsicologia.es" style="color:#526b58">www.orientapsicologia.es</a> · <a href="https://wa.me/34678766839" style="color:#526b58">+34 678 766 839</a></p>
        <p style="margin-top:14px;color:#777;font-size:11px">Recibes este mensaje por tu cuenta, inscripción o cita en Orienta Psicología.</p>
      </div>
    </div></body></html>`;
}

async function obtenerLogo(appUrl) {
  if (logoOrientaCache) return logoOrientaCache;
  try {
    const response = await fetch(`${appUrl}/orienta-icon.png`);
    if (!response.ok) return null;
    logoOrientaCache = Buffer.from(await response.arrayBuffer());
    return logoOrientaCache;
  } catch {
    return null;
  }
}

async function procesarTrabajo(id) {
  const claim = await query(
    `UPDATE curso_notificaciones
     SET estado = 'procesando', intentos = intentos + 1, error = NULL
     WHERE id = ? AND (
       estado IN ('pendiente', 'fallida')
       OR (estado = 'procesando' AND fecha_actualizacion < DATE_SUB(NOW(), INTERVAL 15 MINUTE))
     )`,
    [id]
  );
  if (claim.affectedRows !== 1) return false;

  const [job] = await query(
    'SELECT id, email_destino, asunto, contenido_html FROM curso_notificaciones WHERE id = ?',
    [id]
  );
  try {
    const appUrl = getAppUrl();
    const logo = await obtenerLogo(appUrl);
    await transportador().sendMail({
      from: `"Orienta Psicología" <${process.env.EMAIL_USER}>`,
      to: job.email_destino,
      subject: job.asunto,
      html: job.contenido_html.replaceAll('{{ORIENTA_LOGO}}', logo ? 'cid:logo-orienta' : `${appUrl}/orienta-icon.png`),
      text: `${job.asunto}. Accede a tu campus: ${appUrl}/campus`,
      ...(logo ? { attachments: [{ filename: 'orienta-icon.png', content: logo, contentType: 'image/png', cid: 'logo-orienta' }] } : {}),
    });
    await query(
      `UPDATE curso_notificaciones
       SET estado = 'enviada', fecha_envio = NOW(), email_destino = NULL,
           asunto = NULL, contenido_html = NULL, error = NULL
       WHERE id = ?`,
      [id]
    );
    return true;
  } catch (error) {
    await query(
      `UPDATE curso_notificaciones SET estado = 'fallida', error = ? WHERE id = ?`,
      [String(error.message || 'Error de correo').slice(0, 1000), id]
    );
    console.error('[campus/email] No se pudo enviar la notificación:', error.message);
    return false;
  }
}

async function encolarYEnviar({ usuarioId, cursoId, tipo, periodo, email, asunto, contenido }) {
  const appUrl = getAppUrl();
  await query(
    `INSERT IGNORE INTO curso_notificaciones
       (usuario_id, curso_id, tipo, periodo, email_destino, asunto, contenido_html, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [usuarioId, cursoId, tipo, periodo, email, asunto, plantilla(asunto, contenido, appUrl)]
  );
  const [job] = await query(
    `SELECT id FROM curso_notificaciones
     WHERE usuario_id = ? AND curso_id = ? AND tipo = ? AND periodo = ?`,
    [usuarioId, cursoId, tipo, periodo]
  );
  if (!job) throw new Error('No se pudo registrar el correo del curso.');
  return procesarTrabajo(job.id);
}

function fechaEspanola(value) {
  if (!value) return '—';
  const date = String(value).slice(0, 10).split('-');
  return date.length === 3 ? `${date[2]}/${date[1]}/${date[0]}` : String(value);
}

export async function enviarConfirmacionCurso({ usuarioId, cursoId, email, nombre, curso, periodo, fechaFin = null }) {
  const [[resumen], pendientes] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN COALESCE(cp.completado, 0) = 1 THEN 1 ELSE 0 END) AS completados
       FROM curso_contenidos cc
       LEFT JOIN curso_progreso cp ON cp.contenido_id = cc.id AND cp.usuario_id = ?
       WHERE cc.curso_id = ? AND cc.publicado = 1 AND cc.obligatorio = 1`,
      [usuarioId, cursoId]
    ),
    query(
      `SELECT cc.tema, cc.titulo, cc.tipo
       FROM curso_contenidos cc
       LEFT JOIN curso_progreso cp ON cp.contenido_id = cc.id AND cp.usuario_id = ?
       WHERE cc.curso_id = ? AND cc.publicado = 1
         AND COALESCE(cp.completado, 0) <> 1
       ORDER BY cc.orden, cc.id`,
      [usuarioId, cursoId]
    ),
  ]);
  const total = Number(resumen?.total) || 0;
  const completados = Number(resumen?.completados) || 0;
  const porcentaje = total ? Math.round((completados / total) * 100) : 0;
  const lista = pendientes.map((item) => `<li style="margin:8px 0"><strong>${escapar(item.titulo)}</strong>${item.tema ? ` · ${escapar(item.tema)}` : ''}${item.tipo ? ` <span style="color:#777">(${escapar(item.tipo)})</span>` : ''}</li>`).join('');
  const contenido = `<p>Hola ${escapar(nombre)}, tu inscripción a <strong>${escapar(curso.titulo)}</strong> está confirmada.</p>
    <p>Tu progreso actual es <strong>${porcentaje}%</strong>. Te queda este contenido:</p>
    ${lista ? `<ul>${lista}</ul>` : '<p>El temario estará disponible pronto en el campus.</p>'}
    <p>Ya puedes continuar tu formación desde Campus Orienta.${fechaFin ? ` Tu membresía está pagada hasta el <strong>${fechaEspanola(fechaFin)}</strong>.` : ''}</p>`;
  return encolarYEnviar({
    usuarioId, cursoId, tipo: 'inscripcion', periodo, email,
    asunto: `Inscripción confirmada: ${curso.titulo}`, contenido,
  });
}

export async function enviarBienvenidaUsuario({ usuarioId, email, nombre }) {
  const contenido = `<p>Hola ${escapar(nombre)}, tu cuenta de Orienta Psicología ya está creada.</p>
    <p>Desde Campus Orienta puedes explorar talleres gratuitos y cursos de pago, consultar tus actividades y seguir tu progreso.</p>
    <p>Cuando te inscribas en una formación, recibirás por correo la información necesaria para empezar.</p>`;
  return encolarYEnviar({
    usuarioId, cursoId: 0, tipo: 'bienvenida', periodo: `cuenta-${usuarioId}`, email,
    asunto: 'Te damos la bienvenida a Orienta Psicología', contenido,
  });
}

export async function enviarConfirmacionCita({ usuarioId, citaId, email, nombre, fecha, hora, modalidad, sede, enlace }) {
  const contenido = `<p>Hola ${escapar(nombre)}, tu cita con Orienta Psicología está reservada.</p>
    <div style="padding:16px;border-radius:12px;background:#f7f4ed"><p><strong>Fecha:</strong> ${escapar(fechaEspanola(fecha))}</p>
    <p><strong>Hora:</strong> ${escapar(String(hora || '').slice(0, 5))} (hora peninsular española)</p>
    <p><strong>Modalidad:</strong> ${escapar(modalidad || 'Por confirmar')}</p>${sede ? `<p><strong>Ubicación:</strong> ${escapar(sede)}</p>` : ''}
    ${enlace ? `<p><strong>Videollamada:</strong> <a href="${escapar(enlace)}">Abrir enlace seguro</a></p>` : '<p>Si es una sesión online, te enviaremos el enlace cuando esté disponible.</p>'}</div>
    <p>Te enviaremos un recordatorio el día anterior.</p>`;
  return encolarYEnviar({
    usuarioId, cursoId: 0, tipo: 'confirmacion_cita', periodo: `cita-${citaId}`, email,
    asunto: `Cita reservada para el ${fechaEspanola(fecha)}`, contenido,
  });
}

export async function enviarActualizacionCita({ usuarioId, citaId, email, nombre, fecha, hora, modalidad, sede, enlace }) {
  const contenido = `<p>Hola ${escapar(nombre)}, se ha actualizado la información de tu cita con Orienta Psicología.</p>
    <div style="padding:16px;border-radius:12px;background:#f7f4ed"><p><strong>Fecha:</strong> ${escapar(fechaEspanola(fecha))}</p>
    <p><strong>Hora:</strong> ${escapar(String(hora || '').slice(0, 5))} (hora peninsular española)</p>
    <p><strong>Modalidad:</strong> ${escapar(modalidad || 'Por confirmar')}</p>${sede ? `<p><strong>Ubicación:</strong> ${escapar(sede)}</p>` : ''}
    ${enlace ? `<p><strong>Videollamada:</strong> <a href="${escapar(enlace)}">Abrir enlace seguro</a></p>` : ''}</div>`;
  return encolarYEnviar({
    usuarioId, cursoId: 0, tipo: 'actualizacion_cita', periodo: `cita-${citaId}-${Date.now()}`, email,
    asunto: 'Se ha actualizado la información de tu cita', contenido,
  });
}

export async function enviarRecordatorioCita({ usuarioId, citaId, email, nombre, fecha, hora, modalidad, sede, enlace }) {
  const contenido = `<p>Hola ${escapar(nombre)}, te recordamos que mañana tienes una cita con Orienta Psicología.</p>
    <div style="padding:16px;border-radius:12px;background:#f7f4ed"><p><strong>Fecha:</strong> ${escapar(fechaEspanola(fecha))}</p>
    <p><strong>Hora:</strong> ${escapar(String(hora || '').slice(0, 5))} (hora peninsular española)</p>
    <p><strong>Modalidad:</strong> ${escapar(modalidad || 'Por confirmar')}</p>${sede ? `<p><strong>Ubicación:</strong> ${escapar(sede)}</p>` : ''}
    ${enlace ? `<p><strong>Videollamada:</strong> <a href="${escapar(enlace)}">Unirme a la sesión</a></p>` : ''}</div>
    <p>Si necesitas ayuda para cambiar la cita, escríbenos a <a href="mailto:info@orientapsicologia.es">info@orientapsicologia.es</a>.</p>`;
  return encolarYEnviar({
    usuarioId, cursoId: 0, tipo: 'recordatorio_cita', periodo: `cita-${citaId}-${String(fecha).slice(0, 10)}`, email,
    asunto: `Recordatorio: mañana tienes una cita con Orienta`, contenido,
  });
}

export async function enviarCancelacionCita({ usuarioId, citaId, email, nombre, fecha, hora }) {
  const contenido = `<p>Hola ${escapar(nombre)}, te confirmamos que la cita prevista para el ${escapar(fechaEspanola(fecha))} a las ${escapar(String(hora || '').slice(0, 5))} ha sido cancelada.</p>
    <p>Si quieres reservar otra fecha, puedes hacerlo desde el apartado de Consultas o escribirnos a <a href="mailto:info@orientapsicologia.es">info@orientapsicologia.es</a>.</p>`;
  return encolarYEnviar({
    usuarioId, cursoId: 0, tipo: 'cancelacion_cita', periodo: `cita-${citaId}`, email,
    asunto: 'Tu cita con Orienta Psicología se ha cancelado', contenido,
  });
}

export async function enviarAvisoAdminCita({ usuarioId, citaId, usuario, email, fecha, hora, accion }) {
  const contenido = `<p>Se ha producido una actualización en una cita de Orienta Psicología.</p>
    <ul><li><strong>Acción:</strong> ${escapar(accion)}</li><li><strong>Usuario:</strong> ${escapar(usuario)}</li>
    <li><strong>Correo:</strong> ${escapar(email)}</li><li><strong>Fecha:</strong> ${escapar(fechaEspanola(fecha))} · ${escapar(String(hora || '').slice(0, 5))}</li>
    <li><strong>Referencia:</strong> ${escapar(citaId)}</li></ul>`;
  const destino = process.env.CONTACT_EMAIL || 'info@orientapsicologia.es';
  return encolarYEnviar({
    usuarioId, cursoId: 0, tipo: `aviso_admin_${accion}`, periodo: `cita-${citaId}-${Date.now()}`,
    email: destino, asunto: `Orienta Psicología · ${accion} de cita`, contenido,
  });
}

export async function enviarCertificadoCurso({ usuarioId, cursoId, email, nombre, curso, periodo, fechaFin }) {
  const contenido = `<p>¡Enhorabuena, ${escapar(nombre)}! Has completado satisfactoriamente <strong>${escapar(curso.titulo)}</strong>.</p>
    <section style="margin:28px 0;padding:28px 20px;border:5px double #cfad62;text-align:center;background:#fffdf7">
      <p style="letter-spacing:3px;font-size:11px;color:#526b58">ORIENTA PSICOLOGÍA</p>
      <h2 style="font-family:Georgia,serif;color:#62513e">Certificado de aprovechamiento</h2>
      <p>Se certifica que</p><p style="font-size:22px;font-family:Georgia,serif;color:#526b58"><strong>${escapar(nombre)}</strong></p>
      <p>ha completado satisfactoriamente la formación</p><p style="font-size:19px"><strong>${escapar(curso.titulo)}</strong></p>
      <p>Duración: <strong>${escapar(curso.duracion_horas || '—')} horas</strong></p>
      <p>Finalizado el <strong>${fechaEspanola(fechaFin)}</strong></p>
      <p style="margin-top:32px;font-family:Georgia,serif;font-style:italic">Antonio Cantillo Rueda</p><p style="font-size:12px">Dirección · Orienta Psicología</p>
    </section>
    <p>También puedes consultar e imprimir tu certificado en <a href="${escapar(getAppUrl())}/informes">Informes</a>.</p>
    <p>Hay más cursos disponibles en el catálogo para que sigas aprendiendo.</p>`;
  return encolarYEnviar({
    usuarioId, cursoId, tipo: 'finalizacion', periodo, email,
    asunto: `¡Enhorabuena! Has completado ${curso.titulo}`, contenido,
  });
}

export async function enviarRecordatorioSemanal({ usuarioId, cursoId, email, nombre, curso, periodo, progreso, pendientes }) {
  const lista = pendientes.map((item) => `<li style="margin:8px 0"><strong>${escapar(item.titulo)}</strong>${item.tema ? ` · ${escapar(item.tema)}` : ''}${item.tipo ? ` <span style="color:#777">(${escapar(item.tipo)})</span>` : ''}</li>`).join('');
  const contenido = `<p>Hola ${escapar(nombre)}, esta semana te acompañamos a continuar con <strong>${escapar(curso.titulo)}</strong>.</p>
    <p>Llevas completado el <strong>${progreso}%</strong>. Te quedan estas actividades:</p>
    <ul>${lista}</ul><p>Entra al campus para seguir a tu ritmo.</p>`;
  return encolarYEnviar({
    usuarioId, cursoId, tipo: 'recordatorio_semanal', periodo, email,
    asunto: `Tu avance en ${curso.titulo}: actividades pendientes`, contenido,
  });
}

export async function procesarCorreosPendientes(limit = 100) {
  const trabajos = await query(
    `SELECT id FROM curso_notificaciones
     WHERE estado IN ('pendiente', 'fallida')
        OR (estado = 'procesando' AND fecha_actualizacion < DATE_SUB(NOW(), INTERVAL 15 MINUTE))
     ORDER BY fecha_creacion ASC LIMIT ?`,
    [Math.max(1, Math.min(Number(limit) || 100, 250))]
  );
  let enviados = 0;
  for (const trabajo of trabajos) if (await procesarTrabajo(trabajo.id)) enviados += 1;
  return { revisados: trabajos.length, enviados };
}

export function escaparHtml(value) {
  return escapar(value);
}
