# Brote 2: Elk Cloner

El segundo brote (T-018, ver "Brotes" en `01-mecanicas.md`): sus tropas son las del brote 2 (T-025) y su jefe, Elk Cloner, el Poeta (T-026). Trae el escudo (T-024): es el brote que enseña a usarlo. El escenario es el mismo que el del brote 1.

## Idea

Elk Cloner se copiaba en cada disquete y, de vez en cuando, enseñaba un poema. En el juego sus tropas se copian al caer y él recita: sus versos cruzan el carril por encima de las plantas y solo los para un escudo.

## Enemigos

| Tipo | Comportamiento | Aparece en |
|---|---|---|
| Copycat | Muerde como el gusano. Al caer deja una copia pequeña y débil, una sola vez. Da 15 | Ronda 1 |
| Copycat escupidor | Escupe como el escupidor y deja copia. Da 20 | Ronda 1 |
| Copycat acorazado | Como el acorazado, con placas de disquete, y deja copia. Da 25 | Ronda 1 |
| Minstrel | Se para a 3,5 casillas de lo primero sembrado y recita versos que cruzan el carril hasta el primer escudo. Da 25 | Ronda 3 |
| Elk Cloner, el Poeta (jefe) | Un bicho de pie con un disquete por cabeza y cornamenta. Avanza despacio, muerde, recita versos por su carril y, cada pocos, el poema entero por los cinco | Ronda 8 |

Las tropas tienen nivel desde la ronda 1, con las tablas de `ENEMY_LEVELS` (la `high`, del 5 al 9, desde la ronda 6). Desde T-035 ninguna pasa del nivel 9; solo la escolta de Elk Cloner lleva el 10. El tope de nivel de las disparadoras sigue en el 5 del brote 1 (T-035; hasta entonces subía a 10 en la ronda 1). Detalle de las tropas en "Tropas del brote 2 (T-025)" de `01-mecanicas.md`.

## Rondas

Decisiones L-01, L-07 y L-08 cerradas el 22 nov 2026 con la recomendación. Un concepto por ronda; el jugador ya sabe jugar, así que son 8 y no 10.

| Ronda | Concepto nuevo | Qué aprende el jugador |
|---|---|---|
| 1 | Los Copycat (hasta T-035, también el tope de nivel a 10, que contaba Boxer) | Que lo aprendido sigue y que cada Copycat deja una copia |
| 2 | Escudo: muro e infusión (lo presenta Patty y lo enseña Boxer) | Parar escupitajos antes de que lleguen a las disparadoras |
| 3 | Llega el Minstrel | Sus versos cruzan el carril: solo los para un escudo |
| 4 | Mezcla: acorazados, Minstrel y escupidores | Minas para unos, escudos para otros |
| 5 | Dos oleadas por los cinco carriles | Cubrir los cinco carriles |
| 6 | Elk Cloner se prepara: tropas aceleradas (+15 %) | Boxer cuenta quién fue; aguantar más deprisa |
| 7 | Aún más tropas y más rápidas (+25 %) | Llegar con un escudo en cada carril |
| 8 | Combate contra Elk Cloner y su escolta | Mantener los escudos mientras se le tumba |

### Guion (T-026, PROVISIONAL)

En las rondas del brote `elkCloner` de `OUTBREAKS` (`balance.ts`). Cada ronda empieza con 20 s de preparación que se pueden adelantar. El brote empieza con 300 monedas (`startingBalance`) y el tablero vacío (B-02).

| Ronda | Copycat | Escupidores | Acorazados | Minstrel | Último grupo | Niveles | Idea del guion |
|---|---|---|---|---|---|---|---|
| 1 | 15 | 3 | 3 | 0 | 74 s | 1 a 4 | De uno en uno al principio, como en el brote 1, pero ya con nivel y con copias |
| 2 | 10 | 12 | 5 | 0 | 76 s | 1 a 7 | Muchos escupidores: el muro les para los escupitajos |
| 3 | 18 | 6 | 8 | 8 | 80 s | 1 a 7 | Los primeros Minstrel, de uno en uno y luego en grupo |
| 4 | 19 | 5 | 10 | 7 | 84 s | 3 a 9 | Mezcla: acorazados que piden minas, Minstrel que piden escudos |
| 5 | 30 | 7 | 13 | 8 | 88 s | 3 a 9 | Dos oleadas por los cinco carriles, con Minstrel detrás |
| 6 | 33 | 12 | 13 | 10 | 90 s | 5 a 9 | Elk Cloner se prepara: todo un 15 % más rápido |
| 7 | 40 | 12 | 20 | 15 | 94 s | 5 a 9 | Todo un 25 % más rápido, con Minstrel por los cinco carriles |
| 8 | 5 | 0 | 10 | 14 | 116 s | 5 a 9 | Escolta: un acorazado de nivel 10 por carril y dos Minstrel de nivel 10; Elk Cloner por el centro y refuerzos mientras vive |

