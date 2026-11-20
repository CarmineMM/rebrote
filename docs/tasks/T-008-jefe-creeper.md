# [Jefe] Creeper

**Estado:** Completada (20 nov 2026) · **Prioridad:** Baja · **Tamaño estimado:** M (orientativo) · **Depende de:** T-007 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 18 y 19 nov 2026; diseño del jefe cerrado el 20 nov 2026

## Contexto
Tras las rondas del mundo 1 llega el jefe. La idea está en `docs/specs/02-mundo-1-gusanos.md`: Creeper salta de carril, como el original saltaba de máquina en máquina.

Al empezar la task (20 nov 2026) Carmine cerró J-01 a J-05 y amplió el alcance: el mundo 1 pasa de 7 a 10 rondas. En la 8 y la 9 Creeper se prepara: se le ve a la derecha y acelera a los gusanos, que además salen en mayor número. La 10 es el combate contra él.

## Objetivos
1. **Combate de jefe** con una mecánica propia: el salto de carril.
2. **Anticipar al jefe:** dos rondas en las que se le ve prepararse y los gusanos van más rápido.
3. **Cierre del mundo 1** con pantalla de victoria.

## Alcance
**Incluye:** rondas 8 y 9 (gusanos acelerados y más numerosos, Creeper preparándose a la derecha), ronda 10 con Creeper, salto de carril con aviso, copias, golpe al aterrizar, dos fases, barra de vida del jefe, pantallas de victoria y de derrota del combate final.
**No incluye:** mundo 2, recompensas, guardado.

## Decisiones
| # | Pregunta | Decisión (20 nov 2026) | Decide |
|---|---|---|---|
| J-01 | ¿Avisa a qué carril va a saltar? | Sí, con 1 s de aviso (la recomendación). En la fase 2, 0,6 s | Carmine |
| J-02 | ¿Cada cuánto salta? | Al perder cada 20 % de vida (la recomendación). En la fase 2, cada 10 % | Carmine |
| J-03 | ¿Invoca gusanos? | Sí: al saltar deja una copia (un gusano acelerado) en el carril que abandona. En la fase 2, dos | Carmine |
| J-04 | ¿Tiene fases? | Dos. La 2 empieza por debajo del 50 %: deja dos copias, salta más a menudo y avisa menos | Carmine |
| J-05 | ¿Qué pasa con las plantas del carril donde aterriza? | Daña a lo primero sembrado que tiene delante (la recomendación) | Carmine |
| Añadida | ¿A qué carril salta? | Al azar, nunca al suyo (la recomendación) | Carmine |
| Añadida | ¿Qué pasa si cruza el borde izquierdo? | Se pierde la partida, queden las vidas que queden (la recomendación) | Carmine |
| Añadida | ¿Cuántas rondas tiene el mundo 1? | 10: Creeper se prepara en la 8 y la 9, con gusanos más rápidos y más numerosos, y sale en la 10 | Carmine |
| Implementación | ¿Qué pasa con sus copias al derrotarlo? | Se desconectan: caen con él. Así la victoria llega al derrotarlo | Claude |
| Implementación | ¿Salta otra vez si al aterrizar ya cruzó otro umbral? | No: los umbrales que cruza mientras salta se gastan. Un golpe que cruza dos umbrales da un solo salto | Claude |
| Implementación | ¿Le dan las balas en el aire? | No: en el aire no le dan las balas ni las minas, y las plantas no le apuntan. Mientras avisa, sí | Claude |
| Implementación | ¿Perder contra el jefe? | Como en cualquier ronda: se empieza desde la 1 | Regla de T-007 |

Valores PROVISIONAL en `ENEMIES.creeper`, `CREEPER` y `ROUNDS` de `balance.ts`: vida 4000, velocidad 0,2 casillas/s, mordisco 120, golpe al aterrizar 150, 0,6 s en el aire, copias con +35 % de velocidad, rondas 8 y 9 con +20 % y +35 %.

