# Brote 3: Brain

Diseño del tercer brote, acordado con Carmine el 22 nov 2026. Lo construyeron T-037 (la infusión del escudo), T-038 (las tropas) y T-039 (el jefe y las 8 rondas). Lo que aquí dice "decidido" lo decidió Carmine; los números son un punto de partida y se ajustan con `npm run sim`.

## Idea

Brain se escondía de quien lo buscaba. En el juego sus tropas llegan ocultas, una de ellas salta por encima de las plantas y el jefe hace las dos cosas. Es el brote de la **infiltración**: en el brote 2 atacaban a las plantas desde lejos; aquí se cuelan por detrás de la línea.

El escudo gana un segundo uso. Contra el Minstrel protegía a las plantas. Contra lo que salta es una puerta: lo único que no se puede saltar.

## El original (1986)

Brain fue el primer virus para PC. Lo escribieron dos hermanos de Lahore, que dejaron dentro del código su nombre, su dirección y su teléfono. Viajaba en disquetes, en el sector de arranque. Era sigiloso: si alguien miraba el disco, le enseñaba una copia limpia. Para guardar esa copia marcaba sectores como defectuosos, y el sistema se los saltaba. No destruía nada.

**No es un gusano.** Un gusano viaja solo por la red; Brain necesitaba que alguien llevara el disquete de un equipo a otro. Es un virus de sector de arranque, como Elk Cloner. Por eso sus tropas no son gusanos: son bichos nuevos (decidido).

## Lo que aporta al jugador

- **Infundir el escudo (decidido).** En el brote 2 el escudo solo se siembra como muro. La disparadora con escudo llega en este brote, en la ronda 2. Patty no crea nada nuevo: avisa de que el escudo ya se puede infundir, y Boxer enseña a hacerlo. Es T-037. Hecho en T-037 (ES-01 a ES-04): Patty dice "He reforzado el escudo: ahora aguanta sobre una disparadora"; el saldo inicial es 300, como el brote 2; el brote está en preparación (`boss: null`, `?brote=3`) con un guion provisional de 3 rondas y las tropas del brote 2 sin el Minstrel, que T-038 ya cambió por las suyas (abajo) y T-039 cambiará por sus 8 rondas.
- **Lo de este brote llega hacia atrás (norma ES-03):** quien vence a Brain puede infundir el escudo también al rejugar los brotes 1 y 2, desde su ronda 1. Las tropas y el jefe de este brote no cambian por eso, pero lo que traigan T-038 y T-039 (el Skipper que salta, el sigilo) tiene que funcionar también contra lo que el jugador ya lleva.
- **Un segundo uso del escudo:** parar lo que salta.
- **Un uso nuevo de las minas y del hielo:** descubren lo que está oculto.

## Enemigos

Los nombres se quedan en inglés, como Copycat y Minstrel.

| Tipo | Papel | Comportamiento |
|---|---|---|
| Lurker | Base | Muerde como el gusano. Llega oculto |
| Lurker escupidor | Distancia | Escupe como el escupidor. Llega oculto |
| Lurker acorazado | Tanque | Aguanta como el acorazado. Llega oculto |
| Skipper | Nueva | Avanza a saltos por encima de plantas y minas. Solo lo para un escudo |
| Brain, el Cerebro | Jefe | Avanza oculto y a saltos. Solo lo para un escudo |

### Oculto (el rasgo del brote)

- Un enemigo oculto **no es blanco** de las disparadoras: no le apuntan ni disparan por él.
- **No es invulnerable:** una bala que ya va por el carril le da si lo toca, y una mina estalla igual si se le acerca.
- **Se descubre** al llegar a 4 casillas de lo primero sembrado en su carril, y también un rato cuando recibe daño, cuando lo frena el hielo o cuando lo quema el fuego.
- **El jugador siempre lo ve:** oculto se pinta como una silueta que tiembla, no desaparece. Lo que no lo ve son las plantas.

### Skipper

- Frágil y rápido. Avanza a saltos de 2 casillas, con una pausa en tierra entre salto y salto.
- Se agacha un momento antes de saltar, para que se le vea venir.
- No muerde plantas normales ni se para en ellas: va a la salida. Cuesta una vida, no plantas.
- Si hay un escudo en su camino (muro, disparadora con escudo o el invento muro de hielo), cae delante y lo muerde (`hopLanding`, regla que existe desde T-024).
- En el aire no le dan las balas (decidido). Hay que matarlo en tierra o pararlo.
- El hielo le alarga la pausa entre saltos.
- No llega oculto: saltando ya se le ve de sobra.

