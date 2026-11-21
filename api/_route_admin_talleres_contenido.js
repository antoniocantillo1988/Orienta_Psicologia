import { json, query, requireAdmin } from './_db.js';

const TIPOS = new Set(['video', 'presentacion', 'pdf', 'cuestionario', 'tarea']);

function enteroPositivo(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

async function recalcularFechaFinalizacion(cursoId) {
  await query(
    `UPDATE inscripciones i
     SET fecha_finalizacion = CASE
       WHEN EXISTS (
         SELECT 1 FROM curso_contenidos cc
         WHERE cc.curso_id = i.curso_id AND cc.publicado = 1 AND cc.obligatorio = 1
       ) AND NOT EXISTS (
         SELECT 1
         FROM curso_contenidos cc
         LEFT JOIN curso_progreso cp
           ON cp.contenido_id = cc.id AND cp.usuario_id = i.usuario_id
         WHERE cc.curso_id = i.curso_id AND cc.publicado = 1 AND cc.obligatorio = 1
           AND COALESCE(cp.completado, 0) <> 1
       ) THEN COALESCE(i.fecha_finalizacion, NOW())
       ELSE NULL
     END
     WHERE i.curso_id = ? AND i.estado = 'activa'`,
    [cursoId]
  );
}

function validarEnlace(tipo, enlace) {
  if (tipo === 'tarea' && !enlace) return null;
  if (!enlace) throw new Error('Añade el enlace del contenido.');

  let enlaceLimpio = enlace.trim();
  if (tipo === 'cuestionario') {
    // Microsoft Forms ofrece un bloque iframe; solo guardamos su atributo src,
    // nunca el HTML suministrado por el navegador.
    const iframeSrc = enlaceLimpio.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (iframeSrc) enlaceLimpio = iframeSrc[2].trim();
  }

  let parsed;
  try {
    parsed = new URL(enlaceLimpio);
  } catch {
    throw new Error('Pega el enlace de Microsoft Forms o su código de inserción.');
  }
  if (parsed.protocol !== 'https:') throw new Error('El enlace debe comenzar por https://.');

  const host = parsed.hostname.toLowerCase();
  if (tipo === 'video' && !['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
    throw new Error('Para vídeos, pega un enlace de YouTube.');
  }
  const dominioFormsValido = [
    'forms.office.com',
    'forms.microsoft.com',
    'forms.office365.us',
    'forms.cloud.microsoft',
  ].some((dominio) => host === dominio || host.endsWith(`.${dominio}`));
  if (tipo === 'cuestionario' && !dominioFormsValido) {
    throw new Error('Para cuestionarios, pega un enlace de Microsoft Forms.');
  }
  if (tipo === 'cuestionario') parsed.searchParams.set('embed', 'true');
  return parsed.toString();
}

function normalizar(body = {}) {
  const cursoId = enteroPositivo(body.curso_id);
  const titulo = String(body.titulo || '').trim();
  const tema = String(body.tema || '').trim();
  const tipo = String(body.tipo || 'video');
  const enlace = validarEnlace(tipo, String(body.enlace || '').trim());
  const orden = Number(body.orden || 0);

  if (!cursoId) throw new Error('Selecciona un curso válido.');
  if (!titulo) throw new Error('Escribe un título para el contenido.');
  if (!tema) throw new Error('Escribe el nombre del tema.');
  if (!TIPOS.has(tipo)) throw new Error('El tipo de contenido no es válido.');
  if (!Number.isSafeInteger(orden) || orden < 0) throw new Error('El orden debe ser un número igual o mayor que cero.');

  const instrucciones = String(body.instrucciones || '').trim();
  if (tipo === 'tarea' && !instrucciones) throw new Error('Añade las instrucciones de la tarea.');

  return {
    curso_id: cursoId,
    tema: tema.slice(0, 180),
    titulo: titulo.slice(0, 200),
    tipo,
    enlace,
    instrucciones: instrucciones || null,
    orden,
    obligatorio: body.obligatorio === false || body.obligatorio === 0 ? 0 : 1,
    publicado: body.publicado === false || body.publicado === 0 ? 0 : 1,
  };
}

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'GET') {
      const cursoId = enteroPositivo(req.query?.curso_id);
      if (!cursoId) return json(res, 400, { error: 'Falta el ID válido del curso.' });
      const contenidos = await query(
        `SELECT id, curso_id, tema, titulo, tipo, enlace, instrucciones,
                orden, obligatorio, publicado, fecha_creacion
         FROM curso_contenidos
         WHERE curso_id = ?
         ORDER BY orden ASC, id ASC`,
        [cursoId]
      );
      return json(res, 200, { contenidos });
    }

    if (req.method === 'POST') {
      const item = normalizar(req.body);
      const [curso] = await query('SELECT id FROM cursos WHERE id = ?', [item.curso_id]);
      if (!curso) return json(res, 404, { error: 'No se encontró ese curso.' });
      const result = await query(
        `INSERT INTO curso_contenidos
           (curso_id, tema, titulo, tipo, enlace, instrucciones, orden, obligatorio, publicado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.curso_id, item.tema, item.titulo, item.tipo, item.enlace,
          item.instrucciones, item.orden, item.obligatorio, item.publicado]
      );
      await recalcularFechaFinalizacion(item.curso_id);
      return json(res, 201, { ok: true, contenido_id: result.insertId });
    }

    const contenidoId = enteroPositivo(req.body?.contenido_id ?? req.query?.contenido_id);
    if (!contenidoId) return json(res, 400, { error: 'Falta el ID válido del contenido.' });

    if (req.method === 'PUT') {
      const item = normalizar(req.body);
      const [anterior] = await query('SELECT curso_id FROM curso_contenidos WHERE id = ?', [contenidoId]);
      if (!anterior) return json(res, 404, { error: 'No se encontró ese contenido.' });
      await query(
        `UPDATE curso_contenidos
         SET curso_id = ?, tema = ?, titulo = ?, tipo = ?, enlace = ?,
             instrucciones = ?, orden = ?, obligatorio = ?, publicado = ?
         WHERE id = ?`,
        [item.curso_id, item.tema, item.titulo, item.tipo, item.enlace,
          item.instrucciones, item.orden, item.obligatorio, item.publicado, contenidoId]
      );
      const [existente] = await query('SELECT id FROM curso_contenidos WHERE id = ?', [contenidoId]);
      if (!existente) return json(res, 404, { error: 'No se encontró ese contenido.' });
      await recalcularFechaFinalizacion(anterior.curso_id);
      if (Number(anterior.curso_id) !== Number(item.curso_id)) {
        await recalcularFechaFinalizacion(item.curso_id);
      }
      return json(res, 200, { ok: true });
    }

    if (req.method === 'DELETE') {
      const [anterior] = await query('SELECT curso_id FROM curso_contenidos WHERE id = ?', [contenidoId]);
      if (!anterior) return json(res, 404, { error: 'No se encontró ese contenido.' });
      await query('UPDATE curso_contenidos SET publicado = 0 WHERE id = ?', [contenidoId]);
      await recalcularFechaFinalizacion(anterior.curso_id);
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    const status = /Selecciona|título|tema|tipo de contenido|enlace|YouTube|Microsoft Forms|instrucciones|orden|ID válido/.test(error.message) ? 400 : 500;
    console.error('[admin/talleres/contenido]', error.message);
    return json(res, status, { error: status === 500 ? 'No se pudo guardar el contenido.' : error.message });
  }
}
