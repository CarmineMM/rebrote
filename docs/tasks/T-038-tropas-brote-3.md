# [Enemigos] Tropas del brote 3: Lurker y Skipper

**Estado:** Completada (22 nov 2026, 0.14.0) · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-037 · **Bloquea a:** T-039 · **Origen:** conversación de diseño del 22 nov 2026

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

## Decisiones
LK-02 a LK-09, cerradas por Carmine el 22 nov 2026, al empezar la task: todas con la recomendación. LK-01, en la galería `/bichos.html`: el camaleón y el saltamontes.

| # | Pregunta | Opciones | Recomendación | Decidido |
|---|---|---|---|---|
| LK-01 | ¿Qué bicho son? | Propuestas en la galería | Tres propuestas. Idea: bichos de camuflaje para los Lurker y un saltamontes o una pulga para el Skipper. Que no parezcan gusanos | En la galería, entre insecto hoja, camaleón y encapuchado para los Lurker, y saltamontes, pulga y grillo de muelles para el Skipper: el camaleón (B; el escupidor, con los colores al revés) y el saltamontes rosa (A). Las otras se quedan en la galería como referencia |
| LK-02 | ¿Cómo se ve "oculto"? | a) Silueta que tiembla. b) Transparente. c) Del color del césped | a: el jugador siempre lo ve; las plantas no | a (la recomendación): oscura, con contorno y un temblor de interferencia; al descubrirse recupera sus colores |
| LK-03 | Además de la distancia, ¿qué descubre a un oculto? | Libre | Recibir daño, estar frenado por hielo o quemado por fuego, y morder. Vuelve a ocultarse unos segundos después solo si sigue lejos | La recomendación: recibir daño (bala, mina o granada), ir frenada o quemada la descubre; vuelve a ocultarse 3 s después solo si sigue a más de 4 casillas. Morder y escupir pasan siempre dentro de las 4 |
| LK-04 | ¿Una bala que ya va por el carril le da a un oculto? | Sí o no | Sí: oculto es "no le apuntan", no "no le dan" | Sí (la recomendación) |
| LK-05 | ¿Cuánto salta el Skipper y cuánto descansa? | Libre | 2 casillas por salto y 1 s en tierra | La recomendación: 2 casillas por salto, 1 s en tierra y unos 0,5 s en el aire (unas 1,3 casillas/s) |
| LK-06 | ¿El Skipper hace estallar las minas? | a) Sí, al caer cerca. b) Nunca | a: en tierra es un enemigo más. En el aire no las activa | a (la recomendación) |
| LK-07 | Si el escudo que lo paró se rompe, ¿qué hace? | Sigue saltando o muerde lo siguiente | Sigue saltando | Sigue saltando (la recomendación) |
| LK-08 | ¿Cuánta vida y cuánto da? | Libre | Menos vida que el Lurker base (unos dos tercios) y la misma moneda que un escupidor | La recomendación: 65 de vida (72 en el nivel 1 con la fuerza de todos) y 20 monedas |
| LK-09 | ¿Con qué números salen los Lurker? | Los del brote 1 o menos vida | Los del brote 1, como los Copycat, y la simulación ajusta | La recomendación: los del gusano, el escupidor y el acorazado (100, 140 y 400 de vida; 15, 20 y 25 monedas). La simulación los vio muy duros y bajaron un 25 % (ver abajo) |

