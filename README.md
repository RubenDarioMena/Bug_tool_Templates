# Bug Report Tool

Bug Report Tool es una aplicación portable para capturar bugs, documentar
regresiones y producir reportes listos para copiar. Funciona como un único
HTML autocontenido: no necesita compilación, instalación de paquetes, base de
datos, cuenta de usuario ni servicios externos.

La distribución incluye una muestra sintética precargada y dos formularios
listos para usar: **Bug** y **Regression**. La interfaz puede cambiar entre
español e inglés y ofrece los estilos Día, Noche, Otoño y Neon.

## Inicio rápido

En Windows, abre `Start Bug Tool.bat`. El launcher inicia el servidor local y
abre la herramienta en:

```text
http://127.0.0.1:8765/
```

También puedes iniciarla directamente desde PowerShell:

```powershell
./BugTool_Server.ps1
```

Opciones disponibles:

```powershell
./BugTool_Server.ps1 -NoBrowser
./BugTool_Server.ps1 -Port 8766
```

La opción `-NoBrowser` evita abrir una ventana automáticamente y `-Port` permite
usar otro puerto local. Para una ejecución completamente directa, abre
`bug_tool_multilanguage.html` en cualquier navegador; el HTML contiene una
configuración de respaldo y puede trabajar sin el servidor.

## Qué resuelve

La herramienta combina en una sola interfaz la captura estructurada, la
validación, la generación de output y la preparación de evidencias. El tester
puede llenar un formulario, recibir feedback inmediato, corregir el texto
generado y copiar distintas representaciones sin cambiar de aplicación.

La configuración no está fijada dentro de la lógica de cada control. Los
formularios, campos, listas, reglas y plantillas se describen en los CSV y en
la configuración embebida del HTML. Esto permite adaptar el flujo sin reescribir
la aplicación.

## Formularios e instancias

- Formularios independientes para bugs y regresiones.
- Varias instancias abiertas como pestañas de trabajo.
- Renombrado de instancias y selección de la instancia activa por formulario.
- Transferencia de valores compatibles entre Bug y Regression.
- Preservación de valores escritos cuando se actualiza la configuración.
- Campos organizados en secciones `joined` o `lines`.
- Secciones y campos reordenables con controles visuales o arrastre.
- Diseño adaptable para pantallas grandes y ventanas estrechas.
- Colapsado independiente del encabezado, formulario, output y panel de Media.

## Campos configurables

El editor de formularios permite crear y modificar campos sin tocar el código.
Según el tipo de campo, la herramienta puede mostrar:

- Texto de una línea y áreas multilínea.
- Autocomplete alimentado por listas reutilizables.
- Checklists con selección múltiple, opción especial, layout configurable e
  índices como `campo[0]` y `campo.length`.
- Keywords/chips con unicidad, contador, modo unido o por líneas y detección de
  coincidencias con el cuerpo del reporte.
- Casillas booleanas, fechas y reloj con formatos configurables.
- Mirrors y salidas compuestas que reutilizan valores de otros campos.
- Placeholders, ayudas, valores iniciales, valores vacíos y omisión de líneas.
- Campos ocultos por defecto que aparecen mediante una condición.
- Variables calculadas que pueden alimentar otros campos, reglas, output o
  nombres de Media sin producir una línea propia.

Cada campo conserva un ID estable. Los IDs son los que usan las plantillas y
las reglas, por lo que cambiar una etiqueta visible no rompe las referencias.

## Output editable y formatos de salida

El output se genera a partir del schema y se puede editar antes de copiarlo.
La herramienta mantiene la relación entre cada fragmento visible y el campo
que lo produjo:

- Copiar todo el reporte o copiar secciones concretas.
- Regenerar el output completo.
- Editar manualmente un fragmento sin perder las actualizaciones del resto.
- Detectar qué campos quedaron desconectados después de una edición manual.
- Reconectar solo un campo o recuperar todo el output generado.
- Navegar desde el output hacia el campo de origen.
- Previsualizar el mismo contenido como texto normal, Jira o Markdown.
- Ajustar el tono claro/oscuro de cada preview de salida.
- Abrir un bloc de notas privado con pestañas, altura media o completa.

Las plantillas admiten referencias como `{value}`, `{key}`, `{campoId}`,
`{campo[0]}`, `{campo.length}`, mirrors y propiedades de Media. El idioma de
la interfaz no cambia IDs, valores, plantillas ni el output canónico.

## Validación y Rules

La pestaña Rules reúne validaciones por campo, condiciones entre campos, reglas
globales y tiles informativas. Se pueden configurar:

- Campos obligatorios.
- REGEX directa o referenciada mediante `@regla`.
- Mensajes de error y colores por campo.
- Acciones `show`, `hide`, `disable`, `setDefault`, `valueOf` y `error`.
- Tiles de contexto, advertencia o error con color, grupo y destino navegable.
- Comparaciones de texto, pertenencia y números.
- Condiciones `empty`, `notEmpty`, `contains`, `in`, `not in` e `isAll`.
- Operadores `=`, `!=`, `<`, `<=`, `>` y `>=`.
- Operadores lógicos `AND`, `OR` y `NOT`.
- `matches` y `not matches`, incluidos patrones `@regla`.
- Comparaciones entre dos campos y referencias a `key`, colecciones, mirrors y
  filas de Media.

Ejemplos:

