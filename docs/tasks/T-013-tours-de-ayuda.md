# [Interfaz] Tours de ayuda: cada cosa nueva se enseña la primera vez

**Estado:** Completada (20 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** L (orientativo) · **Depende de:** T-012 · **Bloquea a:** ninguna · **Origen:** pedido de Carmine del 20 nov 2026 ("el juego desbloquea las funciones pero el usuario no está familiarizado con los controles ni en cómo hacer las cosas")

## Contexto
Cada ronda del mundo 1 desbloquea algo (T-009) y el aviso "¡YA LO TIENES!" cuenta qué es en una línea, pero no enseña el gesto: arrastrar una carta, tocar una planta para subirla, arrastrar una planta sobre otra, llevar una mina hasta una disparadora o tocar dos veces para ver una ficha. Un jugador nuevo no sabe dónde tocar.

## Objetivos
1. Un tour por cada cosa que se desbloquea, solo la primera vez: se enseña con una mano animada que hace el gesto sobre el tablero de verdad.
2. Se guarda qué tours se vieron, para no repetirlos (también en partidas nuevas).
3. El jugador apaga todos los tours con la opción "Ayuda" de los ajustes.
4. Más visual que texto: lo importante se ilumina, la mano lo hace y el bocadillo lleva un dibujo y una frase corta.
5. Regla del proyecto: una mecánica nueva llega con su tour.

## Alcance
**Incluye:** tours de la ronda 1 (lo básico), de subir de nivel, de las dos minas, de infundir y de fusionar; pista de la moneda en el suelo; opción "Ayuda" en Opciones y en Ajustes; tours vistos guardados en el navegador; regla en `CLAUDE.md`, guía de gráficos y ADR.
**No incluye:** botón para volver a ver los tours, tours de la portada o de los menús, vídeos o capturas, cambios de reglas o de balance.

## Decisiones
| # | Pregunta | Decisión (20 nov 2026) | Decide |
|---|---|---|---|
| G-01 | ¿Cómo es cada paso? | "Mira y prueba": se oscurece todo menos lo importante y una mano animada hace el gesto sobre el tablero de verdad. Si el jugador lo hace, el paso se celebra y avanza solo; si no puede o no quiere, pulsa "Siguiente" | Carmine |
| G-02 | ¿Qué tours hay? | Uno por cada desbloqueo (subir de nivel, mina de fuego, mina de hielo, infundir, fusionar), lo básico en la ronda 1 (sembrar, carril, monedas, vidas, ficha y "¡Que vengan!") y la pista de la moneda en el suelo | Carmine |
| G-03 | ¿Y el aviso "¡YA LO TIENES!"? | Se queda como está; al pulsar "¡A jugar!" empieza el tour de lo nuevo, si no se vio y la ayuda está encendida | Carmine |
| G-04 | ¿Corre la cuenta atrás durante el tour? | No: la preparación se queda parada mientras dura (el juego sigue vivo para poder hacer el gesto). "¡Que vengan!" sigue funcionando y cierra el tour | Claude (lo dejó así la pregunta G-01) |
| G-05 | ¿Cuándo cuenta un tour como visto? | Al acabarlo, al pulsar "Saltar" o si el jugador empieza el ataque a medias. Se guarda en este navegador (`rebrote.tours`) y no se borra al perder ni con una partida nueva | Claude |
| G-06 | ¿Qué es un jugador nuevo? | El que aún no vio ese tour en este navegador. Quien ya jugaba antes de esta task verá los tours de lo que le quede por desbloquear | Claude |
| G-07 | ¿Qué pasa si falta lo que hay que señalar? | Si no hay planta, par para fusionar o mina, el paso no ilumina el tablero: sale solo el bocadillo con su dibujo animado. Nunca se atasca | Claude |
| G-08 | Pista de la moneda | Sin pausa ni velo: una mano toca la moneda y un bocadillo pequeño dice que vale más. Deja de salir al recoger una así, o tras salir tres veces | Claude |
| G-09 | ¿Librería de tours? | No: hecha a mano en React (ver ADR-0012). Las librerías señalan elementos de la página con texto, y lo que hay que señalar está dentro del lienzo de Phaser y hay que animar el gesto | Claude |
| G-10 | ¿Por defecto? | La ayuda está encendida. Apagarla en mitad de un tour lo cierra sin darlo por visto | Claude |

## Criterios de aceptación

Comprobados el 20 nov 2026 con tests de Vitest (los nuevos `tourSpots.test.ts` y `tours.test.ts`; 301 en total) y en Chrome sin ventana sobre la RTX 4060, en calidad Ultra, con clics y arrastres de ratón de verdad:
- Ronda 1 entera a 1600 × 900: arrastrar la carta a la casilla iluminada siembra, sale "¡Bien!" y pasa al carril; monedas y vidas con "Siguiente"; dos clics sobre la planta abren su ficha (el tour espera debajo) y, al cerrarla, sale "¡Que vengan!"; pulsarlo empieza el ataque y el tour queda visto. La cuenta atrás se queda en 20 todo el rato.
- Rondas 2 a 6 (con la tecla N): tras "¡A jugar!", tocar la planta abre el panel y la mano pasa al botón "Subir"; las dos minas se siembran arrastrando la carta y se ve su alcance; se infunde con la carta de fuego y luego arrastrando la mina de fuego; se fusionan dos de fuego. El tablero queda como debe y cada tour, visto.
- Pausa > Ajustes > English a mitad del tour: el juego se recarga y el tour sigue en el mismo paso, en inglés, con la cuenta atrás parada. "Saltar" lo cierra y la cuenta sigue.
- Pista de la moneda: sale sobre la primera moneda del suelo; al recogerla (+18) queda aprendida y la siguiente moneda ya no la lleva.
- Ayuda apagada: no sale nada y la cuenta corre. Encendida a mitad de la preparación, sale el tour con la cuenta parada. Cargar la partida guardada vuelve a sacar el tour no terminado; uno visto no sale en una partida nueva tras recargar.
- 812 × 375 (inglés) y 568 × 320 (español): lo básico y subir de nivel; el bocadillo cabe y no tapa lo señalado.
- El aviso de girar la pantalla tapa el tour como todo lo demás (`covered`); no se probó en un móvil de verdad.

- [x] Partida nueva sin tours vistos: en la ronda 1 sale lo básico (sembrar, carril, monedas, vidas, ficha y "¡Que vengan!"), con la cuenta atrás parada.
- [x] Al empezar las rondas 2 a 6, tras "¡A jugar!", sale el tour de lo nuevo: subir de nivel, mina de fuego, mina de hielo, infundir y fusionar.
- [x] Hacer el gesto de verdad completa el paso con una celebración; "Siguiente" pasa sin hacerlo; "Saltar" cierra el tour.
- [x] Un tour visto no vuelve a salir, tampoco en una partida nueva ni al recargar la página.
- [x] Con la ayuda apagada (Opciones o Ajustes) no sale ningún tour ni la pista de la moneda.
- [x] La primera moneda que cae al suelo lleva la pista; al recogerla deja de salir.
- [x] Si falta lo que hay que señalar, el paso sale igual con su dibujo y no se atasca (probado con el carril sin planta; el resto, con test).
- [x] Probado a 1600 × 900, 812 × 375 y 568 × 320, en español y en inglés: el bocadillo no se sale ni tapa lo que señala.
- [x] La pausa, la ficha, el aviso de desbloqueo, el cambio de calidad o de idioma y el aviso de girar no rompen un tour a medias (el de girar, por código: no se probó en un móvil).
- [x] Regla en `CLAUDE.md`, lista en la guía de gráficos, ADR-0012; `Feature` sin tour no compila.
- [x] `npm test` y `npm run build` pasan.

## Cómo quedó (para tareas siguientes)
- **Tours:** `src/ui/tour/tours.ts` (`TOUR_OF_FEATURE`, `TOURS` con sus pasos, `toursOfRound`, `cueOf`, `placeStep`), tours vistos en `tourProgress.ts` (clave `rebrote.tours`, `HINT_MAX_SHOWS`), bocadillo en `placeBubble.ts`. Los pone en marcha `useTours` (en `App`) y los pinta `TourOverlay` con `TourHand` y `TourPicture`; la pista de la moneda, `CoinHint`.
- **Escena:** `tourHold` para la preparación en `advance`; `emitTourBoard` manda lo que señalar (lo elige `tourCells` de `view/tourSpots.ts`) y `emitTourArt` los dibujos (`portraitUrl` sin fondo). `playerAction` al sembrar, infundir, seleccionar, subir de nivel y fusionar; `coinDropped` y `coinGone` para la pista. Al arrancar, la escena pone `tourHold` a falso y `useTours` se lo vuelve a decir al recibir `sceneReady`.
- **HUD:** las piezas que se señalan llevan `data-tour` (`card-*`, `balance`, `lives`, `round-go`, `level-up`).
- **Ajustes:** `Settings.help` (por defecto encendida), en la sección "Ayuda" de `SettingsPanel`.
