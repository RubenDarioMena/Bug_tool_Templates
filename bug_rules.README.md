# bug_rules.csv — guía de configuración Live

`bug_rules.csv` reúne el comportamiento de la herramienta. Sus columnas no
cambian de significado según el tipo de fila.

## Encabezado

```text
form_id,rule_type,rule_id,when_expression,action,target,value,severity,color,group,message,editor_condition,setting_name,setting_value
```

## `rule_type=setting`

Settings globales reutilizables por fields, conditions, tiles y media.

```csv
GLOBAL,setting,issue_re,,,,,,,,,,issue_re,^DEMO-[0-9]+$
GLOBAL,setting,default_environment,,,,,,,,,,default_environment,Local - datos sintéticos
```

Usa `setting_name` y `setting_value`. Un field lo referencia como
`@issue_re` o `@default_environment`.

## `rule_type=condition`

Aplica una acción a un field cuando la expresión es verdadera.

```csv
bug,condition,failures_bound,failures > attempts,error,failures,Las reproducciones no pueden superar los intentos,,,,,,,
```

Columnas relevantes:

- `form_id`, `rule_id`: identidad estable.
- `when_expression`: DSL booleana (`AND`, `OR`, `NOT`, `=`, `!=`, `<`, `<=`,
  `>`, `>=`, `empty`, `notEmpty`, `contains`, `isAll`, `in`, `matches`, `not matches`). Los
  cuatro comparadores relacionales son exclusivamente numéricos; `=<` y `=>`
  no son aliases válidos y `=` continúa significando igualdad.
- `action`: `show`, `hide`, `disable`, `setDefault`, `valueOf` o `error`.
- `valueOf` calcula el valor de una salida compuesta en cada evaluación. En
  campos editables sólo rellena cuando el destino está vacío. Su columna
  `value` acepta texto, `@regla` y referencias `{idCampo}` al valor lógico de
  otro campo del mismo formulario, incluidos mirrors calculados. Un mirror con
  `include_in_output=no` en Fields funciona como variable sin línea propia.
- `target`: field que recibe la acción.
- `value`: default o mensaje, según la acción.
- `editor_condition`: `yes` cuando pertenece al editor del propio field.

## Referencias de la DSL

- `key` es la Key global de la instancia/ticket activo.
- `checklist[0]` es la primera selección y `checklist.length` su cantidad
  efectiva. Cuando está activa “Todas”, se usan todas las opciones disponibles.
- `media:media1:type` es el tipo y `media:media1:name` el nombre generado.
- En una checklist, `campo = "Android"` y `campo contains "Android"`
  comprueban pertenencia; `campo in ("Android", "iPhone")` acepta cualquier
  intersección.
- Los IDs y operadores son canónicos y sensibles a su sintaxis; las
  comparaciones de texto continúan siendo insensibles a mayúsculas.

## REGEX: escritura y negación

En la casilla REGEX de un field se escribe el patrón sin delimitadores `/…/`
y sin comillas envolventes, o una referencia `@regla`. Distingue mayúsculas y
valida sólo valores no vacíos; `required` controla el vacío. Para checklists y
keywords se aplican sus validadores específicos, no la REGEX del field.

Conditions, condiciones de error del editor y tiles comparten estas expresiones:

```text
key matches "^DEMO-\d+$"
key not matches "^DEMO-\d+$"
NOT (key matches @issue_re)
key notEmpty AND key not matches @issue_re
```

`not matches` equivale a `NOT (… matches …)`. `matches` ignora mayúsculas y,
en colecciones, basta con que coincida un elemento; su negación exige que no
coincida ninguno e incluye el campo vacío. Los valores se evalúan sin espacios
en los extremos. Una referencia de campo inexistente invalida toda la condición.

Se busca una coincidencia parcial: `^` y `$` exigen el valor completo. No se
admiten delimitadores `/patrón/i` ni flags añadidos al patrón. En la UI y CSV se
escribe `\d`; dentro del JSON se representa como `\\d`. El parser de Conditions
no interpreta escapes de comillas: elige comillas simples o dobles para envolver
el patrón según su contenido; usa una `@regla` si contiene ambos tipos.

Una REGEX inválida devuelve falso en `matches`; negarla devuelve verdadero,
igual que el `NOT` histórico. En validación de field, una REGEX inválida se
ignora en ejecución (los editores validan su sintaxis al guardarla).

El buscador de Rules acepta regex ignorando mayúsculas y, si es inválida, busca
el texto literal. Los templates de output/Media sustituyen placeholders, no
interpretan regex. Una `@regla` guarda texto: su significado depende del lugar
que la utiliza.

## `rule_type=tile`

Muestra contexto o errores en la barra superior.

```csv
bug,tile,product_context,product notEmpty,,product,Producto: {product},warn,blue,Contexto,,,,
```

Columnas relevantes: `when_expression`, `target`, `value` (texto visible),
`severity` (`warn` o `error`), `color`, `group` y `message`.

## Reglas de edición

1. No cambies el encabezado ni el nombre `bug_rules.csv`.
2. Mantén `rule_id` estable para que Settings compare propiedades y detecte
   conflictos correctamente.
3. No pongas listas ni fields aquí: usa Data o Fields.
4. Guarda como CSV UTF-8 separado por comas.
5. Actualiza con F5 y revisa **Settings → Cambios de configuración → Rules**.

Si una expression o target conserva el ID de un field, form o `@setting` que ya
no existe, Live sí se carga y Settings lo marca como **Relación huérfana** en
Live ↔ Tester y Cambios de configuración. Desde el aviso se puede borrar del Tester
la condition o tile afectada; el CSV fuente no se modifica. Una expresión con
sintaxis ilegible, un ID duplicado, una action o severidad desconocida sí
bloquea los tres CSV y conserva el último Live válido.
