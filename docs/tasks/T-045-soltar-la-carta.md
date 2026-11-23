# [Interfaz] Soltar la carta elegida tocando donde no se puede jugar

**Estado:** Completada (23 nov 2026, 0.16.3) · **Prioridad:** Alta · **Tamaño estimado:** S (orientativo) · **Depende de:** ninguna · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 23 nov 2026

## Contexto
Carmine, jugando en el móvil: al tocar una carta de la bandeja de arriba (disparadora, mina de fuego, mina de hielo, escudo), la carta queda elegida y no hay forma de soltarla. Al final obliga a sembrarla en algún sitio.

Hoy (verificado en 0.16.2, 23 nov 2026):
- Con una carta elegida, un toque en el tablero llama a `tryPlay` (`src/game/scenes/BoardScene.ts`, en `bindPointer`). Si la casilla no vale (`cardPlay(...).blocker` no es null: ocupada, sin moneda, infusión aún bloqueada, el elemento ya puesto) o el toque cae fuera del tablero (`cell` null), `tryPlay` vuelve sin hacer nada y la carta sigue elegida.
- Soltar la carta tras arrastrarla fuera del tablero tampoco la suelta, a propósito (`onDropped` en `bindHud`: "Soltar fuera del tablero (o un simple clic en la carta) no cobra ni siembra: la carta sigue elegida").
- Volver a tocar la carta elegida la vuelve a elegir (`cardPicked`), no la suelta.
- Solo la sueltan Esc (`selectionCancelled`, desde el HUD) y el botón derecho del ratón. En el móvil no hay ninguno de los dos.

El panel de nivel de las disparadoras ya funciona como pide Carmine: "Un clic fuera de las plantas cierra el panel de nivel" (`pickPlant(null)` en el mismo `POINTER_DOWN`). Los inventos (T-021) también: tocar fuera del tablero los suelta sin gastarlos (`powerDown`) y tocar otra vez el elegido en el panel lo suelta (`onPowerPicked`).

## Objetivos
1. **Que en el móvil se pueda soltar una carta** sin jugarla.
2. **Que se comporte como el panel de nivel y los inventos:** tocar donde no se puede la suelta.
3. **No soltarla por accidente** cuando el jugador sí quería jugarla.

## Alcance
**Incluye:** soltar la carta con un toque donde no se puede jugar (en el tablero o fuera de él) y al tocar otra vez la carta elegida, en táctil y con ratón; tests de la regla si sale a `core`; guías al día.
**No incluye:** cambiar las reglas de dónde se puede sembrar o infundir, los inventos (ya se sueltan bien), el arrastre de plantas para fusionar.

## Decisiones
Cerradas por Carmine el 23 nov 2026, todas con la recomendación.

| # | Pregunta | Decisión |
|---|---|---|
| SC-01 | ¿Qué toques sueltan la carta? | Fuera del tablero y en cualquier casilla donde no se puede jugar (ocupada, aún bloqueada, el elemento ya puesto), también sin moneda: la casilla ya avisa en rojo |
| SC-02 | Con una carta elegida, tocar una disparadora donde no se puede jugar, ¿abre su panel de nivel? | No: solo suelta la carta. El siguiente toque ya abre el panel |
| SC-03 | ¿Tocar otra vez la carta elegida la suelta? | Sí, como los inventos del panel izquierdo |
| SC-04 | Arrastrar la carta y soltarla donde no se puede, ¿la suelta? | Sí, igual que un toque. Un toque corto en la carta no cuenta como soltarla |
| SC-05 | ¿Sonido o tour? | Ninguno de los dos: no es una mecánica nueva |

## Criterios de aceptación
### Soltar la carta
- [x] Con una carta elegida, un toque fuera del tablero (en el decorado, sin tocar el HUD) la suelta sin cobrar.
- [x] Con una carta elegida, un toque en una casilla donde no se puede jugar la suelta según SC-01, sin cobrar ni sembrar.
- [x] Un toque en una casilla donde sí se puede sigue jugando la carta, como hoy.
- [x] Tocar otra vez la carta elegida se comporta según SC-03.
- [x] Arrastrar y soltar la carta se comporta según SC-04.
- [x] Tocar una disparadora con una carta elegida se comporta según SC-02.
- [x] Al soltarse, la bandeja deja de marcar la carta, se borran el resaltado, el fantasma y el rótulo del tablero, y el HUD deja de enseñar el precio de infundir.
- [x] Tocar una moneda con una carta elegida la recoge y no suelta la carta (hoy, un toque sobre una moneda no llega al tablero).
- [x] Un doble toque sobre una planta con una carta elegida no abre su ficha (como hoy) ni deja el juego en un estado raro.

