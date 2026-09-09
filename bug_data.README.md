# bug_data.csv — guía de configuración Live

`bug_data.csv` contiene solamente valores reutilizables: listas raíz, listas
dependientes, relaciones padre/hijo y sus etiquetas. La herramienta canónica
lo lee automáticamente junto con `bug_fields.csv` y `bug_rules.csv` al abrir o
actualizar mediante `Start Bug Tool.bat`.

## Encabezado v3

```text
list_id,parent_list_id,parent_value,value,list_label
```

Cada columna mantiene siempre el mismo significado:

| Columna | Contenido |
| --- | --- |
| `list_id` | ID estable de la lista que consumen los fields. |
| `parent_list_id` | ID de la lista padre; vacío para una lista raíz. |
| `parent_value` | Valor concreto del padre al que pertenece `value`. |
| `value` | Opción reutilizable por la herramienta. |
| `list_label` | Nombre visible opcional. Va al final porque se usa con poca frecuencia y puede repetirse en todas las filas de la lista. |

## Lista raíz

```csv
list_id,parent_list_id,parent_value,value,list_label
platforms,,,Linux,Plataformas
platforms,,,Windows,Plataformas
platforms,,,macOS,Plataformas
```

Para agregar una opción, añade otra fila con el mismo `list_id`.

## Lista dependiente

```csv
list_id,parent_list_id,parent_value,value,list_label
products,,,Informes,Producto
products,,,Documentos,Producto
components,products,Informes,Exportación,Componente
components,products,Informes,Filtros,Componente
components,products,Documentos,Búsqueda,Componente
```

Una lista dependiente puede ser padre de otra, por ejemplo
`producto → componente → función`. `parent_list_id` debe existir en el mismo archivo.

## Reglas de edición

1. No cambies el encabezado ni el nombre `bug_data.csv`.
2. Conserva IDs simples y estables; los fields los referencian literalmente.
3. Usa comillas dobles cuando un valor contenga coma o espacios significativos.
4. No agregues settings o REGEX aquí; viven en `bug_rules.csv`.
5. Guarda como CSV UTF-8 separado por comas.
6. Actualiza Bug Tool con F5 y revisa **Settings → Live**.

Los tres CSV se activan atómicamente. Si cualquiera está incompleto o no es
válido, la herramienta conserva el último Live válido; `bug_data.csv` nunca se
aplica parcialmente por sí solo durante la carga automática.

Una lista dependiente cuyo `parent_list_id` fue eliminado es una **Relación
huérfana**, no un fallo de parsing: Live se activa, Settings la resalta en ambos
registros y permite borrar del Tester esa lista dependiente. El CSV fuente no se
reescribe desde Settings.

## Compatibilidad

La importación manual todavía acepta el formato anterior
`category,key,value,child` y el primer orden v3, con `list_label` en la segunda
posición, para migraciones. La exportación canónica siempre produce el nuevo
orden v3 legible. Las reglas globales del formato anterior se exportan ahora en
`bug_rules.csv`.
