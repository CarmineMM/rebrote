# [Plantas] Arrancar: quitar una planta y recuperar la mitad de lo que costó

**Estado:** Completada (23 nov 2026, 0.17.0) · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna (mejor después de T-045) · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 23 nov 2026

## Contexto
Carmine quiere que el jugador pueda quitar una planta del tablero y recuperar el 50 % de lo que le costó. La mecánica se estrena en la **ronda 4 del brote 3** (Brain).

**Nombre propuesto: "Arrancar"** (en inglés, *Uproot*). Es lo que se hace con una planta en un huerto, se entiende sin explicarlo y no choca con el vocabulario fijo (regla 5): no es "fusionar", "infundir", "nivel" ni "invento", y no se parece a "recolocar", el invento que mueve una disparadora a otra casilla. Descartados: "desplantar" (poco usado), "podar" (es cortar ramas, no quitar la planta), "vender" (suena a "tienda", que no se le dice al jugador, T-036), "trasplantar" (se confunde con recolocar). En el código: `uproot`.

Hoy (verificado en 0.16.2, 23 nov 2026):
- Una planta solo sale del tablero cuando la destruyen en combate (`plantDestroyed`) o al fusionarla con otra.
- `Shooter` (`src/game/core/plants.ts`) guarda `element`, `cannons` y `level`. No guarda lo que se gastó en ella. Sembrar cuesta `COSTS` (`balance.ts`: disparadora 100, fuego 75, hielo 75, escudo 150); subir de nivel e infundir cuestan su precio por el número de cañones; fusionar no cuesta nada pero junta lo gastado en dos plantas; el nivel base (T-023) es gratis.
- Al tocar una disparadora se abre su panel de nivel (`LevelPanel.tsx`, `pickPlant` en `BoardScene.ts`), desde la ronda que desbloquea `levelUp` (brote 1, ronda 2). Los muros y las minas no tienen panel.
- La ronda 4 del brote 3 ("Mezcla: acorazados ocultos y Skipper", `docs/specs/06-brote-3-brain.md`) no desbloquea nada (`unlocks: []` en `OUTBREAKS`).
- Los desbloqueos son `Feature` (`src/game/core/rounds.ts`), cada uno con su tour (`TOUR_OF_FEATURE`, regla 9) y su aviso al empezar la ronda. Lo de un brote vencido vale en los anteriores (regla 15, `carriedFeatures`).

## Objetivos
1. **Dar al jugador una salida** cuando una planta ya no sirve donde está: mal colocada, de un elemento que no conviene contra las tropas nuevas o para hacer sitio a un escudo.
2. **Que no salga gratis:** se pierde la mitad, así que colocar sigue importando.
3. **Que se entienda en el móvil** con un gesto claro y difícil de hacer sin querer.

## Alcance
**Incluye:** regla pura en `core` con test (qué se puede arrancar y cuánto se devuelve), registrar lo gastado en cada planta, gesto y botón, `Feature` nueva `uproot` en la ronda 4 del brote 3 con su aviso y su tour (regla 9), su sonido (regla 10) y su animación, `SAVE_VERSION` nuevo (regla 8), textos en español e inglés, vocabulario en la spec y las guías.
**No incluye:** devolver semillas, deshacer una fusión (arrancar quita la planta fusionada entera), arrancar enemigos u obstáculos, cambios en el invento de recolocar, un bot que arranque en `npm run sim`.

## Decisiones
Cerradas por Carmine el 23 nov 2026, todas con la recomendación.

| # | Pregunta | Decisión |
|---|---|---|
| AR-01 | Nombre para el jugador | Arrancar (*Uproot*) |
| AR-02 | ¿Qué es "lo que ha costado la planta"? | Todo lo gastado en ella: sembrarla, sus niveles, sus infusiones (también lo que costó la mina o el muro arrastrado para infundirla) y, si es una fusión, lo gastado en las dos de origen. El nivel base gratis (T-023) no cuenta. Se guarda en la planta (`SAVE_VERSION` nuevo) |
| AR-03 | Redondeo del 50 % | Hacia abajo: siempre enteros, nunca más de la mitad. El 50 % va en `balance.ts` |
| AR-04 | ¿Qué se puede arrancar? | Disparadoras (con o sin elemento) y muros. Las minas no |
| AR-05 | ¿Cuándo se puede arrancar? | Siempre, también en combate, como subir de nivel |
| AR-06 | Una planta herida, ¿devuelve menos? | No: la mitad de lo gastado, esté como esté |
| AR-07 | Gesto | Botón "Arrancar" en el panel de nivel, que pide un segundo toque para confirmar ("¿Arrancar? +75") |
| AR-08 | Muros: no tienen panel | Tocar un muro abre un panel pequeño solo con "Arrancar" |
| AR-09 | ¿Quién lo anuncia en la ronda 4 del brote 3? | Patty, como los demás desbloqueos de planta |
| AR-10 | Rejugando un brote anterior con el brote 3 vencido, antes de poder subir de nivel | Se puede arrancar: tocar la planta abre el panel solo con "Arrancar" |

## Criterios de aceptación
### Regla
- [x] En `core`, una función pura dice si una planta se puede arrancar y cuánto devuelve; otra la quita del estado y suma la moneda. Con tests: disparadora recién sembrada, subida de nivel, infundida, fusionada (AR-02), muro (AR-04), nivel base comprado, redondeo (AR-03), bloqueada antes de su ronda.
- [x] Lo gastado en cada planta se guarda en el estado y se mantiene al subir de nivel, infundir, fusionar (suma las dos) y recolocar.
- [x] El porcentaje va en `balance.ts`. Ningún número fuera (regla 2).
- [x] La forma de `MatchState` cambia: `SAVE_VERSION` sube y `src/game/save.ts` comprueba el campo nuevo (regla 8). Sin migración: la partida guardada de antes se descarta.

