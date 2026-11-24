-- Ejecuta este script una sola vez en la base de datos de Orienta.
-- No se ha ejecutado desde la aplicación.

CREATE TABLE IF NOT EXISTS material_categorias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(500) NULL,
  orden INT NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_material_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO material_categorias (nombre, orden) VALUES
  ('Envejecimiento', 10),
  ('Infantojuvenil', 20),
  ('Patologías transversales', 30);

CREATE TABLE IF NOT EXISTS materiales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id INT UNSIGNED NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion VARCHAR(1000) NULL,
  enlace_drive VARCHAR(2048) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  publicado TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_materiales_categoria_publicado (categoria_id, publicado, orden),
  CONSTRAINT fk_materiales_categoria
    FOREIGN KEY (categoria_id) REFERENCES material_categorias (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