### Calidad
- [x] Esc y el botón derecho siguen soltando la carta.
- [x] Los tours que piden sembrar (disparadora, minas, muro) siguen funcionando: si el jugador suelta la carta a mitad del tour, la mano vuelve a señalar la carta.
- [x] Si la regla de "qué toque suelta la carta" sale de la escena, va en `core` con test (regla 1).
- [x] `docs/specs/01-mecanicas.md` (cómo se juega una carta) al día.
- [x] Probado en táctil a 812 × 375 y 568 × 320, y con ratón a 1600 × 900.
- [x] `npm test` y `npm run build` pasan.

## Cómo quedó (23 nov 2026, 0.16.3)
- **Regla:** `cardTap(state, card, cell)` en `src/game/core/match.ts` dice si el toque juega la carta (`'play'`) o la suelta (`'release'`): fuera del tablero (`cell` null) o con cualquier `blocker` de `cardPlay`. Tests en `match.test.ts` (sembrar, infundir, fuera, ocupada, el elemento ya puesto, sin moneda, antes de su ronda).
- **Escena:** `tryPlay` (`BoardScene.ts`) suelta la carta con `select(null)` cuando `cardTap` dice `'release'`. Lo usan el toque en el lienzo y `cardDropped`, que ya no se salta los toques fuera del tablero. El toque usa la misma casilla que el resaltado (`cardCellAt`). Tomar la carta elegida la suelta (`onPicked`, SC-03).
- **Carta (`Card.tsx`):** pulsar la carta elegida solo avisa a la escena, sin arrastre. Con una sin elegir, solo se manda `cardDropped` si el puntero llega a salir de la carta: un toque, aunque el dedo se mueva un poco, la deja elegida. La elegida se puede soltar aunque ya no alcance la moneda.
- **Lo que no cambia:** tocar una moneda la recoge sin soltar la carta (el toque no llega al tablero, `over.length > 0`). Esc y el clic derecho siguen igual. El doble toque sobre una planta con una carta elegida: el primero suelta la carta y el segundo, ya sin carta, selecciona la planta, sin ficha.
- **Probado** en Chromium sin GPU con toques de pantalla táctil a 812 × 375 y 568 × 320 (elegir y tocar fuera, tocar la carta dos veces, sembrar tocando y arrastrando, tocar y arrastrar a una disparadora, toque movido dentro de la carta, tour de la ronda 1 tras soltar la carta: la mano sigue señalando la carta) y con ratón a 1600 × 900 (clic fuera, Esc, clic derecho y dos clics en la carta). Queda para Carmine, en un móvil de verdad: el toque con el dedo entre dos casillas.

## Casos límite y riesgos
- El HUD de arriba tapa la fila del fondo en pantalla pequeña: un toque sobre el HUD no llega al lienzo y no debe soltar la carta por pasar "fuera del tablero".
- La casilla a la que apunta una carta de elemento puede ser la de la disparadora que se ve delante (`cardCellAt`). El toque que suelta la carta tiene que usar la misma casilla que el resaltado, para que lo que se ve en rojo sea lo que suelta.
- Con la ronda en combate un toque puede caer justo cuando una planta muere y la casilla se libera: se juega lo que diga la casilla en el momento del toque.
- **Riesgo:** soltar la carta por un toque que quería jugarla (dedo gordo entre dos casillas). Por eso la casilla ya se ve en rojo antes del toque con ratón; en táctil no hay hover, así que vale la pena probarlo con el dedo en las dos medidas pequeñas.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Móvil: toca la carta de disparadora y luego el césped de fuera del tablero | La carta se suelta; no se cobra nada |
| Toca la carta de disparadora y luego una casilla con una disparadora | La carta se suelta (SC-01) y no se abre el panel (SC-02) |
| Toca la carta de fuego y luego una disparadora que ya tiene hielo | La carta se suelta |
| Toca la carta de fuego y luego una casilla vacía con moneda suficiente | Mina de fuego, como hoy |
| Toca la carta de hielo y vuelve a tocar la carta de hielo | La carta se suelta (SC-03) |
| Con ratón, pulsa Esc con una carta elegida | La carta se suelta, como hoy |

## Cómo probarlo (QA)
1. En el móvil en horizontal (o el navegador a 812 × 375 con táctil): elegir cada carta y tocar fuera del tablero.
2. Elegir cada carta y tocar una casilla donde no se puede jugar.
3. Elegir una carta y tocarla otra vez.
4. Arrastrar una carta fuera del tablero y soltarla.
5. Seguir el tour de la disparadora (brote 1, ronda 1) soltando la carta a mitad.
