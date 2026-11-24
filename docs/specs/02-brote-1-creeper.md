# Brote 1: Creeper

Un brote es una campaña que termina en un jefe (T-018, ver "Brotes" en `01-mecanicas.md`). Este es el primero: sus tropas son gusanos y su jefe, Creeper. Hasta T-018 se llamaba "Mundo 1: Gusanos"; "gusanos" dejó de ser el nombre porque habrá más jefes gusano con tropas modificadas, y "mundo" queda reservado para el futuro.

## Idea

Los gusanos informáticos se copian solos de máquina en máquina. En el juego son bichos literales que avanzan por los carriles.

## Enemigos

| Tipo | Comportamiento | Aparece en |
|---|---|---|
| Gusano | Avanza y muerde la planta que encuentra. Da 15 | Ronda 1 |
| Gusano acorazado | Igual, con mucha más vida y más lento. Lleva casco y placas que se le caen al perder vida. Da 25 | Ronda 3 |
| Gusano escupidor | Se detiene a distancia y escupe. Puede destruir minas antes de que exploten. Da 20 | Ronda 4 |
| Creeper (jefe) | Gusano gigante con cabeza de monitor. Llega con escolta, salta de carril al perder vida y deja copias suyas | Ronda 9 |

Desde la ronda 3 los enemigos tienen nivel (T-009): más vida y más daño, cada vez más alto. Desde T-010 todos, también Creeper, son un 10 % más fuertes, y los de nivel 5 a 9 y 10 o más, un 20 % y un 40 % más. Detalle en `01-mecanicas.md`.

## Rondas

Un concepto nuevo por ronda.

| Ronda | Concepto nuevo | Qué aprende el jugador |
|---|---|---|
| 1 | Disparadora y gusano | Sembrar y defender un carril |
| 2 | Subir de nivel (hasta el 5) | Mejorar o sembrar otra: primera decisión con la moneda |
| 3 | Mina de fuego, llega el acorazado, enemigos con nivel | La mina y su conteo de 2 s |
| 4 | Mina de hielo, llega el escupidor | Frenar para ganar tiempo y proteger las minas |
| 5 | Infundir (carta o mina arrastrada) | El daño progresivo y el frenado en cada disparo |
| 6 | Fusionar | Concentrar poder |
| 7 | Creeper se prepara: tropas aceleradas y más numerosas | Aguantar más deprisa |
| 8 | Aún más tropas y más rápidas | Llegar fuerte al jefe |
| 9 | Combate contra Creeper y su escolta | Repartir las defensas por los cinco carriles |

Hasta T-047 (24 nov 2026) eran 10 rondas: la 7 era de repaso, sin nada nuevo y con los tres tipos a la vez (28 gusanos, 8 acorazados y 7 escupidores), y Creeper se preparaba en la 8 y la 9. Se quitó para acortar la partida (R9-01). Para no perder semillas, la ronda 1 da un premio de estreno con el doble (R9-05, en "Semillas" de `01-mecanicas.md`).

### Guion (T-007, T-008, T-009 y T-047, PROVISIONAL)

Borrador en las rondas del brote `creeper` de `OUTBREAKS` (`balance.ts`), para afinar jugando. Cada ronda empieza con 20 s de preparación que se pueden adelantar. El brote empieza con 250 monedas (`startingBalance`).

| Ronda | Gusanos | Acorazados | Escupidores | Último grupo | Idea del guion |
|---|---|---|---|---|---|
| 1 | 10 | 0 | 0 | 60 s | Uno por carril, de uno en uno: hay que cubrir los cinco |
| 2 | 15 | 0 | 0 | 64 s | Parejas en el mismo carril: subir de nivel o sembrar otra |
| 3 | 19 | 1 | 0 | 66 s | Grupos juntos y en carriles vecinos: donde una mina rinde. Primer acorazado |
| 4 | 12 | 5 | 2 | 72 s | Un acorazado por carril cada poco, con gusanos que distraen y los dos primeros escupidores |
| 5 | 22 | 5 | 0 | 78 s | Dos oleadas por los cinco carriles: frenar para ganar tiempo |
| 6 | 13 | 5 | 5 | 82 s | Escupidores que revientan minas y desgastan la primera planta |
| 7 | 50 | 12 | 12 | 92 s | Todo un 25 % más rápido. Oleadas por los cinco carriles |
| 8 | 59 | 20 | 15 | 99 s | Todo un 35 % más rápido, con escupidores en cuatro carriles a la vez |
| 9 | 0 | 5 | 0 | 5,5 s | Escolta de cinco acorazados de nivel 10 (T-010) y Creeper detrás, por el centro (más sus copias) |

Simulado con una defensa sólida (tres columnas de disparadoras), las 7 primeras rondas duran unos 11 minutos con las preparaciones enteras. Un bot que siembra por columnas, sube de nivel e infunde supera las 10 sin perder vidas en unos 13 minutos sin contar las preparaciones (unos 16 con ellas).

