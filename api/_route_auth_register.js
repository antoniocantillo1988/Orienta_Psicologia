// api/auth/register.js
import { query, json, hashPassword, createToken } from './_db.js';
import { enviarBienvenidaUsuario } from './_email_cursos.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });

  const { email, password, nombre_usuario } = req.body || {};
  
  if (!email || !password || !nombre_usuario) {
    return json(res, 400, { error: 'Todos los campos son obligatorios.' });
  }
  
  if (password.length < 8) {
    return json(res, 400, { error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  try {
    const existing = await query('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase()]);
    
    if (existing.length > 0) {
      return json(res, 409, { error: 'Ya existe una cuenta con ese email.' });
    }

    const result = await query(
      'INSERT INTO usuarios (email, password, nombre_usuario, tipo) VALUES (?, ?, ?, 0)',
      [email.toLowerCase(), hashPassword(password), nombre_usuario.trim()]
    );

    const token = createToken({ id: result.insertId, email: email.toLowerCase(), tipo: 0 });

    try {
      await enviarBienvenidaUsuario({
        usuarioId: result.insertId,
        email: email.toLowerCase(),
        nombre: nombre_usuario.trim(),
      });
    } catch (emailError) {
      console.error('[register] No se pudo encolar el correo de bienvenida:', emailError.message);
    }

    return json(res, 201, {
      token,
      user: { 
        id: result.insertId, 
        email: email.toLowerCase(), 
        nombre_usuario: nombre_usuario.trim(), 
        tipo: 0 
      },
    });

  } catch (err) {
    console.error('[register]', err.message);
    return json(res, 500, { error: 'Error de servidor: ' + err.message });
  }
}
