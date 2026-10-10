# bug_fields.csv — guía de configuración Live

`bug_fields.csv` describe la estructura visual y el output de los formularios:
forms, sections y fields. Conditions, tiles y settings globales viven en
`bug_rules.csv`; las opciones reutilizables viven en `bug_data.csv`.

## Modelo v3

La primera columna es `record_type` y sólo indica la clase estructural de la
fila:

- `form`: declara una top-tab de formulario.
- `section`: declara una sección dentro de un form.
- `field`: declara un field dentro de una section.

El orden de las filas `form`, `section` y `field` es el orden que se presenta y
el que usa el output. `condition` y `tile` ya no se hacen pasar por tipos de
field.

## Columnas de identidad y estructura

| Columna | Contenido |
| --- | --- |
| `record_type` | `form`, `section` o `field`. |
| `form_id`, `form_label` | ID estable y label del formulario. |
| `section_id`, `section_label` | ID estable y label de sección. |
| `field_id`, `field_label`, `field_type` | Identidad y tipo del field; aparecen inmediatamente después de la sección para facilitar su edición visual. |
| `section_mode` | `lines` o `joined`. |
| `section_heading` | Encabezado fijo del output. |
| `section_separator` | Separador de una sección joined; `NONE` significa pegar. |
| `section_no_gap` | `yes` elimina el gap final de la sección. |

## Columnas comunes de field

| Columna | Contenido |
| --- | --- |
| `source` | Lista de Data, lista dependiente o field origen de un mirror. |
| `size` | `full`, `half`, `third` o `twoThirds`. |
| `required` | `yes` para exigir valor; no desactiva otras validaciones. |
| `default_value` | Valor inicial; admite `@setting` de Rules. En keywords/checklist, un array JSON de strings. |
| `placeholder` | Ejemplo visual cuando el control está vacío. |
| `help_text` | Ayuda debajo del control. |
| `rows` | Altura inicial de un textarea. |
| `template` | Plantilla de output con `{value}`, `{fieldId}` o `{media:mediaN}`. |
| `separator` | Separador propio; `NONE` significa sin separador. |
| `join_previous` | `yes` continúa en la línea previa. |
| `per_line`, `per_line_header` | Plantilla por línea y encabezado opcional. |
| `empty_as`, `omit_value` | Representación de vacío u omisión por valor. |
| `hidden` | `yes` oculta hasta que una condition lo muestre. |
| `include_in_output` | `no` convierte un `mirror` en variable calculada reutilizable sin línea propia; vacío/`yes` conserva su output. |
| `error_color` | Color del tile de validación del field. |
| `regex`, `error_message` | Validación del field; `regex` puede usar `@setting`. |

Las tres columnas menos frecuentes cierran el archivo:

| Columna | Contenido |
| --- | --- |
| `form_media_source`, `form_media_format` | Override opcional de lista y formato de media del form. |
| `system_format` | Formato de `clock` o `date`. |

## Keywords

Las columnas `keyword_*` sólo configuran fields `keywords`:

- `keyword_count`: cantidad exacta, mínima (`>=5`) o `@setting`.
- `keyword_overlap`: `yes` impide repetir keywords en el cuerpo.
- `keyword_mode`: `newline` o vacío para modo unido.
- `keyword_separator`, `keyword_per_chip`, `keyword_header`.
- `keyword_space_commit`: `yes` crea chip con Espacio.

## Checklist

Las columnas `checklist_*` sólo configuran fields `checklist`:

- `checklist_options`: array JSON cuando no usa una lista de Data.
- `checklist_layout`, `checklist_title`.
- `checklist_all_option`: `yes` habilita la opción especial exclusiva.
- `checklist_all_label`, `checklist_all_output`,
  `checklist_all_dependency`, `checklist_all_value`.

Fuera del modo de edición, las secciones sin campos visibles también se
ocultan. Al activarse una condición vuelven a aparecer junto con sus campos;
el editor conserva todas las secciones disponibles.

## Plantillas

- `\n` o `<br>` fuerzan un salto de línea.
- `{{` y `}}` producen llaves literales.
- `{key}` usa la Key de la instancia/ticket activo.
- `{fieldId}` usa el valor lógico de otro field del mismo formulario, incluido
  un `mirror` calculado mediante `valueOf`.
- `{checklist[0]}` usa la primera selección y `{checklist.length}` cuenta las
  selecciones efectivas. “Todas las anteriores” se expande para índices y
  conteo, pero `{checklist}` conserva su `checklist_all_output`.
- `{media:media1:name}` usa el nombre generado y `{media:media1:type}` su tipo.
  `{media:media1}` continúa como alias compatible del nombre.
- IDs, placeholders y plantillas son canónicos y nunca se traducen al cambiar
  el idioma de la interfaz.

Los IDs `key`, `value`, el namespace `media:*` y las formas que terminan en
`[n]` o `.length` están reservados para el resolutor de referencias.

## Flujo de edición

1. Mantén el encabezado exportado por la herramienta.
2. Conserva IDs estables; los snapshots y overrides comparan por ID y propiedad,
   no por número físico de fila.
3. Guarda como CSV UTF-8 separado por comas con el mismo nombre.
4. Actualiza Bug Tool con F5.
5. Revisa **Settings → Cambios de configuración → Fields**.

La carga automática valida los tres CSV antes de activar un nuevo Live. La
lectura sigue aceptando los encabezados v2, el primer orden v3 y el encabezado
v3 inmediatamente anterior sin `include_in_output`; toda exportación nueva usa
el orden v3 documentado.

Si un field conserva una `source`, `regex` o referencia de template cuyo
elemento ya fue eliminado de Data o Fields, Live se activa con una **Relación
huérfana** visible en ambos registros de Settings. El botón del aviso elimina
ese field del Tester mediante un override reversible; no modifica el CSV.

Los defaults múltiples se copian por instancia: `["qa-gate","edge-case"]`
precarga chips y `["PlayStation 5"]` precarga una checklist. Un JSON inválido,
un escalar o un default vacío inicia la colección vacía; se omiten elementos
no textuales, vacíos y duplicados exactos. Los valores ya capturados se conservan
al completar nuevos fields en una sesión existente.
