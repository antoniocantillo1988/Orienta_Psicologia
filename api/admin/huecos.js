// api/admin/huecos.js
import { json, requireAdmin } from '../_db.js';
import { pool } from '../../lib/db.js';

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return; // requireAdmin ya ha respondido (401/403)

    // POST - crear hueco
    if (req.method === 'POST') {
      const { fecha, hora_inicio, hora_fin, modalidad, sede_cita } = req.body || {};

      // 1. Validar que existan todos los campos obligatorios
      if (!fecha || !hora_inicio || !hora_fin || !modalidad || !sede_cita) {
        return json(res, 400, { error: 'Todos los campos son obligatorios.' });
      }

      // 2. Validar orden de horas
      if (hora_fin <= hora_inicio) {
        return json(res, 400, { error: 'La hora de fin debe ser posterior a la de inicio.' });
      }

      // 3. Validar modalidad y sede permitidas
      if (!['online', 'domicilio'].includes(modalidad) ||
          !['malaga', 'cordoba'].includes(sede_cita)) {
        return json(res, 400, { error: 'Modalidad o sede no válidas.' });
      }

      // 4. Inserción segura con PostgreSQL
      const { rows } = await pool.query(
        `INSERT INTO disponibilidad (fecha, hora_inicio, hora_fin, modalidad, sede_cita, ocupado)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [fecha, hora_inicio, hora_fin, modalidad, sede_cita]
      );

      return json(res, 201, { hueco: rows[0] });
    }

    // DELETE - borrar hueco libre
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      
      if (!id) {
        return json(res, 400, { error: 'Se requiere el ID del hueco a eliminar.' });
      }

      await pool.query(
        'DELETE FROM disponibilidad WHERE id = $1 AND ocupado = false', 
        [id]
      );
      
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Método no permitido' });
  } catch (err) {
    console.error('[admin/huecos]', err.message);
    return json(res, 500, { error: err.message });
  }
}