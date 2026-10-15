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
Cerrar el popup descarta las correcciones pendientes. Cambiar la etiqueta visible
de una opción (`option.label`) también invalida la confirmación, aunque su valor
interno y su posición sigan iguales.

## Historial de uso

Después de confirmar, el popup registra en `/logs` únicamente el dominio de la
página y las claves de los campos completados. No envía los valores del perfil
ni la ruta, los parámetros o el fragmento de la URL. Si la página interrumpe la
aplicación después de completar algunos campos, solo se registran esas claves.

Previsualizar, cancelar, confirmar sin escribir y borrar no generan registros de
uso. El envío al historial es independiente del formulario: un fallo o una
respuesta lenta del backend no bloquea el popup ni el botón de borrado. La
petición al historial tiene un límite de cinco segundos y no se reintenta sola.

## Borrar el autocompletado

**Borrar autocompletado** vacía los controles que FillPro haya escrito en el
documento actual, sin consultar la API, modificar el perfil ni enviar el
formulario. También funciona si el backend está desconectado, siempre que el
panel de acciones esté disponible.

Se conservan los campos omitidos, los valores que FillPro no modificó y las
correcciones posteriores. También se conservan controles reemplazados, ocultos,
no editables o que hayan cambiado de identidad, formulario o contexto. El popup
informa cuántos campos borró y cuántos conservó.

El borrado deja los campos vacíos; no restaura su valor anterior. En un selector
elimina la selección, incluso si no existe una opción vacía. Los eventos de la
página pueden rechazar o repoblar un campo: esos casos no se cuentan como borrados.

Este registro temporal de campos borrables, distinto del historial de uso de la
web, se acumula entre autocompletados mientras siga abierto el mismo
documento y se conserva al cerrar/reabrir el popup. No se guarda en disco y se
pierde al recargar la página o la extensión. Cada borrado consume ese historial
(incluidos los campos conservados) e invalida la vista previa pendiente. No se
intenta adivinar qué valores provienen de versiones anteriores de FillPro.

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
8. Después de autocompletar, corrige la ciudad directamente en el formulario.
   Cierra/reabre el popup y pulsa **Borrar autocompletado**: deben vaciarse los
   demás campos escritos por FillPro y conservarse la ciudad corregida. El perfil
   guardado no cambia. Repetir el borrado sin otro autocompletado no modifica nada.

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

`npm test` cubre el motor original, el backend, la previsualización y el borrado
en jsdom. `npm run test:browser` ejecuta el popup y todos los content scripts
en un navegador real, simulando únicamente el transporte de Chrome y la API.
También comprueba que el historial respete los campos confirmados y los fallos
de red. Las suites de `tests/historial/` que requieren MySQL se omiten desde la
raíz si no hay configuración de base de datos; no equivalen a una prueba de la
API real. Ejecútalas solo con una base de pruebas aislada, siguiendo las
indicaciones de sus archivos, porque crean y eliminan usuarios de prueba.
