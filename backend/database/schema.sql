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
-- profiles: datos del perfil laboral. Un usuario puede tener
-- VARIOS perfiles (p. ej. una profesión distinta por perfil),
-- cada uno identificado por `profile_name`.
-- Los campos siguen los formularios más comunes de portales de
-- empleo (LinkedIn, Computrabajo, elempleo, ATS) — HU-RNF-011.
-- Si ya tienes la base creada, ejecuta en su lugar las migraciones:
--   database/migrations/profile_fields.sql
--   database/migrations/profile_name.sql
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    profile_name VARCHAR(100) NOT NULL DEFAULT 'Mi perfil',
    -- Datos personales
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(20),
    document_type VARCHAR(10),
    document_number VARCHAR(30),
    birth_date DATE,
    -- Ubicación
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    address VARCHAR(255),
    postal_code VARCHAR(20),
    -- Perfil profesional / experiencia
    headline VARCHAR(150),
    summary TEXT,
    current_title VARCHAR(150),
    current_company VARCHAR(150),
    years_experience TINYINT UNSIGNED,
    salary_expectation INT UNSIGNED,
    -- Educación
    education_level VARCHAR(30),
    institution VARCHAR(150),
    field_of_study VARCHAR(150),
    graduation_year SMALLINT UNSIGNED,
    languages VARCHAR(255),
    -- Enlaces
    linkedin VARCHAR(255),
    github VARCHAR(255),
    portfolio VARCHAR(255),
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