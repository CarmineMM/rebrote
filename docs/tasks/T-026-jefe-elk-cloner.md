# [Jefe] Elk Cloner y rondas del brote 2

**Estado:** Completada (22 nov 2026, 0.8.0) · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-024, T-025 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 20 y 21 nov 2026

## Contexto
Sustituye a la task del jefe Blaster, que pasó al brote 11 (21 nov 2026). Carmine pidió que el escudo salga igualmente en el brote 2 y que su jefe sea una buena excusa para usarlo.

**El original (1982).** Elk Cloner fue uno de los primeros virus que se extendió fuera de un laboratorio. Viajaba en disquetes de Apple II: se copiaba a cada disquete que pasaba por un equipo infectado y, cada 50 arranques, mostraba un poema en pantalla. No destruía nada; era una broma.

**Desde T-024** el brote 2 ya existía en `OUTBREAKS` con un guion provisional de 3 rondas (tropas del brote 1 y el escudo en la ronda 2) y sin jefe (`boss: null`): en preparación, cerrado al jugador, y en desarrollo se jugaba con `?brote=2` (ADR-0015, "Brotes en preparación"). Esta task sustituye ese guion por el de verdad, pone a Elk Cloner como `boss` (y quita su nombre de `outbreak.comingBoss`) y lo abre. Lo que cuenta Boxer de él ya estaba en `story.lore.elkCloner`. Los ataques que cruzan el carril tienen su regla de bloqueo en `waveReach` (`combat.ts`).

**Desde T-025** están sus tropas: los Copycat (gusano, escupidor y acorazado, que al caer dejan una copia pequeña) y el Minstrel, que recita versos (`Verse`, `MatchState.verses`, eventos `verseWarned`, `sang`, `verseHit` y `verseGone`; la onda en pantalla es `VerseView`). Los versos de Elk Cloner son los mismos, más grandes. Antes, al caer Creeper caían todos y no salía ninguna copia (`bossDown` en `combat.ts`, solo con `kind === 'creeper'`); ahora la regla es de todos los jefes (`isBoss`).

En el juego es **Elk Cloner, el Poeta**. El combate de Creeper sirvió de modelo: barra de jefe (`BossBar`), jefe esperando a la derecha (`bossPreparing`), tests propios (`elkCloner.test.ts`) y vista propia (`elkClonerView.ts`). El brote 2 no cambia de escenario.

## Objetivos
1. **Guion de rondas del brote 2,** con un concepto nuevo por ronda.
2. **Un jefe que enseñe a usar el escudo.**
3. **Cierre del brote** con su recompensa y su trozo de historia.

## Alcance
**Incluye:** guion de rondas del brote 2, entidad y reglas de Elk Cloner, arte y animación, barra de jefe, sonido, spec del brote 2, textos, tests, simulación con bots como en el brote 1.
**No incluye:** escenario nuevo, brote 3, plantas nuevas aparte del escudo, viñetas del brote 2 (se escriben cuando exista T-031).

## Decisiones
Cerradas por Carmine el 22 nov 2026, al empezar la task: todas con la recomendación. L-02 se cerró antes, el 21 nov 2026.

| # | Pregunta | Opciones | Recomendación | Decidido |
|---|---|---|---|---|
| L-01 | ¿Cuántas rondas tiene el brote 2? | 7, 10 u otro | 8: el jugador ya sabe jugar y hay dos conceptos nuevos (escudo y Minstrel) | 8 (la recomendación) |
| L-02 | Mecánica principal | a. Recita versos: cada verso es una onda por un carril que atraviesa todas las plantas y solo se para en un escudo | Cerrada | a (21 nov 2026) |
| L-03 | ¿Y el guiño a los 50 arranques? | a) Nada. b) Cada cierto número de versos recita el poema entero: una onda por los cinco carriles a la vez, con aviso largo | b: es el momento grande del combate y premia tener escudos repartidos | b (la recomendación) |
| L-04 | ¿Cómo se sobrevive al poema entero sin escudos? | a) No se sobrevive bien. b) El daño es alto pero no mata plantas con la vida completa | b: castiga sin borrar el tablero de golpe | b (la recomendación) |
| L-05 | ¿Elk Cloner avanza? | a) Se queda al fondo. b) Avanza despacio | b: si no avanza, no hay presión de tiempo | b (la recomendación) |
| L-06 | ¿Trae escolta? | Sí o no | Sí, Minstrel y acorazados, para que las minas sigan sirviendo | Sí (la recomendación) |
| L-07 | ¿Qué desbloquea cada ronda? | Libre | Ronda 2: escudo. Ronda 3: llega el Minstrel. Resto: mezcla y subida de dificultad | La recomendación |
| L-08 | ¿Topes de nivel del brote 2? | Libre | Tope 10 desde la ronda 1: es la progresión que quedó sin usar en el brote 1 y lo que da margen al nivel base de T-023 | Tope 10 desde la ronda 1 (la recomendación) |
| L-09 | ¿Qué aspecto tiene? | Libre | Un bicho con un disquete por cabeza, como Creeper lleva un monitor | La recomendación |