Para que no se parezca a la unidad de otros juegos que salta una sola vez la primera planta, el Skipper salta siempre y por encima de todo lo que no sea escudo.

### Hecho en T-038 (22 nov 2026)
Las reglas, como arriba, con LK-02 a LK-09 (en `01-mecanicas.md`, "Tropas del brote 3"). Lo que cambió respecto a lo de arriba:
- **Vida de los Lurker:** un 25 % menos que su pareja del brote 1 (75, 105 y 300 de base). Con la misma, el bot no pasaba de la ronda 1: con las disparadoras atrás, el sigilo les quita más de la mitad del tiempo de disparo y, sin bajas al principio, no hay monedas para construir. Así se confirmó el riesgo de "Las tropas ocultas valen, en la práctica, casi el doble de vida".
- **Ronda 1 provisional:** niveles `early`, como la ronda 1 del brote 2.
- **Skipper:** 65 de vida y 20 monedas; 2 casillas por salto, 1 s en tierra y 0,5 s en el aire (1,33 casillas/s de media).
- **Aspecto (LK-01, Carmine, en la galería `/bichos.html`):** los Lurker son camaleones (el escupidor, con los colores al revés) y el Skipper, un saltamontes rosa.

Simulación del guion provisional (`npm run sim`, 10 partidas por bot, con el azar fijo):

| Variante | Bot | Ganadas | Dónde pierde |
|---|---|---|---|
| Vida del brote 1, ronda 1 `mid` | con escudos | 0 de 10 | Ronda 1 |
| Vida −25 %, ronda 1 `mid` | con escudos | 0 de 10 | Ronda 1 |
| Vida del brote 1, ronda 1 `early` | con escudos | 0 de 10 | Ronda 2 |
| Vida −40 %, ronda 1 `mid` | con escudos | 0 de 10 | Ronda 3 |
| **Vida −25 %, ronda 1 `early` (la elegida)** | con escudos | 4 de 10 | Ronda 3 (los Skipper cuestan vidas) |
| | con escudos y 3 cañones | 2 de 10 | Ronda 3 |
| | sin escudos | 4 de 10 | Ronda 3 |

**Para T-039:** en este brote el bot con escudos juega igual que el que no los usa, porque gasta cada 100 monedas en disparadoras antes de juntar las 150 de un muro; tampoco usa minas ni hielo para descubrir. Hay que enseñarle a poner un muro (o una mina de hielo) delante de cada carril antes de ajustar el guion de verdad.

## Rondas

Ocho, como el brote 2 (decidido). Un concepto por ronda.

| Ronda | Concepto nuevo | Qué aprende el jugador |
|---|---|---|
| 1 | Los Lurker, ocultos | Que las plantas tardan en verlos: las minas y el hielo los descubren |
| 2 | Infundir el escudo (lo anuncia Patty y lo enseña Boxer) | Una disparadora con escudo aguanta el doble y hace de puerta |
| 3 | Llega el Skipper, de uno en uno | Solo lo para un escudo, y en tierra es frágil |
| 4 | Mezcla: acorazados ocultos y Skipper | Escudos para unos, minas para otros |
| 5 | Dos oleadas por los cinco carriles | Una puerta en cada carril |
| 6 | Brain se prepara: tropas aceleradas | Boxer cuenta quién fue Brain |
| 7 | Más tropas y más rápidas | Llegar con los cinco carriles cerrados |
| 8 | Combate contra Brain y su escolta | Mantener las puertas y descubrirlo |

El escenario es el mismo: sigue siendo la defensa del refugio. La música es la de los cuatro primeros brotes.

### Guion (T-039, PROVISIONAL)

En las rondas del brote `brain` de `OUTBREAKS` (`balance.ts`). Cada ronda empieza con 20 s de preparación; el brote empieza con 300 monedas (ES-04) y el tablero vacío (B-02). Ninguna tropa pasa del nivel 9; la escolta lleva el 10.

