# Mundo 1: Gusanos

## Idea

Los gusanos informáticos se copian solos de máquina en máquina. En el juego son bichos literales que avanzan por los carriles.

## Enemigos

| Tipo | Comportamiento | Aparece en |
|---|---|---|
| Gusano | Avanza y muerde la planta que encuentra | Ronda 1 |
| Gusano acorazado | Igual, con mucha más vida y más lento. Lleva casco y placas que se le caen al perder vida | Ronda 4 |
| Gusano escupidor | Se detiene a distancia y escupe. Puede destruir minas antes de que exploten | Ronda 6 |
| Creeper (jefe) | Gusano gigante con cabeza de monitor. Salta de carril al perder vida y deja copias suyas | Ronda 10 |

## Rondas

Un concepto nuevo por ronda.

| Ronda | Concepto nuevo | Qué aprende el jugador |
|---|---|---|
| 1 | Disparadora y gusano | Sembrar y defender un carril |
| 2 | Subir de nivel | Mejorar o sembrar otra: primera decisión con la moneda |
| 3 | Fuego solo | La mina y su conteo de 2 s |
| 4 | Infundir fuego, llega el acorazado | El daño progresivo contra enemigos con mucha vida |
| 5 | Hielo, solo e infundido | Frenar para ganar tiempo |
| 6 | Fusionar, llega el escupidor | Concentrar poder y proteger las minas |
| 7 | Todo junto, sin ayudas | Repaso |
| 8 | Creeper se prepara: gusanos acelerados | Aguantar más deprisa |
| 9 | Más gusanos y aún más rápidos | Llegar fuerte al jefe |
| 10 | Combate contra Creeper | Repartir las defensas por los cinco carriles |

### Guion (T-007 y T-008, PROVISIONAL)

Borrador en `ROUNDS` de `balance.ts`, para afinar jugando. Cada ronda empieza con 20 s de preparación que se pueden adelantar.

| Ronda | Gusanos | Acorazados | Escupidores | Último grupo | Idea del guion |
|---|---|---|---|---|---|
| 1 | 10 | 0 | 0 | 60 s | Uno por carril, de uno en uno: hay que cubrir los cinco |
| 2 | 15 | 0 | 0 | 64 s | Parejas en el mismo carril: subir de nivel o sembrar otra |
| 3 | 19 | 0 | 0 | 66 s | Grupos juntos y en carriles vecinos: donde una mina rinde |
| 4 | 12 | 5 | 0 | 72 s | Un acorazado por carril cada poco, con gusanos que distraen |
| 5 | 22 | 5 | 0 | 78 s | Dos oleadas por los cinco carriles: frenar para ganar tiempo |
| 6 | 13 | 5 | 5 | 82 s | Escupidores que revientan minas y desgastan la primera planta |
| 7 | 28 | 8 | 7 | 87 s | Todo junto, con dos oleadas seguidas al final |
| 8 | 33 | 8 | 8 | 88 s | Todo un 20 % más rápido. Oleadas por los cinco carriles |
| 9 | 39 | 13 | 10 | 91 s | Todo un 35 % más rápido, con escupidores en cuatro carriles a la vez |
| 10 | 0 | 0 | 0 | 2 s | Solo Creeper, por el carril del centro (más sus copias) |

Simulado con una defensa sólida (tres columnas de disparadoras), las 7 primeras rondas duran unos 11 minutos con las preparaciones enteras. Un bot que siembra por columnas, sube de nivel e infunde supera las 10 sin perder vidas en unos 13 minutos sin contar las preparaciones (unos 16 con ellas).

## Jefe: Creeper

**El original (1971).** Programa experimental que se movía de una máquina a otra por ARPANET y mostraba un mensaje retando a que lo atraparan. Se considera el primer gusano.

**En el juego (T-008, decidido el 20 nov 2026).**
- Castiga al jugador que fusionó todo en una sola fila y obliga a repartir defensas.
- **Se prepara (rondas 8 y 9):** se le ve enroscado sobre el suelo corrupto, a la derecha, con "CARGANDO" en su pantalla y una barra que se llena. Acelera a los gusanos: cada uno que sale recibe un chispazo suyo.
- **Sale (ronda 10):** salta al agujero del carril del centro y dice "SOY CREEPER: ¡ATRÁPAME SI PUEDES!", como el original.
- **Salto de carril (J-01, J-02):** al perder cada 20 % de vida se agacha, marca el carril de destino durante 1 s y salta a él. El destino es al azar, nunca su carril. En el aire no le dan las balas ni las minas.
- **Copias (J-03):** al despegar deja un gusano acelerado en el carril que abandona.
- **Aterrizaje (J-05):** golpea a lo primero sembrado que tiene delante.
- **Fase 2 (J-04):** por debajo del 50 % la pantalla se le pone roja, se enfada y salta cada 10 %, avisa solo 0,6 s y deja dos copias.
- **Fin:** si cruza el borde izquierdo se pierde la partida. Al derrotarlo sus copias se desconectan y el mundo 1 está superado.
- **Aspecto:** un gusano gigante hecho de ordenador antiguo: cabeza de monitor de carcasa crema con la cara en fósforo verde y una antena con luz roja, y anillos de carcasa con rejilla y lucecitas.

Las reglas están en `docs/specs/01-mecanicas.md` y los valores, como PROVISIONAL en `ENEMIES.creeper` y `CREEPER` de `balance.ts`.

## Mundos futuros (solo ideas, no se diseñan aún)

- Troyanos: llegan con pinta inofensiva y sueltan enemigos al morir.
- Ransomware: ponen un candado a una planta hasta que pagues.
