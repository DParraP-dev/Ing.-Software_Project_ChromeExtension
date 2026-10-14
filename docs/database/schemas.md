# 🗄️ Esquema de base de datos (MySQL)

La base de datos se llama **`fillpro_db`** y está compuesta por **5 tablas** relacionales. El script completo para crearla está en [`../../backend/database/schema.sql`](../../backend/database/schema.sql).

## Diagrama de relaciones

```text
users (1) ──< (1) profiles (1) ──< (N) knowledge
  │
  └──< (N) logs (1) ──< (N) log_fields
```

- Un `user` tiene un `profile` (1‑a‑1).
- Un `profile` tiene varias filas de `knowledge` (habilidades).
- Un `user` tiene varios `logs`, y cada `log` tiene varios `log_fields`.

---

## Tabla `users`

Cuentas de acceso (login / signup).

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | INT | PK, AUTO_INCREMENT |
| `email` | VARCHAR(150) | UNIQUE, NOT NULL |
| `password` | VARCHAR(255) | NOT NULL (hash bcrypt) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

---

## Tabla `profiles`

Datos del perfil laboral, uno por usuario.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | INT | PK, AUTO_INCREMENT |
| `user_id` | INT | NOT NULL, FK → `users.id` |
| `first_name` | VARCHAR(100) | |
| `last_name` | VARCHAR(100) | |
| `phone` | VARCHAR(20) | |
| `country` | VARCHAR(100) | |
| `city` | VARCHAR(100) | |
| `linkedin` | VARCHAR(255) | |
| `github` | VARCHAR(255) | |
| `email` | VARCHAR(150) | Correo de contacto (puede diferir del de la cuenta) |
| `document_type` | VARCHAR(10) | `CC`, `CE`, `TI`, `PA`, `PPT`, `DNI`, `RUT`, `CURP`, `OTRO` |
| `document_number` | VARCHAR(30) | |
| `birth_date` | DATE | Se devuelve como `AAAA-MM-DD` |
| `state` | VARCHAR(100) | Departamento / estado / provincia |
| `address` | VARCHAR(255) | |
| `postal_code` | VARCHAR(20) | |
| `headline` | VARCHAR(150) | Titular profesional |
| `summary` | TEXT | Resumen / acerca de mí |
| `current_title` | VARCHAR(150) | Cargo actual o más reciente |
| `current_company` | VARCHAR(150) | Empresa actual o más reciente |
| `years_experience` | TINYINT UNSIGNED | |
| `salary_expectation` | INT UNSIGNED | Aspiración salarial mensual |
| `education_level` | VARCHAR(30) | `bachillerato` … `doctorado` |
| `institution` | VARCHAR(150) | |
| `field_of_study` | VARCHAR(150) | Título / área de estudio |
| `graduation_year` | SMALLINT UNSIGNED | |
| `languages` | VARCHAR(255) | |
| `portfolio` | VARCHAR(255) | Portafolio / sitio web |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

---

## Tabla `knowledge`

Habilidades del perfil (relación 1‑a‑muchos con `profiles`).

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | INT | PK, AUTO_INCREMENT |
| `profile_id` | INT | NOT NULL, FK → `profiles.id` |
| `skill` | VARCHAR(100) | |

---

## Tabla `logs` — 🚧 planeado

Registro de autocompletados por sitio web. La tabla existe pero aún no se usa desde la API.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | INT | PK, AUTO_INCREMENT |
| `user_id` | INT | NOT NULL, FK → `users.id` |
| `website` | VARCHAR(255) | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

## Tabla `log_fields` — 🚧 planeado

Campos completados en cada log (relación 1‑a‑muchos con `logs`).

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | INT | PK, AUTO_INCREMENT |
| `log_id` | INT | NOT NULL, FK → `logs.id` |
| `field_name` | VARCHAR(100) | |

---

## Cómo crear la base de datos

```bash
mysql -u root -p < backend/database/schema.sql
```

O abre `backend/database/schema.sql` en MySQL Workbench y ejecuta todo el script de una vez. Al terminar, dentro de `fillpro_db` deben aparecer las 5 tablas: `users`, `profiles`, `knowledge`, `logs`, `log_fields`.