| Ronda | Lurker | Escupidores | Acorazados | Skipper | Último grupo | Niveles | Acelera | Dificultad medida |
|---|---|---|---|---|---|---|---|---|
| 1 | 16 | 5 | 0 | 0 | 66 s | 1 a 4 | | 86 |
| 2 | 10 | 12 | 5 | 0 | 76 s | 1 a 4 | | 153 |
| 3 | 18 | 6 | 8 | 7 | 80 s | 1 a 7 | | 273 |
| 4 | 19 | 5 | 10 | 7 | 84 s | 1 a 7 | | 293 |
| 5 | 30 | 7 | 13 | 8 | 88 s | 3 a 9 | | 609 |
| 6 | 33 | 12 | 13 | 10 | 90 s | 3 a 9 | +15 % | 763 |
| 7 | 40 | 12 | 20 | 15 | 94 s | 5 a 9 | +25 % | 1230 |
| 8 | 5 | 0 | 10 | 14 | 104 s | 5 a 9 | | Escolta: un Lurker acorazado de nivel 10 por carril y dos Skipper de nivel 10; Brain por el centro y refuerzos mientras vive |

- **Mismo esqueleto que el brote 2**, con sus tropas: el Minstrel pasa a ser el Skipper. Los primeros Skipper (ronda 3) salen de uno en uno.
- **La ronda 1 es más suave que la del brote 2 en tropas** (sin acorazados, más corta) porque a un oculto solo se le dispara en las últimas casillas: con la primera versión (la del brote 2 con Lurker, 74 s y tres acorazados) el bot perdía en la ronda 1 una de cada tres partidas. Era la provisional de T-038 con un acorazado; también se quitó, porque con 300 monedas el bot solo cubre tres carriles al principio y un acorazado oculto de nivel 4 rompe un carril con una disparadora.
- **Los niveles van un tramo por detrás de los del brote 2** (`early` en la 1 y la 2, `mid` en la 3 y la 4, `late` en la 5 y la 6, `high` en la 7 y la 8): el sigilo ya los hace más duros. Con los del brote 2, el bot con escudos perdía en las rondas 2 a 4.
- **Dificultad medida (`roundThreat`):** sube de ronda en ronda y la 1 (86) es más dura que la 1 del brote 2 (73). La vida de una tropa oculta cuenta 2,5 veces (`STEALTH.threat`): con las disparadoras atrás solo se le dispara desde 4 casillas, unas 3,4 de las 8,65 que anda hasta morder (el 40 %). Sin ese peso la ronda 1 medía 42.

## Hecho en T-039 (22 y 23 nov 2026)

Decisiones BR-02 a BR-09 cerradas por Carmine con la recomendación, y una nueva al ver el código (qué lo descubre); BR-01 (el aspecto), por Carmine en la galería `/jefes.html` el 23 nov 2026: la cúpula. Reglas en `01-mecanicas.md` ("Jefe: Brain"); valores, como PROVISIONAL en `ENEMIES.brain` y `BRAIN` de `balance.ts`.

