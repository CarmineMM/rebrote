# [Rondas] Las 7 rondas del mundo 1

**Estado:** Completada (19 nov 2026) · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-003, T-004, T-005, T-006 · **Bloquea a:** T-008 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Con las mecánicas listas falta la progresión. El diseño está en `docs/specs/02-mundo-1-gusanos.md`: 7 rondas, un concepto nuevo por ronda, dos enemigos nuevos.

## Objetivos
1. **Rondas con guion.** Cada ronda define qué enemigos salen, cuándo y por qué carril.
2. **Un concepto por ronda.** Las cartas y acciones se desbloquean en el orden de la spec.
3. **Enemigos nuevos.** Acorazado en la ronda 4 y escupidor en la ronda 6.

## Alcance
**Incluye:** definición de rondas como datos en `src/game/config/`, desbloqueo progresivo, aviso corto del concepto nuevo, gusano acorazado, gusano escupidor, pausa entre rondas, indicador de ronda en el HUD.
**No incluye:** jefe (T-008), guardado de progreso, selector de niveles.

## Decisiones
| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| Añadida | ¿Cómo arranca cada ronda tras la pausa? | Decidida el 19 nov 2026 con la recomendación: cuenta atrás de 20 s con un botón "¡Que vengan!" para adelantarla. También antes de la ronda 1. El goteo sigue durante la cuenta atrás | Carmine |
| Añadida | ¿Las vidas se conservan entre rondas? | Decidida el 19 nov 2026 con la recomendación: sí, 3 vidas para las 7 rondas, como plantas y saldo | Carmine |
| Añadida | ¿Cuándo llega lo nuevo de cada ronda? | Decidida el 19 nov 2026 con la recomendación: al empezar su preparación. El HUD ya dice "Ronda N de 7", sale el aviso y lo nuevo se puede usar para prepararse | Carmine |
| Añadida | ¿Quién escribe el guion de las rondas? | Decidida el 19 nov 2026: un borrador PROVISIONAL en `balance.ts` que se afina jugando (resumen en `docs/specs/02-mundo-1-gusanos.md`) | Carmine |
| Añadida | ¿El escupitajo es un proyectil o un golpe instantáneo? | Decidido al implementar: proyectil visible que vuela por el carril y da a lo primero sembrado que encuentra. Se puede revisar | Claude |
| Añadida | ¿El escupidor se para fuera del césped si su objetivo está muy cerca del borde? | Decidido al implementar: no. Nunca se para antes de pisar el césped, como las plantas no disparan antes; así siempre se le puede dar | Claude |

## Criterios de aceptación

Comprobados el 19 nov 2026 con tests de Vitest (`rounds.test.ts`, `combat.test.ts` y `match.test.ts`) y en Chrome con GPU (NVIDIA RTX 4060), en Ultra y en Bajo, a 60 FPS en Ultra. Casos probados en el juego:
- Preparación de la ronda 1 con su cuenta atrás, el botón "¡Que vengan!" (clic real) y el aviso; el ataque empieza con "¡Ahí vienen!".
- Ronda superada: "¡Ronda 1 superada!", las plantas saltan y empieza la preparación de la 2 con su aviso.
- Ronda 3: solo se ven las cartas de disparadora y fuego, y el fuego sobre una disparadora dice "Infundir: desde la ronda 4" en rojo.
- Ronda 6 con acorazado, escupidores, gusano, plantas y una mina de fuego: el escupidor se para a 2,6 casillas de la mina, la revienta sin que se arme y sigue andando. Al acorazado se le caen las placas al perder vida.
- Victoria tras la ronda 7 (celebración y pantalla), "Jugar otra vez" desde la victoria y desde la derrota (vuelve a la ronda 1 con solo la disparadora), y derrota con "en la ronda 4 de 7".
- HUD a 1600 × 900, 1280 × 720, 812 × 375 y 568 × 320.

### Rondas
- [x] El HUD muestra "Ronda N de 7".
- [x] Una ronda termina cuando no quedan enemigos por salir ni vivos.
- [x] Entre rondas hay una pausa en la que se puede sembrar, infundir, fusionar y subir de nivel.
- [x] Plantas y saldo se conservan de una ronda a la siguiente.
- [x] Al empezar cada ronda aparece un aviso de una línea con el concepto nuevo.

### Desbloqueo
- [x] Ronda 1: solo disparadora. Ronda 2: subir de nivel. Ronda 3: fuego solo. Ronda 4: infundir fuego. Ronda 5: hielo. Ronda 6: fusionar.
- [x] Una carta o acción bloqueada no aparece en el HUD.

