# [Jefe] Brain y rondas del brote 3

**Estado:** Completada (23 nov 2026, 0.15.0) · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-037, T-038 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 22 nov 2026

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

### Al empezar la task (Carmine, 22 nov 2026, con la recomendación)
- **BR-02:** saltos de 2 casillas, 3 s en tierra (se agacha el último segundo: el aviso) y 0,8 s en el aire. Unas 0,5 casillas/s: sin escudo cruza el jardín en unos 17 s. Se afina con `npm run sim`.
- **Qué lo descubre (nueva, al ver el código):** chocar con un escudo, la explosión de una mina (de fuego o de hielo) que lo alcanza y la granada (el caso límite: sí). No lo descubren la cercanía de lo sembrado ni las balas, tampoco las de hielo o fuego: a un Lurker sí, pero a Brain una bala perdida disparada a su escolta lo dejaría al descubierto todo el carril.
- **BR-03:** cuando cae el escudo que lo paraba, a los 2 s vuelve a ocultarse.
- **BR-04:** una mina de fuego o la granada lo descubren 3 s; la mina de hielo, lo que lo frena (4 s). Como mínimo, 3 s.
- **BR-05:** b. Se le puede ganar sin escudos, con minas y hielo, pero cuesta.
- **BR-06:** sí. Con la mitad de la vida o menos descansa 2 s en vez de 3 y se agacha menos rato.
- **BR-07:** un Lurker acorazado de nivel 10 por carril, ocultos, y dos Skipper de nivel 10. Luego, refuerzos mientras vive.
- **BR-08:** no, como al Skipper: en el aire no le dan las balas ni las minas.
- **BR-09:** al llegar, "¿Me buscabas? Deja tu mensaje". Las demás frases (al ocultarse, al descubrirlo una mina, al morder un escudo, al escapar y al ganar) las escribe Claude con el teléfono y el disquete del Brain real, y Carmine las revisa antes de cerrar la task.
- **BR-01 (Carmine, 23 nov 2026, en la galería):** la cúpula. Un cerebro rosa bajo una cúpula de cristal, sobre un platillo con luces y cuatro patas de muelle. Las otras dos propuestas de `/jefes.html` (un cerebro con parches de sectores tachados sobre un saltador de muelle y uno que salta como un pulpo sobre cables con clavijas) se quedan como referencia. Oculto, se pinta como la silueta morada que tiembla de los Lurker.

## Decisiones pendientes
Ninguna (BR-01 a BR-09 cerradas).

Las frases de Brain (BR-09), escritas por Claude, las dio por buenas Carmine el 23 nov 2026.

## Criterios de aceptación
### Rondas
- [x] El brote 3 tiene sus 8 rondas, editables como datos, con los conceptos de la spec: Lurker en la 1, infusión del escudo en la 2, Skipper en la 3, mezcla en la 4, cinco carriles en la 5, jefe preparándose en la 6 y la 7, y combate en la 8.
- [x] Los primeros Skipper salen de uno en uno.
- [x] La dificultad medida sube de ronda en ronda, y la ronda 1 es más dura que la 1 del brote 2.
- [x] Ninguna tropa del guion pasa del nivel 9, salvo la escolta.

### Combate
- [x] Brain se ve preparándose a la derecha en las rondas 6 y 7, y en la 6 Boxer cuenta qué fue el virus de verdad.
- [x] Avanza oculto y a saltos por su carril, por encima de las plantas normales.
- [x] Oculto, las disparadoras no le apuntan.
- [x] Al encontrar un escudo cae delante, se descubre y lo muerde. Cuando el escudo cae, vuelve a ocultarse según BR-03.
- [x] Una mina que estalla a su lado y el hielo lo descubren según BR-04.
- [x] El jugador lo ve siempre, oculto o no, y distingue los dos estados.
- [x] Tiene barra de vida de jefe.
- [x] Si cruza el jardín, se pierde la partida.
- [x] Al derrotarlo se gana el brote, queda vencido para ese jugador, se entregan las semillas y la ruta lo muestra superado.

### Calidad
- [x] Reglas en `core` con tests propios; valores en `balance.ts`.
- [x] Simulación con bots anotada en la spec: sin escudos ni minas, pierde casi siempre; con escudos, gana la mayoría; solo con minas y hielo, según BR-05.
- [x] La simulación mide también el brote con nivel base 1, 3 y 5 del Vivero, como se hizo en el brote 2.
- [x] Propuestas de aspecto en `/jefes.html` antes de pintar el definitivo.
- [x] `docs/specs/06-brote-3-brain.md`, `03-ruta-de-brotes.md` y `01-mecanicas.md`, al día.
- [x] Textos en español e inglés. Al jugador no se le dice "poder", "tienda" ni "comprar".
- [x] `npm test` y `npm run build` pasan.

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
