-- ============================================================
-- Migración 002 — HU: Múltiples perfiles por usuario
-- ============================================================
-- Permite que un usuario tenga VARIOS perfiles (p. ej. "Perfil
-- Backend", "Perfil Diseño") y los distinga por un nombre visible.
--
-- Cambios:
--   1. Agrega `profiles.profile_name` (el nombre que ve el usuario
--      en la lista de perfiles).
--   2. Pone un nombre por defecto a los perfiles que ya existían,
--      para que la lista nunca muestre una entrada sin título.
--
-- Ejecútala UNA sola vez sobre una base creada con una versión
-- anterior de schema.sql:
--   mysql -u root -p fillpro_db < backend/database/migrations/profile_name.sql
--
-- Las bases nuevas no la necesitan: schema.sql ya incluye la columna.
-- ============================================================

USE fillpro_db;

ALTER TABLE profiles
    ADD COLUMN profile_name VARCHAR(100) NOT NULL DEFAULT 'Mi perfil' AFTER user_id;

-- Da un nombre legible a los perfiles previos (quedarían con el default).
UPDATE profiles SET profile_name = 'Mi perfil' WHERE profile_name IS NULL OR profile_name = '';
