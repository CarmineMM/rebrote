# ADR-0012: Tours de ayuda hechos a mano, sobre el juego vivo

- **Estado:** Aceptada
- **Fecha:** 2026-11-20

## Contexto

T-013 pide un tour por cada cosa que se desbloquea, solo para quien no lo vio, que se pueda apagar con la opción "Ayuda" y que sea más visual que texto. Carmine eligió "mira y prueba" (G-01): una mano animada hace el gesto sobre el tablero de verdad y, si el jugador lo hace, el paso avanza solo.

Lo que hay que señalar casi nunca es un elemento de la página: es una casilla libre, una disparadora, una mina o dos plantas que se pueden fusionar, dentro del lienzo de Phaser, con la cámara inclinada del ADR-0005. Y el gesto que se enseña es un arrastre o un doble toque, no un clic en un botón.

Condiciones previas:
- React no pinta entidades del juego; si tiene que enseñar una planta o un enemigo, la escena le manda una imagen compuesta con sus texturas (regla 3 de `CLAUDE.md`, `portrait.ts`).
- React y Phaser se hablan solo por `EventBus`.
- La pausa congela la escena entera, también la entrada (ADR-0007).

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| Una librería de tours (driver.js, Shepherd, React Joyride) | Velo, foco y bocadillos ya hechos | Señalan elementos de la página: para una casilla del lienzo habría que crear elementos falsos encima. No animan gestos. Traen su propio aspecto (que habría que tapar entero) y más peso |
| Tours pintados en Phaser | Todo en el lienzo | El HUD que hay que señalar (cartas, saldo, vidas, "¡Que vengan!", el botón "Subir") es de React; los textos y bocadillos irían en el lienzo y se recrearían con cada cambio de calidad |
| Tours hechos a mano en React, con lo del tablero que manda la escena | Un solo sistema para el HUD y el tablero; mismo aspecto que el resto de menús; el gesto se anima con CSS | Hay que escribir el velo, la mano y la colocación del bocadillo |

## Decisión

Tours hechos a mano en React, encima del juego vivo.

- **Qué tours hay y cuándo salen** es una tabla pura (`src/ui/tour/tours.ts`): cada `Feature` de `rounds.ts` tiene su tour (`TOUR_OF_FEATURE`, un `Record<Feature, TourId>`: una `Feature` sin tour no compila). Al empezar la preparación de una ronda, `App` pone en cola los tours de lo que desbloquea que aún no se vieron, si la ayuda está encendida. Salen cuando no hay nada encima (aviso de desbloqueo, ficha, pausa, derrota o aviso de girar).
- **El juego sigue vivo, con la preparación parada.** Mientras sale un tour, `App` manda `tourHold` y la escena no descuenta la preparación (no hay enemigos en la preparación, así que no hay nada más que parar). La entrada funciona: el jugador puede hacer el gesto de verdad.
- **La escena dice qué señalar** (`tourBoard`): casillas y plantas que sirven para cada paso, ya en coordenadas de la página (círculos y el contorno de un carril). Las elige una función pura sobre el estado y las reglas de core (`src/game/view/tourSpots.ts`). También manda una vez los dibujos que van en los bocadillos (`tourArt`), compuestos con sus texturas como la foto de la ficha.
- **La escena dice qué hizo el jugador** (`playerAction`: sembrar, infundir, seleccionar, subir de nivel, fusionar). El tour lo usa para dar el paso por hecho; la ficha (`entityInfo`) y el ataque (`roundChanged`) ya llegaban.
- **React pinta** el velo con huecos (un SVG con máscara, que no recoge clics), los aros que laten, la mano (SVG hecha con código) que hace el gesto con CSS, y el bocadillo con su dibujo, una frase corta, los puntos de los pasos, "Siguiente" y "Saltar". Dónde va el bocadillo lo decide una función pura con test (`placeBubble`), como el panel de nivel.
- **Los tours vistos** se guardan aparte de la partida (`rebrote.tours`): no se borran al perder ni con una partida nueva. La opción "Ayuda" va con los demás ajustes (`rebrote.ajustes`).

## Consecuencias

- Una mecánica nueva lleva su tour (regla de `CLAUDE.md`): pasos en `TOURS`, sus textos en `tour` de `src/i18n/`, lo que haya que señalar en `tourSpots.ts` y lo que cuente como hecho en `playerAction`. La guía de gráficos tiene la lista.
- Lo que ilumina un tour no bloquea nada: el velo deja pasar los clics. Un tour nunca se atasca: si falta lo que señalar, sale solo el bocadillo.
- Con la pausa, la ficha o el aviso encima, el tour espera debajo y sigue donde iba.