### En la partida
- [x] `uproot` es una `Feature` nueva que se desbloquea en la ronda 4 del brote 3, con su aviso (AR-09).
- [x] Antes de esa ronda no se puede arrancar ni se ve el botón.
- [x] Con el brote 3 vencido, se puede arrancar en los brotes 1 y 2 desde su ronda 1 (regla 15, AR-10), y también en el brote 4.
- [x] El gesto es el de AR-07, enseña lo que se recupera antes de confirmar ("+75") y no arranca con un solo toque sin querer.
- [x] Al arrancar: la planta sale del tablero con su animación, la moneda vuelve al saldo y el contador lo celebra, y la casilla queda libre para sembrar en el acto.
- [x] Si la planta muere o la arrastran para fusionar mientras el botón espera la confirmación, el panel se cierra y no se cobra nada.
- [x] En combate (si AR-05 a) los enemigos que mordían esa planta siguen andando, como cuando muere.

### Tour, sonido y arte
- [x] Tour propio en `TOUR_OF_FEATURE` y `TOURS` (regla 9): la mano toca una disparadora del tablero y luego el botón "Arrancar"; una frase corta por paso en `tour.steps` y su dibujo en `TourPicture`. Lista "Mecánica nueva" de `docs/guias/graficos.md`.
- [x] Sonido propio (regla 10): regla en `cues.ts` con test, entrada en `SFX` (`src/game/config/audio.ts`) y fuente en `scripts/audio/manifest.ts`. Se oye en `/tests/sonidos.html`. Lista "Sonido nuevo".
- [x] Animación hecha por código: la planta sale de la tierra (tirón, terrones y la moneda saltando al contador), respeta los niveles gráficos (ADR-0006) y `artInv()`, y usa el reloj y los tweens de la escena para que la pausa la congele (regla 4).

### Calidad
- [x] Vocabulario: "arrancar" en `docs/specs/01-mecanicas.md` (vocabulario y una sección propia) y en la regla 5 de `CLAUDE.md`; ronda 4 en `docs/specs/06-brote-3-brain.md`.
- [x] Textos en español e inglés (`src/i18n/`, `docs/guias/idiomas.md`). No se dice "vender", "tienda", "poder" ni "comprar".
- [x] El panel con el botón nuevo se lee bien y no tapa la planta a 812 × 375 y 568 × 320 (`levelPanelPlace.ts`). En pantallas bajas "Arrancar" va junto al título, así que el panel no crece: se coloca igual que el de siempre. Mientras dura el aviso de una línea de la ronda, el de una planta del centro puede taparla, igual que antes de esta task.
- [x] La ficha de la planta (T-010) no cambia.
- [x] `npm test` y `npm run build` pasan.
- [x] Versión menor (regla 12): mecánica nueva.

## Casos límite y riesgos
- **Fusión (AR-02 b):** dos disparadoras de 100, una subida al nivel 3, se fusionan: lo gastado es la suma de las dos, aunque la fusionada se quede con el nivel más bajo.
- **Nivel base (T-023):** la disparadora nace en nivel 5 gratis; arrancarla recién sembrada devuelve 50, no más.
- **Recolocar:** mover una planta con el invento no cambia lo que se gastó en ella.
- **Brain** y el Skipper saltan las plantas y solo los para un escudo: arrancar un escudo que hacía de puerta los deja pasar. Es la gracia, no un fallo.
- **Riesgo de abuso:** sembrar en la preparación y arrancar al final no da moneda (se pierde la mitad). Arrancar y volver a sembrar en otro carril en pleno combate sí puede ser fuerte: si lo es, se mira AR-05.
- **Riesgo:** el panel de nivel ya es estrecho en 568 × 320; con un botón más puede no caber encima de la planta. Resuelto: en pantallas bajas el botón va junto al título y el panel no crece; entre los dos toques no cambia de ancho, así el segundo cae donde el primero.
- La partida guardada en mitad del brote 3 de antes se descarta (ADR-0014).

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Brote 3, ronda 3: toca una disparadora | Panel de nivel sin "Arrancar" |
| Brote 3, ronda 4: empieza la preparación | Aviso de Patty y tour de arrancar |
| Arranca una disparadora sembrada por 100, sin nada más | +50 |
| Arranca una disparadora de 2 cañones (dos de 100) subida un nivel (×2 = 2 × precio del nivel) | +la mitad de la suma, redondeada hacia abajo |
| Arranca una disparadora de fuego (100 + 75) | +87 |
| Arranca un muro (150) | +75 (si AR-04 b) |
| Toca "Arrancar" una vez y luego fuera del panel | No arranca; el panel se cierra |
| Rejuega el brote 1 con el brote 3 vencido, ronda 1 | Puede arrancar (AR-10) |

## Cómo probarlo (QA)
1. `?brote=3`, avanzar con N hasta la ronda 4: aviso, tour y arrancar una planta.
2. Arrancar una disparadora con fuego, una fusionada y un muro, comparando el saldo antes y después.
3. Arrancar en combate una planta que muerden.
4. Rejugar el brote 1 con el brote 3 vencido y arrancar en la ronda 1.
5. Guardar, salir y volver: lo gastado en cada planta se mantiene.
6. Probar en el móvil a 812 × 375 y 568 × 320.
