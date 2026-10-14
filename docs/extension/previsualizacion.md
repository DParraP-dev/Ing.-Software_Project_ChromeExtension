# Previsualización del autocompletado

El popup permite revisar los datos antes de escribirlos en el formulario:

1. **Previsualizar autocompletado** consulta el perfil y detecta los controles,
   sin modificar el formulario ni disparar sus eventos.
2. La vista previa muestra el valor actual y el sugerido. Puedes corregir los
   valores, desmarcar campos o cancelar. Los campos con datos existentes aparecen
   desmarcados; reemplazarlos requiere seleccionarlos explícitamente.
3. **Confirmar y autocompletar** escribe únicamente los valores seleccionados y
   no vacíos. No guarda correcciones en el perfil ni envía el formulario.

## Compatibilidad y seguridad

La detección reutiliza el motor modular de `autofillService`: catálogo completo
del perfil, reglas de portales, habilidades, correo de la cuenta, formatos de
teléfono y fechas, selectores y campos numéricos. Se conservan las réplicas de
LinkedIn y Computrabajo y la detección en shadow roots abiertos e iframes del
mismo origen. Los iframes de otro origen siguen fuera del alcance.

Cada vista previa pertenece al documento y a la pestaña revisados. Si un control
cambia de valor, identidad, opciones, formulario o disponibilidad, hay que volver
a previsualizar. Se valida todo el lote antes de escribir y se comprueba cada
campo otra vez durante la aplicación, incluidos los eventos del portal. Si la
página cambia durante la escritura se detiene el resto y se informa el avance.

Los valores se escriben con setters nativos y eventos compatibles con los
frameworks de los portales. Los selectores usan índices internos de opción para
distinguir opciones con el mismo `value`; el usuario ve sus etiquetas normales.
El mensaje antiguo `FILLPRO_AUTOFILL` se rechaza para no saltarse la confirmación.
Cerrar el popup descarta las correcciones pendientes.

## Prueba manual

1. Inicia el backend y guarda un perfil desde el frontend. Si vienes de una
   versión anterior a la ampliación del perfil, sigue la migración indicada en
   el README principal.
2. Recarga FillPro desde `chrome://extensions` y recarga la página del formulario.
3. Sirve solo la carpeta de la extensión: desde la raíz ejecuta
   `python -m http.server 5500 --bind 127.0.0.1 --directory extension` y abre
   `http://127.0.0.1:5500/test-form.html`.
4. Inicia sesión en el popup, previsualiza y comprueba que el formulario no cambie.
5. Corrige el nombre, omite GitHub y confirma. Debe escribirse solo lo seleccionado.
6. Repite con **Cancelar**. Comprueba también que los datos escritos manualmente
   aparezcan desmarcados al abrir otra vista previa.
7. Repite con las réplicas de `extension/test-forms/` y comprueba que la selección
   y los formatos del motor de compatibilidad sigan funcionando.

## Pruebas automatizadas

Desde la raíz:

```sh
npm ci
npm test
npm run test:browser
```

La suite de navegador requiere Chrome instalado. Puedes elegir otro canal con
`FILLPRO_BROWSER_CHANNEL` (por ejemplo, `msedge`). Usa un perfil temporal y una
API simulada: no necesita credenciales, no usa tu perfil de Chrome y no modifica
MySQL. `FILLPRO_SCREENSHOT_DIR` permite guardar capturas con datos ficticios.

`npm test` cubre el motor original, el backend y los casos de previsualización
en jsdom. `npm run test:browser` ejecuta el popup y todos los content scripts
en un navegador real, simulando únicamente el transporte de Chrome y la API.
