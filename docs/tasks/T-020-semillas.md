# [Progresión] Moneda secundaria: semillas

**Estado:** Completada (21 nov 2026, 0.5.0) · **Prioridad:** Alta · **Tamaño estimado:** S (orientativo) · **Depende de:** T-017, T-018 · **Bloquea a:** T-022, T-023 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
La partida tiene una sola moneda (`balance` en `MatchState`), que se gana por enemigo eliminado y por goteo (`ECONOMY` en `balance.ts`, `src/game/core/economy.ts`) y se pierde al acabar la partida. No hay nada que el jugador se lleve de un brote al siguiente.

Carmine quiere una segunda moneda que se gane al superar rondas y al vencer jefes, y que se gaste fuera de la partida. Los jefes vencidos se pueden rejugar para ahorrar más.

## Objetivos
1. **Que cada partida deje algo,** se gane o se pierda.
2. **Que rejugar sirva, sin romper la economía.**
3. **Que no se confunda** con la moneda de la partida.

## Alcance
**Incluye:** saldo de la moneda secundaria en el progreso permanente, reglas de recompensa en `src/game/core/`, valores en `balance.ts`, resumen de lo ganado en victoria y derrota, saldo visible en el Invernadero, textos, tests.
**No incluye:** en qué se gasta (T-022 y T-023), compras con dinero real.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| C-01 | Nombre | **Cerrada (21 nov 2026): semillas**, con la recomendación | Cerrada | Carmine |
| C-02 | ¿Cuánto da cada cosa? | **Cerrada (21 nov 2026):** valores libres, pero con algo de azar: cada recompensa tiene un tope y da entre el 75 y el 100 % de él, así nunca hay valores fijos. Topes del brote 1: 50 por ronda superada y 500 por el jefe; cada brote siguiente sube los topes un 5 % de los del brote 1 | Cerrada | Carmine |
| C-03 | ¿Cuánto da rejugar un brote ya vencido? | **Cerrada (21 nov 2026): b**, una sola fracción, pero entre el 15 y el 25 % del tope (al azar), en las rondas y en el jefe | Cerrada | Carmine |
| C-04 | Si pierdes, ¿cobras las rondas superadas? | **Cerrada (21 nov 2026): sí, pero poco:** no lo mismo que superando cada ronda y ganando. Se cobra el 25 % de lo que dieron las rondas | Cerrada | Carmine |
| C-05 | ¿Bonus por no perder vidas? | **Cerrada (21 nov 2026): sí**, cuantas más vidas quedan, más: un porcentaje de lo ganado, un 10 % por vida (con 3, un 30 %) | Cerrada | Carmine |

Además, Carmine pidió (21 nov 2026) que el jugador vea lo que gana al ganar y al perder, que las cantidades sean pequeñas frente a una tienda con artículos de 1000 a 2000 semillas y el más caro de unos 10.000, y que la economía obligue a repetir algún brote para comprar más y llegar al final con lo máximo posible. Los valores están en `SEEDS` de `balance.ts` como PROVISIONAL y se ajustan cuando existan los precios de la tienda; el detalle y las cuentas de toda la ruta, en "Semillas (T-020)" de `01-mecanicas.md`.

## Criterios de aceptación
- [x] Al superar una ronda se suma su recompensa al total de la partida (y sale "+N semillas" bajo "¡Ronda N superada!").
- [x] Al vencer al jefe por primera vez se suma la recompensa de jefe.
- [x] En un brote ya vencido, las recompensas se reducen según C-03.
- [x] Al terminar la partida (victoria, o derrota si C-04 es sí), lo ganado pasa al progreso permanente una sola vez.
- [x] Las pantallas de victoria y de derrota muestran cuánto se ganó y el saldo nuevo.
- [x] El Invernadero muestra el saldo.
- [x] El icono y el color son distintos de los de la moneda de la partida.
- [x] Salir al menú con la partida guardada no entrega nada todavía, y reanudarla no entrega dos veces.

### Calidad
- [x] Cantidades siempre en enteros.
- [x] Reglas puras con tests, valores en `balance.ts`.
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Cerrar la pestaña justo al ganar: la recompensa se entrega antes de borrar la partida guardada, no después.
- Recargar la pantalla de victoria no cobra de nuevo.
- Farmeo: perder a propósito en la ronda 9 una y otra vez. Con C-03 el beneficio es bajo; vigilarlo.
- Saldo muy grande: el marcador no se desborda con 6 cifras.

## Objetivo final con ejemplos
Con los valores decididos (topes de 50 por ronda y 500 por el jefe; del 75 al 100 % la primera vez y del 15 al 25 % al repetir; 10 % por vida al ganar; 25 % de las rondas al perder). Cada cantidad cae al azar entre las dos cifras, siempre redondeando hacia abajo:
| Partida | Semillas |
|---|---|
| Vence el brote 1 por primera vez (9 rondas y el jefe) sin perder vidas | De 920 a 1235 |
| Lo vence por primera vez con 1 vida | De 778 a 1045 |
| Pierde en la ronda 7 del brote 1, sin haberlo vencido | De 55 a 75 |
| Vuelve a vencer el brote 1 sin perder vidas | De 179 a 302 |
| Sale al menú en la ronda 4 y no vuelve | 0 hasta que termine esa partida |

Lo que dio la prueba en el juego (21 nov 2026): primera victoria con 3 vidas, 383 de las rondas, 455 del jefe y 251 de las vidas: 1089. Repetirlo y perder en la ronda 7: 57 de las rondas, se cobran 14.

## Notas de cierre (21 nov 2026)
- La última ronda (la del jefe) no da semillas de ronda: da las del jefe al cobrar. Por eso el brote 1 cobra 9 rondas.
- Si el brote ya estaba vencido se decide al empezar la partida y va en ella (`MatchState.seeds.replay`): una partida reanudada sigue igual.
- El progreso pasa a la versión 3 y la partida guardada también: lo guardado antes se descarta (ADR-0014, sin migraciones).
- No lleva tour ni sonido propio: no es un gesto ni una mecánica de la partida. Al superar una ronda suena lo de siempre y el "+N semillas" sale en el tablero; la victoria y la derrota ya tienen su sonido.
- Riesgo de farmeo vigilado con un test: perder a propósito en el combate final nunca da más que volver a ganar un brote ya vencido.

## Cómo probarlo (QA)
1. Perder en la ronda 3 y mirar la pantalla de derrota y el Invernadero.
2. Vencer el brote 1 dos veces y comparar lo ganado.
3. Recargar en la pantalla de victoria y comprobar que el saldo no sube.
