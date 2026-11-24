# [Interfaz] Velocidad del juego: ×1,5 y ×2

**Estado:** Completada (24 nov 2026, 0.17.4) · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** ninguna · **Bloquea a:** ninguna · **Origen:** petición de Carmine del 23 nov 2026. Tentativa TT-002, revisada el 24 nov 2026

## Contexto
Carmine quiere poder acelerar el tiempo del juego durante la partida, a ×1,5 y a ×2, para que las rondas largas o ya conocidas se hagan menos pesadas. Quiere saber también si se puede hacer con lo que ya existe, sin cambios exagerados ni profundos (ver "Factibilidad técnica").

Hoy (verificado el 24 nov 2026, en 0.17.3):
- El tablero avanza en `BoardScene.update` (`src/game/scenes/BoardScene.ts:578`), que llama a `advance(delta)` (`:914`) con el `delta` de Phaser. `advance` pasa ese `delta` a las tres reglas que cuentan el tiempo: `stepRound` (`:918`, preparación y salida de los grupos), `stepIncome` (`:924`, goteo) y `stepCombat` (`:930`). Ninguna otra regla mira el reloj.
- `stepCombat` (`src/game/core/combat.ts:657`) reparte cualquier `dtMs` en pasos de 50 ms como mucho (`MAX_STEP_MS`, `combat.ts:283`). Un test ya comprueba que un fotograma largo da lo mismo que varios cortos (`combat.test.ts:365`).
- `stepRound` (`src/game/core/rounds.ts:490`) y `stepIncome` (`src/game/core/economy.ts:38`) solo suman `dtMs` a sus relojes. El tiempo que sobra al acabar la preparación ya cuenta para el ataque.
- Los tours solo salen en la preparación, y mientras hay uno la preparación no descuenta (`holding`, `BoardScene.ts:917`; `useTours.ts:91` y `:136`). La pausa para la escena entera con `this.sys.pause()` (`applyPause`, `BoardScene.ts:547`): `update` no corre. El aviso de desbloqueo, la ficha y las viñetas también pausan (`halted`, `src/App.tsx:220`).
- Lo que dura y es una regla se pinta desde el estado. El paso de los gusanos sale de `enemy.x` (`wormView.ts:578`), la cuenta de la mina de `mine.fuseMs` (`mineView.ts:177`), la granada de `flightMs` y `fuseMs` (`grenadeView.ts:111` y `:226`), el salto del Skipper de `hop.ms` (`bugView.ts:368`) y el aviso del poema de Elk Cloner de `recital.ms` (`wormView.ts:312`).
- Otras cosas van con el reloj y los tweens de la escena (`this.time`, `this.tweens`), no con el estado:
  - las animaciones de cada evento: el mordisco dura 300 ms (`wormView.ts:690`) y el retroceso al disparar, 200 ms (`plantView.ts:213`);
  - el decorado (`ambience.ts`: pájaros, mariposas, viento) y los bocadillos de los jefes;
  - las monedas que quedan en el suelo (`spawnDroppedCoin`, `BoardScene.ts:2694`), que se van a los `ECONOMY.dropLifetimeMs` (8 s, `balance.ts:61`);
  - el retraso de la pantalla de derrota y la espera del jefe que salta desde donde se preparaba (`OMEN_LEAP_MS`, 520 ms, `creeperView.ts:44`, usada en `BoardScene.ts:981`).
