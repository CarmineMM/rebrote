# [Web] Instalar el juego como aplicación (PWA)

**Estado:** Completada (22 nov 2026, 0.10.0) · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-028 · **Bloquea a:** ninguna · **Origen:** pedido de Carmine del 21 nov 2026

## Contexto
Rebrote es una página web sin más (ADR-0001) y no se puede instalar. El ADR-0011 ya lo preveía: "Si algún día se instala como aplicación (PWA), el manifiesto llevará la orientación horizontal". El juego corre entero en el navegador, así que instalado puede funcionar sin conexión.

Carmine quiere un botón "Instalar" en el menú principal que solo aparezca si el juego no está instalado.

Hechos de la plataforma que condicionan la task:
- En Chrome y Edge (escritorio y Android) la página puede ofrecer la instalación con un botón propio.
- En Safari de iPhone y iPad no existe esa posibilidad: el usuario tiene que ir a Compartir y elegir "Añadir a pantalla de inicio".
- En Firefox de escritorio no se puede instalar.
- Una página no siempre puede saber si ya está instalada cuando se abre desde el navegador.

## Objetivos
1. **Instalable** desde el menú principal donde el navegador lo permita.
2. **Jugable sin conexión** una vez instalado.
3. **Actualizaciones sin sustos:** una versión nueva llega sola y no rompe una partida a medias.

## Alcance
**Incluye:** manifiesto, service worker, botón "Instalar" en la portada, instrucciones para iPhone, aviso de versión nueva, ADR (ADR-0021: el 0017 ya era el del versionado) y nota en ADR-0001 y ADR-0011, textos en español e inglés.
**No incluye:** publicar en tiendas de aplicaciones, notificaciones, sincronizar progreso entre dispositivos.

## Decisiones tomadas
| # | Pregunta | Decisión (22 nov 2026) | Decide |
|---|---|---|---|
| V-01 | ¿Con qué se hace? | a) `vite-plugin-pwa` 2, modo `generateSW` | Claude Code al implementar |
| V-02 | ¿Qué se ve en iPhone? | b) El botón abre una ayuda con los dos pasos (Compartir, "Añadir a pantalla de inicio") y el aviso de que instalado empieza de cero | Carmine (tomó la recomendación) |
| V-03 | ¿Cómo llega una versión nueva? | a) Sola, aplicada solo en la portada o el Invernadero, nunca en mitad de una partida, con una viñeta encima o escribiendo el nombre | Carmine (tomó la recomendación) |
| V-04 | ¿Instalada se abre a pantalla completa? | Sí, y en horizontal | Carmine (tomó la recomendación) |
| V-05 | ¿Se guarda el audio para jugar sin conexión? | Sí: los efectos al instalar (unos 1,3 MB, los dos formatos). La música (T-015), solo cuando se haya oído una vez: irá en `public/audio/musica/` | Carmine (tomó la recomendación) |

Cómo quedó: ADR-0021. Si el jugador cancela el diálogo de Chrome, el navegador no deja volver a abrirlo hasta que avise otra vez; mientras, el botón abre la ayuda con los pasos del menú del navegador, así que sigue funcionando.

## Criterios de aceptación

Comprobados el 22 nov 2026 con Vitest (809 tests), `npm run build` y Chrome 158 sin ventana sobre el build servido en local: Chrome da el juego por instalable sin errores (`getInstallabilityErrors`) y lee el manifiesto entero; el service worker guarda 152 archivos. Con el servidor apagado, el juego abre, empieza una partida y baja los 68 efectos desde la caché, sin un fallo. Publicada otra versión con una partida en marcha: la nueva queda esperando, la partida sigue sin recargar, y al salir al menú la página se recarga sola con la 0.10.0 en el pie y la partida guardada en "Continuar"; la caché vieja se borra. Abriendo de nuevo tras otra publicación, la portada se recarga sola a los tres segundos con la nueva. Los diálogos del navegador se probaron con avisos simulados (aceptar y cancelar), el iPhone con su agente de usuario y `navigator.standalone`, y Firefox con el suyo. Menú y ayuda, en español y en inglés, caben sin desplazarse a 812 × 375 y 568 × 320. No se ha instalado en un Android ni en un iPhone de verdad, ni se ha jugado una ronda entera en modo avión en un móvil (pasos 1 a 4 de QA): queda para Carmine.

