# Mundo 1: Gusanos

## Idea

Los gusanos informáticos se copian solos de máquina en máquina. En el juego son bichos literales que avanzan por los carriles.

## Enemigos

| Tipo | Comportamiento | Aparece en |
|---|---|---|
| Gusano | Avanza y muerde la planta que encuentra | Ronda 1 |
| Gusano acorazado | Igual, con mucha más vida y más lento. Lleva casco y placas que se le caen al perder vida | Ronda 4 |
| Gusano escupidor | Se detiene a distancia y escupe. Puede destruir minas antes de que exploten | Ronda 6 |

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
| 7 | Todo junto, sin ayudas | Repaso antes del jefe |

### Guion (T-007, PROVISIONAL)

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

Simulado con una defensa sólida (tres columnas de disparadoras), las 7 rondas duran unos 11 minutos con las preparaciones enteras.

## Jefe: Creeper

**El original (1971).** Programa experimental que se movía de una máquina a otra por ARPANET y mostraba un mensaje retando a que lo atraparan. Se considera el primer gusano.

**En el juego.**
- Salta de carril cada cierto tiempo.
- Castiga al jugador que fusionó todo en una sola fila y obliga a repartir defensas.

**Pendiente de diseñar:** vida, frecuencia de salto, si avisa a qué carril va, si invoca gusanos y si tiene fases.

## Mundos futuros (solo ideas, no se diseñan aún)

- Troyanos: llegan con pinta inofensiva y sueltan enemigos al morir.
- Ransomware: ponen un candado a una planta hasta que pagues.