- Dos animaciones fijas dependen de una duración de las reglas. El bocadillo del poema de Elk Cloner dura `ELK_CLONER.poemWarnMs` (5 s, `elkClonerView.ts:144`), y el jefe se ve a los `OMEN_LEAP_MS` de salir.
- Phaser 4.2.1 tiene `timeScale` en el reloj (`this.time.timeScale`) y en los tweens (`this.tweens.timeScale`) de cada escena. Hoy el juego no los usa.
- El HUD de la derecha (`hud-right`, `src/App.tsx:595`) lleva las vidas, el saldo y el botón de pausa. Las teclas P y Esc se leen en `src/App.tsx:495` y `:501`. H, N, M, J, K, L y S son atajos solo de desarrollo (`bindDebugKeys`, `BoardScene.ts:845`).
- Desde 0.17.2 (HUD del móvil) la ronda va al lado de los corazones si cabe y, si no, debajo (`useHudFit`, `src/ui/useHudFit.ts`, que mide el ancho de `hud-right`; CSS en `src/styles.css:1315` y `:1334`). La barra de la sobrecarga va debajo de la pausa. Un botón más en `hud-right` lo ensancha: en el móvil la ronda bajará debajo de los corazones más a menudo.
- El sonido ya recorta los efectos que se repiten (`minGapMs`, `maxVoices` y `burst`, `src/game/audio/voices.ts:28`).
- Los bots de `npm run sim` usan su propio paso fijo (`STEP_MS`, `src/game/sim/bot.ts:448` y `:459`), sin la escena.
- Los ajustes del aparato van en `rebrote.ajustes` (`src/ui/useSettings.ts:46`). La partida guardada es el `MatchState` (ADR-0010).
- Las velocidades se escriben con el formato del idioma: `formatNumber` (`src/i18n/index.ts:64`) da "1,5" en español y "1.5" en inglés (`docs/guias/idiomas.md`).

## Factibilidad técnica
**Veredicto: se puede hacer con lo que existe, sin cambios profundos.** El combate es una simulación pura por pasos (ADR-0008). Acelerar es darle más tiempo de juego por cada fotograma, `advance(delta * velocidad)`, en un solo sitio. No hay que tocar ninguna regla, ni el guion, ni el balance, ni la partida guardada.

Por qué es seguro:
- **Las reglas no cambian.** Lo que pasa en 1 s de juego es igual a ×1 que a ×2; solo pasa en menos tiempo real. Los números de balance siguen valiendo y `npm run sim` da lo mismo.
- **No se cuelan balas ni se pierden mordiscos.** `stepCombat` corta cualquier `dtMs` en pasos de 50 ms. A 60 fps y ×2, cada fotograma trae unos 33 ms de juego: sigue siendo un paso. A 30 fps y ×2, unos 67 ms: dos pasos. La lógica apenas cuesta más: en T-002 era un 5 % del tiempo, y lo caro es pintar (`graficos.md`, sección 13).
- **La pausa sigue igual.** Con la escena en pausa, `update` no corre, a cualquier velocidad. Los tours tampoco cambian: salen en la preparación, que con tour no descuenta.
- **Lo que se pinta desde el estado se acelera solo:** paso de los gusanos, saltos, cuentas de minas y granadas, avisos de los jefes, barras y cuenta atrás.
- **Nada nuevo en lo guardado.** La velocidad no va en `MatchState`: ni `SAVE_VERSION` (regla 8) ni `PROGRESS_VERSION` (regla 11) cambian.

Lo que hay que tocar (estimado):

| Pieza | Cambio | Tamaño |
|---|---|---|
| `src/game/config/balance.ts` | Las velocidades: 1, 1,5 y 2 (regla 2) | 3 líneas |
| `src/game/core/` (por ejemplo, `speed.ts`) | Función pura con test: la velocidad siguiente y validar una recibida | ~20 líneas |
| `src/game/EventBus.ts` | Un evento de React a la escena con la velocidad | 2 líneas |
| `BoardScene.ts` | Guarda la velocidad, escucha el evento y la aplica en `advance` | ~10 líneas |
| HUD (React) | El botón junto al de pausa, con su estilo en el móvil | componente pequeño |
| `src/i18n/es.ts` y `en.ts` | Nombre, ayuda y etiqueta del botón | 3 o 4 claves |
| `elkClonerView.ts:144` y `BoardScene.ts:981` | El bocadillo del poema y la espera del jefe, divididos por la velocidad | 2 líneas |

