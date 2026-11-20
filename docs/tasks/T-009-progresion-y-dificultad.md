# [Rondas] Progresión y dificultad del mundo 1

**Estado:** Completada (20 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** L (orientativo) · **Depende de:** T-008 · **Bloquea a:** ninguna · **Origen:** pedido de Carmine del 20 nov 2026 ("que el juego se sienta más complicado")

## Contexto
Con las 10 rondas y el jefe listos (T-008), el mundo 1 se queda corto de reto y el jugador descubre las cosas con un aviso de una línea que se le escapa. Esta task reordena qué se desbloquea en cada ronda, lo anuncia con un aviso que hay que aceptar, pone niveles a los enemigos, cambia lo que da cada uno y endurece las rondas finales y el jefe.

## Objetivos
1. **Descubrir una cosa por ronda**, en este orden: 1 disparadora, 2 subir de nivel (hasta el 5), 3 mina de fuego, 4 mina de hielo, 5 infundir (también arrastrando una mina sembrada), 6 fusionar, 7 subir de nivel hasta el 10.
2. **Aviso de desbloqueo vistoso** que congela el juego hasta que el jugador lo acepta ("¡YA LO TIENES!").
3. **Enemigos con nivel**, al azar y cada vez más altos, con más vida y más daño.
4. **Más presión al final:** rondas 8 y 9 con más tropas, jefe con escolta y copias más peligrosas.

## Alcance
**Incluye:** nuevo orden de desbloqueo y tope de nivel por ronda, modal de desbloqueo, niveles de enemigos (reglas, reparto por ronda y aspecto), recompensa por tipo de enemigo, cambios en el guion (rondas 3, 4, 8, 9 y 10), copias y daño del jefe, escolta con grito, infundir arrastrando una mina sembrada.
**No incluye:** mundo 2, guardado, cambios en la economía pasiva ni en el costo de subir de nivel.

## Decisiones
| # | Pregunta | Decisión (20 nov 2026) | Decide |
|---|---|---|---|
| P-01 | Orden de desbloqueo | Ronda 1 disparadora; 2 subir de nivel con tope 5; 3 mina de fuego; 4 mina de hielo; 5 infundir (fuego y hielo); 6 fusionar; 7 tope de nivel 10 | Carmine |
| P-02 | Aviso de lo desbloqueado | Modal vistoso ("¡YA LO TIENES!", brillando) que hay que aceptar. Mientras está abierto el juego queda en pausa | Carmine (la pausa, Claude) |
| P-03 | Recompensa por enemigo | Gusano 15, escupidor 20, acorazado 25. Fija por tipo: el nivel no la cambia | Carmine (fija por tipo, Claude) |
| P-04 | Niveles de los enemigos | Al azar por ronda. Rondas 1–2: nivel 1. 3–4: del 1 al 4, más probable cuanto más bajo. 5–7: del 1 al 7, pico en el 4, menos el 1 y aún menos el 7. 8–10: del 3 al 10, pico en el 7, menos el 3 y aún menos el 10 | Carmine |
| P-05 | Cuánto suma cada nivel de enemigo | +15 % de vida y de daño por nivel sobre el nivel 1 (un 5 % más que el +10 % de daño de las disparadoras). No cambia la velocidad | Carmine ("5 % más que los disparadores"; leído como +15, Claude) |
| P-06 | Aspecto del nivel | El nivel 1 se ve igual que antes. Desde el 2, medallita con el número en la cabeza (los mismos colores que las disparadoras) y un poco más grande cuanto más nivel | Claude (libertad creativa, ADR-0004) |
| P-07 | Jefe | Sin nivel. Muerde como un gusano de nivel 10 (117,5) | Carmine |
| P-08 | Copias del jefe | Siempre de nivel 10. En la fase 1 deja un gusano. En la fase 2, cada una de las dos copias: 50 % gusano, 25 % acorazado, 25 % escupidor | Carmine |
| P-09 | Rondas 8 y 9 | Acelerado del 25 % y del 35 %, y un 50 % más de gusanos, acorazados y escupidores que antes | Carmine |
| P-10 | Escolta del jefe | Al empezar la ronda 10 sale un acorazado de nivel 5 por cada carril, al paso de Creeper. Creeper grita "¡ADELANTE, MIS ACORAZADOS!" y sale detrás | Carmine (uno por carril); grito y paso, Claude |
| P-11 | Guion de las rondas 3 y 4 | Ronda 3: un acorazado. Ronda 4: dos escupidores. Las rondas 5 a 7 no cambian | Carmine |
| P-12 | Infundir arrastrando una mina | Una mina sembrada se puede arrastrar sobre una disparadora sin elemento para infundirla con su elemento. La mina cuenta como un elemento: en una de N cañones se paga el resto (N − 1). No se puede arrastrar una mina que ya está contando | Carmine (arrastrar la mina); el costo y la mina armada, Claude |
| Implementación | ¿Y los textos de una línea de cada ronda? | Se quedan, con lo nuevo de cada ronda y los enemigos que llegan. El aviso que hay que aceptar es aparte | Claude |
| Implementación | ¿Cuándo sale Creeper respecto a su escolta? | La escolta a los 2 s del ataque y él a los 5,5 s, 0,7 casillas detrás. La escolta va acelerada a su paso (0,2 / 0,16 = +25 %) para que no la adelante | Claude |
| Implementación | ¿Da moneda Creeper? | No: al caer se gana la partida. Sus copias y su escolta dan lo de su tipo | Claude |

## Criterios de aceptación

Comprobados el 20 nov 2026 con tests de Vitest (`rounds.test.ts`, `combat.test.ts`, `creeper.test.ts`, `match.test.ts` y `economy.test.ts`; 238 en total) y en el Chromium por software del equipo de desarrollo (sin GPU), a 1600 × 900 y 812 × 375. Casos probados en el juego:
- Avisos de las rondas 1 a 7 con su contenido; las rondas 8 a 10 no avisan. Con el aviso abierto la cuenta atrás no corre; al aceptarlo sigue.
- Aceptar un aviso y que salga el siguiente enseguida (atajo N): la escena quedaba en pausa sin nada abierto. Arreglado (ver "Cómo quedó").
- Ronda 5: una mina de fuego arrastrada con el ratón sobre una disparadora de un cañón. La mina se queda medio transparente en su casilla, sale el rótulo "Infundir con la mina", la planta queda de fuego y no se cobra nada.
- Ronda 9: gusanos y escupidores de nivel 5 a 9, acelerados un 35 %, con su medallita.
- Ronda 10: "¡ADELANTE, MIS ACORAZADOS!", cinco acorazados de nivel 5 con medallita y Creeper detrás con su frase de siempre.
- Panel de una disparadora de nivel 5 en la ronda 2: "Máximo" y "Tope 5: sube en la ronda 7".

- [x] Cada ronda desbloquea lo de P-01 y nada más. Subir de nivel se para en el 5 hasta la ronda 7 y luego en el 10; el panel lo dice.
- [x] Al empezar la preparación de una ronda con algo nuevo (también la 1) sale el modal "¡YA LO TIENES!" con lo desbloqueado. El juego está en pausa hasta pulsar el botón. Al cambiar la calidad no vuelve a salir: la escena recreada continúa la partida (`resume`) y no avisa; el aviso abierto es estado de React y se conserva. Comprobado leyendo el código: con el aviso abierto el menú de pausa no se abre, así que solo se puede cambiar de calidad por el modo automático.
- [x] Los enemigos salen con el nivel de P-04, con +15 % de vida y de daño por nivel; los de nivel 2 o más llevan medallita.
- [x] Gusano 15, escupidor 20 y acorazado 25, cobrados solos o soltados con el extra de siempre.
- [x] Rondas 8 y 9 con +25 % y +35 % de velocidad y un 50 % más de tropas de cada tipo (redondeando hacia arriba).
- [x] Ronda 3 con un acorazado, ronda 4 con dos escupidores.
- [x] Ronda 10: cinco acorazados de nivel 5 delante de Creeper, al paso de Creeper, con su grito. Creeper muerde 117,5. Sus copias son de nivel 10, y en la fase 2 pueden ser acorazados o escupidores.
- [x] Una mina sembrada se arrastra sobre una disparadora y la infunde (con rótulo y costo), desde la ronda 5.
- [x] Reglas en `src/game/core/` con tests; números en `balance.ts`; docs al día.

## Cómo quedó (para tareas siguientes)
- **Reglas:**
  - `Enemy.level`, con `enemyLevelFactor`, `enemyMaxHp`, `enemyDamage`, `rollEnemyLevel` y `rollCopyKind` en `combat.ts`. `hpFraction` usa la vida de su nivel. `spawnEnemy` acepta el nivel (7.º argumento).
  - `enemyKilled` lleva `kind`: la escena paga `ENEMIES[kind].reward`. `ECONOMY.killReward` ya no existe.
  - En `rounds.ts`: `RoundScript.levelCap` y `levels`, y `RoundGroup.level`, `haste` y `shout`. `stepRound` recibe `random` y emite `shout`. Además, `levelCapAt`, `levelCap`, `levelCapRaisedAfter` y `roundUnlocks`.
  - En `match.ts`: `levelUpOffer` lleva `cap` y `capRaisedAt`; infundir con una mina va en `mineDragBlocker`, `mineInfusion`, `mineInfusionTargets` e `infuseWithMine`.
- **Aviso de desbloqueo:** la escena lo manda por `GameEvents.unlocked` (`UnlockInfo`) y React lo muestra en `UnlockModal`. Al aceptarlo, React devuelve `unlockAccepted`. Mientras está abierto, `App` pausa el juego (`paused || unlock`). La escena lo repite al pedirle el estado hasta que se acepta, y `App` ignora el de una ronda ya aceptada.
- **Arreglo de la pausa:** `applyPause` usa `this.sys.pause()`/`resume()`, que se aplican en el acto. Con `this.scene.pause()` la orden esperaba en cola, y quitar la pausa y ponerla enseguida dejaba la escena pausada sin nada abierto (ADR-0007 actualizado).
- **Vista:**
  - `FusionDragView` lleva cualquier figura (`carriedShooter`, `carriedMine`).
  - `MineView` sabe agarrarse y gastarse (`contains`, `foot`, `setLifted`, `consume`).
  - `WormView` pinta la medallita y el tamaño por nivel.
  - `CreeperOmen.command` hace el grito.
  - `CardIcon` se exporta para reusar los dibujos de las cartas.
- **Balance simulado:** un bot hace lo siguiente: hasta 4 columnas, sube siempre la más baja hasta el tope, fuego en la primera columna y hielo en la segunda, y recoge todas las monedas. Llega al jefe sin perder vidas en 6 de 6 partidas y le gana en 5. Antes de T-009 un bot parecido ganaba siempre. La dificultad la pone sobre todo el combate final; las rondas 1 a 9 siguen siendo asequibles para quien reparte bien. Afinar jugando.

## Casos límite y riesgos
- El nivel de los enemigos y las rondas 8 y 9 más largas pueden hacer el mundo 1 demasiado duro: se ajusta jugando (todo es PROVISIONAL).
- Un cambio de calidad con el modal abierto no debe volver a mostrarlo ni despausar el juego.
- Una mina que se arma mientras se arrastra: el arrastre se cancela.

## Cómo probarlo (QA)
1. Empezar una partida: sale el modal de la disparadora; el contador no corre hasta aceptarlo.
2. Con N (ronda siguiente) y M (+500), pasar por las rondas 2 a 7 y comprobar cada modal y el tope de nivel.
3. En la ronda 5, sembrar una mina y arrastrarla sobre una disparadora.
4. En las rondas 8 a 10, comprobar medallitas, escolta, grito y copias.
