// api/admin/huecos.js
import { query, json, requireAdmin } from '../_db.js';

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return; // requireAdmin ya ha respondido (401/403)

    // POST - crear hueco
    if (req.method === 'POST') {
      const { fecha, hora_inicio, hora_fin, modalidad, sede_cita } = req.body || {};

      // 1. Campos obligatorios
      if (!fecha || !hora_inicio || !hora_fin || !modalidad || !sede_cita) {
        return json(res, 400, { error: 'Todos los campos son obligatorios.' });
      }

      // 2. Orden de horas
      if (hora_fin <= hora_inicio) {
        return json(res, 400, { error: 'La hora de fin debe ser posterior a la de inicio.' });
      }

      // 3. Valores permitidos (según el ENUM de tu base de datos)
      if (!['online', 'presencial'].includes(modalidad) ||
          !['malaga', 'cordoba'].includes(sede_cita)) {
        return json(res, 400, { error: 'Modalidad o sede no válidas.' });
      }

      // 4. Inserción (MySQL usa "?")
      await query(
        `INSERT INTO disponibilidad (fecha, hora_inicio, hora_fin, modalidad, sede_cita, ocupado)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [fecha, hora_inicio, hora_fin, modalidad, sede_cita]
      );

      return json(res, 201, { ok: true });
    }

    // DELETE - borrar hueco libre
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) {
        return json(res, 400, { error: 'Se requiere el ID del hueco a eliminar.' });
      }

      await query('DELETE FROM disponibilidad WHERE id = ? AND ocupado = 0', [id]);
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Método no permitido' });
  } catch (err) {
    console.error('[admin/huecos]', err.message);
    return json(res, 500, { error: err.message });
  }
}