No hace falta tocar: las reglas de `core` (salvo la función nueva), el guion de los brotes, los números de balance, la partida guardada, el progreso, los perfiles, los bots ni el catálogo.

Lo que hay que vigilar (nada de esto es profundo):
1. **Las animaciones de cada evento van a su ritmo.** Si solo se acelera el `delta`, el mordisco (300 ms), el retroceso (200 ms) y las explosiones siguen durando lo mismo en tiempo real. Caben: a ×2, un mordisco llega cada 500 ms (`biteIntervalMs`, 1 s, `balance.ts:132`), y los gusanos de Morris más seguidos salen cada 200 ms (`minEveryMs`, 400 ms, `balance.ts:458`), con una salida que se puede solapar. Lo que sí cambia es que a ×2 hay hasta el doble de efectos a la vez. Se prueba con la tecla H en Bajo.
2. **Las dos animaciones atadas a una regla.** Sin corregirlas, a ×2 el bocadillo del poema sigue 2,5 s después del poema y el jefe camina el doble antes de verse.
3. **Las monedas del suelo** van con el reloj de la escena, no con el estado. VJ-01 decide si su vida cuenta en tiempo real o en tiempo de juego.
4. **Más sonidos por segundo.** La limitación de `voices.ts` ya los recorta; se escucha a ×2 con muchas plantas.
5. **Menos tiempo para reaccionar.** Es lo esperado: a ×2 el juego es más difícil de hecho, aunque los números no cambien.
6. **La ficha (T-010)** da los tiempos de las reglas ("muerde cada 1 s"). Se quedan así.

La otra forma, acelerarlo todo con `this.time.timeScale` y `this.tweens.timeScale` (VJ-01 b), también es pequeña. Pero acelera el decorado, acorta la vida de las monedas del suelo y los retrasos de victoria y derrota, y para dejar algo a su ritmo habría que compensarlo tween por tween. Por eso se recomienda la a.

## Objetivos
1. **Partidas más ágiles:** el jugador elige ×1, ×1,5 o ×2 cuando quiera durante la partida.
2. **El mismo juego, más deprisa:** las reglas, el guion y el balance no cambian. A ×2, un minuto de juego dura 30 s.
3. **No se rompe nada de lo que va con el tiempo:** pausa, tours, partida guardada, cambio de calidad o de idioma.

## Alcance
**Incluye:** el control de velocidad en el HUD (y su tecla, si VJ-04 la pide), la velocidad aplicada a la ronda, al goteo y al combate, el ajuste de las dos animaciones atadas a una regla, los textos en español e inglés, los tests y las docs (`01-mecanicas.md`, `graficos.md` y una consecuencia en ADR-0008).
**No incluye:** velocidades por encima de ×2, cámara lenta, acelerar la música o los menús, la portada (`TitleScene`), el Invernadero, el catálogo ni los bots. Tampoco cambia ningún número de balance.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| VJ-01 | ¿Qué se acelera? | **Cerrada (24 nov 2026):** a) solo las reglas (ronda, goteo y combate). Las animaciones de cada golpe, el decorado, los bocadillos y la vida de las monedas del suelo van en tiempo real | Cerrada | Carmine |
| VJ-02 | ¿Se acelera también la preparación? | **Cerrada (24 nov 2026):** a) sí: la cuenta atrás va a la misma velocidad (con un tour en pantalla sigue sin descontar) | Cerrada | Carmine |
| VJ-03 | ¿Cómo es el control? | **Cerrada (24 nov 2026):** a) un botón redondo junto al de pausa que pasa de ×1 a ×1,5, a ×2 y otra vez a ×1, y enseña la velocidad actual | Cerrada | Carmine |
| VJ-04 | ¿Lleva atajo de teclado? | **Cerrada (24 nov 2026):** b) la V, que hace lo mismo que el botón | Cerrada | Carmine |
| VJ-05 | ¿Se recuerda la velocidad? | **Cerrada (24 nov 2026):** a) no: toda partida, nueva o continuada, empieza a ×1; dentro de la partida se mantiene (rondas, pausa, cambio de calidad o de idioma) | Cerrada | Carmine |
| VJ-06 | ¿Desde cuándo se puede usar? | **Cerrada (24 nov 2026):** a) desde la ronda 1 del brote 1 | Cerrada | Carmine |
| VJ-07 | ¿Lleva tour y sonido propios? | **Cerrada (24 nov 2026):** a) no: no es una mecánica ni un gesto (reglas 9 y 10). El botón lleva su ayuda (`title`, `aria-label`) y suena el clic de los botones de siempre | Cerrada | Carmine |