### Botón
- [x] En Chrome y Edge, con el juego sin instalar, la portada muestra "Instalar".
- [x] Al pulsarlo sale el diálogo de instalación del navegador; si el jugador acepta, el botón desaparece.
- [x] Si el jugador cancela, el botón sigue ahí y vuelve a funcionar.
- [x] Abierto como aplicación instalada, el botón no aparece.
- [x] En un navegador que no permite instalar (Firefox de escritorio), el botón no aparece.
- [x] En iPhone y iPad, según V-02: el botón abre la ayuda con los dos pasos y el aviso de que empieza de cero.

### Instalada
- [x] Tiene el nombre "Rebrote" y el icono de T-028.
- [x] Se abre sin barra de direcciones y en horizontal: el manifiesto lleva `display: fullscreen` (y `standalone` de reserva) y `orientation: landscape`; en un aparato de verdad, QA.
- [x] Con el modo avión puesto, se abre y se juega una ronda entera con sonido: sin servidor, se abrió, empezó la partida y los efectos se bajaron de la caché; la ronda entera en un móvil, QA.
- [x] La partida guardada y el progreso se conservan al cerrar y abrir.

### Versiones
- [x] Tras publicar una versión nueva, el jugador la recibe según V-03 sin tener que borrar nada.
- [x] Una versión nueva nunca se aplica en mitad de una partida.
- [x] El número de versión de la portada coincide con lo publicado (ADR-0017).

### Calidad
- [x] El service worker solo actúa en la versión publicada, no en `npm run dev`.
- [x] Las páginas de desarrollo (`sonidos.html`, `disparadoras.html`) no se publican ni se guardan en caché: el build solo lleva `index.html` y la caché no tiene ninguna.
- [x] ADR nuevo y notas en ADR-0001 y ADR-0011.
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- **El mayor riesgo: quedarse pegado en una versión vieja.** Un service worker mal configurado sirve el juego antiguo para siempre. Hay que probar el ciclo completo: publicar, abrir, publicar otra vez, abrir.
- **En iPhone, la aplicación instalada no comparte datos con Safari.** Quien jugó en Safari y luego instala empieza de cero. Se acepta mientras el juego esté en desarrollo (ADR-0014: sin exportación de datos). Conviene avisarlo en la ayuda de instalación.
- El jugador desinstala la aplicación: el navegador puede tardar en volver a ofrecer la instalación.
- "Borrar progreso" no debe tocar la caché de archivos, y actualizar la caché no debe tocar el progreso.
- Si cambia la forma de la partida guardada o del progreso entre versiones, lo anterior se descarta (`SAVE_VERSION`, `PROGRESS_VERSION`; ADR-0014). Una actualización puede dejar al jugador a cero: es lo decidido durante el desarrollo.
- El dominio tiene que servir por HTTPS (ya lo hace).

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Chrome en Android, primera visita | Botón "Instalar" en la portada |
| Tras instalar y abrir desde el icono | Sin botón, a pantalla completa y en horizontal |
| Firefox en escritorio | Sin botón |
| iPhone en Safari | Botón que explica los dos pasos |
| Aplicación instalada sin conexión | Se juega con normalidad |
| Se publica la versión 0.2.0 mientras alguien juega la ronda 6 | Termina su partida; al volver a la portada o abrir de nuevo, ya tiene la 0.2.0 |

## Cómo probarlo (QA)
1. Instalar desde Chrome en Android y en escritorio.
2. Poner modo avión y jugar una ronda.
3. Publicar un cambio visible, abrir la aplicación instalada y comprobar que llega.
4. Repetir la instalación en un iPhone.