**Dificultad.** Lo dura que es cada ronda se mide con `roundThreat` (`rounds.ts`): la vida que saca el guion por segundo de ataque, con la fuerza media de sus niveles, las copias de los Copycat y lo que la acelera. Con la curva de T-035 sube de ronda en ronda (73, 153, 222, 362, 468, 681 y 967 hasta el combate; antes, 69, 136, 187, 271, 352, 540 y 764) y la ronda 1 ya es más dura que la 1 del brote 1 (18); las rondas 6 y 7 pasan a la 9 del brote 1 (660), la última antes de Creeper. Un test lo comprueba (`elkCloner.test.ts`).

**Refuerzos del combate final.** Mientras Elk Cloner vive, la ronda 8 sigue sacando grupos (Minstrel, acorazados y Copycat); cuando cae, los que faltan ya no salen y la ronda queda despejada (`stepRound`).

## Jefe: Elk Cloner

**El original (1982).** Uno de los primeros virus que salió de un laboratorio. Viajaba en disquetes de Apple II: se copiaba en cada disquete que pasaba por un equipo infectado y, cada 50 arranques, enseñaba un poema. No rompía nada: era una broma de un estudiante. No se reproduce su poema: los versos del jefe se inventan para el juego.

**En el juego (T-026, decisiones L-02 a L-09 cerradas el 21 y 22 nov 2026).**
- **Avanza despacio (L-05):** 0,15 casillas/s (0,1 hasta T-035), algo menos que Creeper, sin pararse. Muerde lo que toca, también un muro. Si cruza el jardín se pierde la partida, queden las vidas que queden.
- **Versos (L-02):** mientras pisa el césped, cada 3,5 s toma aire (1 s, como el Minstrel) y suelta un verso por su carril: una onda que quita 75 (55 hasta T-035) a todo lo que cruza hasta el primer escudo, que lo recibe y lo para. Ralentizado, tarda más entre versos.
- **Poema entero (L-03):** tras 2 versos, en vez del tercero anuncia el poema entero: se queda quieto (no avanza ni muerde) durante un aviso largo de 5 s, con un pentagrama dorado que se va encendiendo en los cinco carriles y la cuenta atrás. El aviso no va más lento aunque esté frenado. Luego suelta una onda dorada por cada carril, todas desde él, que quitan 558 (385 hasta T-035) a cada cosa que cruzan, hasta el primer escudo de su carril.
- **No borra el tablero (L-04):** lo que tenía la vida entera se queda al menos con el 25 % de su vida; lo ya dañado no se salva.
- **Escolta (L-06):** un Copycat acorazado de nivel 10 por carril y dos Minstrel de nivel 10, antes que él; luego refuerzos. Al mandarla grita "¡Copycat, en formación: que empiece la función!".
- **Al caer:** caen todos con él, ningún Copycat deja copia y los versos en vuelo se deshacen. Se gana el brote, queda vencido en el progreso permanente (T-017) y da sus semillas (T-020). Abre el brote 3 cuando exista.
- **No tiene nivel:** 10.890 de vida (9900 de base, con la fuerza de todos de T-010; 9900 hasta T-035), mordisco de 143 cada 1,2 s (110 hasta T-035).
- **Se prepara (rondas 6 y 7, y la preparación de la 8):** de pie sobre el suelo corrupto, a la derecha, escribiendo su poema en un pergamino que se llena de tinta; a cada tropa acelerada le manda una nota. En la ronda 6 Boxer cuenta qué fue el virus de verdad (T-032).
- **Habla rimando,** en un bocadillo de pergamino: al llegar, al anunciar cada poema, una de cada tres veces que recita, al escapar y al ganar.
- **Aspecto (L-09):** de pie, para no parecerse a Creeper, que va tumbado: cuatro cuentas granate con bandas de oro, una gorguera blanca de poeta, un disquete azul de 5¼ por cabeza con la cara dibujada en la etiqueta y la boca en la ventana de lectura, y una cornamenta dorada (el alce de su nombre) con una pluma de escribir. El aro del centro del disquete parecía un tercer ojo (Carmine, 22 nov 2026): hay cuatro propuestas (de metal, tenue, mate o sin aro) en `/jefes.html` y Carmine eligió la mate (C), que es la que usa el juego.

Las reglas están en `docs/specs/01-mecanicas.md` ("Jefe: Elk Cloner") y los valores, como PROVISIONAL en `ENEMIES.elkCloner` y `ELK_CLONER` de `balance.ts`.

