# Brote 3: Brain

Diseño del tercer brote, acordado con Carmine el 22 nov 2026. Todavía no está hecho: lo construyen T-037, T-038 y T-039. Lo que aquí dice "decidido" lo decidió Carmine; los números son un punto de partida y se ajustan con `npm run sim`.

## Idea

Brain se escondía de quien lo buscaba. En el juego sus tropas llegan ocultas, una de ellas salta por encima de las plantas y el jefe hace las dos cosas. Es el brote de la **infiltración**: en el brote 2 atacaban a las plantas desde lejos; aquí se cuelan por detrás de la línea.

El escudo gana un segundo uso. Contra el Minstrel protegía a las plantas. Contra lo que salta es una puerta: lo único que no se puede saltar.

## El original (1986)

Brain fue el primer virus para PC. Lo escribieron dos hermanos de Lahore, que dejaron dentro del código su nombre, su dirección y su teléfono. Viajaba en disquetes, en el sector de arranque. Era sigiloso: si alguien miraba el disco, le enseñaba una copia limpia. Para guardar esa copia marcaba sectores como defectuosos, y el sistema se los saltaba. No destruía nada.

**No es un gusano.** Un gusano viaja solo por la red; Brain necesitaba que alguien llevara el disquete de un equipo a otro. Es un virus de sector de arranque, como Elk Cloner. Por eso sus tropas no son gusanos: son bichos nuevos (decidido).

## Lo que aporta al jugador

- **Infundir el escudo (decidido).** En el brote 2 el escudo solo se siembra como muro. La disparadora con escudo llega en este brote, en la ronda 2. Patty no crea nada nuevo: avisa de que el escudo ya se puede infundir, y Boxer enseña a hacerlo. Es T-037. Hecho en T-037 (ES-01 a ES-04): Patty dice "He reforzado el escudo: ahora aguanta sobre una disparadora"; el saldo inicial es 300, como el brote 2; el brote está en preparación (`boss: null`, `?brote=3`) con un guion provisional de 3 rondas y las tropas del brote 2 sin el Minstrel, que T-038 y T-039 cambian por las suyas.
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
