# Identidad visual de FillPro

Inventario de la identidad **antes** del rediseño (rama `develop`, octubre 2026) y de las decisiones que se derivan de ella. Todo el sistema de diseño (`tokens.css`, `components.css`) parte de este documento.

## 1. Logo

| Archivo | Uso | Notas |
|---|---|---|
| `frontend/assets/FillPro_logo.png` | Original, 1376 × 768 | Fondo blanco opaco con mucho margen. Se conserva sin cambios. |
| `frontend/assets/FillPro_Logo_Alt-sinFondo.png` | Versión para fondos oscuros, 666 × 189 | Trazo blanco y check menta, fondo transparente. |
| `frontend/assets/Icono-FillPro.png` | Favicon, 32 × 32 | Se conserva. |
| `frontend/assets/fillpro-logo.png` | **Nuevo**, 1020 × 308 | El mismo logo recortado y con fondo transparente (los píxeles se separaron del blanco por color, sin redibujar). Para cabeceras sobre cualquier superficie clara. |
| `frontend/assets/fillpro-mark.png` | **Nuevo**, 298 × 308 | Solo la marca (documento con check). Para el popup y espacios pequeños. |

**Anatomía.** Un documento con las esquinas plegadas y un check que lo atraviesa, seguido del texto *Fill* en índigo y *Pro* en menta, en una sans geométrica muy gruesa.

**Reglas.**
- Tamaño mínimo del logo completo: 96 px de ancho. La marca sola, 20 px.
- Sobre índigo o fondos oscuros se usa siempre la versión `Alt-sinFondo`.
- El logo no se recolorea, no se le aplica sombra y no se encierra en una tarjeta.

**El check es la idea central de la marca.** En el rediseño, el check del logo se convierte en la señal de estado de cada campo: *listo* (check menta) o *revisar*.

## 2. Color

### Colores medidos

| Color | Hex | Dónde aparece | Uso |
|---|---|---|---|
| Índigo marca | `#3730A3` | Toda la web (`--indigo-900`) | Primario: botones, títulos, panel del inicio, fondo de login |
| Índigo del logo | `#2D2D8F` | Píxeles del PNG del logo | Ancla oscura de la escala primaria |
| Índigo interacción | `#4F46E5` | Hover y foco (`--indigo-600`) | Estado hover, anillo de foco |
| Índigo claro | `#EEF0FB` / `#EEF2FF` | Tarjeta "Siguiente paso", chips del historial | Fondos de acento suave |
| Menta | `#10B981` | Anillo de progreso, aviso de compatibilidad | Éxito, progreso, "Pro" del logo |
| Menta del logo | `#3CC091` | Píxeles del PNG | Check de la marca |
| Pizarra 900 | `#1E293B` | Texto principal | Tinta |
| Pizarra 500 | `#64748B` | Subtítulos, ayudas | Texto secundario |
| Pizarra 200 | `#E2E8F0` | Bordes de tarjetas e inputs | Bordes |
| Pizarra 50 | `#F8FAFC` | Fondo de página | Superficie base |
| Rojo | `#B91C1C` | Botón "Borrar historial" | Peligro |

### Inconsistencias encontradas
- El popup usaba un violeta distinto (`#5956E9`) y grises propios (`#687288`, `#505A70`). No coincidía con la web.
- `index`, `login`, `signup` y `reset-password` usaban `Arial` y colores escritos a mano. Las demás páginas usaban variables, pero cada hoja redefinía las suyas con valores ligeramente distintos (`--indigo-50` existía en dos tonos, `--radius-md` en 10 y 12 px).
- `#94A3B8` en placeholders daba 2.6:1 de contraste (no cumple AA).

### Decisión
Se conservan **índigo `#3730A3` + menta + pizarra**. La escala primaria 50–900 se derivó de `#3730A3` (700) y del índigo del logo (800). La menta se ancla en `#10B981` (500); para texto sobre blanco se usa la 700 (`#047857`, 5.5:1). Todos los pares de texto cumplen AA (ver `tokens.css`).

**Modo oscuro: no.** El logo principal es índigo oscuro y pierde contraste sobre fondos oscuros. Cambiarlo por la versión blanca en todas las pantallas cambia la presencia de la marca, así que el sistema se queda en claro (`color-scheme: light`). Los tokens están preparados para añadirlo después.

## 3. Tipografía

| Rol | Antes | Ahora |
|---|---|---|
| Display / títulos | Space Grotesk 600–700 (Google Fonts) | **Space Grotesk**, variable 300–700, alojada localmente |
| Texto | Inter (Google Fonts) en 4 páginas, Arial en otras 4, la del sistema en el popup | **Hanken Grotesk**, variable 100–900, alojada localmente |

- **Space Grotesk** es la voz de la marca y se mantiene en títulos, cifras y el logo tipográfico del popup.
- **Inter se reemplaza** por Hanken Grotesk: el brief prohíbe Inter como fuente por defecto, y en la práctica el texto no tenía una familia consistente. Hanken Grotesk es una grotesca del mismo carácter que Inter (neutra y legible a 13–16 px), pero con terminales más abiertas que acompañan a Space Grotesk.
- Ambas fuentes son libres (SIL OFL 1.1) y se sirven desde `frontend/assets/fonts/` y `extension/popup/fonts/`. **No hay CDN**: la CSP de la extensión no lo permitiría y la web carga más rápido.

## 4. Forma

| Elemento | Antes | Ahora (token) |
|---|---|---|
| Radio de controles | 8–10 px | `--radius-sm` 8 px |
| Radio de botones e inputs | 10–12 px | `--radius-md` 10 px |
| Radio de tarjetas y paneles | 14–20 px | `--radius-lg` 16 px |
| Sombra de tarjeta | `0 1px 2px … 0 4px 16px` | Solo en lo que flota (`--shadow-2`, `--shadow-3`). Las tarjetas en reposo se separan por un paso de tono y un borde. |
| Espaciado | Valores sueltos (13, 14, 18, 22 px) | Escala de 4 px |

## 5. Estilo de componentes (antes)

- **Botones:** sólidos índigo con radio medio. Variantes "ghost" con borde. Feedback `translateY(1px)` al pulsar.
- **Inputs:** borde de 1 px gris claro, foco con borde índigo y halo de 3 px.
- **Tarjetas:** blancas con borde y sombra suave; en el dashboard, iconos en cuadros de color (patrón genérico que se elimina).
- **Inicio:** dos mitades (índigo con logo y botón, blanco con ilustración).
- **Login / registro:** caja blanca centrada sobre índigo con círculos decorativos.
- **Ilustración** (`Image_right_side.png`): estilo plano índigo + menta, una persona frente a un formulario que se va marcando. Es material real de la marca y se mantiene en el inicio y en el panel de autenticación.

## 6. Tono

Español neutro, cercano, en segunda persona ("Tu perfil listo en un clic"). Mensajes que dicen qué pasó y qué hacer. Los textos funcionales (botones, errores, estados) no cambian en el rediseño. Se tradujeron al español los rótulos que estaban en inglés en login/registro ("Log in", "Password", "Sign up !").