### Enemigos
- [x] El acorazado tiene varias veces la vida del gusano y avanza más lento.
- [x] El escupidor se detiene a distancia de la primera planta de su carril y le dispara.
- [x] El escupidor puede destruir una mina antes de que explote.

### Calidad
- [x] Añadir o cambiar una ronda es editar datos, sin tocar escenas.
- [x] `npm test` y `npm run build` pasan.

## Notas de tareas anteriores
- **T-004:**
  - Las minas ocupan casilla en `MatchState.plants` (`Sown`) y tienen vida (`MINE.hp`). El escupidor puede atacar a lo primero que haya en su carril con `sownAt`, sea planta o mina. Si la destruye, sale `plantDestroyed` y la mina no explota.
  - Para desbloquear "fuego solo" (ronda 3) antes que "infundir fuego" (ronda 4), `cardPlay` tendrá que saber qué acciones están desbloqueadas. Hoy la carta de fuego siembra e infunde siempre.
- **T-005:**
  - La carta de hielo siembra (mina) e infunde siempre, como la de fuego. La ronda 5 la desbloquea entera.
  - La ralentización (`enemy.slow`) frena el avance y el mordisco de cualquier enemigo, porque multiplica su reloj: vale para el acorazado sin cambios. El escupidor debería disparar más despacio mientras va frenado, igual que muerde más despacio (`ICE.slowsBites`).
  - El HUD ya tiene tres cartas y un modo compacto para pantallas estrechas. Un aviso de ronda ("Nuevo: hielo") no debe tapar la bandeja.

## Casos límite y riesgos
- Perder en mitad de una ronda reinicia desde la ronda 1 en el prototipo. Hecho: "Jugar otra vez" empieza una partida nueva.
- Las 7 rondas completas deberían durar entre 10 y 15 minutos. Si se alargan, recortar duración por ronda antes que quitar rondas.
  - Simulado con una defensa sólida (tres columnas de disparadoras en los cinco carriles, la primera de fuego): 11,3 minutos con las preparaciones enteras, sin perder vidas. Los ataques duran de 64 a 92 s. Con una defensa más floja durará más. Falta cronometrarlo jugando (QA).
  - Esa defensa gana sin perder vidas incluso en nivel 1: puede que el borrador sea fácil para quien llega con el tablero lleno. Se ajusta jugando.
- El orden de desbloqueo choca con el orden de construcción de las tasks (fusionar se construye antes pero se desbloquea en la ronda 6): es intencionado.
- Escupidor a tiro de una mina pero lejos de su radio: la revienta a escupitajos sin que se arme. Si pasa un gusano por el radio, la mina se arma igual.
- Ganar o perder con balas o escupitajos en vuelo: se apagan.

## Objetivo final con ejemplos
| Momento | Lo que ve el jugador |
|---|---|
| Inicio de la ronda 3 | Aviso "Nuevo: fuego. Siémbralo solo y explota", aparece la carta de fuego |
| Ronda 4 | Primer acorazado; la carta de fuego ya se puede soltar sobre disparadoras |
| Fin de la ronda 7 | Mensaje de victoria provisional hasta que exista el jefe |

## Añadido durante la task

### Reglas
- **Rondas en `src/game/core/rounds.ts`:** `stepRound` cuenta la preparación, saca los grupos del guion a su hora y pasa a la siguiente ronda cuando la actual queda despejada. Tras la última, la partida queda ganada (`isWon`). `startAttack` adelanta el ataque. Sustituye al generador de prueba de T-002 (`spawner.ts`, borrado).
- **El estado:** `MatchState.round` guarda la ronda, su fase (`prep`, `attack` o `won`), lo que falta de preparación o lo que lleva el ataque, y los grupos que ya salieron. Así un cambio de calidad continúa la ronda donde estaba.
- **Desbloqueo:** cada ronda desbloquea lo suyo (`Feature`) y lo anterior sigue desbloqueado (`unlockedAt`). Sembrar e infundir cada elemento van por separado. `cardPlay`, `fusionBlocker` y `levelUpOffer` responden `locked` si aún no toca. `availableCards` dice qué cartas se ven.
- **Escupidor en `stepCombat`:** se para a `range` casillas de lo primero sembrado que tiene delante en su carril, nunca antes de pisar el césped, y escupe cada cierto tiempo. El escupitajo (`Spit`, en `MatchState.spits`) vuela hacia la izquierda y quita vida a lo primero sembrado que encuentra, planta o mina. Si lo destruye, sale `plantDestroyed`. Si su objetivo ya no está, sigue hasta el siguiente o sale del tablero.
- **Ralentizado** escupe más despacio en la misma proporción, como muerde más despacio (`ICE.slowsAttacks`, antes `slowsBites`).
- **El orden del paso** queda: enemigos (arden, avanzan, muerden o escupen), escupitajos, minas, balas y plantas. `enemy.biteMs` pasa a llamarse `attackMs`.
- **Nuevos eventos:** `spat`, `spitHit` y `spitGone` en el combate; `attackStarted`, `roundCleared`, `roundStarted` y `won` en las rondas.

