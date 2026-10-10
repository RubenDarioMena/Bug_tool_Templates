# Demo QA AAA

La herramienta abre `ACS-18427`, el bug ficticio de Naoe suspendida en una
animación de caída cerca de Himeji Castle. Incluye pasos, build `1.0.0.1842`,
coordenadas, save, resultado actual/esperado y reproducción `4/5`.

Todos los tickets, builds, coordenadas, saves y nombres de evidencia son
inventados. No representan tickets internos de Ubisoft ni plantillas filtradas.
Assassin’s Creed Shadows y Rainbow Six Siege aportan el contexto de las demos;
Project Kestrel es un proyecto completamente ficticio.

## Recorrer los ejemplos completos

En **Sesión → Cargar sesión desde archivo…**, selecciona
[`examples/aaa-qa-session.json`](examples/aaa-qa-session.json). Esta operación
carga la configuración y reemplaza la sesión activa; guarda tu sesión primero
si necesitas conservarla.

La sesión incluye seis pestañas Bug y una Regression, todas válidas:

| Pestaña | Qué demuestra |
| --- | --- |
| Traversal · Himeji | Naoe, contexto del mundo, coordenadas, save y repro 4/5. |
| Crash · PC | GPU/driver, firma, fase, log específico y dump `.dmp`. |
| Performance · lluvia | FPS objetivo/observado, frame time p95 y profiler. |
| Siege · desync | Operador, mapa, ronda, servidor, latencia, pérdida y traza. |
| Kestrel · árabe | Fase de vuelo, vehículo, string ID y texto árabe. |
| Kestrel · controles | Checklist de accesibilidad y expectativa de controles. |
| Regression · corregido | Build candidata, 5 intentos, 0 fallos y video de corrección. |

## Pruebas interactivas sugeridas

Los cambios de texto se validan al salir del campo; los selectores y checklists
aplican al confirmar su selección.

1. **Crash por contenido.** En el ticket inicial, añade `Application crash`
   al resumen, descripción, pasos, resultados, impacto, workaround o notas.
   Aparecerá **Diagnóstico de crash** y serán obligatorios tipo, fase, firma,
   log `.log`/`.txt` y reporte de consola. También detecta keywords y el texto
   del campo de nombres de adjuntos. La regla reconoce `crash`, `crashes`,
   `crashed` y `crashing`, sin distinguir mayúsculas.
2. **Crash explícito.** Selecciona `Crash` en Tipo de incidencia. En PC también
   aparecerán GPU/driver y dump `.dmp`; en consola se exige el código de reporte
   `QA-PS5-CR-18428` (o PS5Pro/XSX/XSS según la plataforma). Añade `Debug log` y,
   en PC, `Crash dump` a las evidencias.
3. **Ocultar otra vez.** Quita la mención positiva y vuelve a `Bug`. La sección
   y sus líneas del output desaparecen. Sus valores se conservan y dejan de
   generar errores hasta volver a mostrarse. El texto inicial `No crash…` no
   activa diagnósticos; también se excluyen las frases simples `without crash`,
   `sin crash`, `not a crash` y `non-crash`. Es una regla de texto configurable,
   no una clasificación semántica de cualquier negación posible. Los campos
   diagnósticos no se usan como disparadores para evitar que se activen solos.
4. **Contexto por proyecto.** Cambia a Rainbow Six Siege: desaparecen misión de
   mundo, clima y hora; aparecen modo y ronda. Personajes, mapas, componentes y
   escenarios tienen listas dependientes. Cambia región para filtrar ubicaciones.
   Los valores que no pertenecen a la selección se señalan como errores.
5. **Rendimiento.** Selecciona `Performance` y deja vacíos FPS o profiler para
   ver los errores. Si los FPS observados cumplen el objetivo, una tile pide
   revisar frame time y picos; no presupone que el bug esté resuelto.
6. **Red.** Selecciona conexión online para revelar servidor, latencia y pérdida.
   Con pérdida mayor que cero se exige una traza `.pcap`/`.pcapng`. `101` en
   pérdida o un valor negativo produce error. `Network / Desync` exige online.
7. **Localización y accesibilidad.** `Localization` pide idioma de destino,
   string ID y ambos textos. `Accessibility` o la casilla Documentar accesibilidad
   muestra ajustes múltiples y comportamiento esperado.
8. **Coherencia.** Prueba 6 reproducciones en 5 intentos, una build con formato
   incorrecto, una ronda fuera de 1–15 o un ID `R6S-…` para Assassin’s Creed.
   Quita la plataforma afectada de la cobertura. Usa “Todas las plataformas”
   para demostrar expansión de la opción especial y conteo de selecciones.
9. **Keywords.** Se requieren al menos 3, únicas y sin repetirlas en el cuerpo.
   `Naoe` demuestra el conflicto con el texto; duplicados también se rechazan.
   El chip `crash` activa diagnósticos, pero puede entrar en conflicto si el
   cuerpo ya contiene esa palabra, incluso dentro de `No crash…`.
10. **Cierre y regresión.** `Resolved`/`Closed` exige resolución y fecha.
    `Verified Fixed` exige intentos, 0 fallos, build distinta y video.
    `Still Present` pide un ticket de seguimiento; `Blocked`, el motivo.

Los nombres de adjuntos y diagnósticos son referencias de evidencia simulada;
no son archivos subidos. El panel **Media** genera nombres como
`ACS-18427_PS5_Repro.mp4` mediante una variable de plataforma calculada.
El formulario de la bandera roja sigue siendo para reportar problemas de la
propia herramienta al servidor local.

La UI, ayudas y errores cambian entre español e inglés. Los valores de las
listas y el reporte canónico permanecen en inglés para compartir tickets.
Las sesiones de esta demo usan el namespace `aaa-qa-demo`, separado de la
muestra anterior `public-demo`, que conserva sus datos locales.

## Configuración y comprobación

Los tres CSV y el respaldo del HTML contienen la misma demo. Puedes cambiar
listas, campos y condiciones desde Data/Rules/Settings y exportar la herramienta
para actualizar el respaldo portable. Los defaults de keywords/checklists se
escriben como arrays JSON en `default_value`, por ejemplo
`["qa-gate","edge-case","physics-loop"]`.

Checks de motor: `node tests/hidden-field-validation.cjs`.
Prueba integrada de la demo: `node tests/aaa-qa-demo.cjs`, con Playwright
resoluble por Node y Google Chrome instalado (`BUG_TOOL_BROWSER` permite elegir
otro canal). La prueba usa su propio servidor y revisa CSV, apertura directa,
importación de los siete ejemplos, campos condicionales, output, Media,
validaciones, idiomas, persistencia y ancho móvil. `BUG_TOOL_SCREENSHOTS` permite
guardar capturas de escritorio y móvil en el directorio indicado.
