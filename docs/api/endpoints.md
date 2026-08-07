# 🔌 API REST - Contrato de Endpoints

Este documento define el contrato de comunicación entre el Frontend, la Extensión y el Backend.

# Endpoints para Sprint 1 (pueden cambiar)

| Endpoint | Estado |
|----------|--------|
| POST /auth/register |
| POST /auth/login |
| GET /profile |
| PUT /profile |
| POST /logs |
| GET /logs |

> **Importante**
>
> Este documento representa un contrato entre los diferentes componentes del sistema. Cualquier modificación en un endpoint deberá ser comunicada y aprobada por el equipo antes de implementarse.

# 1. Registrar usuario

## Endpoint

```http
POST /auth/register
```

## Descripción

Permite registrar un nuevo usuario en el sistema.

---

## Request

```json
{
    "email": "usuario@email.com",
    "password": "********"
}
```

---

## Response Exitosa (201)

```json
{
    "success": true,
    "message": "Usuario registrado correctamente."
}
```

---

## Posibles errores

| Código | Descripción |
|---------|-------------|
| 400 | Datos inválidos |
| 409 | El correo ya se encuentra registrado |
| 500 | Error interno del servidor |

---

# 2. Iniciar sesión

## Endpoint

```http
POST /auth/login
```

## Descripción

Permite autenticar un usuario y generar un token JWT.

---

## Request

```json
{
    "email": "usuario@email.com",
    "password": "********"
}
```

---

## Response Exitosa (200)

```json
{
    "success": true,
    "token": "JWT_TOKEN",
    "user": {
        "_id": "...",
        "email": "usuario@email.com"
    }
}
```

---

## Posibles errores

| Código | Descripción |
|---------|-------------|
| 401 | Credenciales incorrectas |
| 404 | Usuario no encontrado |
| 500 | Error interno |

---

# 3. Obtener perfil

## Endpoint

```http
GET /profile
```

## Descripción

Obtiene toda la información del perfil del usuario autenticado.

---

## Headers

```http
Authorization: Bearer JWT_TOKEN
```

---

## Response Exitosa (200)

```json
{
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "3001234567",
    "country": "Colombia",
    "city": "Medellín",
    "linkedin": "https://linkedin.com/in/juan",
    "github": "juanperez",
    "knowledge": [
        "Java",
        "Node.js"
    ]
}
```

---

## Posibles errores

| Código | Descripción |
|---------|-------------|
| 401 | Token inválido |
| 403 | Usuario no autorizado |
| 404 | Perfil no encontrado |

---

# 4. Actualizar perfil

## Endpoint

```http
PUT /profile
```

## Descripción

Permite crear o actualizar la información del perfil del usuario.

---

## Headers

```http
Authorization: Bearer JWT_TOKEN
```

---

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
    "knowledge": [
        "Java",
        "Node.js"
    ]
}
```

---

## Response Exitosa (200)

```json
{
    "success": true,
    "message": "Perfil actualizado correctamente."
}
```

---

## Posibles errores

| Código | Descripción |
|---------|-------------|
| 400 | Datos inválidos |
| 401 | Token inválido |
| 500 | Error interno |

---

# 5. Registrar autocompletado

## Endpoint

```http
POST /logs
```

## Descripción

Registra en la bitácora una acción de autocompletado realizada por la extensión.

---

## Headers

```http
Authorization: Bearer JWT_TOKEN
```

---

## Request

```json
{
    "website": "https://ejemplo.com",
    "fieldsCompleted": [
        "Nombre",
        "Correo",
        "Teléfono"
    ]
}
```

---

## Response Exitosa (201)

```json
{
    "success": true,
    "message": "Registro almacenado correctamente."
}
```

---

## Posibles errores

| Código | Descripción |
|---------|-------------|
| 401 | Token inválido |
| 500 | Error interno |

---

# 6. Obtener historial

## Endpoint

```http
GET /logs
```

## Descripción

Obtiene el historial de autocompletados realizados por el usuario autenticado.

---

## Headers

```http
Authorization: Bearer JWT_TOKEN
```

---

## Response Exitosa (200)

```json
[
    {
        "website": "https://linkedin.com",
        "date": "2026-08-07T15:20:00Z",
        "fieldsCompleted": [
            "Nombre",
            "Correo"
        ]
    },
    {
        "website": "https://workday.com",
        "date": "2026-08-06T18:10:00Z",
        "fieldsCompleted": [
            "Nombre",
            "Ciudad",
            "LinkedIn"
        ]
    }
]
```

---

## Posibles errores

| Código | Descripción |
|---------|-------------|
| 401 | Token inválido |
| 500 | Error interno |

---

# 📌 Convenciones Generales

## Autenticación

Todos los endpoints, excepto:

- `POST /auth/register`
- `POST /auth/login`

requieren un token JWT válido.

---
