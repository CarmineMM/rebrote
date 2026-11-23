# [Interfaz] Soltar la carta elegida tocando donde no se puede jugar

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** S (orientativo) · **Depende de:** ninguna · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 23 nov 2026

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

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| SC-01 | ¿Qué toques sueltan la carta? | a) Solo fuera del tablero. b) Fuera del tablero y en una casilla donde no se puede jugar (ocupada, infusión bloqueada, el elemento ya puesto). c) b, salvo "sin moneda" | b): es lo que pidió Carmine y lo que hace el panel de nivel. "Sin moneda" también la suelta: la casilla ya avisa en rojo antes del toque | Carmine |
| SC-02 | Con una carta elegida, tocar una disparadora donde no se puede jugar (por ejemplo, la carta de disparadora sobre otra disparadora), ¿además abre su panel de nivel? | a) Solo suelta la carta. b) Suelta la carta y abre el panel de esa planta | a): un toque, una cosa. El siguiente toque ya abre el panel | Carmine |
| SC-03 | ¿Tocar otra vez la carta elegida en la bandeja la suelta? | a) Sí, como los inventos del panel izquierdo. b) No, se queda como hoy | a) | Carmine |
| SC-04 | Arrastrar la carta y soltarla fuera del tablero o en una casilla que no vale, ¿la suelta? | a) Sí, igual que un toque. b) No, como hoy: la carta sigue elegida | a): quien arrastra a un sitio que no vale casi siempre quiere echarse atrás. Hay que cuidar que el toque corto sobre la carta (que hoy dispara `cardDropped` sobre la propia carta) no la suelte justo después de elegirla | Carmine |
| SC-05 | ¿Suena algo al soltarla? ¿Lleva tour? | a) Sin sonido nuevo ni tour: no es una mecánica, es lo que ya hace el panel de nivel. b) Un sonido suave de "soltar" | a) | Carmine |

## Criterios de aceptación
### Soltar la carta
- [ ] Con una carta elegida, un toque fuera del tablero (en el decorado, sin tocar el HUD) la suelta sin cobrar.
- [ ] Con una carta elegida, un toque en una casilla donde no se puede jugar la suelta según SC-01, sin cobrar ni sembrar.
- [ ] Un toque en una casilla donde sí se puede sigue jugando la carta, como hoy.
- [ ] Tocar otra vez la carta elegida se comporta según SC-03.
- [ ] Arrastrar y soltar la carta se comporta según SC-04.
- [ ] Tocar una disparadora con una carta elegida se comporta según SC-02.
- [ ] Al soltarse, la bandeja deja de marcar la carta, se borran el resaltado, el fantasma y el rótulo del tablero, y el HUD deja de enseñar el precio de infundir.
- [ ] Tocar una moneda con una carta elegida la recoge y no suelta la carta (hoy, un toque sobre una moneda no llega al tablero).
- [ ] Un doble toque sobre una planta con una carta elegida no abre su ficha (como hoy) ni deja el juego en un estado raro.

### Calidad
- [ ] Esc y el botón derecho siguen soltando la carta.
- [ ] Los tours que piden sembrar (disparadora, minas, muro) siguen funcionando: si el jugador suelta la carta a mitad del tour, la mano vuelve a señalar la carta.
- [ ] Si la regla de "qué toque suelta la carta" sale de la escena, va en `core` con test (regla 1).
- [ ] `docs/specs/01-mecanicas.md` (cómo se juega una carta) al día.
- [ ] Probado en táctil a 812 × 375 y 568 × 320, y con ratón a 1600 × 900.
- [ ] `npm test` y `npm run build` pasan.

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
