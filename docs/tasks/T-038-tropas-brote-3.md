# [Enemigos] Tropas del brote 3: Lurker y Skipper

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-037 · **Bloquea a:** T-039 · **Origen:** conversación de diseño del 22 nov 2026

## Contexto
El diseño del brote está en `docs/specs/06-brote-3-brain.md`. Brain es un virus de sector de arranque, no un gusano, así que sus tropas son bichos nuevos (decidido por Carmine).

Lo que ya existe y se puede aprovechar (verificado):
- El guion de tropas por brote: base, distancia y tanque. En el brote 2 son los Copycat, que repiten las reglas del gusano, el escupidor y el acorazado (`WORM`, `SPITTER`, `ARMORED` en `balance.ts`) y añaden su rasgo.
- La regla del salto frente a un escudo: "una unidad que salta por su carril cae delante del primer escudo" (`hopLanding`, T-024). Ninguna unidad la usa todavía.
- Estar en el aire: Creeper ya lo está al saltar (`isAirborne`).
- El invento muro de hielo también para saltos.
- La galería de enemigos en desarrollo (`/gusanos.html`) y la de jefes (`/jefes.html`).

## Objetivos
1. **Tres tropas con el rasgo del brote:** llegan ocultas.
2. **El Skipper:** la primera unidad que salta por su carril.
3. **Que haya respuesta para todo:** escudo, minas y hielo.

## Alcance
**Incluye:** Lurker, Lurker escupidor, Lurker acorazado y Skipper en `ENEMIES`; regla de oculto y regla de salto en `core`; arte, animación y aura por nivel; propuestas de aspecto en la galería; fichas de información; sonido; textos; partida guardada; tests.
**No incluye:** el jefe y el guion de rondas (T-039), reutilizar tropas de otros brotes.

## Decisiones cerradas (22 nov 2026)
- En el aire, al Skipper no le dan las balas.
- Las tres tropas base llegan ocultas y se descubren a 4 casillas de lo primero sembrado en su carril.
- Ninguna tropa pasa del nivel 9; solo la escolta del jefe lleva el 10.
- Los nombres van en inglés: Lurker y Skipper.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| LK-01 | ¿Qué bicho son? | Propuestas en la galería | Tres propuestas. Idea: bichos de camuflaje para los Lurker y un saltamontes o una pulga para el Skipper. Que no parezcan gusanos | Carmine |
| LK-02 | ¿Cómo se ve "oculto"? | a) Silueta que tiembla. b) Transparente. c) Del color del césped | a: el jugador siempre lo ve; las plantas no | Carmine |
| LK-03 | Además de la distancia, ¿qué descubre a un oculto? | Libre | Recibir daño, estar frenado por hielo o quemado por fuego, y morder. Vuelve a ocultarse unos segundos después solo si sigue lejos | Carmine |
| LK-04 | ¿Una bala que ya va por el carril le da a un oculto? | Sí o no | Sí: oculto es "no le apuntan", no "no le dan" | Carmine |
| LK-05 | ¿Cuánto salta el Skipper y cuánto descansa? | Libre | 2 casillas por salto y 1 s en tierra | Carmine |
| LK-06 | ¿El Skipper hace estallar las minas? | a) Sí, al caer cerca. b) Nunca | a: en tierra es un enemigo más. En el aire no las activa | Carmine |
| LK-07 | Si el escudo que lo paró se rompe, ¿qué hace? | Sigue saltando o muerde lo siguiente | Sigue saltando | Carmine |
| LK-08 | ¿Cuánta vida y cuánto da? | Libre | Menos vida que el Lurker base (unos dos tercios) y la misma moneda que un escupidor | Carmine |

## Criterios de aceptación
### Lurker (las tres)
- [ ] Muerden, escupen y aguantan como sus equivalentes del brote 1, con los valores propios que se decidan.
- [ ] Entran ocultas. Una disparadora no dispara por una tropa oculta.
- [ ] Se descubren al llegar a 4 casillas de lo primero sembrado en su carril, y según LK-03.
- [ ] Una mina estalla al acercarse una tropa oculta, igual que con una visible.
- [ ] En un carril sin nada sembrado cruzan ocultas hasta la salida.
- [ ] El jugador distingue de un vistazo una tropa oculta de una descubierta.

### Skipper
- [ ] Avanza a saltos, con una pausa en tierra entre uno y otro, y se agacha antes de saltar.
- [ ] Pasa por encima de plantas y minas sin tocarlas ni pararse.
- [ ] Con un escudo en su camino (muro, disparadora con escudo o muro de hielo), cae delante y lo muerde.
- [ ] En el aire no recibe balas; en tierra sí.
- [ ] El hielo le alarga la pausa entre saltos.
- [ ] Al cruzar el borde izquierdo quita una vida, como cualquier enemigo.
- [ ] No llega oculto.

### Calidad
- [ ] Reglas en `core` con tests; valores en `balance.ts`; la partida guardada acepta las tropas nuevas, estén ocultas, en tierra o en el aire.
- [ ] Propuestas de aspecto en la galería antes de pintar las definitivas (LK-01).
- [ ] Arte, animación, aura y niveles gráficos según `docs/guias/graficos.md` ("Enemigo nuevo").
- [ ] Cada tropa tiene su ficha, que dice si está oculta.
- [ ] Sonido propio para el salto y para descubrirse (regla 10).
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Un Skipper que cae justo sobre la casilla de una planta normal: no se para ni la daña.
- Un Skipper en el aire cuando estalla una mina: no recibe daño.
- Dos Skippers en el mismo carril frente al mismo escudo: los dos lo muerden.
- Tropa oculta en llamas: descubierta mientras arde.
- Escupidor oculto: se descubre a 4 casillas pero escupe desde 2,6; siempre se le ve antes de que ataque.
- Una disparadora sembrada delante de una tropa oculta la descubre al instante si queda a menos de 4 casillas.
- **Riesgo de balance:** descubrirse a 4 casillas deja a las plantas la mitad del recorrido para disparar. Ajustar vida y cantidades con la simulación, no a ojo.
- **Riesgo de vidas:** con 3 vidas, tres Skippers colados acaban la partida.
- **Riesgo de parecido:** el Skipper salta siempre y por encima de todo lo que no sea escudo. No convertirlo en "salta una vez la primera planta".

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Lurker entra por un carril con una disparadora en la columna 2 | La disparadora no dispara hasta que el Lurker está a 4 casillas |
| Lo mismo, con una mina de hielo a mitad de carril | La mina lo frena y lo descubre; la disparadora empieza a disparar antes |
| Skipper por un carril con 3 disparadoras y ningún escudo | Las salta todas y quita una vida |
| Lo mismo, con un muro en la primera columna | Cae delante del muro, lo muerde y las disparadoras lo eliminan |
| Skipper en el aire sobre una disparadora que dispara | Las balas pasan por debajo |

## Cómo probarlo (QA)
1. Con `?brote=3`, dejar un carril solo con disparadoras y soltar un Skipper.
2. Añadir un muro y repetir; después, una disparadora con escudo.
3. Poner una mina de hielo y mirar cuándo empiezan a disparar las plantas a un Lurker.