- **Salta (BR-02):** 2 casillas, 3 s en tierra (se agacha el último segundo: el aviso) y 0,8 s en el aire. Unas 0,53 casillas/s: sin escudo cruza el jardín en unos 17 s. Salta por encima de plantas y minas y solo lo para un escudo (muro, disparadora con escudo o muro de hielo), al que muerde.
- **Qué lo descubre (decidido al empezar):** el escudo que lo para, la explosión de una mina que lo alcanza y la granada. No lo descubren la cercanía ni las balas, tampoco las de hielo o fuego: a los Lurker sí, pero a Brain una bala perdida disparada a su escolta lo dejaría al descubierto todo el carril y "las salta sin que le disparen" no se cumpliría. Una bala que ya va por el carril le da igual (LK-04): oculto también pierde vida si se pone delante de su escolta.
- **Cuánto (BR-03, BR-04):** con el escudo delante sigue descubierto, y 2 s después de que caiga; una mina de fuego o la granada, 3 s; la de hielo, los 4 s que lo frena (y le alarga el descanso).
- **Fase 2 (BR-06):** con la mitad de la vida descansa 2,4 s en vez de 3 (más que la cuenta de 2 s de una mina: así la que arma al caer aún le alcanza) y se agacha 0,6 s.
- **En el aire no le dan las balas ni las minas (BR-08).**
- **Escolta (BR-07):** un Lurker acorazado de nivel 10 por carril y dos Skipper de nivel 10, antes que él, con su grito; luego, refuerzos mientras vive.
- **Grande y con la boca pegada al escudo:** su hocico queda por delante del de cualquier tropa que muerda el mismo escudo, así que descubierto se lleva él los disparos. Con el hocico del acorazado por delante, su escolta se comía las balas y descubierto apenas recibía 113 de daño por segundo.
- **Vida 4500 de base (4950 con la fuerza de todos) y mordisco de 80 (88) cada 1,2 s,** ajustados con la simulación (abajo). Con 8000 no se le ganaba ni con muros y 3 cañones (3 de 10); con 5000, 9 de 10, pero solo con minas hacía falta el nivel base 5.
- **Habla (BR-09)** en un bocadillo de contestador: "¿Me buscabas? Deja tu mensaje." al llegar; se burla al ocultarse, al morder el escudo y al descubrirlo una mina, y al escapar y al ganar. Las frases las escribió Claude con el teléfono y el disco limpio del Brain real; Carmine las revisa antes de cerrar la task.
- **Se prepara** en las rondas 6 y 7 (y en la preparación de la 8) a la derecha, marcando sectores como defectuosos en un mapa de sectores (se llena de rojos tachados) y ocultándose un instante cada poco. En la 6, Boxer cuenta qué fue el Brain real (`story.lore.brain`, de T-037).
- **Se ve siempre:** oculto, la silueta morada que tiembla de los Lurker, con los ojos en verde; descubierto, sus colores, con un destello verde al descubrirse. Su barra dice "Oculto" o "¡Descubierto!" y marca dónde entra en la fase 2; en la fase 2 se enciende un halo rojo y pone cara de enfado.
- **Aspecto (BR-01, Carmine, 23 nov 2026):** un cerebro rosa bajo una cúpula de cristal, sobre un platillo de metal con luces y cuatro patas de muelle que se aprietan antes de cada salto; muerde con la mandíbula del platillo. Se eligió en `/jefes.html` entre tres propuestas (las otras, un pogo con sectores tachados y un cerebro sobre cables con clavijas, se quedan como referencia). El juego usa `BRAIN_DESIGN` (`src/game/view/brainArt.ts`).
- **Sonido:** su voz de contestador (`brainTalk`), un boing de muelle grave al saltar (`brainHop`), un golpe de metal al caer (`brainLand`) y su derrota (`brainDefeated`). Al descubrirse suena como sus tropas (`reveal`).

### Simulación con bots (T-039)

Con `npm run sim`, 10 partidas por bot, con el azar fijo. El bot de T-026 aprendió lo que T-038 dejó apuntado: con escudos, pone la puerta contra lo que salta antes que nada (si un Skipper o Brain pisa el césped sin escudo por delante, ahorra hasta poder ponerla) y, con la primera columna montada, un muro delante de los carriles por los que llega algo oculto. Puede usar de puerta la disparadora con escudo (`door: 'shooter'`: la infunde en su columna más adelantada, y pone un muro solo de emergencia). El de las minas (`mines`) llega al combate final sin escudo en el carril de Brain (se le quitan al empezar la ronda) y le siembra una mina de hielo donde va a caer. Las tablas de los brotes 1 y 2 salen idénticas a las de antes: lo nuevo solo actúa contra lo que salta y lo oculto.

| Bot | Sin mejoras | Nivel base 3 | Nivel base 5 |
|---|---|---|---|
| Sin escudos ni minas, 2 cañones | 0 de 10 (pierde de la ronda 5 a la 8) | 0 de 10 (llega a Brain y pierde) | 0 de 10 (llega a Brain y pierde) |
| Sin escudos ni minas, 3 cañones | 0 de 10 | 0 de 10 | 0 de 10 |
| Muros, 3 cañones | 9 de 10 (jefe en 43 s) | 10 de 10 (32 s) | 10 de 10 (25 s) |
| Muros, 2 cañones | 0 de 10 (cae en la ronda 8) | 8 de 10 (44 s) | 10 de 10 (35 s) |
| Disparadoras con escudo, 3 cañones | 7 de 10 (41 s), casi sin perder vidas | 10 de 10 (36 s) | 10 de 10 (25 s) |
| Disparadoras con escudo, 2 cañones | 0 de 10 | 3 de 10 | 4 de 10 |
| Solo minas contra Brain, 3 cañones (BR-05) | 0 de 10 (llega a Brain y se le escapa) | 10 de 10 (34 s) | 10 de 10 (26 s) |
| Solo minas contra Brain, 2 cañones | 0 de 10 | 0 de 10 | 0 de 10 |

