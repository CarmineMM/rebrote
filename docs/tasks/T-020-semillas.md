# [Progresión] Moneda secundaria: semillas

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** S (orientativo) · **Depende de:** T-017, T-018 · **Bloquea a:** T-022, T-023 · **Origen:** conversación de diseño del 20 nov 2026

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
| C-01 | Nombre | Semillas, esporas, brotes | Semillas (brote ya es otra cosa) | Carmine |
| C-02 | ¿Cuánto da cada cosa? | Valores libres | Ronda superada: 5. Jefe vencido por primera vez: 100 | Carmine |
| C-03 | ¿Cuánto da rejugar un brote ya vencido? | a) Lo mismo. b) Una fracción | b: 25 % de las rondas y del jefe. Si da lo mismo, la tienda se vacía en una tarde | Carmine |
| C-04 | Si pierdes, ¿cobras las rondas superadas? | Sí o no | Sí: perder no se siente vacío | Carmine |
| C-05 | ¿Bonus por no perder vidas? | Sí o no | Sí, pequeño: premia jugar bien sin hacerlo obligatorio | Carmine |

Los valores se escriben como PROVISIONAL en `balance.ts` y se ajustan cuando existan los precios de la tienda.

## Criterios de aceptación
- [ ] Al superar una ronda se suma su recompensa al total de la partida.
- [ ] Al vencer al jefe por primera vez se suma la recompensa de jefe.
- [ ] En un brote ya vencido, las recompensas se reducen según C-03.
- [ ] Al terminar la partida (victoria, o derrota si C-04 es sí), lo ganado pasa al progreso permanente una sola vez.
- [ ] Las pantallas de victoria y de derrota muestran cuánto se ganó y el saldo nuevo.
- [ ] El Invernadero muestra el saldo.
- [ ] El icono y el color son distintos de los de la moneda de la partida.
- [ ] Salir al menú con la partida guardada no entrega nada todavía, y reanudarla no entrega dos veces.

### Calidad
- [ ] Cantidades siempre en enteros.
- [ ] Reglas puras con tests, valores en `balance.ts`.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Cerrar la pestaña justo al ganar: la recompensa se entrega antes de borrar la partida guardada, no después.
- Recargar la pantalla de victoria no cobra de nuevo.
- Farmeo: perder a propósito en la ronda 9 una y otra vez. Con C-03 el beneficio es bajo; vigilarlo.
- Saldo muy grande: el marcador no se desborda con 6 cifras.

## Objetivo final con ejemplos
Con los valores recomendados (ronda 5, jefe 100, repetición 25 %):
| Partida | Semillas |
|---|---|
| Vence el brote 1 por primera vez (10 rondas y jefe) | 150 |
| Pierde en la ronda 7 del brote 1, sin haberlo vencido | 30 |
| Vuelve a vencer el brote 1 | 37 (se redondea hacia abajo) |
| Sale al menú en la ronda 4 y no vuelve | 0 hasta que termine esa partida |

## Cómo probarlo (QA)
1. Perder en la ronda 3 y mirar la pantalla de derrota y el Invernadero.
2. Vencer el brote 1 dos veces y comparar lo ganado.
3. Recargar en la pantalla de victoria y comprobar que el saldo no sube.
