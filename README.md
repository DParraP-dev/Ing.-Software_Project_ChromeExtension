# 📖 Estándar de Desarrollo del Proyecto

Este documento define las normas de trabajo que seguirá el equipo durante el desarrollo del proyecto. El objetivo es mantener un flujo de trabajo organizado, facilitar la colaboración y reducir conflictos durante la integración del código.

---

# 📁 Arquitectura del Repositorio

El proyecto estará organizado como un **monorepositorio**, donde todos los componentes del sistema convivirán en un único repositorio.

```text
autofill-extension/

│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── package.json
│
├── backend/
│   ├── src/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── services/
│   └── package.json
│
├── extension/
│   ├── manifest.json
│   ├── popup/
│   ├── content/
│   ├── background/
│   ├── utils/
│   └── assets/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── sprint/
│   ├── backlog/
│   └── diagrams/
│
├── .gitignore
├── README.md
└── LICENSE
```

## Responsabilidad de cada carpeta

### `/frontend`

Contiene la aplicación desarrollada en React.

Incluye:

- Login
- Registro
- Dashboard
- Gestión del perfil
- Historial de acciones

---

### `/backend`

Contiene la API desarrollada con Node.js.

Incluye:

- Endpoints REST
- Autenticación
- Lógica de negocio
- Comunicación con MongoDB

---

### `/extension`

Contiene el código de la extensión del navegador.

Incluye:

- Manifest
- Popup
- Content Scripts
- Background Scripts
- Utilidades

---

### `/docs`

Contiene toda la documentación del proyecto.

Ejemplos:

- Arquitectura
- Contratos de la API
- Diagramas
- Sprint Backlogs
- Decisiones técnicas

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