## Simulación con bots

Con `npm run sim` (`src/game/sim/`): cada bot juega el brote entero 10 veces con azar fijo y las preparaciones enteras. El bot es el de T-009 y T-010 que fusiona antes de subir de nivel: cubre los cinco carriles, monta 3 columnas de disparadoras de 2 cañones (fuego en la primera y hielo en la segunda) y con lo que sobra sube de nivel la más baja. El que usa escudos, además, pone un muro delante de sus disparadoras en cuanto un carril tiene algo que ataca de lejos, cubre los cinco en cuanto tiene la primera columna montada, repone los que se rompen y siembra donde falten si el jefe anuncia el poema.

Resultado del 22 nov 2026:

| Bot | Victorias | Partida | Combate final |
|---|---|---|---|
| Sin escudos | 0 de 10 (pierde siempre en la ronda 8) | 16 min | 93 s |
| Sin escudos, con disparadoras de 3 cañones | 0 de 10 | 16 min | 109 s |
| Con escudos | 10 de 10, sin perder vidas | 16 min | 91 s |
| Sin escudos hasta oír el poema (y con moneda guardada para cinco muros) | 0 de 10 | 16 min | 101 s |
| Brote 1 con el mismo bot, como referencia | 9 de 10 | 17 min | 57 s |

- Las rondas 1 a 7 duran de 85 a 115 s de ataque; con las preparaciones, el brote ronda los 16 minutos, como el brote 1.
- **Sin escudos se pierde:** el poema entero cada pocos segundos acaba con lo que ya estaba dañado. Con más cañones tampoco basta: antes de los ajustes (con 6600 de vida y el poema cada 3 versos) un bot sin escudos y con 3 cañones le ganaba 6 de 6, porque lo tumbaba antes del segundo poema; por eso se subió su vida y el poema llega cada 2 versos y hace más daño.
- **Con escudos se gana,** también con baterías más pequeñas (2 columnas de 2 cañones: 5 de 6) o más grandes (4 de 2 o 3 de 3: 6 de 6, en 63 a 77 s). Con disparadoras de un solo cañón no se llega al jefe: se pierde en la ronda 6.
- **Reaccionar al aviso no basta si se llega sin escudos:** el aviso da tiempo a sembrar (5 s), pero hacen falta cinco muros (750 monedas) y el bot solo pone los que puede pagar, empezando por los carriles más amenazados, que no siempre son el del jefe. Con 3 cañones por disparadora sí gana reaccionando tarde (6 de 6).
- **Un muro por carril no lo resuelve todo:** el poema quita 385 a cada muro, así que aguantan tres poemas (desde T-035 quita 558: aguantan dos); Elk Cloner sigue avanzando y muerde el de su carril, y la escolta y los refuerzos desgastan los demás. Hay que reponerlos y tumbarlo a tiempo.

### Tras la curva de niveles de T-035 (22 nov 2026)

T-035 cambió el crecimiento por nivel (compuesto, `01-mecanicas.md`), dejó el tope de las disparadoras en 5, bajó el nivel máximo de las tropas al 9 y subió a Elk Cloner (vida +10 %, mordisco +30 %, verso a 75, poema +45 % y 0,15 casillas/s) y al Minstrel (+40 % de vida y de daño). Con `npm run sim`, 10 partidas por bot:

| Bot | Sin mejoras | Nivel base 3 | Nivel base 5 |
|---|---|---|---|
| Con escudos, 2 cañones | 0 de 10 (cae en la ronda 8, a veces en la 7) | 8 de 10 (jefe en 85 s) | 10 de 10 (69 s) |
| Con escudos, 3 cañones | 10 de 10 (jefe en 71 s) | 10 de 10 (60 s) | 10 de 10 (46 s) |
| Sin escudos, 2 cañones | 0 de 10 | 0 de 10 | 10 de 10 (68 s) |
| Sin escudos, 3 cañones | 0 de 10 | 4 de 10 | 10 de 10 (46 s) |
| Brote 1, sin escudos, 2 cañones (referencia) | 9 de 10 (jefe en 60 s) | 9 de 10 | 10 de 10 |

- **Sin comprar nada, el brote 2 pide escudos y fusionar a 3 cañones.** Con 2 cañones el combate final se pierde; con algo de nivel base ya se gana.
- **Con el nivel base 5 comprado, los escudos dejan de ser obligatorios.** Es el premio de haberlo comprado todo; si se quiere que el escudo siga haciendo falta, la palanca es el poema.
- **El brote 1 queda como estaba:** 9 de 10 sin mejoras, con las rondas unos segundos más largas (la 9, de 113 a 121 s).
