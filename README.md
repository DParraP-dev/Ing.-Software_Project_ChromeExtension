# 🖊️ FillPro

**FillPro** es una extensión de navegador (Chrome, Manifest V3) que **autocompleta formularios de postulación laboral** con los datos que el usuario guarda una sola vez en su perfil. El objetivo es ahorrar tiempo al postularse a ofertas de empleo evitando reescribir la misma información en cada formulario.

El proyecto está compuesto por tres componentes que conviven en un **monorepositorio**:

- **Extensión de navegador** — detecta los campos de un formulario en la página activa y los rellena.
- **Backend (API REST)** — gestiona autenticación y almacenamiento del perfil del usuario.
- **Frontend web** — aplicación web para registrarse, iniciar sesión y editar el perfil.

---

## 🧱 Stack tecnológico

| Componente | Tecnología |
|------------|------------|
| Extensión | JavaScript vanilla + Manifest V3 |
| Backend | Node.js + Express 5 (CommonJS) |
| Base de datos | **MySQL** (a través de `mysql2`) |
| Autenticación | JWT (`jsonwebtoken`) + `bcrypt` |
| Frontend web | HTML + CSS + JavaScript vanilla (sin framework) |

> **Nota:** versiones anteriores de la documentación describían React y MongoDB. La implementación real usa **JavaScript vanilla** en el frontend y **MySQL** como base de datos. Este README refleja el estado actual del código.

---

## 📁 Estructura del repositorio

```text
Ing.-Software_Project_ChromeExtension/
│
├── frontend/                # Aplicación web (HTML + CSS + JS vanilla)
│   ├── pages/               # Páginas HTML (index, login, signup, main, profile, reset-password)
│   ├── js/                  # Scripts (app, login, signup, main, profile)
│   ├── css/                 # Hojas de estilo
│   └── assets/              # Logos, íconos e imágenes
│
├── backend/                 # API REST (Node.js + Express)
│   ├── src/
│   │   ├── app.js           # Configuración de la app Express (middleware + rutas)
│   │   ├── server.js        # Punto de arranque del servidor
│   │   ├── config/
│   │   │   └── database.js   # Pool de conexión a MySQL
│   │   ├── middleware/
│   │   │   └── auth.middleware.js   # Verificación de token JWT
│   │   └── routes/
│   │       ├── auth.routes.js       # /auth/register y /auth/login
│   │       └── profile.routes.js    # /profile (obtener y guardar)
│   ├── database/
│   │   └── schema.sql       # Definición de las tablas MySQL
│   └── package.json
│
├── extension/               # Extensión de navegador (Manifest V3)
│   ├── manifest.json
│   ├── content.js           # Content script: detecta y rellena campos del formulario
│   ├── popup/               # UI del popup (login + botón de autocompletar)
│   └── test-form.html       # Formulario de prueba para validar el autocompletado
│
├── docs/                    # Documentación del proyecto
│   ├── api/                 # Contrato de la API y modelos de datos
│   └── database/            # Esquema de la base de datos
│
├── .gitignore
└── README.md
```

### Responsabilidad de cada carpeta

- **`/frontend`** — Interfaz web: registro, inicio de sesión, dashboard y gestión del perfil. HTML/CSS/JS vanilla, sin bundler.
- **`/backend`** — API REST: autenticación con JWT, hash de contraseñas con bcrypt y persistencia del perfil en MySQL.
- **`/extension`** — Extensión de navegador: popup para iniciar sesión y disparar el autocompletado, más el content script que rellena los formularios.
- **`/docs`** — Documentación: contrato de la API, modelos de datos y esquema de base de datos.

---

## ✅ Estado actual (implementado)

| Funcionalidad | Estado |
|---------------|--------|
| Registro de usuario (`POST /auth/register`) | ✅ Implementado |
| Inicio de sesión (`POST /auth/login`) | ✅ Implementado |
| Obtener perfil (`GET /profile`) | ✅ Implementado |
| Guardar / actualizar perfil (`POST /profile`) | ✅ Implementado |
| Autocompletado de formularios (extensión) | ✅ Implementado |
| Historial de autocompletados (`/logs`) | 🚧 Planeado (tablas en el esquema, sin endpoints aún) |
| Recuperación de contraseña | 🚧 Planeado (existe la página, sin backend) |

