import { json, query, requireAdmin } from './_db.js';
import { getDriveFileId } from './_materiales_drive.js';

function entero(value, { nullable = false } = {}) {
  if (nullable && (value === '' || value == null)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function orden(value) {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number) || number < 0 || number > 100000) {
    throw new Error('El orden debe ser un número entero entre 0 y 100000.');
  }
  return number;
}

function categoria(body = {}) {
  const nombre = String(body.nombre || '').trim();
  if (!nombre) throw new Error('Escribe el nombre de la categoría.');
  return {
    nombre: nombre.slice(0, 120),
    descripcion: String(body.descripcion || '').trim().slice(0, 500) || null,
    orden: orden(body.orden),
  };
}

function material(body = {}) {
  const titulo = String(body.titulo || '').trim();
  const enlace = String(body.enlace_drive || '').trim();
  const fileId = getDriveFileId(enlace);
  const categoriaId = entero(body.categoria_id, { nullable: true });
  if (!titulo) throw new Error('Escribe el título del material.');
  if (!fileId) throw new Error('Introduce un enlace HTTPS válido de un archivo de Google Drive.');
  if (body.categoria_id !== '' && body.categoria_id != null && categoriaId === null) {
    throw new Error('Selecciona una categoría válida.');
  }
  return {
    titulo: titulo.slice(0, 200),
    descripcion: String(body.descripcion || '').trim().slice(0, 1000) || null,
    enlace_drive: enlace.slice(0, 2048),
    categoria_id: categoriaId,
    orden: orden(body.orden),
    publicado: body.publicado ? 1 : 0,
  };
}

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'GET') {
      const [categorias, materiales] = await Promise.all([
        query('SELECT id, nombre, descripcion, orden FROM material_categorias ORDER BY orden, nombre'),
        query(
          `SELECT m.id, m.categoria_id, m.titulo, m.descripcion, m.enlace_drive,
                  m.orden, m.publicado, c.nombre AS categoria
           FROM materiales m
           LEFT JOIN material_categorias c ON c.id = m.categoria_id
           ORDER BY c.orden, c.nombre, m.orden, m.titulo`
        ),
      ]);
      return json(res, 200, { categorias, materiales });
    }

    const body = req.body || {};
    const tipo = String(body.tipo || 'material');

    if (req.method === 'POST') {
      if (tipo === 'categoria') {
        const data = categoria(body);
        const result = await query(
          'INSERT INTO material_categorias (nombre, descripcion, orden) VALUES (?, ?, ?)',
          [data.nombre, data.descripcion, data.orden]
        );
        return json(res, 201, { ok: true, id: result.insertId });
      }
      if (tipo === 'material') {
        const data = material(body);
        if (data.categoria_id !== null) {
          const [exists] = await query('SELECT id FROM material_categorias WHERE id = ?', [data.categoria_id]);
          if (!exists) return json(res, 400, { error: 'La categoría seleccionada ya no existe.' });
        }
        const result = await query(
          `INSERT INTO materiales
             (categoria_id, titulo, descripcion, enlace_drive, orden, publicado)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [data.categoria_id, data.titulo, data.descripcion, data.enlace_drive, data.orden, data.publicado]
        );
        return json(res, 201, { ok: true, id: result.insertId });
      }
      return json(res, 400, { error: 'Tipo de elemento no válido.' });
    }

    const id = entero(body.id ?? req.query?.id);
    if (!id) return json(res, 400, { error: 'Falta un identificador válido.' });

    if (req.method === 'PUT') {
      if (tipo === 'categoria') {
        const data = categoria(body);
        const result = await query(
          `UPDATE material_categorias
           SET nombre = ?, descripcion = ?, orden = ?, fecha_actualizacion = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [data.nombre, data.descripcion, data.orden, id]
        );
        if (!result.affectedRows) return json(res, 404, { error: 'No se encontró la categoría.' });
        return json(res, 200, { ok: true });
      }
      if (tipo === 'material') {
        const data = material(body);
        if (data.categoria_id !== null) {
          const [exists] = await query('SELECT id FROM material_categorias WHERE id = ?', [data.categoria_id]);
          if (!exists) return json(res, 400, { error: 'La categoría seleccionada ya no existe.' });
        }
        const result = await query(
          `UPDATE materiales
           SET categoria_id = ?, titulo = ?, descripcion = ?, enlace_drive = ?, orden = ?,
               publicado = ?, fecha_actualizacion = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [data.categoria_id, data.titulo, data.descripcion, data.enlace_drive,
            data.orden, data.publicado, id]
        );
        if (!result.affectedRows) return json(res, 404, { error: 'No se encontró el material.' });
        return json(res, 200, { ok: true });
      }
      return json(res, 400, { error: 'Tipo de elemento no válido.' });
    }

    if (req.method === 'DELETE') {
      const table = tipo === 'categoria' ? 'material_categorias' : tipo === 'material' ? 'materiales' : null;
      if (!table) return json(res, 400, { error: 'Tipo de elemento no válido.' });
      const result = await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      if (!result.affectedRows) return json(res, 404, { error: 'No se encontró el elemento.' });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    const invalid = /Escribe|Introduce un enlace|Selecciona una categoría|orden debe|identificador válido|Tipo de elemento/.test(error.message);
    const duplicate = error.code === 'ER_DUP_ENTRY';
    const status = invalid || duplicate ? 400 : 500;
    console.error('[admin/materiales]', error.message);
    return json(res, status, {
      error: duplicate ? 'Ya existe una categoría con ese nombre.'
        : status === 500 ? 'No se pudo guardar el material. Comprueba que las tablas de materiales están creadas.'
          : error.message,
    });
  }
}
