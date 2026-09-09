# Bug Report Tool

Aplicación autocontenida para crear reportes de bugs y notas de regresión. Se
abre directamente en el navegador o mediante un servidor local opcional que
carga `bug_data.csv`, `bug_fields.csv` y `bug_rules.csv`.

## Inicio rápido

- En Windows, abre `Start Bug Tool.bat`.
- Si prefieres PowerShell, ejecuta `./BugTool_Server.ps1`.
- Para trabajar sin servidor, abre `bug_tool_multilanguage.html`; el archivo
  incluye una configuración de respaldo.

El servidor escucha en `http://127.0.0.1:8765/`. Usa `-NoBrowser` para no abrir
el navegador automáticamente o `-Port 8766` para elegir otro puerto.

## Contenido

- `bug_tool_multilanguage.html`: interfaz en español e inglés, cuatro estilos,
  formularios Bug/Regression, output editable y configuración Live.
- `bug_data.csv`: listas y relaciones dependientes.
- `bug_fields.csv`: formularios, secciones, campos y plantillas de output.
- `bug_rules.csv`: ajustes, validaciones, condiciones y tiles.
- `BugTool_Server.ps1` y `Start Bug Tool.bat`: servidor local y acceso directo.
- `bug_*README.md`: referencia de cada CSV.

La muestra inicial usa datos sintéticos y el namespace `public-demo`. La
configuración y el progreso se guardan localmente en el navegador; no se
conectan servicios externos.

## Personalización

Puedes editar los CSV con cualquier editor compatible con UTF-8 y actualizar la
aplicación con F5. Para cambios de estructura más amplios, usa el botón de
edición del formulario y exporta una copia HTML desde la propia herramienta.

Las condiciones aceptan `AND`, `OR`, `NOT`, comparaciones, listas, referencias
de campos y regex. Ejemplos:

```text
key matches "^DEMO-\d+$"
key not matches "^DEMO-\d+$"
NOT (status = "Closed")
```

Las plantillas de Media pueden usar pestañas internas por formulario. Sus
perfiles se conservan en HTML y sesiones, mientras que los tres CSV mantienen
sus encabezados de intercambio.

## Licencia

Este repositorio se distribuye bajo la [GNU General Public License v3.0 o
posterior](https://www.gnu.org/licenses/gpl-3.0.html). Consulta `LICENSE` para
el identificador SPDX y la referencia oficial del texto completo.
