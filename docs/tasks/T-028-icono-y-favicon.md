# [Web] Icono del juego y favicon

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** S (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-029 · **Origen:** pedido de Carmine del 21 nov 2026

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

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| W-01 | ¿Qué enseña el icono? | a) El brote del logo (las dos hojas que salen de la O). b) La cara de la disparadora. c) Una R con brote | a: es el nombre del juego, se lee en pequeño y no depende del aspecto de ninguna planta | Carmine |
| W-02 | ¿Fondo? | a) Transparente. b) Ficha de color con esquinas redondeadas | b para los iconos de aplicación (iPhone no admite transparencia); el de la pestaña puede ir sin fondo | Carmine |
| W-03 | ¿Cuál se queda? | Una de las propuestas | Se decide con la galería delante | Carmine |

## Criterios de aceptación
### Propuestas
- [ ] Una página de desarrollo enseña 3 propuestas, cada una a 16, 32, 180 y 512 píxeles, sobre fondo claro y sobre fondo oscuro.
- [ ] Cada propuesta se ve también recortada en círculo y en cuadrado redondeado, como la recortará Android.
- [ ] Nada cambia en el juego hasta que W-03 esté respondida.

### Icono definitivo
- [ ] La pestaña del navegador muestra el icono, en tema claro y en tema oscuro.
- [ ] A 16 píxeles se distingue la forma; no es una mancha.
- [ ] Al añadir el juego a la pantalla de inicio de un iPhone, el icono sale sin borde negro ni transparencia.
- [ ] La versión para Android no pierde ninguna parte del dibujo al recortarse en círculo.
- [ ] Todos los tamaños salen del mismo dibujo maestro con un solo comando, y el resultado está en el repositorio.
- [ ] El color de la barra del navegador en móvil combina con la portada.

### Calidad
- [ ] El dibujo es propio y está hecho por código o a mano en SVG; no usa material de terceros.
- [ ] Los archivos generados pesan poco (el de 512, menos de 50 kB).
- [ ] La guía de gráficos explica cómo regenerarlos.
- [ ] `npm test` y `npm run build` pasan.

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