## Criterios de aceptación
### Velocidad
- [x] Las velocidades (1, 1,5 y 2) están en `balance.ts`, y ningún otro archivo las escribe a mano.
- [x] Una función pura de `src/game/core/` da la velocidad siguiente y descarta una velocidad que no está en la lista, con test.
- [x] `advance` recibe el `delta` multiplicado por la velocidad, y con él avanzan `stepRound`, `stepIncome` y `stepCombat`. La preparación, según VJ-02.
- [x] Con un tour en pantalla, la preparación sigue sin descontar a cualquier velocidad (`holding` sigue dando 0 a `stepRound`; comprobado en el código, no con un tour en pantalla).
- [x] La pausa, el aviso de desbloqueo, la ficha y las viñetas siguen parando el juego a cualquier velocidad. Al volver, sigue la velocidad que había.
- [x] El decorado, el arrastre y la recolocación siguen con el `delta` real (salvo que VJ-01 diga b).
- [x] El bocadillo del poema de Elk Cloner y la espera del jefe que salta duran lo mismo en tiempo de juego a cualquier velocidad: `poemWarn(warnMs / speed)` y `leapTo(foot, OMEN_LEAP_MS / speed)` en los cuatro jefes, con la misma espera para su vista (en el código; no mirado en pantalla).
- [x] Las monedas del suelo se comportan según VJ-01.

### Control
- [x] El control de VJ-03 está en el HUD durante la partida y enseña la velocidad actual ("×1", "×1,5", "×2"; en inglés, "×1.5"), con el número formateado con el idioma.
- [x] La velocidad la guarda React y se la manda a la escena por `EventBus`, también cuando la escena arranca (`sceneReady`), como `tourHold`. Así sobrevive al cambio de calidad o de idioma.
- [x] Si VJ-04 lo pide, la tecla hace lo mismo que el botón, y no hace nada con un menú abierto o mientras se escribe.
- [x] La velocidad se recuerda (o no) según VJ-05.
- [x] La velocidad no va en `MatchState`: `SAVE_VERSION` no cambia.
- [x] Textos en `src/i18n/es.ts` y `en.ts` (`docs/guias/idiomas.md`): nombre y ayuda del botón. Sin "poder", "tienda" ni "comprar".

### Móvil
- [x] Probado en horizontal a 812 × 375 y 568 × 320: el botón cabe en `hud-right` sin tapar el saldo, las vidas, la pausa ni lo que se juega (lista "HUD o menú nuevo" de `graficos.md`). A 568 px con cuatro cartas la pausa se salía 7 px (23 con un saldo de cinco cifras): por debajo de 600 px el HUD junta sus columnas y encoge un poco corazones, moneda y botones (`styles.css`).
- [x] Con el botón nuevo, `useHudFit` sigue decidiendo bien: la ronda va al lado de los corazones o debajo sin solaparse, y la barra de la sobrecarga (Morris, brote 4) y la del jefe siguen sin tapar el césped.

