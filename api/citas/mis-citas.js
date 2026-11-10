// api/citas/mis-citas.js
import { query, json, requireAuth } from '../_db.js';

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return; //requireAuth ya ha respondido
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });

  try {
   const citas = await query(
        `SELECT c.id, c.estado, c.motivo_consulta, c.enlace_videollamada,
                c.creado_en,
                d.fecha, d.hora_inicio, d.hora_fin, d.modalidad, d.sede_cita
         FROM citas c
         JOIN disponibilidad d ON c.disponibilidad_id = d.id
         WHERE c.usuario_id = ?
         ORDER BY d.fecha DESC, d.hora_inicio DESC`,
        [user.id]
    );
    return json(res, 200, { citas });
  } catch (err) {
    console.error('[mis-citas]', err.message);
    return json(res, 500, { error: err.message });
  }
};
