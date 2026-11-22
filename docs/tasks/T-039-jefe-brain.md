# [Jefe] Brain y rondas del brote 3

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-037, T-038 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 22 nov 2026

## Contexto
El diseño está en `docs/specs/06-brote-3-brain.md`. Carmine eligió la opción A: Brain avanza oculto y a saltos, y solo lo para un escudo. Son 8 rondas, como el brote 2.

**El original (1986).** El primer virus para PC, escrito por dos hermanos de Lahore que dejaron su nombre y su teléfono dentro del código. Viajaba en el sector de arranque de los disquetes y se escondía: a quien miraba el disco le enseñaba una copia limpia.

Los dos jefes anteriores sirven de modelo (verificado en `docs/specs/05-brote-2-elk-cloner.md`): barra de jefe, jefe que se prepara a la derecha en las rondas previas, escolta con grito, refuerzos mientras vive, derrota si cruza el jardín, frase de Boxer sobre el virus real, propuestas de aspecto en `/jefes.html`, medida de dificultad por ronda (`roundThreat`) y simulación con bots (`npm run sim`).

Tras T-037 el brote 3 existe en preparación con un guion provisional, y tras T-038 están sus tropas: los Lurker (ocultos, con un 25 % menos de vida que su pareja del brote 1, `LURKER_HP`) y el Skipper, con las reglas `STEALTH` y `HOP` y sus tests en `infiltration.test.ts`. Lo que T-038 dejó apuntado para la simulación (en `docs/specs/06-brote-3-brain.md`): en este brote el bot con escudos no llega a poner muros (gasta cada 100 monedas en disparadoras antes de juntar las 150 de un muro) y no usa minas ni hielo para descubrir; hay que enseñárselo antes de ajustar el guion.

## Objetivos
1. **Guion de las 8 rondas,** con un concepto nuevo por ronda.
2. **Combate contra Brain:** oculto, a saltos, y con el escudo como puerta.
3. **Abrir el brote** al jugador, con su recompensa.

## Alcance
**Incluye:** guion definitivo del brote 3, entidad y reglas de Brain, arte y animación, propuestas de aspecto, barra de jefe, escolta y refuerzos, frases del jefe y de Boxer, sonido, simulación con bots, tabla de dificultad, spec al día, textos, tests.
**No incluye:** escenario nuevo, viñetas nuevas de la historia, brote 4, plantas nuevas.

## Decisiones cerradas (22 nov 2026)
- Opción A: sigilo y salto. Solo lo para un escudo.
- Las minas y el hielo también lo descubren.
- Si cruza el jardín, se pierde la partida.
- 8 rondas. Mismo escenario y misma música que los brotes 1 y 2.
- Tropas hasta el nivel 9; la escolta, nivel 10.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| BR-01 | ¿Qué aspecto tiene? | Propuestas en `/jefes.html` | Que no se confunda con Creeper (tumbado, con monitor) ni con Elk Cloner (de pie, con disquete). Idea: un cerebro bajo una cúpula de cristal, sobre patas | Carmine |
| BR-02 | ¿Cuánto salta y cuánto descansa? | Libre | Saltos de 2 casillas y una pausa más larga que la del Skipper: da tiempo a reaccionar | Carmine |
| BR-03 | Descubierto frente a un escudo, ¿cuánto tarda en volver a ocultarse cuando el escudo cae? | Libre | 2 s: es la ventana para castigarle | Carmine |
| BR-04 | ¿Cuánto dura descubierto por una mina o por el hielo? | Libre | Lo que dure el efecto, y como mínimo 3 s | Carmine |
| BR-05 | ¿Se puede ganar sin escudos? | a) No. b) Sí, difícil, con minas y hielo | b: evita que el escudo sea obligatorio dos jefes seguidos | Carmine |
| BR-06 | ¿Tiene una segunda fase? | Sí o no | Sí, sencilla: con la mitad de la vida salta más seguido | Carmine |
| BR-07 | ¿Qué escolta trae? | Libre | Un acorazado oculto de nivel 10 por carril y dos Skipper de nivel 10 | Carmine |
| BR-08 | ¿En el aire le dan las balas? | Sí o no | No, como al Skipper | Carmine |
| BR-09 | ¿Qué dice? | Libre | Se burla con el teléfono que el Brain real dejó en su código: "¿Me buscabas? Deja tu mensaje" | Carmine |