---

## 🚀 Puesta en marcha

### Requisitos previos

- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- [MySQL](https://www.mysql.com/) instalado y en ejecución
- Un navegador basado en Chromium (Chrome, Edge, Brave) para cargar la extensión

### 1. Base de datos

Ejecuta el script de esquema en tu instalación local de MySQL. Crea la base de datos `fillpro_db` con sus 5 tablas (`users`, `profiles`, `knowledge`, `logs`, `log_fields`):

```bash
mysql -u root -p < backend/database/schema.sql
```

> También puedes abrir `backend/database/schema.sql` en MySQL Workbench y ejecutar todo el script de una vez.

### 2. Backend

```bash
cd backend
npm install
```

Crea un archivo `.env` dentro de `backend/` con tus credenciales (ver la sección [Variables de entorno](#-variables-de-entorno)):

```bash
npm run dev    # con recarga automática (nodemon)
# o
npm start      # ejecución normal
```

El servidor arranca en `http://localhost:3000`. Puedes verificarlo abriendo esa URL: responde con un JSON confirmando que la API y la base de datos están conectadas.

### 3. Frontend web

El frontend es HTML/JS estático. Ábrelo con cualquier servidor estático (por ejemplo, la extensión Live Server, o `python -m http.server`) apuntando a la carpeta `frontend/`, y navega a `pages/index.html`.

> El frontend hace peticiones a `http://localhost:3000`, así que el backend debe estar corriendo.

### 4. Extensión

1. Abre `chrome://extensions` en tu navegador.
2. Activa el **Modo desarrollador**.
3. Haz clic en **Cargar descomprimida** y selecciona la carpeta `extension/`.
4. Ancla la extensión y ábrela para iniciar sesión y probar el autocompletado (puedes usar `extension/test-form.html` como formulario de prueba).

---

## 🔑 Variables de entorno

El backend lee su configuración desde un archivo `.env` en `backend/` (cargado con `dotenv`):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | `tu_contraseña` |
| `DB_NAME` | Nombre de la base de datos | `fillpro_db` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `JWT_SECRET` | Clave secreta para firmar los tokens JWT | `una_clave_larga_y_secreta` |

> El servidor escucha en el puerto `3000`.

---

## 🔌 Endpoints de la API

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/` | Health check (API + conexión a la base de datos) | No |
| `POST` | `/auth/register` | Registrar un nuevo usuario | No |
| `POST` | `/auth/login` | Iniciar sesión y obtener un token JWT | No |
| `GET` | `/profile` | Obtener el perfil del usuario autenticado | Sí (JWT) |
| `POST` | `/profile` | Crear o actualizar el perfil del usuario autenticado | Sí (JWT) |

El contrato detallado (request/response) está en [`docs/api/endpoints.md`](docs/api/endpoints.md).

---

# 🌿 Estrategia de Ramas

## Ramas permanentes

### `main`

Representa la versión estable del proyecto.

**Reglas**

- Nunca desarrollar directamente sobre esta rama.
- Solo recibe código al finalizar un Sprint.
- Debe contener únicamente funcionalidades probadas.

---

### `develop`

Es la rama de integración.

Aquí llegan todas las funcionalidades desarrolladas durante el Sprint.

Todos los desarrolladores crearán sus ramas de trabajo a partir de esta rama.

---

## Ramas de funcionalidades

Cada historia de usuario o funcionalidad deberá desarrollarse en una rama independiente.

Formato:

```text
feature/nombre-funcionalidad
```

Ejemplos:

```text
feature/login

feature/register

feature/profile

feature/auth

feature/api-profile

feature/content-script

feature/autofill

feature/logs
```

Cada rama debe representar **una única funcionalidad**.

---

# 🔄 Flujo de Trabajo

```text
                 main
                   ▲
                   │
        Merge al finalizar Sprint
                   │
                develop
                   ▲
                   │
        Pull Request aprobado
                   │
      feature/nombre-funcionalidad
```

## Flujo completo

1. Actualizar la rama `develop`.
2. Crear una nueva rama `feature`.
3. Implementar la funcionalidad.
4. Realizar commits frecuentes.
5. Subir la rama al repositorio.
6. Abrir un Pull Request.
7. Solicitar revisión.
8. Integrar la rama en `develop`.
9. Al finalizar el Sprint, fusionar `develop` en `main`.

---

# ✅ Reglas antes de subir código

Antes de realizar un `push`, todos los integrantes deberán cumplir los siguientes pasos.

## 1. Actualizar la rama `develop`

```bash
git checkout develop
git pull origin develop
```

---

## 2. Actualizar la rama de trabajo

Incorporar los cambios recientes de `develop` en la rama de trabajo antes de continuar.

---

## 3. Resolver conflictos

Si existen conflictos:

- Resolverlos localmente.
- Verificar que el proyecto sigue funcionando.
- No realizar `push` hasta comprobar que todo compila correctamente.

---

## 4. Probar la funcionalidad

Antes de subir código verificar que:

- La aplicación inicia correctamente.
- No existen errores de compilación.
- La funcionalidad cumple con los criterios de aceptación.
- No se afectaron funcionalidades existentes.

---

## 5. Realizar commits descriptivos

❌ No usar mensajes como:

```text
Update

Cambios

asd

Último commit
```

---

# 📝 Convención de Commits

Se utilizará la especificación **Conventional Commits**.

Formato:

```text
tipo: descripción
```

## Prefijos permitidos

| Prefijo | Descripción |
|----------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de errores |
| `docs` | Cambios en documentación |
| `style` | Cambios de formato o estilo |
| `refactor` | Reestructuración del código sin cambiar comportamiento |
| `test` | Pruebas |
| `chore` | Configuración o mantenimiento |

### Ejemplos

```text
feat: implement login endpoint

feat: create profile page

fix: correct JWT validation

docs: update API contract

refactor: simplify autofill algorithm

test: add authentication tests

chore: configure eslint
```

---

# 🔀 Pull Requests

Todo cambio al repositorio deberá integrarse mediante un Pull Request.

No se realizarán merges directos a `develop` ni a `main`.

## Antes de crear un Pull Request verificar que:

- La funcionalidad está completamente terminada.
- El proyecto compila correctamente.
- No existen conflictos pendientes.
- El código fue probado localmente.
- Los commits siguen la convención establecida.
- La documentación fue actualizada si aplica.

---

## Todo Pull Request debe incluir

### Objetivo

¿Qué funcionalidad implementa?

---

### Cambios realizados

Descripción breve de los cambios más importantes.

---

### Cómo probarlo

Ejemplo:

1. Iniciar sesión.
2. Crear un perfil.
3. Editar el nombre.
4. Verificar que la información se guarda correctamente.

---

### Evidencia *(opcional)*

Si la funcionalidad tiene interfaz gráfica, adjuntar capturas de pantalla o un video corto.

---

# 🤝 Buenas prácticas del equipo

Durante el desarrollo del proyecto se seguirán las siguientes recomendaciones:

- Mantener ramas pequeñas y enfocadas en una única funcionalidad.
- Realizar commits frecuentes en lugar de un único commit grande.
- Solicitar revisión antes de integrar cambios importantes.
- Comunicar bloqueos al equipo lo antes posible.
- No modificar código de otro integrante sin previo acuerdo.
- Mantener actualizada la documentación.
- Priorizar un código claro y legible sobre soluciones excesivamente complejas.
- Discutir previamente cualquier decisión técnica que afecte a varios componentes del sistema.

---

# 🎯 Objetivo de estas normas

Estas reglas buscan facilitar el trabajo colaborativo y simular un entorno de desarrollo profesional.

Seguir un flujo de trabajo consistente permitirá:

- Reducir conflictos de integración.
- Mantener un historial de cambios limpio.
- Facilitar la revisión de código.
- Mejorar la comunicación del equipo.
- Garantizar un desarrollo más organizado durante los tres Sprints.