### Decidido al implementar
- **Vida de los Lurker, con la simulación (LK-09):** con la vida del brote 1, el bot (con escudos o sin ellos) perdía siempre en la ronda 1 del guion provisional: con las disparadoras atrás, el sigilo les quita más de la mitad del tiempo de disparo y, sin bajas al principio, no hay monedas para construir. Probadas cuatro variantes (10 partidas cada una), la que deja el brote jugable es un 25 % menos de vida (75, 105 y 300; `LURKER_HP` en `balance.ts`) y la ronda 1 con niveles `early`, como la ronda 1 del brote 2. Con eso el bot gana 4 de 10 y pasa las tres rondas. Lo demás (daño, velocidad, alcance, moneda) es lo del brote 1. El Skipper se queda con sus 65 de vida (LK-08). Tabla en `docs/specs/06-brote-3-brain.md`.
- **Dónde caen los saltos:** el Skipper nunca cae encima de un escudo ni detrás: si caería dentro de su alcance de mordisco, cae justo a su alcance (`hopStop`). Si se siembra un escudo mientras vuela, también lo para. Mientras muerde un escudo su descanso no corre: cuando el escudo cae, descansa 1 s, se agacha y sigue saltando (LK-07).
- **Aspecto oculto (LK-02):** silueta del morado de la corrupción (`#2b2034`), con los ojos encendidos en verde neón, un temblor continuo y, cada 1,5 s, un tirón de interferencia. Al descubrirse destella en verde y suelta unos píxeles. Sin WebGL (Phaser en Canvas no tiñe), la silueta no se puede pintar y el oculto se ve muy transparente con los ojos encendidos: se sigue distinguiendo. La medallita de nivel y el aura se siguen viendo sobre la silueta.
- **Sin tour:** como el Minstrel y los Copycat (T-025), son enemigos, no un gesto ni una pieza del jugador (regla 9: cada `Feature` lleva su tour). Los presentan los avisos de una línea de las rondas 1 y 3 del guion provisional.
- **Sonido:** el Skipper salta con un "boing" de muelle y un poco de hierba (`hop`, receta nueva `boing`); un Lurker se descubre con un destello digital que sube y un chasquido de interferencia (`reveal`, receta `decloak`). Cada uno con dos alternativas en `/sonidos.html` para que Carmine elija de oído. Una semilla normal suena a metal en el Lurker acorazado, como en los otros acorazados.
- **Derrota:** en el brote 3 dice "bichos" en vez de "gusanos" ("3 bichos cruzaron el jardín").
- **Guion provisional del brote 3:** los Lurker en lugar de los Copycat desde la ronda 1 y el Skipper de uno en uno (tres) en la ronda 3, como dice el diseño. El de verdad es de T-039.
- **En desarrollo:** la tecla L suelta un Lurker (base, escupidor y acorazado, por turnos) y la S un Skipper, en el carril del puntero.

## Criterios de aceptación
### Lurker (las tres)
- [x] Muerden, escupen y aguantan como sus equivalentes del brote 1, con los valores propios que se decidan.
- [x] Entran ocultas. Una disparadora no dispara por una tropa oculta.
- [x] Se descubren al llegar a 4 casillas de lo primero sembrado en su carril, y según LK-03.
- [x] Una mina estalla al acercarse una tropa oculta, igual que con una visible.
- [x] En un carril sin nada sembrado cruzan ocultas hasta la salida.
- [x] El jugador distingue de un vistazo una tropa oculta de una descubierta.

### Skipper
- [x] Avanza a saltos, con una pausa en tierra entre uno y otro, y se agacha antes de saltar.
- [x] Pasa por encima de plantas y minas sin tocarlas ni pararse.
- [x] Con un escudo en su camino (muro, disparadora con escudo o muro de hielo), cae delante y lo muerde.
- [x] En el aire no recibe balas; en tierra sí.
- [x] El hielo le alarga la pausa entre saltos.
- [x] Al cruzar el borde izquierdo quita una vida, como cualquier enemigo.
- [x] No llega oculto.

### Calidad
- [x] Reglas en `core` con tests; valores en `balance.ts`; la partida guardada acepta las tropas nuevas, estén ocultas, en tierra o en el aire.
- [x] Propuestas de aspecto en la galería antes de pintar las definitivas (LK-01).
- [x] Arte, animación, aura y niveles gráficos según `docs/guias/graficos.md` ("Enemigo nuevo").
- [x] Cada tropa tiene su ficha, que dice si está oculta.
- [x] Sonido propio para el salto y para descubrirse (regla 10).
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

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

Con `npm run dev`: la tecla L suelta un Lurker (base, escupidor y acorazado, por turnos) y la S un Skipper, en el carril del puntero; la N salta de ronda y la M da moneda. `/bichos.html` compara las propuestas de aspecto (LK-01): en "Aspecto", lado a lado y con un botón por cada reacción; en "Tablero", con las reglas de verdad.
