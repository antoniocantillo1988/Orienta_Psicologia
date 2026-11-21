-- Registro y cola de correos de inscripción, progreso y certificados del campus.
-- Ejecutar una vez en la base de datos test antes de activar el envío.
CREATE TABLE IF NOT EXISTS curso_notificaciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  curso_id BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(64) NOT NULL,
  periodo VARCHAR(64) NOT NULL,
  email_destino VARCHAR(320) NULL,
  asunto VARCHAR(255) NULL,
  contenido_html LONGTEXT NULL,
  estado ENUM('pendiente', 'procesando', 'enviada', 'fallida') NOT NULL DEFAULT 'pendiente',
  intentos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  error VARCHAR(1000) NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_envio DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_curso_notificacion (usuario_id, curso_id, tipo, periodo),
  KEY ix_curso_notificacion_pendiente (estado, fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
