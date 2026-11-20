# [Dificultad] Enemigos más fuertes, ficha de información y bandeja fija

**Estado:** Completada (20 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** T-009 · **Bloquea a:** ninguna · **Origen:** pedido de Carmine del 20 nov 2026 ("vamos a incrementar el nivel de dificultad del juego")

## Contexto
Con la progresión de T-009 el mundo 1 sigue siendo asequible para quien reparte bien: un bot llega a Creeper sin perder vidas y le gana casi siempre. Esta task endurece a los enemigos, quita la moneda gratis de la preparación y deja el nivel de las disparadoras en 5 todo el mundo 1. Además añade una ficha con los datos de cada planta y enemigo, quita el aviso de la ronda 1, prepara la bandeja de cartas para poder cambiarlas en el futuro y pinta las monedas soltadas por encima de los enemigos.

## Objetivos
1. **Más dificultad:** enemigos más fuertes (también Creeper), sin moneda durante la preparación, tope de nivel 5 y escolta de nivel 10.
2. **Información a mano:** con doble clic sobre una planta o un enemigo, una ficha con su foto y sus datos, con el juego en pausa.
3. **Bandeja lista para cambiar cartas:** cartas algo más pequeñas y todas del mismo tamaño.
4. **Detalles:** sin aviso de desbloqueo en la ronda 1 y monedas soltadas siempre visibles para recogerlas.

## Alcance
**Incluye:** fuerza de los enemigos y extras por tramo de nivel, goteo solo durante el ataque, tope de nivel 5 en todo el mundo 1, escolta de nivel 10, ficha de información (plantas, minas y enemigos) con foto, tamaño fijo de las cartas, capa de las monedas soltadas, ronda 1 sin aviso que aceptar.
**No incluye:** el sistema de cartas para llevar plantas nuevas a cada jefe (solo se deja la bandeja preparada), mundo 2, cambios en el costo de subir de nivel ni en lo que da cada enemigo.

## Decisiones
| # | Pregunta | Decisión (20 nov 2026) | Decide |
|---|---|---|---|
| A-01 | Aviso de la ronda 1 | La ronda 1 no saca "¡YA LO TIENES!": la disparadora se da por sabida. Su aviso de una línea se queda | Carmine (el de una línea, Claude) |
| A-02 | Moneda durante la preparación | El goteo solo corre durante el ataque. En la preparación se para y en el siguiente ataque sigue donde iba | Carmine (que siga donde iba, Claude) |
| A-03 | Ficha de información | Doble clic (o doble toque) sobre una planta o un enemigo: el juego se pausa y sale una ficha con su foto a la izquierda y sus datos: nivel, vida, daño, cadencia o velocidad, efectos y lo que da | Carmine (el contenido de cada ficha, Claude) |
| A-04 | ¿Y las minas? | También tienen ficha (vida, alcance, conteo y lo que hacen al explotar) | Claude |
| A-05 | Tope de nivel | 5 en todo el mundo 1. La ronda 7 ya no lo sube a 10 y no trae nada nuevo: no saca el aviso que hay que aceptar | Carmine |
| A-06 | Bandeja de cartas | Cartas algo más pequeñas y todas del mismo tamaño, para poder cambiar en el futuro las que se llevan. Las ranuras vacías no se pintan | Carmine |
| A-07 | Fuerza de los enemigos | Todos (también Creeper y los que vengan): +10 % de vida y de daño. Por tramos de nivel, encima de lo que ya da el nivel: del 5 al 9, +20 %; desde el 10, +40 % (en vez del 20). Los tramos son los del color de la medallita. Primero fue 15, 25 y 40 %; Carmine la bajó el mismo día | Carmine |
| A-08 | Creeper con la fuerza nueva | No tiene nivel, así que solo lleva el +10 %: vida 4400, mordisco 129,25 (los 117,5 de T-009 por 1,1) y golpe al aterrizar 165 | Claude |
| A-09 | Monedas soltadas | Se pintan por encima de los enemigos y de las matas del primer plano, sin moverlas de sitio. Su sombra sigue en el suelo | Carmine (las matas y la sombra, Claude) |
| A-10 | Escolta de Creeper | Los cinco acorazados de la ronda 10 salen de nivel 10 | Carmine |

## Criterios de aceptación

Comprobados el 20 nov 2026 con tests de Vitest (`combat.test.ts`, `creeper.test.ts`, `rounds.test.ts`, `match.test.ts`, `economy.test.ts` y el nuevo `entityInfo.test.ts`; 257 en total) y en el Chromium por software del equipo de desarrollo (sin GPU), a 1600 × 900, 812 × 375 y 568 × 320. Casos probados en el juego:
- Partida nueva: sin aviso que aceptar, la cuenta atrás corre y la ronda 1 saca su aviso de una línea. 15 s de preparación: saldo igual y reloj del goteo a 0. Luego, en el ataque, el reloj avanza.
- Saltando de ronda con N: avisan la 2, la 3, la 5 y la 6; la 7 ya no (sale su línea nueva).
- Ronda 10: cinco acorazados de nivel 10 con medallita de oro (1513 de vida con la fuerza de 15 %; 1448 con la de 10 %).
- Moneda soltada en el carril de un gusano, con un acorazado delante: se ve por encima de los dos y un clic encima de ellos la cobra (+29).
- Doble clic real del ratón sobre una disparadora de fuego fusionada, una mina de hielo, un acorazado quemado, frenado y acelerado, y Creeper: sale su ficha con foto, el juego se pausa, Esc la cierra y sigue. Tras la de la disparadora, su panel de nivel sigue abierto.
- Bandeja en la ronda 5 con una disparadora de 3 cañones bajo la carta de fuego: tres cartas de 148 × 46 (86 × 44 en compacto) y "×3 = 225" cabe (en compacto, en dos líneas). A 568 px de ancho la bandeja y los marcadores no se tocan.

- [x] La ronda 1 empieza sin el aviso "¡YA LO TIENES!"; la cuenta atrás corre en cuanto carga el juego. Las rondas 2 a 6 lo siguen sacando (salvo la 4, comprobada solo con test: con el atajo N la escena en pausa a veces se salta una ronda).
- [x] Durante la preparación el saldo no sube solo; durante el ataque sube 25 cada 10 s de ataque.
- [x] Las disparadoras no pasan del nivel 5 en todo el mundo 1. El panel dice "Máximo" sin prometer otra ronda.
- [x] Los enemigos tienen +10 % de vida y de daño; los de nivel 5 a 9, además, +20 %, y los de nivel 10, +40 %. Creeper tiene 4400 de vida.
- [x] La escolta de Creeper es de nivel 10.
- [x] Una moneda soltada se ve y se recoge aunque un enemigo pase por delante.
- [x] Doble clic sobre una disparadora, una mina o un enemigo: el juego queda en pausa y sale su ficha con foto y datos. Se cierra con el botón, con Esc o haciendo clic fuera, y el juego sigue.
- [x] Todas las cartas de la bandeja miden lo mismo, algo menos que antes (148 × 46 frente a 170 × 52), también con el precio de infundir ("×3 = 225") y en el HUD compacto.
- [x] Reglas en `src/game/core/` con tests; números en `balance.ts`; docs al día.

## Cómo quedó (para tareas siguientes)
- **Fuerza:** `ENEMY_POWER` en `balance.ts` (`base` y `levelTiers`). En `combat.ts`, `enemyTierBonus` y `enemyPower`; `enemyMaxHp`, `enemyDamage` y `slamDamage` ya la llevan. El Creeper tiene su propio `biteDamage` (117,5) y `CREEPER.biteAsWormLevel` ya no existe. **La vida y el daño reales salen siempre de esas funciones**: `ENEMIES[tipo].hp` y su daño son solo la base (los tests y la barra del jefe se cambiaron por eso).
- **Goteo:** `stepIncome` en `economy.ts`, con su reloj en `MatchState.incomeMs`. La escena lo llama en `advance` después de las rondas; ya no hay temporizador de Phaser.
- **Ronda silenciosa:** `RoundScript.quiet`; `roundUnlocks` devuelve `[]` para ella.
- **Ficha:** la escena reconoce el doble clic (`checkDoubleTap`, `infoTargetAt`, `openInfo`) y manda `GameEvents.entityInfo` (`EntityInfo`) con los datos de `view/entityInfo.ts` y la foto de `view/portrait.ts`. Las vistas de enemigos tienen `contains` y `ground` (`EnemyView`). React la pinta en `InfoPanel` y `App` junta en `halted` todo lo que pausa.
- **Capa de monedas:** `DEPTH.droppedCoins`.
- **Bandeja:** tamaño en `--card-w` y `--card-h` de `.seed-tray` (`styles.css`).
- **Balance simulado:** un bot como el de T-009 (hasta 4 columnas, sube siempre la más baja, fuego en la primera y hielo en la segunda, recoge todas las monedas) ganaba 4 de 6 partidas con las reglas de T-009. Con la fuerza a 15, 25 y 40 % perdía las 6, casi siempre en las rondas 9 y 10; la fuerza sola ya le hacía perder las 6. Sin goteo en la preparación pasa de 4 a 3 victorias; el tope 5 no le cambia nada. Con la fuerza rebajada a 10, 20 y 40 % sigue perdiendo las 6, pero siempre llega a la ronda 10. Un bot que fusiona antes de subir de nivel (3 o 4 columnas de dos cañones) gana 12 de 12 sin perder vidas con las dos fuerzas. Afinar jugando.

## Casos límite y riesgos
- Las rondas 8 a 10 pueden quedar demasiado duras con la fuerza nueva, el tope en 5 y la escolta de nivel 10: se ajusta jugando (todo es PROVISIONAL).
- El primer clic del doble clic sobre una disparadora la selecciona (abre su panel de nivel). El segundo abre la ficha sin deseleccionarla: al cerrarla, el panel sigue ahí.
- Con una carta elegida, el clic siembra o infunde: el doble clic no abre la ficha.

## Cómo probarlo (QA)
1. Empezar una partida: no sale el aviso de la ronda 1 y el saldo no sube hasta que empieza el ataque.
2. Hacer doble clic sobre una disparadora, una mina y un gusano: sale la ficha, el juego se para y al cerrarla sigue.
3. Con N y M, llegar a la ronda 7: no sale aviso y el tope sigue en 5.
4. En la ronda 10, comprobar que la escolta lleva medallita de oro (nivel 10).
5. Dejar que un enemigo suelte una moneda y otro pase por encima: la moneda se ve por delante y se recoge.