### Calidad
- [x] Tests (`speed.test.ts`): el de la función de velocidad; a ×2 con fotogramas que dan pasos de 50 ms, el combate es idéntico al de pasos de 50 ms; con fotogramas de 33 y 67 ms el resultado es el mismo (el gusano cae, sin vidas perdidas, a menos de dos pasos de cuando cae a ×1: los cortes de los pasos no coinciden, así que el estado no es idéntico al milisegundo). La ronda y el goteo, a ×2, acaban en la mitad de fotogramas.
- [x] Prueba de rendimiento (tecla H) a ×2 en Bajo y en Ultra: 60 FPS con 15 plantas, 72 gusanos y la sobrecarga encendida (Chrome sin ventana en la RTX 4060; en un móvil no se ha medido).
- [ ] Se escucha a ×2 con muchas plantas: los disparos no saturan. **Sin escuchar:** lo recortan `minGapMs`, `maxVoices` y `burst` (`voices.ts`), pero falta oírlo.
- [x] Docs: `01-mecanicas.md` (la velocidad y que no cambia las reglas), `graficos.md` (las animaciones atadas a una regla se dividen por la velocidad) y una consecuencia en ADR-0008.
- [x] Versión de parche (regla 12): es un ajuste de comodidad, como T-045. 0.17.4, con su línea en `CHANGELOG.md`.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- **Un fotograma muy largo a ×2** (equipo lento o pestaña que vuelve): el `delta` ya viene recortado por Phaser (ADR-0008) y `stepCombat` lo reparte en pasos de 50 ms. No hay saltos de balas.
- **Varios grupos en un mismo fotograma:** a ×2 salen juntos más a menudo, porque `stepRound` suelta en un paso todo lo que ya tocaba. Con 33 o 67 ms por fotograma, la diferencia no se ve.
- **Cambiar de velocidad a mitad de un salto, una mina o el poema:** se pinta desde el estado, así que sigue sin saltos. Solo el bocadillo del poema que ya está abierto conserva su duración.
- **Partida continuada:** empieza a ×1, o según VJ-05.
- **Jugador que no sabe que lo ha acelerado:** el botón enseña siempre la velocidad actual.
- **Ficha abierta** a ×2: el juego está en pausa, como siempre.
- **La portada y el catálogo** usan `stepCombat`, pero sin esta velocidad: no cambian.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Toca el botón de velocidad una vez | Pasa a ×1,5: los gusanos avanzan y las plantas disparan un 50 % más deprisa |
| Lo toca otra vez | ×2. Un mordisco cada 0,5 s de tiempo real; la ficha sigue diciendo "cada 1 s" |
| Lo toca otra vez | Vuelve a ×1 |
| Pausa a ×2 y continúa | Sigue a ×2 |
| Cambia la calidad gráfica a ×2 | La partida continúa a ×2 |
| Preparación a ×2 | La cuenta atrás baja el doble de rápido (si VJ-02 es a) |
| Elk Cloner anuncia su poema a ×2 | El bocadillo dura 2,5 s, lo mismo que tarda el poema |
| Cae una moneda al suelo a ×2 | Dura 8 s de tiempo real (si VJ-01 es a) |
| Sale al menú y continúa la partida | Empieza a ×1 (si VJ-05 es a) |

## Cómo probarlo (QA)
1. Empezar el brote 1 y, en la preparación, tocar el botón: la cuenta atrás se acelera (si VJ-02 es a).
2. En el ataque, probar ×1,5 y ×2: los gusanos, las balas y el goteo van más deprisa y el juego va fluido.
3. Pausar y continuar, cambiar la calidad y el idioma: la velocidad se mantiene.
4. Con `?brote=2`, llegar a Elk Cloner con la N y mirar el bocadillo del poema a ×2.
5. Con la H, la prueba de rendimiento a ×2 en Bajo, con "Mostrar FPS".
6. En el móvil, en horizontal, a 812 × 375 y 568 × 320: el botón cabe y se toca bien.
7. Salir al menú y continuar: la velocidad según VJ-05.
