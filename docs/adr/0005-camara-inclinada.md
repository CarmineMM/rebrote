# ADR-0005: Cámara inclinada sobre un tablero plano

- **Estado:** Aceptada
- **Fecha:** 2026-11-19

## Contexto

El tablero se dibujaba como una cuadrícula plana, sin escenario. Carmine pidió mejores gráficos, que la cámara esté un poco inclinada (como en los juegos clásicos de defensa por carriles) y un fondo animado. El juego ocupa toda la pantalla (ADR-0007), así que el césped pasa a ser una parte de un escenario más grande.

Inclinar la cámara afecta a todo lo que se dibuja y a cómo se traduce un clic a una casilla. Por eso se decide una sola vez.

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| 3D real (three.js) | Cámara libre | Rompe ADR-0002, pesa más, todo se rehace |
| Trapecio con filas iguales | Muy simple | No se siente profundidad: las filas del fondo miden lo mismo que las de delante |
| Perspectiva real (homografía) sobre el tablero plano | Profundidad creíble, la inversa es exacta y barata, todo sigue en 2D | Hay que proyectar cada cosa que se pinta |

## Decisión

Perspectiva real con una homografía, en `src/game/view/perspective.ts`.

- **Lógica:** la lógica del juego trabaja en coordenadas de tablero, en unidades de casilla (`BoardPoint` en `src/game/core/board.ts`). No sabe nada de píxeles. El punto `x: 3.5, y: 2.5` es el centro de la casilla del carril 2 y la columna 3.
- **Vista:** `toScreen` lleva un punto del tablero a la pantalla y `toBoard` hace lo contrario para el puntero, también con el canvas escalado.
- **Objetos de pie:** plantas, enemigos y monedas se dibujan derechos, apoyados en su punto del suelo. Se escalan con `cellWidthAt` (lo del fondo se ve más pequeño) y se ordenan por su `y` en pantalla para que lo de delante tape lo de atrás.
- **Escena:** el diseño mide 1600 × 900. El césped ocupa el centro y la parte baja; el resto es decorado: cielo, colinas, seto, camino, el suelo corrupto por donde saldrán los gusanos y un corte de tierra delante. Las posiciones están en `src/game/view/layout.ts`. Cómo se adapta a pantallas con otra proporción: ADR-0007.
- **Decorado:** el decorado fijo se pinta una vez con Canvas 2D en texturas. Lo animado va encima, en `src/game/view/ambience.ts`.

## Consecuencias

- `BOARD` en `balance.ts` solo guarda carriles y columnas. Tamaños y posiciones en pantalla son de la vista.
- T-002: las velocidades de enemigos y balas van en casillas por segundo. La posición de un gusano es un `BoardPoint` y la vista la proyecta en cada frame.
- El clic se traduce siempre con `toBoard` y `cellAt`. Nunca se divide la posición en píxeles entre un tamaño de casilla.
- La resolución interna depende del nivel gráfico (ADR-0006). La cámara amplía para que las coordenadas de diseño no cambien. Una posición del DOM se lleva al mundo con `camera.getWorldPoint`.
- Convenciones de dibujo (orígenes, sombras, capas, escala de arte): `docs/guias/graficos.md`.
