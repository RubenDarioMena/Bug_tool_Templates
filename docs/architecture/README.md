# Arquitectura runtime con Archify

Este directorio contiene el mapa de arquitectura runtime de Bug Report Tool,
generado con [Archify 2.17](https://github.com/tt-a1i/archify). El diagrama se
basa en evidencia del repositorio fijada al commit
`7b754d3ad12133bc904527df9e59589cdcbb7de8`; sus marcadores `SRC` enlazan a
las líneas verificadas de esa revisión.

## Resultado

| Comprobación | Resultado |
| --- | --- |
| Tipo | `architecture` |
| Perfil | `showcase` |
| Validación determinista | 9/9 checks, 0 errores, 0 advertencias |
| Evidencia de repositorio | 22 referencias verificadas |
| Evidencia automatizada de navegador | Aprobada |
| Viewports | 1440×900, 1600×1000, 1920×1080 y 2048×1320 |
| Temas inspeccionados | Claro y oscuro |
| Revisión visual | Aprobada; 0 rondas de corrección posteriores a la entrega |
| SHA-256 de la especificación | `fc3895a1f916778ebe7c55500cdacaabef3dd1ec3dfd68a37c37f977d714fdc1` |
| SHA-256 del HTML | `b0607ee3de4bd37bf1eae79705e8324bd8365e64781cc7b306fea837264db55a` |

La composición documenta el arranque directo o mediante el launcher de
Windows, el servidor HTTP limitado a loopback, la carga Live de los tres CSV,
el fallback embebido, la combinación de overrides y snapshots, los formularios
y Rules, la generación de output y Media, la persistencia en `localStorage` y
la salida por portapapeles o archivos descargados.

Archify no ofrece locale español para los controles fijos del visor en esta
versión. El contenido del diagrama está en español, mientras que esos controles
y el atributo `lang` del HTML usan el fallback en inglés.

## Artefactos

- `bug-tool-runtime.architecture.html`: visor interactivo autocontenido.
- `bug-tool-runtime.architecture.json`: especificación tipada y reproducible.
- `bug-tool-runtime.architecture.visual-check.json`: recibo automatizado ligado
  al hash del HTML.
- `bug-tool-runtime.architecture.visual-check.html`: hoja de contacto de QA.
- `bug-tool-runtime.architecture.visual-check.*.png`: capturas de evidencia en
  claro y oscuro para 1440×900 y 2048×1320.

## Flujo reproducible

Con la skill `archify` instalada en `~/.codex/skills/archify`, desde su
directorio se ejecutó:

```bash
node bin/archify.mjs doctor
node bin/archify.mjs validate architecture \
  /ruta/al/repositorio/docs/architecture/bug-tool-runtime.architecture.json \
  --quality showcase --repo-root /ruta/al/repositorio --json
node bin/archify.mjs deliver architecture \
  /ruta/al/repositorio/docs/architecture/bug-tool-runtime.architecture.json \
  /ruta/al/repositorio/docs/architecture/bug-tool-runtime.architecture.html \
  --quality showcase --repo-root /ruta/al/repositorio --json
node bin/archify.mjs visual-check \
  /ruta/al/repositorio/docs/architecture/bug-tool-runtime.architecture.html \
  --json
```
