-- ============================================================
-- FillPro — Esquema de base de datos (MySQL)
-- ============================================================
-- Cómo usar este archivo:
-- 1. Abre MySQL Workbench (o la terminal de MySQL)
-- 2. Pega TODO este archivo en un query tab nuevo
-- 3. Ejecuta todo de una vez (Ctrl+Shift+Enter en Workbench
--    ejecuta el script completo, no solo la línea actual)
-- 4. Verifica: dentro de fillpro_db deben aparecer 5 tablas:
--    users, profiles, knowledge, logs, log_fields
--
-- Cada integrante del equipo corre este mismo archivo en su
-- propia instalación local de MySQL, para que todos tengan
-- exactamente la misma estructura de base de datos.
-- ============================================================

CREATE DATABASE IF NOT EXISTS fillpro_db;
USE fillpro_db;

-- ------------------------------------------------------------
-- users: cuentas de acceso (login/signup)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- profiles: datos del perfil laboral, uno por usuario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    country VARCHAR(100),
    city VARCHAR(100),
    linkedin VARCHAR(255),
    github VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- knowledge: habilidades del perfil (relación 1 a muchos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    skill VARCHAR(100),
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

-- ------------------------------------------------------------
-- logs: registro de autocompletados por sitio web
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- log_fields: campos completados en cada log (relación 1 a muchos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_id INT NOT NULL,
    field_name VARCHAR(100),
    FOREIGN KEY (log_id) REFERENCES logs(id)
);