- **El brote dura unos 15 minutos** con las preparaciones (rondas de 89 a 109 s de ataque y el combate final, ganado, de 25 a 45 s).
- **Sin escudos ni minas se pierde siempre,** también con el nivel base 5: lo que salta cruza.
- **Con escudos se gana la mayoría,** como en el brote 2: sin mejoras hacen falta 3 cañones; con el nivel base 3, ya basta con 2.
- **BR-05, se le puede ganar sin escudos, pero cuesta:** solo con minas hace falta el nivel base 3 y 3 cañones. Cada mina de hielo lo descubre 4 s y le quita unos 750.
- **La disparadora con escudo se usa** (riesgo de la task): gana algo menos que el muro sin mejoras (7 frente a 9 de 10, con 3 cañones), pero casi sin perder vidas, porque para a los Skipper donde ya disparan las demás. No hace falta tocar la palanca de que Brain rompa antes uno que otro.
- **Un muro por carril no lo resuelve todo:** el acorazado de su escolta (nivel 10, 291 por mordisco) y Brain rompen el muro en pocos segundos; hay que reponerlo (150 cada vez) y, si se rompe, Brain vuelve a ocultarse a los 2 s y salta por encima de las disparadoras.


## Jefe: Brain, el Cerebro (opción A, decidida)

- **Avanza oculto y a saltos** por su carril, por encima de las plantas normales. Oculto, las disparadoras no le apuntan.
- **Solo lo para un escudo.** Al chocar con uno se descubre y lo muerde. Cuando el escudo cae, vuelve a ocultarse y sigue.
- **Las minas y el hielo también lo descubren** un rato. Así el escudo es lo mejor contra él, pero no lo único.
- **Si cruza el jardín, se pierde la partida,** queden las vidas que queden, como con Elk Cloner.
- **Escolta:** Skipper y acorazados ocultos.
- **Se prepara** en las rondas 6 y 7, a la derecha, como los otros jefes.
- **Habla:** el Brain real dejaba su teléfono en el código. El del juego se burla del jugador con eso ("¿Me buscabas? Deja tu mensaje").

En qué se distingue de los anteriores: Creeper cambia de carril; Elk Cloner ataca de lejos; Brain no se deja ver.

## Dificultad

- **Nivel de las tropas (decidido):** la misma banda que el brote 2. Ninguna pasa del nivel 9; solo la escolta del jefe lleva el 10.
- **Por qué no sube:** el tope de nivel de las disparadoras sigue en 5 hasta el brote 5, y la simulación del brote 2 ya dice que sin mejoras hacen falta 3 cañones y escudos. Subir el nivel de las tropas obligaría a pasar por el Vivero. La dificultad sale del sigilo y del Skipper.
- **Skipper y vidas:** hay 3 vidas y cada Skipper que cruza quita una. Al principio salen de uno en uno.

## Riesgos de diseño

- **Dos jefes seguidos que piden escudo.** Por eso las minas y el hielo descubren a Brain. La simulación tiene que confirmar que sin escudos se puede ganar alguna vez con minas y hielo.
- **Un muro al frente de cada carril lo resuelve todo:** para a los Skipper, para a Brain y para los versos. La disparadora con escudo cuesta más por cañón, así que hay que comprobar que alguien quiera usarla en vez de poner siempre muros.
- **El sigilo acorta el tiempo de disparo:** si las tropas se descubren a 4 casillas, las plantas disparan la mitad del recorrido. Las tropas ocultas valen, en la práctica, casi el doble de vida.

## Reutilizar tropas (decidido el 22 nov 2026)

- Desde el brote 5 se reutilizan tropas de brotes anteriores, con más nivel y un cambio de color, para no dibujar tantas.
- Hasta el brote 4, cada brote trae las suyas, para que el jugador siempre note algo nuevo.
- Hacia el brote 10 vuelven a entrar tropas nuevas.
- El Minstrel queda exclusivo del brote 2 por ahora; se guarda para otro jefe más adelante.
