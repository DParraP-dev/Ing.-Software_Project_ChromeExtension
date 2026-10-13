# 📦 Modelos de datos

La base de datos es **MySQL** (relacional). Las habilidades del perfil se guardan en una tabla aparte (`knowledge`) con relación 1‑a‑muchos, no como un arreglo embebido.

> El esquema completo (DDL) está en [`../../backend/database/schema.sql`](../../backend/database/schema.sql) y su descripción en [`../database/schemas.md`](../database/schemas.md).

---

## User (tabla `users`)

Cuenta de acceso del usuario.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | INT | Clave primaria, autoincremental |
| `email` | VARCHAR(150) | Único, obligatorio |
| `password` | VARCHAR(255) | Hash generado con bcrypt |
| `created_at` | TIMESTAMP | Se asigna al crear |
| `updated_at` | TIMESTAMP | Se actualiza en cada cambio |

> La contraseña (hash) **nunca** se devuelve en las respuestas de la API.

---

## Profile (tabla `profiles`)

Datos del perfil laboral. Relación 1‑a‑1 con `users` (un perfil por usuario).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | INT | Clave primaria, autoincremental |
| `user_id` | INT | Clave foránea → `users.id` |
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
| `updated_at` | TIMESTAMP | Se actualiza en cada cambio |

> **Nota sobre nombres:** en la base de datos las columnas usan `snake_case` (`first_name`), mientras que el cuerpo de las peticiones de la API usa `camelCase` (`firstName`).

---

## Knowledge (tabla `knowledge`)

Habilidades asociadas a un perfil. Relación 1‑a‑muchos con `profiles`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | INT | Clave primaria, autoincremental |
| `profile_id` | INT | Clave foránea → `profiles.id` |
| `skill` | VARCHAR(100) | Una habilidad por fila |

> En la API las habilidades viajan como un arreglo de strings bajo la clave `skills`.

---

## Log (tabla `logs`) — 🚧 planeado

Registro de un autocompletado realizado en un sitio web. La tabla existe en el esquema, pero todavía no hay endpoints que la usen.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | INT | Clave primaria, autoincremental |
| `user_id` | INT | Clave foránea → `users.id` |
| `website` | VARCHAR(255) | Sitio donde se autocompletó |
| `created_at` | TIMESTAMP | Fecha del autocompletado |

---

## LogField (tabla `log_fields`) — 🚧 planeado

Campos completados en cada log. Relación 1‑a‑muchos con `logs`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | INT | Clave primaria, autoincremental |
| `log_id` | INT | Clave foránea → `logs.id` |
| `field_name` | VARCHAR(100) | Nombre del campo completado |