No se reproduce el poema original del virus: los versos del jefe se inventan para el juego, en español e inglés.

### Decidido al implementar
- **Ataque:** avanza siempre a 0,1 casillas/s (la mitad que Creeper) y muerde lo que toca, también un muro, como Creeper (`attack: 'recite'`). Mientras pisa el césped, cada 3,5 s toma aire 1 s (el aviso del Minstrel) y suelta un verso por su carril que quita 55 a todo lo que cruza hasta el primer escudo.
- **Poema entero:** tras 2 versos, en vez del tercero, anuncia el poema entero: 5 s quieto (no avanza ni muerde; el aviso no va más lento aunque esté frenado) y luego una onda dorada por cada carril que quita 385 a cada cosa que cruza, hasta el primer escudo de su carril. L-04: lo que tenía la vida entera se queda con el 25 % de su vida como poco (`poemHit`).
- **Vida:** 9900 (9000 de base y la fuerza de todos). Mordisco de 110 cada 1,2 s. Sin nivel ni medallita ni aura, como Creeper.
- **Escolta (L-06):** un Copycat acorazado de nivel 10 por carril, con su grito, y dos Minstrel de nivel 10; él sale detrás, por el centro. Luego, refuerzos a su hora (Minstrel, acorazados y Copycat) **que dejan de salir en cuanto cae** (regla nueva de `stepRound` para cualquier jefe).
- **Al caer:** caen todos, ningún Copycat deja copia y los versos en vuelo, también los de los Minstrel, se deshacen. Si cruza el jardín, se pierde la partida.
- **Guion:** 8 rondas, con la tabla nueva de niveles `high` (del 5 al 12) desde la 6. Se prepara en la 6 y la 7 (tropas +15 % y +25 %), como Creeper en la 8 y la 9; en la 6 sale la viñeta de Boxer (`lore:elkCloner`). El tope de nivel 10 de la ronda 1 lo cuenta Boxer en "¡YA LO TIENES!". La ronda 1 empieza suave (niveles del 1 al 4, de uno en uno), porque el tablero empieza vacío.
- **Dificultad medida:** `roundThreat` (vida por segundo de ataque con la fuerza media de sus niveles, copias y prisa) sube de ronda en ronda y las rondas 6 y 7 pasan a la 9 del brote 1. Un test lo vigila.
- **Simulación:** `npm run sim` (`src/game/sim/`, fuera de `npm test`). Los primeros números (6000 de vida, poema cada 3 versos y 250 de daño) dejaban ganar a un bot sin escudos con 3 cañones, que lo tumbaba antes del segundo poema; por eso se subieron. Resultado en `docs/specs/05-brote-2-elk-cloner.md`.
- **Aspecto (L-09):** de pie (`ELK_POSE`), no tumbado como Creeper: cuatro cuentas granate con bandas y botones de oro, gorguera blanca de poeta, dos pies, un disquete azul de 5¼ por cabeza con la cara dibujada en la etiqueta, el aro del centro de nariz y la ventana de lectura de boca (por la que asoma el disco), y una cornamenta dorada, el alce de su nombre, con una pluma de escribir. En azul, granate y oro; Creeper es crema y verde.
- **Aro del disquete (22 nov 2026, tras verlo Carmine):** el aro de metal del centro parecía un tercer ojo. Cuatro propuestas (A de metal, B tenue, C mate, D sin aro) en la galería nueva `/jefes.html`, que enseña también a los dos jefes en movimiento; Carmine eligió la C, el aro mate (`ELK_HUB`).
- **Habla rimando** en un bocadillo de pergamino con letra de libro: al llegar, al mandar a la escolta, al anunciar cada poema, una de cada tres veces que recita, al escapar y al ganar. Las rimas son nuestras, en los dos idiomas.
- **Aviso del poema en pantalla:** un pentagrama dorado en cada carril, que se enciende de él hacia las plantas mientras dura el aviso, con notas que avanzan; la cuenta atrás delante de su cara; un halo dorado; "¡Poema entero!" en el centro del césped; la barra brilla y late.
- **Se prepara** escribiendo su poema en un pergamino que se llena de tinta; a cada tropa acelerada le manda una nota dorada.
- **Barra:** azul y oro, con un disquete por cara, "Poema en N versos" o "¡Poema entero!" y una nota por verso hasta el poema; "¡Silenciado!" al caer. En pantallas bajas, sin la fila de notas.
- **Sonido:** su voz (dos pitidos de Apple II, receta nueva `chirp`), el aviso del poema (una nota que se hincha, `swell`, con un saxo grave), el poema (acorde de pizzicato y campana) y su derrota (apagón y un libro que se cierra). Cada uno con dos alternativas en `/sonidos.html` para que Carmine elija de oído. Sus versos suenan como los del Minstrel.
- **Sin tour:** es un enemigo, no un gesto ni una pieza del jugador (como el Minstrel en T-025). Lo presentan la viñeta de Boxer, los avisos de ronda y su ficha.
- **Textos por jefe:** victoria, derrota, rótulo de victoria, barra y "llega en" dejan de estar escritos para Creeper: cada jefe tiene los suyos.
- **Partida guardada:** versión 6 (`Enemy.recital`, `Verse.by` y `Verse.poem`).