## Criterios de aceptación
- [x] El mundo 1 tiene 10 rondas. La 8 y la 9 sacan más enemigos que la 7 (la 9 más que la 8) y todos van acelerados (+20 % y +35 %).
- [x] Desde la preparación de la ronda 8 hasta que empieza el combate, Creeper se ve a la derecha preparándose: respira, se le llena una barra de "CARGANDO" y cada gusano acelerado que sale recibe un chispazo suyo.
- [x] El jefe aparece en la ronda 10: salta desde donde se preparaba hasta el agujero del carril del centro y dice "SOY CREEPER: ¡ATRÁPAME SI PUEDES!".
- [x] El jefe cambia de carril durante el combate: salta al perder cada 20 % de vida (cada 10 % en la fase 2), a un carril al azar que no es el suyo.
- [x] Antes de saltar avisa durante 1 s (0,6 s en la fase 2): se agacha y marca el carril de destino con una diana, una curva de puntos y un "!".
- [x] Al despegar deja una copia (dos en la fase 2) en el carril que abandona; al aterrizar golpea lo primero sembrado que tiene delante.
- [x] Las balas en vuelo cuando salta siguen por su carril y fallan (o dan a lo siguiente). La quemadura y la ralentización se conservan al saltar.
- [x] Por debajo del 50 % entra en la fase 2: pantalla roja, cara de enfado, frase y barra en rojo.
- [x] Barra de vida del jefe en el HUD con una marca por umbral de salto; el HUD dice "Combate final".
- [x] Si cruza el borde izquierdo se pierde la partida, con su propia pantalla de derrota ("¡Creeper se escapó!").
- [x] Al derrotarlo caen sus copias y se muestra la pantalla de victoria del mundo 1 ("¡Atrapaste a Creeper!").
- [x] Con todas las defensas en un solo carril se pierde contra el jefe; con defensas repartidas se le gana (tests en `creeper.test.ts`).
- [x] Reglas en `src/game/core/` con tests; un cambio de calidad en mitad del combate lo continúa igual (salto, vida, copias).

## Notas de tareas anteriores
- **T-007:**
  - Ya hay una victoria provisional al superar la ronda 7: la fase `won` de `RoundState` (`rounds.ts`), el evento `won`, `GameEvents.matchWon` y `VictoryScreen` en React. El jefe tiene que meterse entre la última ronda y la victoria, por ejemplo con una fase nueva en `RoundState` que lo saque al despejarse la ronda 7.
  - Los enemigos se definen en `ENEMIES` de `balance.ts`, con su forma de atacar (`attack: 'bite' | 'spit'`). `stepCombat` decide qué hace cada uno según eso. El salto de carril del Creeper sería un comportamiento nuevo en el paso de enemigos, con su evento.
  - La vista de los enemigos está en `wormView.ts`, con lo que cambia por tipo en `KIND_LOOK` (texturas, tamaño, armadura). Un jefe con barra de vida probablemente merezca su propia vista.
  - La pantalla de victoria y la derrota dicen la ronda (`RoundInfo` por `GameEvents.roundChanged`). Para el jefe hará falta decir que se está en el combate final.
  - Atajos de desarrollo: N salta a la ronda siguiente y M da 500 de moneda. Con ellos se llega rápido al final.

## Cómo quedó (para tareas siguientes)
- **El jefe es un grupo más del guion:** la ronda 10 de `ROUNDS` saca un `creeper` por el carril 2. No hizo falta una fase nueva en `RoundState`: la ronda acaba (y la partida se gana) cuando no quedan enemigos, y al caer Creeper caen todos.
- **Reglas** en `combat.ts`: `Enemy.jump` (agachado o en el aire, con `stageMs`), `Enemy.jumpsUsed`, `Enemy.haste`; eventos `jumpWarned`, `jumped` (con sus copias) y `landed`; `enemyEscaped` lleva el tipo. `stepCombat` recibe `random` para elegir el carril. En `rounds.ts`: `RoundScript.haste` y `bossPreparing`, `roundHaste`, `isBossRound`, `bossRoundIndex`, `isBossPreparing`.
- **Vista:** `creeperView.ts` (`CreeperView`, que envuelve un `WormView` grande, y `CreeperOmen`, Creeper preparándose). `WormView` sabe pintar el salto (`jumpPose`) y las rayas del acelerado. HUD: `BossBar` dentro de `RoundHud`, por `GameEvents.bossChanged`; `matchLost` lleva `LossInfo`.
- **Balance simulado** con un bot que siembra por columnas, sube de nivel e infunde: gana las 10 rondas sin perder vidas en unos 13 minutos (sin contar las preparaciones) y Creeper le dura entre 50 y 60 s; sin subir de nivel, unos 80 s. Con todo en un carril se pierde. Afinar jugando.

## Casos límite y riesgos
- Un jugador con una sola planta de 3 cañones en un carril debe poder perder contra el jefe: esa es la lección.
- Balas en vuelo cuando el jefe salta: siguen por su carril y fallan.
- Efectos activos (quemadura, ralentización) se conservan al saltar.

## Cómo probarlo (QA)
1. Llegar al jefe con todas las defensas en un solo carril y comprobar que no alcanza.
2. Repetir con defensas repartidas.
3. En las rondas 8 y 9, comprobar que se ve a Creeper a la derecha, que su barra se llena y que los gusanos van más rápido (rayas verdes detrás de la cola).
4. Con N (ronda siguiente) y M (+500) se llega rápido a la 8 y a la 10.
