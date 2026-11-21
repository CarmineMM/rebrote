# [Web] Icono del juego y favicon

**Estado:** Completada (21 nov 2026, 0.1.1) · **Prioridad:** Alta · **Tamaño estimado:** S (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-029 · **Origen:** pedido de Carmine del 21 nov 2026

## Contexto
El juego no tiene icono: `index.html` no enlaza ningún favicon y en `public/` solo hay audio (verificado el 21 nov 2026). La pestaña del navegador muestra el icono genérico. Además, instalar el juego como aplicación (T-029) exige iconos de varios tamaños.

El arte del juego se hace por código (ADR-0004) y ya hay un precedente de archivos generados por script: los sonidos de `scripts/audio/` con `npm run audio`. Las dos veces que hubo que elegir un diseño (T-016 y T-027) funcionó enseñar propuestas en una galería de desarrollo y que Carmine eligiera.

## Objetivos
1. **Un icono propio** que se reconozca a 16 píxeles y que sirva también como icono de aplicación.
2. **Todos los tamaños** que piden navegadores y móviles, salidos de un solo dibujo.
3. **Elegir viendo:** propuestas reales antes de sustituir nada.

## Alcance
**Incluye:** dibujo maestro en SVG, favicon para la pestaña, icono para iPhone, iconos de 192 y 512 para instalar, versión "maskable" para Android, color de tema, script que genera los archivos (sugerido `npm run icons`), enlaces en `index.html`, nota en la guía de gráficos.
**No incluye:** manifiesto e instalación (T-029), imagen para compartir en redes, cambiar el logo de la portada.

## Decisiones tomadas
| # | Pregunta | Decisión (21 nov 2026) | Decide |
|---|---|---|---|
| W-01 | ¿Qué enseña el icono? | Se aceptó primero el brote del logo (tres propuestas); con la galería delante, Carmine pidió una con la disparadora de ahora y el cielo y el césped de la portada, y se quedó con esa (ver W-03) | Carmine |
| W-02 | ¿Fondo? | Ficha de color: con esquinas redondeadas en el icono de aplicación, cuadrada en iPhone (iOS la redondea) y a sangre en Android. La pestaña, sin fondo | Carmine |
| W-03 | ¿Cuál se queda? | D, "Disparadora": la disparadora en color sobre el cielo y el césped de la portada. Las otras cuatro (brote solo, la "O" del título, brote en la tierra y silueta de la disparadora) siguen en `/iconos.html` | Carmine |

W-01 se aplicó así: la disparadora no se dibuja aparte, sale de su propio pintor (`SHOOTER.paint`) con un contexto de Canvas que escribe SVG (`src/icons/svgCanvas.ts`). El riesgo de "si la planta se rediseña, hay que rehacer el icono" queda en pasar `npm run icons`, y un test falla hasta que se pasa.

## Criterios de aceptación

Comprobados el 21 nov 2026 con Vitest (465 tests), `npm run build` y Chrome sin ventana: el juego enlaza `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` y el color de tema, y los cinco iconos de `icons/` se sirven (200, con su tipo); `dist/` los lleva. En la galería, la pestaña clara y la oscura enseñan el favicon y a 16 px de verdad se ven el bulbo, el ojo y el cañón. La barra `#2a80d2` puesta sobre una captura de la portada se funde con el cielo de arriba. No se ha probado en un iPhone ni en un Android de verdad (pasos 1 a 3 de QA): queda para Carmine.

### Propuestas
- [x] Una página de desarrollo enseña 3 propuestas, cada una a 16, 32, 180 y 512 píxeles, sobre fondo claro y sobre fondo oscuro. Son cinco (`/iconos.html`), y 16 y 32 se ven además ampliados píxel a píxel.
- [x] Cada propuesta se ve también recortada en círculo y en cuadrado redondeado, como la recortará Android.
- [x] Nada cambia en el juego hasta que W-03 esté respondida. Los archivos se probaron en una copia fuera del repositorio hasta la elección.

### Icono definitivo
- [x] La pestaña del navegador muestra el icono, en tema claro y en tema oscuro (`favicon.svg`, y `favicon.ico` para los navegadores sin SVG).
- [x] A 16 píxeles se distingue la forma; no es una mancha.
- [x] Al añadir el juego a la pantalla de inicio de un iPhone, el icono sale sin borde negro ni transparencia: `apple-touch-icon.png` es cuadrado, a sangre y sin canal alfa (RGB).
- [x] La versión para Android no pierde ninguna parte del dibujo al recortarse en círculo: la disparadora cabe en la zona segura (test de `iconArt.test.ts`).
- [x] Todos los tamaños salen del mismo dibujo maestro con un solo comando, y el resultado está en el repositorio (`npm run icons`; dos pasadas dan los mismos archivos).
- [x] El color de la barra del navegador en móvil combina con la portada.

### Calidad
- [x] El dibujo es propio y está hecho por código o a mano en SVG; no usa material de terceros.
- [x] Los archivos generados pesan poco (el de 512, menos de 50 kB): 28 kB el de aplicación y 49 kB el de Android. Un PNG que sin pérdida pasa de 50 kB se guarda con paleta, y si aun así pasa, el script se para sin tocar `public/`.
- [x] La guía de gráficos explica cómo regenerarlos.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Los navegadores guardan el favicon en caché con mucha fuerza: tras cambiarlo puede tardar en verse. Probar en ventana privada.
- Un degradado bonito a 512 puede ser barro a 16: el favicon pequeño puede necesitar una versión simplificada del mismo motivo.
- Si el icono usa una planta y esa planta se rediseña, hay que rehacerlo. Otro motivo para W-01 a.

## Objetivo final con ejemplos
| Dónde | Qué se ve |
|---|---|
| Pestaña de Chrome con tema oscuro | El brote, nítido |
| Marcadores | El mismo icono |
| Pantalla de inicio de iPhone | Ficha de color con el brote, sin borde |
| Icono redondo en Android | El brote entero, centrado |

## Cómo probarlo (QA)
1. Abrir el juego en una ventana privada y mirar la pestaña.
2. Cambiar el navegador a tema oscuro.
3. Añadir a la pantalla de inicio en un iPhone y en un Android.
