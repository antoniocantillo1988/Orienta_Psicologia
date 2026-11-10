// api/admin/huecos.js
import { query, json, requireAdmin } from '../_db.js';
import { pool } from '../../lib/db.js';


export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return; // requireAdmin ya ha respondido (401/403)

    // POST - crear hueco
    if (req.method === 'POST') {
    const { fecha, hora_inicio, hora_fin, modalidad, sede_cita } = req.body || {};

    if (!['online', 'domicilio'].includes(modalidad) ||
        !['malaga', 'cordoba'].includes(sede_cita)) {
      return res.status(400).json({ error: 'Modalidad o sede no válidas.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO disponibilidad (fecha, hora_inicio, hora_fin, modalidad, sede_cita, ocupado)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [fecha, hora_inicio, hora_fin, modalidad, sede_cita]
    );
    return res.status(201).json({ hueco: rows[0] });
    }

    // DELETE - borrar hueco libre
    if (req.method === 'DELETE') {
    const { id } = req.body || {};
    await pool.query('DELETE FROM disponibilidad WHERE id = $1 AND ocupado = false', [id]);
    return res.json({ ok: true });
    }

    return json(res, 405, { error: 'Método no permitido' });
  } catch (err) {
    console.error('[admin/huecos]', err.message);
    return json(res, 500, { error: err.message });
  }
}
