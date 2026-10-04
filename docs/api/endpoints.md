# 🔌 API REST - Contrato de Endpoints

Este documento define el contrato de comunicación entre el Frontend, la Extensión y el Backend.

> **Base URL (desarrollo):** `http://localhost:3000`

## Endpoints implementados

| Método | Endpoint | Auth | Estado |
|--------|----------|------|--------|
| `GET` | `/` | No | ✅ Implementado |
| `POST` | `/auth/register` | No | ✅ Implementado |
| `POST` | `/auth/login` | No | ✅ Implementado |
| `GET` | `/profile` | Sí (JWT) | ✅ Implementado |
| `POST` | `/profile` | Sí (JWT) | ✅ Implementado |

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

Obtiene la información del perfil del usuario autenticado. Si el usuario todavía no tiene un perfil creado, `profile` es `null` y `skills` es un arreglo vacío (respuesta con estado 200).

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
        "phone": "3001234567",
        "country": "Colombia",
        "city": "Medellín",
        "linkedin": "https://linkedin.com/in/juan",
        "github": "juanperez",
        "updated_at": "2026-09-25T15:20:00.000Z"
    },
    "skills": ["Java", "Node.js"]
}
```

## Response Exitosa sin perfil (200)

```json
{
    "profile": null,
    "skills": []
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

Crea el perfil del usuario si no existe, o lo actualiza si ya existe (upsert). Las habilidades (`skills`) se reemplazan por completo en cada guardado.

## Headers

```http
Authorization: Bearer JWT_TOKEN
```

## Request

```json
{
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "3001234567",
    "country": "Colombia",
    "city": "Medellín",
    "linkedin": "https://linkedin.com/in/juan",
    "github": "juanperez",
    "skills": ["Java", "Node.js"]
}
```

## Response Exitosa (200)

```json
{
    "message": "Perfil guardado correctamente"
}
```

## Posibles errores

| Código | Descripción |
|--------|-------------|
| 401 | No se proporcionó token / token mal formado / token inválido o expirado |
| 500 | Error interno |

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