## Criterios de aceptación
### Rondas
- [ ] El brote 3 tiene sus 8 rondas, editables como datos, con los conceptos de la spec: Lurker en la 1, infusión del escudo en la 2, Skipper en la 3, mezcla en la 4, cinco carriles en la 5, jefe preparándose en la 6 y la 7, y combate en la 8.
- [ ] Los primeros Skipper salen de uno en uno.
- [ ] La dificultad medida sube de ronda en ronda, y la ronda 1 es más dura que la 1 del brote 2.
- [ ] Ninguna tropa del guion pasa del nivel 9, salvo la escolta.

### Combate
- [ ] Brain se ve preparándose a la derecha en las rondas 6 y 7, y en la 6 Boxer cuenta qué fue el virus de verdad.
- [ ] Avanza oculto y a saltos por su carril, por encima de las plantas normales.
- [ ] Oculto, las disparadoras no le apuntan.
- [ ] Al encontrar un escudo cae delante, se descubre y lo muerde. Cuando el escudo cae, vuelve a ocultarse según BR-03.
- [ ] Una mina que estalla a su lado y el hielo lo descubren según BR-04.
- [ ] El jugador lo ve siempre, oculto o no, y distingue los dos estados.
- [ ] Tiene barra de vida de jefe.
- [ ] Si cruza el jardín, se pierde la partida.
- [ ] Al derrotarlo se gana el brote, queda vencido para ese jugador, se entregan las semillas y la ruta lo muestra superado.

### Calidad
- [ ] Reglas en `core` con tests propios; valores en `balance.ts`.
- [ ] Simulación con bots anotada en la spec: sin escudos ni minas, pierde casi siempre; con escudos, gana la mayoría; solo con minas y hielo, según BR-05.
- [ ] La simulación mide también el brote con nivel base 1, 3 y 5 del Vivero, como se hizo en el brote 2.
- [ ] Propuestas de aspecto en `/jefes.html` antes de pintar el definitivo.
- [ ] `docs/specs/06-brote-3-brain.md`, `03-ruta-de-brotes.md` y `01-mecanicas.md`, al día.
- [ ] Textos en español e inglés. Al jugador no se le dice "poder", "tienda" ni "comprar".
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Brain en el aire cuando cae el escudo en el que iba a aterrizar: aterriza donde tocaba y sigue.
- Brain frente a un muro de hielo (invento): lo trata como un escudo.
- El invento de recolocar mueve la disparadora con escudo que lo estaba parando: Brain se oculta y sigue.
- La granada (invento) sobre Brain oculto: decidir si lo descubre. Recomendación: sí.
- Pausa durante un salto o durante el aviso de ocultarse: todo se congela.
- Duración: unos 16 minutos, como los brotes 1 y 2.
- **Riesgo: un muro por carril lo resuelve todo.** Brain muerde el escudo que lo para, y su escolta desgasta los demás: hay que reponerlos. Comprobarlo con la simulación.
- **Riesgo: la disparadora con escudo no se usa** porque el muro hace lo mismo y cuesta menos. Si la simulación lo confirma, avisar a Carmine: la palanca es que Brain rompa antes los muros que las disparadoras con escudo, o al revés.
- **Riesgo de frustración:** un jefe al que las plantas no disparan puede sentirse injusto. El aviso antes de cada salto y la silueta siempre visible son lo que lo evita.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Brain por un carril con 3 disparadoras de 3 cañones y ningún escudo | Las salta sin que le disparen y cruza: partida perdida |
| Lo mismo, con una disparadora con escudo al frente | Cae delante, se descubre y la muerde mientras todas le disparan |
| El escudo cae | A los 2 s se oculta y vuelve a saltar |
| Una mina de hielo estalla a su lado | Queda frenado y descubierto unos segundos |
| Brain cae | Victoria del brote 3 y semillas |

## Cómo probarlo (QA)
1. Jugar el brote 3 entero y cronometrar.
2. Llegar al jefe sin escudos, luego con muros y luego con disparadoras con escudo.
3. Intentar ganarle solo con minas y hielo.
4. Pausar en mitad de un salto.
