# [Interfaz] Móvil: solo en horizontal, panel de nivel en las filas de abajo y ronda en pantalla pequeña

**Estado:** Completada (20 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** S (orientativo) · **Depende de:** T-011 · **Bloquea a:** ninguna · **Origen:** pedidos de Carmine del 20 nov 2026 al probar en un móvil ("que solo se vea en landscape, con feedback entendible"; "se pierde el menú para subir de nivel en las plantas de las últimas filas"; "en pantalla pequeña, que mejor diga la ronda donde se está")

## Contexto
Al abrir el juego en un móvil de pie, el tablero sale diminuto en medio de mucho cielo y no se puede jugar. Además, en un móvil en horizontal el panel de subir de nivel de las plantas de las filas de abajo se sale de la pantalla (no cabe encima por el HUD y lo pone bajo los pies), y la ronda ocupa mucho con su fila de semillitas.

## Objetivos
1. En un móvil o una tableta en vertical, un aviso claro de que hay que girar la pantalla, con el juego parado detrás.
2. El panel de nivel siempre dentro de la pantalla, también en las filas de abajo de un móvil en horizontal.
3. En pantalla pequeña, la ronda dice en cuál se está sin la fila de semillitas.

## Alcance
**Incluye:** aviso de girar (React, animado, en los dos idiomas), pausa de la partida y bucle de Phaser dormido mientras se ve, bloqueo en horizontal a pantalla completa donde se pueda, colocación del panel de nivel a un lado de la planta, ronda compacta.
**No incluye:** instalar el juego como aplicación (PWA), girar el juego con CSS, cambios de reglas o de balance.

## Decisiones
| # | Pregunta | Decisión (20 nov 2026) | Decide |
|---|---|---|---|
| M-01 | ¿Girar el juego o pedir que se gire el móvil? | Pedir que se gire, con un aviso animado; donde el navegador lo deja (Android a pantalla completa), además se bloquea en horizontal. Ver ADR-0011 | Claude (lo pedido: "solo landscape, con feedback") |
| M-02 | ¿Qué cuenta como móvil? | Pantalla táctil en vertical (`pointer: coarse`): móviles y tabletas. Una ventana de escritorio estrecha no | Claude |
| M-03 | ¿Qué pasa con la partida al ponerse en vertical? | Se pausa (como al cambiar de pestaña) y el juego duerme; al girar sale el menú de pausa | Claude |
| M-04 | ¿Dónde va el panel de nivel si no cabe ni encima ni debajo? | A un lado de la planta (derecha; si no cabe, izquierda), con la flechita apuntándola. Si no cabe en ningún sitio, donde haya más hueco, dentro de la pantalla | Claude |
| M-05 | ¿Qué es "pantalla pequeña" para la ronda? | Menos de 860 px de ancho o 560 de alto, lo mismo que el HUD compacto: "Ronda 3 de 10" sin semillitas | Claude |

## Criterios de aceptación

Comprobados el 20 nov 2026 con tests de Vitest (el nuevo `levelPanelPlace.test.ts`; 278 en total) y en el Chromium por software del equipo de desarrollo, emulando un móvil táctil:
- 390 × 844 y 360 × 640 (español e inglés) y tableta 768 × 1024 en vertical: sale el aviso sobre la portada; al pasar a 844 × 390 desaparece y la portada carga.
- Partida en marcha en horizontal, girada a vertical: aviso con "Tu partida te espera en pausa"; de vuelta a horizontal, el menú de pausa está abierto.
- Panel de nivel con disparadoras en las filas 1, 3, 4 y 5 y en las columnas 1, 2, 5 y 9, a 762 × 343, 568 × 320 y 1600 × 900: siempre dentro de la pantalla; en las filas de abajo del móvil sale a un lado, y en escritorio, encima como antes.

- [x] En un móvil o una tableta en vertical, el aviso de girar tapa todo, se entiende (dibujo animado y texto) y está en español y en inglés.
- [x] Mientras se ve el aviso, el juego no avanza (bucle de Phaser dormido) y la partida queda en pausa para cuando se gire.
- [x] Una ventana de escritorio estrecha no muestra el aviso (la consulta pide pantalla táctil; no se pudo probar en el navegador, porque la emulación táctil no se apaga sin recargar).
- [x] A pantalla completa, el dispositivo se bloquea en horizontal donde el navegador lo permite (pendiente de probar en un Android de verdad: QA para Carmine).
- [x] El panel de nivel no se sale de la pantalla en las filas de abajo de un móvil en horizontal.
- [x] Con menos de 860 px de ancho o 560 de alto, la ronda dice "Ronda N de 10" sin semillitas.
- [x] `npm test` y `npm run build` pasan; ADR-0011, guía de gráficos y `CLAUDE.md` al día.

## Cómo quedó (para tareas siguientes)
- **Aviso de girar:** `src/ui/RotateNotice.tsx`, consulta y bloqueo en `src/ui/useLandscapeOnly.ts` (`useNeedsLandscape`, `lockLandscape`), bucle dormido con `setGameAsleep` (`createGame.ts`) a través de la prop `asleep` de `GameCanvas`. `App` pausa la partida al ponerse en vertical. `z-index` 10: todo lo demás va por debajo.
- **Panel de nivel:** la escena manda también `right` y `left` en `PlantPanel` (`LOOK.panelSide`). La colocación es la función pura `placeLevelPanel` (`src/ui/levelPanelPlace.ts`), que esquiva cada pieza del HUD que le cae encima (no el HUD entero). Clases `is-above`, `is-below`, `is-right` e `is-left`, con la flechita en `--arrow`.
- **Ronda:** `.round-progress` se oculta con `(max-width: 860px), (max-height: 560px)`.
