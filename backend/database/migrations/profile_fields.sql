-- ============================================================
-- Migración 001 — HU-RNF-011
-- Compatibilidad con campos de formularios ampliamente reconocidos
-- ============================================================
-- Agrega a `profiles` los campos comunes de portales de empleo
-- (LinkedIn, Computrabajo, elempleo, Greenhouse, Lever, Workday...).
--
-- Ejecútala UNA sola vez sobre una base creada con la versión
-- anterior de schema.sql:
--   mysql -u root -p fillpro_db < backend/database/migrations/profile_fields.sql
--
-- Las bases nuevas no la necesitan: schema.sql ya incluye estas columnas.
-- ============================================================

USE fillpro_db;

ALTER TABLE profiles
    ADD COLUMN email VARCHAR(150),
    ADD COLUMN document_type VARCHAR(10),
    ADD COLUMN document_number VARCHAR(30),
    ADD COLUMN birth_date DATE,
    ADD COLUMN state VARCHAR(100),
    ADD COLUMN address VARCHAR(255),
    ADD COLUMN postal_code VARCHAR(20),
    ADD COLUMN headline VARCHAR(150),
    ADD COLUMN summary TEXT,
    ADD COLUMN current_title VARCHAR(150),
    ADD COLUMN current_company VARCHAR(150),
    ADD COLUMN years_experience TINYINT UNSIGNED,
    ADD COLUMN salary_expectation INT UNSIGNED,
    ADD COLUMN education_level VARCHAR(30),
    ADD COLUMN institution VARCHAR(150),
    ADD COLUMN field_of_study VARCHAR(150),
    ADD COLUMN graduation_year SMALLINT UNSIGNED,
    ADD COLUMN languages VARCHAR(255),
    ADD COLUMN portfolio VARCHAR(255);
