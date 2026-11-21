# [Web] Instalar el juego como aplicación (PWA)

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-028 · **Bloquea a:** ninguna · **Origen:** pedido de Carmine del 21 nov 2026

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
**Incluye:** manifiesto, service worker, botón "Instalar" en la portada, instrucciones para iPhone, aviso de versión nueva, ADR (sugerido ADR-0017) y nota en ADR-0001 y ADR-0011, textos en español e inglés.
**No incluye:** publicar en tiendas de aplicaciones, notificaciones, sincronizar progreso entre dispositivos.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| V-01 | ¿Con qué se hace? | a) `vite-plugin-pwa` (su versión 2 admite Vite 8, comprobado el 21 nov 2026). b) Manifiesto y service worker a mano | a: resuelve la caché de archivos con nombre cambiante en cada build | Claude Code al implementar |
| V-02 | ¿Qué se ve en iPhone? | a) Nada. b) El botón abre una ayuda con los dos pasos (Compartir, "Añadir a pantalla de inicio") | b | Carmine |
| V-03 | ¿Cómo llega una versión nueva? | a) Sola, al abrir la próxima vez. b) Aviso "Hay una versión nueva" con botón | a, aplicada solo en la portada, nunca en mitad de una partida | Carmine |
| V-04 | ¿Instalada se abre a pantalla completa? | Sí o no | Sí, y en horizontal (ADR-0007 y ADR-0011) | Carmine |
| V-05 | ¿Se guarda el audio para jugar sin conexión? | Sí o no | Sí: pesa poco. La música (T-015), solo cuando se haya oído una vez | Carmine |

## Criterios de aceptación
### Botón
- [ ] En Chrome y Edge, con el juego sin instalar, la portada muestra "Instalar".
- [ ] Al pulsarlo sale el diálogo de instalación del navegador; si el jugador acepta, el botón desaparece.
- [ ] Si el jugador cancela, el botón sigue ahí y vuelve a funcionar.
- [ ] Abierto como aplicación instalada, el botón no aparece.
- [ ] En un navegador que no permite instalar (Firefox de escritorio), el botón no aparece.
- [ ] En iPhone y iPad, según V-02.

### Instalada
- [ ] Tiene el nombre "Rebrote" y el icono de T-028.
- [ ] Se abre sin barra de direcciones y en horizontal.
- [ ] Con el modo avión puesto, se abre y se juega una ronda entera con sonido.
- [ ] La partida guardada y el progreso se conservan al cerrar y abrir.

### Versiones
- [ ] Tras publicar una versión nueva, el jugador la recibe según V-03 sin tener que borrar nada.
- [ ] Una versión nueva nunca se aplica en mitad de una partida.
- [ ] El número de versión de la portada coincide con lo publicado (ADR-0017).

### Calidad
- [ ] El service worker solo actúa en la versión publicada, no en `npm run dev`.
- [ ] Las páginas de desarrollo (`sonidos.html`, `disparadoras.html`) no se publican ni se guardan en caché.
- [ ] ADR nuevo y notas en ADR-0001 y ADR-0011.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

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
