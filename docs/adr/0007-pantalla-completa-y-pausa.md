# ADR-0007: Pantalla completa, vista adaptable y menú de pausa

- **Estado:** Aceptada
- **Fecha:** 2026-11-19

## Contexto

Carmine prefiere jugar a pantalla completa, con un menú que pause el juego y desde el que se llegue a los ajustes. Hasta ahora el juego iba en un marco con una barra de HUD encima y un engranaje con un panel de ajustes.

Hay dos problemas técnicos:
- **Proporción:** las pantallas y ventanas no son todas 16:9. Una ventana de navegador típica es más ancha (unos 2:1) y una tableta, más alta (4:3). Con escalado `FIT` quedan bandas negras; con recorte se pierde parte del césped.
- **Pantalla completa del navegador:** el navegador solo deja entrar tras un gesto del jugador, y la tecla Esc sale de ella sin avisar a la página.

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| `FIT` con bandas | Simple | No es pantalla completa de verdad |
| `ENVELOP` (recortar) | Llena siempre | En 21:9 corta el carril delantero; en 4:3 se pierden los agujeros de los gusanos |
| Diseño fijo + decorado extra alrededor | Llena siempre y nunca recorta el juego | Hay que pintar más mundo (cielo, laterales, tierra) |

## Decisión

### Vista adaptable
- El diseño sigue midiendo 1600 × 900 y **siempre se ve entero**.
- El lienzo toma la proporción de la pantalla. `viewFor(aspect)` en `layout.ts` decide qué trozo del mundo se ve:
  - Más ancha que 16:9: más mundo a los lados.
  - Más alta: más cielo arriba y más tierra abajo.
- Alrededor del diseño hay **decorado extra** (`BLEED`, `WORLD`): 360 por los lados, 360 arriba y 200 abajo. Cubre desde 1,1:1 hasta 2,58:1.
- Al redimensionar la ventana la escena reajusta lienzo y cámara (`fitView`). La lógica no cambia: sigue en coordenadas de tablero.

### HUD flotante
React pinta el HUD encima del juego:
- Arriba a la izquierda, la bandeja de cartas.
- Arriba a la derecha, el saldo y el botón de pausa.
- Abajo a la izquierda, los FPS si se activan.

### Pantalla completa del navegador
- Es una preferencia **activada por defecto**.
- Se entra con el primer clic o tecla del jugador fuera de los menús. Los menús llevan `data-no-autofullscreen` para no activarla.
- Si el jugador sale (Esc del navegador), el juego se pone en pausa. "Continuar" vuelve a pantalla completa.
- Si el navegador no la permite, la opción aparece desactivada.

### Menú de pausa
- Se abre con el botón del HUD, con **Esc** (si no hay carta elegida; con carta, Esc la suelta) o con **P**. También se abre solo al cambiar de pestaña o salir de pantalla completa.
- **Pausar** congela la escena entera: temporizadores, tweens, partículas, el goteo pasivo y la vida de las monedas soltadas. El juego se sigue viendo, desenfocado, detrás del menú.
  - Se aplica en el acto con `this.sys.pause()` y `this.sys.resume()`, no con `this.scene.pause()`, que espera en cola al siguiente fotograma. Con la cola, quitar la pausa y volver a ponerla enseguida (aceptar un aviso de desbloqueo y que salga el siguiente, T-009) dejaba la escena en pausa sin nada abierto.
  - El aviso de desbloqueo de T-009 y la ficha de información de T-010 también pausan el juego mientras están abiertos, igual que el menú. En `App`, todo lo que pausa se junta en `halted`.
- Desde el menú se llega a **Ajustes**: pantalla completa, calidad gráfica (ADR-0006) y mostrar FPS.
- Si se cambia la calidad con el menú abierto, el juego nuevo arranca ya en pausa y con la misma partida.
- Las preferencias se guardan en `localStorage` (`rebrote.ajustes`).

## Consecuencias

- Todo decorado nuevo cubre el mundo entero (`WORLD`), no solo el diseño. Ningún elemento de juego va fuera del diseño de 1600 × 900, que es lo único que se ve siempre.
- La franja de arriba de la pantalla la tapa el HUD: ahí solo va cielo o decorado, nunca algo con lo que se juegue.
- Todo lo que pasa con el tiempo dentro del juego usa el reloj, los tweens y las partículas de la escena, para que la pausa lo congele. Nada de `setTimeout` ni `requestAnimationFrame` sueltos.
- T-002 y siguientes: la pantalla de derrota y otros menús son superposiciones de React, como el de pausa, y deben convivir con él.