### Interfaz
- **Ronda en el HUD (React, `RoundHud`):** "Ronda N de 7" en el centro de arriba, con una semillita por ronda (verdes las superadas y dorada, latiendo, la actual). Por debajo de 1250 px de ancho baja a una segunda fila.
- **Preparación:** "Empieza en N s" (el número salta cada segundo y se pone rojo en los tres últimos) y el botón "¡Que vengan!" (`attackRequested`).
- **Aviso:** una línea bajo la ronda al empezar cada una. Entra con un salto, dura 7 s y se va; con la pausa se queda quieto. No empuja el HUD ni tapa la bandeja.
- **Cartas:** solo se ven las desbloqueadas. Cada carta nueva entra en la bandeja con un salto y brilla un momento. La descripción del fuego y del hielo solo habla de infundir cuando ya se puede.
- **Lo bloqueado no responde:** antes de la ronda 2, un clic en una planta no abre el panel; antes de la 6, una planta no se arrastra. El cursor solo cambia (mano o dedo) si se puede hacer algo.
- **Infundir aún bloqueado:** el fuego de la ronda 3 sobre una disparadora pone la casilla roja y el rótulo "Infundir: desde la ronda 4".
- **Victoria provisional (`VictoryScreen`)** hasta que exista el jefe: "¡Jardín a salvo!", "Superaste las 7 rondas." y "Jugar otra vez". La escena manda `matchWon`.
- **Derrota:** dice en qué ronda se perdió ("3 gusanos cruzaron el jardín en la ronda 4 de 7").
- **La escena manda `roundChanged`** (ronda, fase, segundos de preparación, cartas, elementos que se pueden infundir y aviso) solo cuando cambia algo.

### Aspecto
- **Acorazado:** el gusano morado, un poco más grande, con casco de acero (cresta, remaches y un aro por donde sale la antena) y una placa por anillo, solapadas como las de un pangolín. Al perder vida se le caen las placas de la cola a la cabeza, que saltan girando con esquirlas de acero. Las semillas que le dan con placas sacan chispitas. Al morir le sale volando el casco.
- **Escupidor:** rosa chicle con las luces verde neón, boca de piñón y una gotita de moco colgando. Se yergue para cargar con los mofletes hinchados como globos y se lanza al escupir.
- **Escupitajo:** gota de moco verde neón con contorno oscuro y estela de gotitas. Sale bombeado de la boca y revienta en moco verde con un anillo.
- **Rondas en el tablero:** al empezar el ataque brillan los agujeros y sale "¡Ahí vienen!". Al superar una ronda, las plantas saltan en oleada y sale "¡Ronda N superada!". Al ganar, "¡Jardín a salvo!" con hojas y destellos por el césped antes de la pantalla de victoria.
- Detalle en `docs/guias/graficos.md`.

### Valores (en `balance.ts`, PROVISIONAL)
| Qué | Valor |
|---|---|
| Preparación (`ROUND_PREP.durationMs`) | 20 s antes de cada ronda |
| Acorazado (`ENEMIES.armored`) | 400 de vida (4 veces el gusano), 0,16 casillas/s (el gusano, 0,25). Muerde como el gusano |
| Escupidor (`ENEMIES.spitter`) | 140 de vida, 0,28 casillas/s. Se para a 2,6 casillas (la mina detecta a 1,1). Escupitajo de 25 cada 1,8 s, el primero a los 0,9 s, a 4 casillas/s |
| Guion (`ROUNDS`) | Ver la tabla de `docs/specs/02-mundo-1-gusanos.md` |

Con estos números, una disparadora de nivel 1 necesita 20 semillas para un acorazado (unos 27 s) y 5 para un gusano (unos 6 s). Un escupidor revienta una mina en 4 escupitajos (unos 7 s) y una disparadora en 12 (unos 21 s); una disparadora lo elimina con 7 semillas (unos 9 s).

### Atajos de desarrollo (`npm run dev`)
- **N:** salta a la preparación de la ronda siguiente.
- **M:** da 500 de moneda.

## Cómo probarlo (QA)
1. Jugar de la ronda 1 a la 7 y cronometrar.
2. Anotar en qué ronda se pierde por primera vez y por qué.
3. Con N y M (solo en desarrollo) se llega rápido a cualquier ronda para ver su aviso, sus cartas y sus enemigos.