```text
key matches "^DEMO-\d+$"
key not matches "^DEMO-\d+$"
status = "Closed" AND resolution notEmpty
NOT (platform in ("Linux", "macOS"))
```

Las expresiones se validan al editarse y una referencia inexistente no activa
la regla. Las REGEX de los campos se escriben sin delimitadores `/…/`; `^` y
`$` permiten exigir una coincidencia completa.

## Nombres de Media y templates múltiples

El panel de Media genera nombres reproducibles para capturas, videos, logs y
otros tipos configurables. Cada fila tiene un ID estable (`media1`, `media2`, …)
que puede usarse desde Rules, templates y el output:

- Tipos de Media provenientes de una lista editable.
- Formato por sección con `{type}`, `{key}`, fields, listas y mirrors.
- Selector de valores para checklists o keywords con varias selecciones.
- Pestañas de templates independientes por formulario.
- Nombre y formato propios para cada pestaña.
- Filas de Media propias de cada template.
- Selecciones de listas independientes por pestaña.
- Edición con lápiz, alta con `+`, navegación con teclado y pestañas accesibles.
- Copia directa del nombre generado.
- Compatibilidad con referencias `{media:mediaN}`, `:name` y `:type`.

Los templates internos se conservan en el HTML exportado y en las sesiones.
Los tres CSV mantienen su formato de intercambio y no necesitan columnas
adicionales para los perfiles de Media.

## Data y configuración Live

La aplicación puede leer tres archivos CSV desde la misma carpeta:

- `bug_data.csv`: listas raíz, listas dependientes y etiquetas.
- `bug_fields.csv`: formularios, secciones, fields, defaults y formatos.
- `bug_rules.csv`: settings, condiciones y tiles.

Al actualizar con F5, los tres archivos se leen como un conjunto. La aplicación
valida encabezados, referencias, tipos, reglas y plantillas antes de activar la
nueva versión. Si encuentra un problema, conserva el último snapshot válido o
la configuración embebida.

Settings permite revisar:

- Estado de la carga Live.
- Diferencias entre la configuración distribuida y la local.
- Cambios desde la última versión cargada.
- Conflictos entre cambios locales y cambios nuevos.
- Relaciones huérfanas producidas por elementos eliminados.
- Sincronización selectiva o completa.
- Activación independiente de pestañas y selectores de templates de Media por
  formulario.

Los CSV pueden editarse con Excel u otro editor UTF-8. Cada guía `bug_*README.md`
documenta sus columnas, ejemplos y compatibilidad con formatos anteriores.

## Persistencia local y sesiones

- La configuración efectiva se guarda en el almacenamiento local del navegador.
- Cada distribución usa un namespace propio para no mezclar sesiones de otros
  proyectos.
- El progreso de las instancias, Media, output manual, bloc y preferencias se
  restaura al volver a abrir la herramienta.
- Guardar sesión exporta una instantánea transportable con configuración y
  trabajo actual.
- Cargar sesión restaura el estado sin combinarlo parcialmente con otra sesión.
- Exportar herramienta genera un HTML autocontenido con la configuración actual.

## Portabilidad y confidencialidad

La herramienta está pensada para escenarios donde el reporte puede contener
información sensible y debe permanecer bajo control del equipo que lo captura.
Su modelo local reduce la superficie de exposición operativa:

- No requiere conexión a Internet para funcionar.
- No hace llamadas a APIs, servicios cloud, CDNs, fuentes remotas ni cuentas.
- No incluye dependencias de terceros que deban descargarse durante el uso.
- El servidor opcional escucha solo en `127.0.0.1`; no publica un puerto en la
  red local por defecto.
- Solo sirve el HTML y los tres CSV previstos; no ofrece listado de directorios
  ni endpoints de escritura.
- Los datos introducidos permanecen en el navegador y en los archivos locales.
- No hay telemetría, analytics, sincronización automática ni envío silencioso
  de reportes.
- Puede transportarse como una carpeta y ejecutarse en una máquina aislada.
- El HTML directo funciona incluso si el servidor local no está disponible.
- El fallback embebido permite continuar trabajando cuando los CSV no se pueden
  leer temporalmente.

Este diseño evita depender de una plataforma externa para capturar o preparar
un reporte. Los controles del sistema operativo, permisos de carpeta, cifrado de
disco, copias de seguridad y políticas de distribución siguen siendo responsabilidad
del entorno donde se ejecute.

## Diagrama de arquitectura

El flujo runtime completo está documentado en el
[diagrama interactivo de arquitectura](docs/architecture/bug-tool-runtime.architecture.html).
La [especificación y evidencia de validación](docs/architecture/README.md)
incluyen las referencias al código, el recibo de Archify y las capturas de QA
en temas claro y oscuro.

## Estructura de la distribución

```text
bug_tool_multilanguage.html   aplicación y configuración de respaldo
bug_data.csv                  listas y relaciones
bug_fields.csv                schema de formularios y campos
bug_rules.csv                 reglas, condiciones y tiles
BugTool_Server.ps1            servidor loopback opcional
Start Bug Tool.bat            launcher de Windows
DEMO.md                       descripción de la muestra sintética
bug_*README.md                referencia de los CSV
```

No se necesita Node.js, npm ni un proceso de compilación para utilizar la
aplicación. Los archivos se pueden versionar, copiar a un medio extraíble o
mantener en una carpeta controlada por el equipo.