## Criterios de aceptación
### Rondas
- [x] El brote 2 tiene su guion completo, editable como datos.
- [x] Empieza con lo aprendido en el brote 1 (B-01).
- [x] El escudo se desbloquea en la ronda 2.
- [x] La dificultad sube de ronda en ronda y es mayor que la del final del brote 1.

### Combate
- [x] Elk Cloner se ve esperando a la derecha en las rondas previas, como Creeper.
- [x] Tiene barra de vida de jefe.
- [x] Sus ataques respetan la regla del escudo.
- [x] Al derrotarlo se gana el brote, se registra como vencido y se entregan las semillas (si T-020 está hecha).
- [x] La ruta del Invernadero lo muestra como jefe del brote 2 y, al vencerlo, como superado.

### Calidad
- [x] Reglas en `core` con tests propios; valores en `balance.ts`.
- [x] Simulado con bots: uno que no usa escudos pierde casi siempre; uno que los usa bien gana la mayoría. Resultado anotado en la spec del brote 2.
- [x] Spec del brote 2 en `docs/specs/`.
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Jugador que llega al jefe sin ningún escudo sembrado: el aviso del poema entero dura 5 s y da tiempo a sembrar, pero hacen falta cinco muros (750 monedas); la simulación lo anota.
- El aviso y las ondas se congelan en pausa (salen del estado; comprobado en el navegador).
- Ondas en vuelo al morir el jefe: desaparecen (`verseGone`, test).
- Duración: con 8 rondas ronda los 16 minutos con las preparaciones enteras, como el brote 1.
- Riesgo: que el jefe se resuelva con un muro por carril y nada más. Avanza, muerde el muro de su carril y el poema gasta todos los muros (aguantan tres); la escolta y los refuerzos desgastan los demás.
- Riesgo de parecido con Creeper: va de pie, con cornamenta, en azul, granate y oro.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Elk Cloner recita un verso por el carril 3, sin escudos | Todas las plantas del carril 3 pierden vida |
| Lo mismo, con un muro al frente del carril 3 | El muro recibe el golpe; las plantas, nada |
| Anuncia el poema entero y hay escudo en 3 de 5 carriles | Tres carriles a salvo y dos dañados |
| Elk Cloner cae | Victoria del brote 2 |

## Cómo probarlo (QA)
Con `npm run dev` y `?brote=2`, "Nueva partida"; la N salta de ronda y la M da moneda. Con Creeper vencido, el brote 2 se elige en la ruta del Invernadero.
1. Jugar el brote 2 entero y cronometrar.
2. Llegar al jefe sin escudos y luego con ellos.
3. Pausar durante el aviso del poema entero.
4. `npm run sim` para la tabla de los bots.
