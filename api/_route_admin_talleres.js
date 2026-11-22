import { json, query, requireAdmin } from './_db.js';

const TIPOS_ACCESO = new Set(['gratis', 'pago', 'membresia']);

function normalizarCurso(body = {}) {
  const titulo = String(body.titulo || '').trim();
  const tipoAcceso = String(body.tipo_acceso || 'gratis');
  const precio = Number(body.precio || 0);
  const duracion = body.duracion_horas === '' || body.duracion_horas == null
    ? null
    : Number(body.duracion_horas);
  const moneda = String(body.moneda || 'EUR').trim().toUpperCase();

  if (!titulo) throw new Error('Escribe el título del curso.');
  if (!TIPOS_ACCESO.has(tipoAcceso)) throw new Error('El tipo de acceso no es válido.');
  if (tipoAcceso !== 'gratis' && (!Number.isFinite(precio) || precio <= 0)) {
    throw new Error('Indica un precio mayor que cero para los cursos de pago.');
  }
  if (!/^[A-Z]{3}$/.test(moneda)) throw new Error('La moneda debe tener un código de tres letras, por ejemplo EUR.');
  if (duracion !== null && (!Number.isFinite(duracion) || duracion < 0 || duracion > 10000)) {
    throw new Error('La duración debe ser un número válido de horas.');
  }

  return {
    titulo: titulo.slice(0, 200),
    descripcion: String(body.descripcion || '').trim(),
    categoria: String(body.categoria || '').trim().slice(0, 120) || null,
    tipo_acceso: tipoAcceso,
    precio: tipoAcceso === 'gratis' ? 0 : Number(precio.toFixed(2)),
    moneda,
    duracion_horas: duracion,
    publicado: body.publicado ? 1 : 0,
  };
}

function enteroPositivo(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'GET') {
      const cursos = await query(
        `SELECT c.id, c.titulo, c.descripcion, c.categoria, c.tipo_acceso,
                c.precio, c.moneda, c.duracion_horas, c.publicado,
                c.fecha_creacion, c.fecha_actualizacion
         FROM cursos c
         ORDER BY c.fecha_actualizacion DESC, c.id DESC`
      );
      return json(res, 200, { cursos });
    }

    if (req.method === 'POST') {
      const curso = normalizarCurso(req.body);
      const result = await query(
        `INSERT INTO cursos
           (titulo, descripcion, categoria, tipo_acceso, precio, moneda,
            duracion_horas, publicado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [curso.titulo, curso.descripcion, curso.categoria, curso.tipo_acceso,
          curso.precio, curso.moneda, curso.duracion_horas, curso.publicado]
      );
      return json(res, 201, { ok: true, curso_id: result.insertId });
    }

    const cursoId = enteroPositivo(req.body?.curso_id ?? req.query?.curso_id);
    if (!cursoId) return json(res, 400, { error: 'Falta el ID válido del curso.' });

    if (req.method === 'PUT') {
      const curso = normalizarCurso(req.body);
      await query(
        `UPDATE cursos
         SET titulo = ?, descripcion = ?, categoria = ?, tipo_acceso = ?,
             precio = ?, moneda = ?, duracion_horas = ?, publicado = ?,
             fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [curso.titulo, curso.descripcion, curso.categoria, curso.tipo_acceso,
          curso.precio, curso.moneda, curso.duracion_horas, curso.publicado, cursoId]
      );
      const [existente] = await query('SELECT id FROM cursos WHERE id = ?', [cursoId]);
      if (!existente) return json(res, 404, { error: 'No se encontró ese curso.' });
      return json(res, 200, { ok: true });
    }

    if (req.method === 'DELETE') {
      await query('UPDATE cursos SET publicado = 0 WHERE id = ?', [cursoId]);
      const [existente] = await query('SELECT id FROM cursos WHERE id = ?', [cursoId]);
      if (!existente) return json(res, 404, { error: 'No se encontró ese curso.' });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    const status = /Escribe|tipo de acceso|precio|moneda|duración|ID válido/.test(error.message) ? 400 : 500;
    console.error('[admin/talleres]', error.message);
    return json(res, status, { error: status === 500 ? 'No se pudo guardar el curso.' : error.message });
  }
}
