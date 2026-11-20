# ADR-0011: En móvil, solo en horizontal

- **Estado:** Aceptada
- **Fecha:** 2026-11-20

## Contexto

Carmine probó el juego en un móvil y pidió que no se vea en vertical: "que solo se vea en landscape, con un aviso que se entienda".

La vista adaptable del ADR-0007 enseña siempre el diseño entero de 1600 × 900 y rellena con decorado desde 1,1:1 hasta 2,58:1. Un móvil de pie mide 9:19,5 (0,46:1): el tablero queda como una tira estrecha en medio de mucho cielo, las plantas y los gusanos salen diminutos y el HUD no cabe. Una tableta de pie (3:4) está algo mejor, pero tampoco se juega bien.

Hay dos límites técnicos:
- El navegador no deja fijar la orientación desde una página normal. `screen.orientation.lock('landscape')` solo funciona a pantalla completa y solo en algunos navegadores (Chrome y Firefox en Android). En iPhone no hay ni pantalla completa ni bloqueo.
- Un manifiesto con `"orientation": "landscape"` solo vale si el juego se instala como aplicación, y no lo hacemos (ADR-0001: una página sin más).

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| Dejarlo como está | Nada que hacer | En vertical no se puede jugar |
| Girar el juego con CSS (`rotate(90deg)`) en vertical | Se ve en horizontal sin girar nada | El jugador tiene el móvil de pie y el juego de lado: los toques, el arrastre de plantas y los textos van girados, y al girar el móvil el juego gira dos veces |
| Aviso de girar la pantalla, más bloqueo donde se pueda | Lo entiende todo el mundo (lo hacen muchos juegos de móvil), y en Android el bloqueo lo deja fijo en horizontal | En iPhone el jugador tiene que girarlo él |

## Decisión

Aviso de girar la pantalla, y bloqueo en horizontal donde el navegador lo permita.

- **Cuándo sale:** pantalla táctil en vertical, `(orientation: portrait) and (pointer: coarse)` (`PORTRAIT_TOUCH_QUERY` en `src/ui/useLandscapeOnly.ts`). Vale para móviles y tabletas. Una ventana de escritorio estrecha (con ratón) no cuenta: ahí sigue la vista adaptable del ADR-0007.
- **Qué se ve:** `RotateNotice` (React) tapa todo, también la pausa y la carga: un móvil que gira y se pone de lado, "Gira la pantalla" y una frase que explica que el juego se juega en horizontal. Si hay una partida en marcha, añade "Tu partida te espera en pausa".
- **El juego duerme:** mientras sale el aviso, el bucle de Phaser se para (`setGameAsleep` en `createGame.ts`, con `loop.sleep()` y `loop.wake()`). No se simula ni se pinta nada, tampoco la portada, y no se gasta batería. Al despertar se reinicia la cuenta del tiempo para que no haya un salto.
- **La partida se pausa:** al ponerse en vertical, `App` abre el menú de pausa, como al cambiar de pestaña. Al girar de nuevo, el jugador lo encuentra en pausa y sigue con "Continuar". Mientras sale el aviso, las teclas no hacen nada.
- **Bloqueo:** al entrar a pantalla completa (ADR-0007) se pide `screen.orientation.lock('landscape')` (`lockLandscape`). Si el navegador no lo deja, no pasa nada. Como tocar el aviso también es un gesto que activa la pantalla completa, en Android basta con tocarlo para que el juego se ponga en horizontal.

## Consecuencias

- Nada del juego (HUD, menús, fichas, portada) tiene que diseñarse para un móvil en vertical. Lo pequeño que hay que probar es el móvil en horizontal: 812 × 375 y 568 × 320.
- Cualquier superposición nueva va por debajo del aviso (`z-index` menor que 10).
- Si algún día se instala como aplicación (PWA), el manifiesto llevará `"orientation": "landscape"` y el aviso seguirá para el navegador.
