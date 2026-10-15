# 🔌 API REST - Contrato de Endpoints

Este documento define el contrato de comunicación entre el Frontend, la Extensión y el Backend.

> **Base URL (desarrollo):** `http://localhost:3000`

## Endpoints implementados

| Método | Endpoint | Auth | Estado |
|--------|----------|------|--------|
| `GET` | `/` | No | ✅ Implementado |
| `POST` | `/auth/register` | No | ✅ Implementado |
| `POST` | `/auth/login` | No | ✅ Implementado |
| `GET` | `/profile/list` | Sí (JWT) | ✅ Implementado |
| `POST` | `/profile/create` | Sí (JWT) | ✅ Implementado |
| `GET` | `/profile` *(opcional `?id=`)* | Sí (JWT) | ✅ Implementado |
| `POST` | `/profile` *(opcional `?id=`)* | Sí (JWT) | ✅ Implementado |

> **Múltiples perfiles:** un usuario puede tener varios perfiles con nombre.
> `GET /profile/list` devuelve la lista; `POST /profile/create` crea uno nuevo
> (vacío); `GET`/`POST /profile?id=<id>` operan sobre un perfil concreto. Sin
> `?id=`, se usa el primer perfil del usuario (compatibilidad hacia atrás). El
> perfil activo se recuerda en el cliente (localStorage / chrome.storage).

## Endpoints planeados (aún no implementados)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/logs` | Registrar un autocompletado |
| `GET` | `/logs` | Obtener el historial de autocompletados |

> **Importante**
>
> Este documento representa un contrato entre los diferentes componentes del sistema. Cualquier modificación en un endpoint deberá ser comunicada y aprobada por el equipo antes de implementarse.

---

# 0. Health check

## Endpoint

```http
GET /
```

## Descripción

Comprueba que el servidor y la conexión a la base de datos funcionan.

## Response Exitosa (200)

```json
{
    "message": "API funcionando correctamente",
    "database": "conectada"
}
```

## Posibles errores

| Código | Descripción |
|--------|-------------|
| 500 | El servidor responde pero la base de datos falló |

---

# 1. Registrar usuario

## Endpoint

```http
POST /auth/register
```

## Descripción

Permite registrar un nuevo usuario en el sistema.

## Request

```json
{
    "email": "usuario@email.com",
    "password": "********"
}
```

## Response Exitosa (201)

```json
{
    "message": "Usuario creado correctamente",
    "userId": 1
}
```

## Posibles errores

| Código | Descripción |
|--------|-------------|
| 400 | Correo y contraseña son obligatorios |
| 409 | El correo ya se encuentra registrado |
| 500 | Error interno del servidor |

---

# 2. Iniciar sesión

## Endpoint

```http
POST /auth/login
```

## Descripción

Permite autenticar un usuario y generar un token JWT. El token expira en **2 horas**.

## Request

```json
{
    "email": "usuario@email.com",
    "password": "********"
}
```

## Response Exitosa (200)

```json
{
    "message": "Login exitoso",
    "token": "JWT_TOKEN",
    "userId": 1
}
```

## Posibles errores

| Código | Descripción |
|--------|-------------|
| 400 | Correo y contraseña son obligatorios |
| 401 | Credenciales inválidas |
| 500 | Error interno |

---

# 3. Obtener perfil

## Endpoint

```http
GET /profile
```

## Descripción

Obtiene la información del perfil del usuario autenticado. Si el usuario todavía no tiene un perfil creado, `profile` es `null` y `skills` es un arreglo vacío (respuesta con estado 200). `accountEmail` es el correo de la cuenta, usado como respaldo cuando el perfil no tiene correo de contacto.

## Headers

```http
Authorization: Bearer JWT_TOKEN
```

## Response Exitosa (200)

```json
{
    "profile": {
        "id": 1,
        "user_id": 1,
        "first_name": "Juan",
        "last_name": "Pérez",
        "email": "juan@email.com",
        "phone": "+57 3001234567",
        "document_type": "CC",
        "document_number": "1020304050",
        "birth_date": "1995-05-10",
        "country": "Colombia",
        "state": "Antioquia",
        "city": "Medellín",
        "address": "Calle 10 # 20-30",
        "postal_code": "050001",
        "headline": "Desarrollador Full Stack",
        "summary": "Desarrollador con 4 años de experiencia...",
        "current_title": "Desarrollador Backend",
        "current_company": "Acme S.A.S.",
        "years_experience": 4,
        "salary_expectation": 4500000,
        "education_level": "universitario",
        "institution": "Universidad Nacional de Colombia",
        "field_of_study": "Ingeniería de Sistemas",
        "graduation_year": 2019,
        "languages": "Español (nativo), Inglés (B2)",
        "linkedin": "https://linkedin.com/in/juan",
        "github": "juanperez",
        "portfolio": "https://juan.dev",
        "updated_at": "2026-09-25T15:20:00.000Z"
    },
    "skills": ["Java", "Node.js"],
    "accountEmail": "usuario@email.com"
}
```

## Response Exitosa sin perfil (200)

```json
{
    "profile": null,
    "skills": [],
    "accountEmail": "usuario@email.com"
}
```

## Posibles errores