Con T-009 (20 nov 2026), el mismo tipo de bot (hasta 4 columnas, sube siempre la más baja hasta el tope, fuego en la primera columna y hielo en la segunda) llega a Creeper sin perder vidas en 6 partidas de 6 y le gana en 5. Cada partida dura unos 17 minutos con las preparaciones enteras.

Con T-010 (20 nov 2026) y la fuerza a 15, 25 y 40 %, ese bot perdía las 6 partidas, casi siempre en las rondas 9 y 10. Lo que más pesaba era la fuerza: con las reglas de T-009 y solo la fuerza y los tramos, ya perdía las 6. Quitar el goteo de la preparación lo baja de 4 victorias a 3, y el tope 5 no le cambia nada (nunca llega a subirlo todo al 5). Con la fuerza rebajada a 10, 20 y 40 % (el mismo día) sigue perdiendo las 6, pero siempre llega a la ronda 10. Un bot que fusiona antes de subir de nivel (3 o 4 columnas de disparadoras de dos cañones) gana 12 partidas de 12 sin perder vidas con las dos fuerzas: ahora subir de nivel sin fusionar no basta.

Con T-047 (24 nov 2026), el brote pasa de 10 rondas a 9. `npm run sim`, 10 partidas con el bot que fusiona a dos cañones en 3 columnas, sin escudos:

| Nivel base | Con 10 rondas (antes) | Con 9 rondas (T-047) |
|---|---|---|
| 1 (sin comprar) | 9 de 10 · 17,7 min · combate final 61 s | 9 de 10 · 15,9 min · combate final 63 s |
| 3 | 9 de 10 · 17 min · 52 s | 10 de 10 · 15,2 min · 52 s |
| 5 | 10 de 10 · 16,6 min · 45 s | 10 de 10 · 14,7 min · 45 s |

La partida dura casi 2 minutos menos y no sale más difícil: la única que pierde con nivel base 1 la pierde contra Creeper, como antes, y el combate final dura casi lo mismo. Por eso no se ajusta nada (R9-03).

## Jefe: Creeper

**El original (1971).** Programa experimental que se movía de una máquina a otra por ARPANET y mostraba un mensaje retando a que lo atraparan. Se considera el primer gusano.

**En el juego (T-008, decidido el 20 nov 2026).**
- Castiga al jugador que fusionó todo en una sola fila y obliga a repartir defensas.
- **Se prepara (rondas 7 y 8; la 8 y la 9 hasta T-047):** se le ve enroscado sobre el suelo corrupto, a la derecha, con "CARGANDO" en su pantalla y una barra que se llena. Acelera a los gusanos: cada uno que sale recibe un chispazo suyo.
- **Sale (ronda 9; la 10 hasta T-047):** primero grita "¡ADELANTE, MIS ACORAZADOS!" y manda a su escolta, un acorazado de nivel 10 por carril a su paso (T-009; nivel 10 desde T-010). Luego salta al agujero del carril del centro y dice "SOY CREEPER: ¡ATRÁPAME SI PUEDES!", como el original.
- **Salto de carril (J-01, J-02):** al perder cada 20 % de vida se agacha, marca el carril de destino durante 1 s y salta a él. El destino es al azar, nunca su carril. En el aire no le dan las balas ni las minas.
- **Copias (J-03):** al despegar deja un gusano acelerado en el carril que abandona. Desde T-009 las copias son de nivel 10 y en la fase 2 pueden ser acorazados o escupidores. Muerde 117,5, lo que un gusano de nivel 10 en T-009; con la fuerza de T-010, 129,25, y tiene 4400 de vida.
- **Aterrizaje (J-05):** golpea a lo primero sembrado que tiene delante.
- **Fase 2 (J-04):** por debajo del 50 % la pantalla se le pone roja, se enfada y salta cada 10 %, avisa solo 0,6 s y deja dos copias.
- **Fin:** si cruza el borde izquierdo se pierde la partida. Al derrotarlo sus copias se desconectan y el brote 1 está superado: queda vencido para siempre en el progreso permanente (T-017) y abre el brote 2 (T-018, B-04).
- **Aspecto:** un gusano gigante hecho de ordenador antiguo: cabeza de monitor de carcasa crema con la cara en fósforo verde y una antena con luz roja, y anillos de carcasa con rejilla y lucecitas.

Las reglas están en `docs/specs/01-mecanicas.md` y los valores, como PROVISIONAL en `ENEMIES.creeper` y `CREEPER` de `balance.ts`.

## Mundos futuros (solo ideas, no se diseñan aún)

La palabra "mundo" queda para esto: familias de virus que podrían agrupar varios brotes.

- Troyanos: llegan con pinta inofensiva y sueltan enemigos al morir.
- Ransomware: ponen un candado a una planta hasta que pagues.
