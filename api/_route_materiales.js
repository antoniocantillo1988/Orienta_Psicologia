import { json, query } from './_db.js';
import { drivePreviewUrl, getDriveFileId } from './_materiales_drive.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido.' });

  const categoriaId = req.query?.categoria_id == null ? null : Number(req.query.categoria_id);
  if (categoriaId !== null && (!Number.isSafeInteger(categoriaId) || categoriaId <= 0)) {
    return json(res, 400, { error: 'La categoría indicada no es válida.' });
  }

  try {
    const categorias = await query(
      `SELECT c.id, c.nombre, c.descripcion, c.orden,
              COUNT(m.id) AS total_materiales
       FROM material_categorias c
       LEFT JOIN materiales m ON m.categoria_id = c.id AND m.publicado = 1
       GROUP BY c.id, c.nombre, c.descripcion, c.orden
       ORDER BY c.orden ASC, c.nombre ASC`
    );
    const params = [];
    let filtro = 'WHERE m.publicado = 1';
    if (categoriaId !== null) {
      filtro += ' AND m.categoria_id = ?';
      params.push(categoriaId);
    }
    const materiales = await query(
      `SELECT m.id, m.categoria_id, m.titulo, m.descripcion, m.orden, m.enlace_drive,
              c.nombre AS categoria
       FROM materiales m
       LEFT JOIN material_categorias c ON c.id = m.categoria_id
       ${filtro}
       ORDER BY c.orden ASC, c.nombre ASC, m.orden ASC, m.titulo ASC`,
      params
    );
    const items = materiales.map(({ enlace_drive, ...material }) => {
      const fileId = getDriveFileId(enlace_drive);
      return fileId ? { ...material, embed_url: drivePreviewUrl(fileId) } : null;
    });
    return json(res, 200, { categorias, materiales: items.filter(Boolean) });
  } catch (error) {
    console.error('[materiales] No se pudo cargar el catálogo:', error.message);
    return json(res, 500, { error: 'No se pudo cargar el catálogo de materiales.' });
  }
}