| Código | Descripción |
|--------|-------------|
| 401 | No se proporcionó token / token mal formado / token inválido o expirado |
| 500 | Error interno |

---

# 4. Guardar (crear o actualizar) perfil

## Endpoint

```http
POST /profile
```

## Descripción

Crea el perfil del usuario si no existe, o lo actualiza si ya existe (upsert). Las habilidades (`skills`) se reemplazan por completo en cada guardado. Los campos ausentes o vacíos se guardan como `NULL`. Las reglas de validación están en `backend/src/models/profile.fields.js`.

## Headers

```http
Authorization: Bearer JWT_TOKEN
```

## Request

```json
{
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@email.com",
    "phone": "+57 3001234567",
    "documentType": "CC",
    "documentNumber": "1020304050",
    "birthDate": "1995-05-10",
    "country": "Colombia",
    "state": "Antioquia",
    "city": "Medellín",
    "address": "Calle 10 # 20-30",
    "postalCode": "050001",
    "headline": "Desarrollador Full Stack",
    "summary": "Desarrollador con 4 años de experiencia...",
    "currentTitle": "Desarrollador Backend",
    "currentCompany": "Acme S.A.S.",
    "yearsExperience": 4,
    "salaryExpectation": 4500000,
    "educationLevel": "universitario",
    "institution": "Universidad Nacional de Colombia",
    "fieldOfStudy": "Ingeniería de Sistemas",
    "graduationYear": 2019,
    "languages": "Español (nativo), Inglés (B2)",
    "linkedin": "https://linkedin.com/in/juan",
    "github": "juanperez",
    "portfolio": "https://juan.dev",
    "skills": ["Java", "Node.js"]
}
```

## Response Exitosa (200)

```json
{
    "message": "Perfil guardado correctamente"
}
```

## Valores permitidos

| Campo | Regla |
|-------|-------|
| `documentType` | `CC`, `CE`, `TI`, `PA`, `PPT`, `DNI`, `RUT`, `CURP`, `OTRO` |
| `educationLevel` | `bachillerato`, `tecnico`, `tecnologo`, `universitario`, `especializacion`, `maestria`, `doctorado` |
| `birthDate` | `AAAA-MM-DD` |
| `yearsExperience` | Entero 0–70 |
| `graduationYear` | Entero 1950–2100 |
| `salaryExpectation` | Entero ≥ 0 (moneda local, mensual) |
| `email` | Correo válido |

## Posibles errores

| Código | Descripción |
|--------|-------------|
| 400 | Algún campo no cumple las reglas (el mensaje indica cuáles) |
| 401 | No se proporcionó token / token mal formado / token inválido o expirado |
| 500 | Error interno |

---

# 4.1 Listar perfiles

## Endpoint

```http
GET /profile/list
```

## Descripción

Devuelve los perfiles del usuario autenticado (solo id y nombre), para poblar el selector de "cambiar perfil".

## Headers

```http
Authorization: Bearer JWT_TOKEN
```

## Response Exitosa (200)

```json
{
    "profiles": [
        { "id": 1, "name": "Mi perfil" },
        { "id": 2, "name": "Perfil Diseño" }
    ]
}
```

---

# 4.2 Crear perfil nuevo

## Endpoint

```http
POST /profile/create
```

## Descripción

Crea un perfil nuevo (sin datos) con un nombre. Si no se envía `name`, se usa "Mi perfil".

## Headers

```http
Authorization: Bearer JWT_TOKEN
```

## Request

```json
{ "name": "Perfil Backend" }
```

## Response Exitosa (201)

```json
{
    "message": "Perfil creado correctamente",
    "profile": { "id": 3, "name": "Perfil Backend" }
}
```

---

> **Nota sobre `GET`/`POST /profile`:** aceptan un parámetro opcional `?id=<id>`
> para operar sobre un perfil concreto. En `POST /profile`, el campo opcional
> `profileName` renombra el perfil activo. Si el `id` no pertenece al usuario,
> se responde `404`.

---

# 5. (Planeado) Registrar autocompletado

> 🚧 **No implementado todavía.** Las tablas `logs` y `log_fields` ya existen en el esquema de base de datos, pero este endpoint aún no está desarrollado. El diseño propuesto es el siguiente:

## Endpoint

```http
POST /logs
```

## Request

```json
{
    "website": "https://ejemplo.com",
    "fieldsCompleted": ["Nombre", "Correo", "Teléfono"]
}
```

---

# 6. (Planeado) Obtener historial

> 🚧 **No implementado todavía.** Diseño propuesto:

## Endpoint

```http
GET /logs
```

## Response Exitosa (200)

```json
[
    {
        "website": "https://linkedin.com",
        "date": "2026-08-07T15:20:00Z",
        "fieldsCompleted": ["Nombre", "Correo"]
    }
]
```

---

# 📌 Convenciones Generales

## Autenticación

Todos los endpoints, excepto:

- `GET /`
- `POST /auth/register`
- `POST /auth/login`

requieren un token JWT válido en el header `Authorization: Bearer <token>`.

## Formato de errores

Los errores se devuelven con el siguiente formato:

```json
{
    "error": "Descripción del error"
}
```
