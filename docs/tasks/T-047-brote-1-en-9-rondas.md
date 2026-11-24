# [Rondas] Brote 1 en 9 rondas: Creeper se prepara desde la 7

**Estado:** Completada (24 nov 2026, 0.17.1) · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** ninguna · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 23 nov 2026; tentativa TT-001, revisada el 24 nov 2026

## Contexto
Carmine quiere acortar el brote 1 de 10 a 9 rondas, sin tocar el saldo inicial (`startingBalance`, 250) ni la escolta de Creeper (5 acorazados de nivel 10).

Hoy (comprobado el 24 nov 2026, en 0.17.0):
- El guion está en `CREEPER_ROUNDS` (`src/game/config/balance.ts:635`). La ronda 7 (`balance.ts:743`) no desbloquea nada (`unlocks: []`) y es el repaso: 28 gusanos, 8 acorazados y 7 escupidores, con niveles `ENEMY_LEVELS.tables.mid`.
- Las rondas 8 y 9 llevan `bossPreparing: true` y `haste` 1,25 y 1,35; la 10 es el combate.
- El código cuenta las rondas por la longitud del guion (`roundCount`, `src/game/core/outbreaks.ts:79`), y que Creeper se vea preparándose depende de `bossPreparing`, no del número de ronda.
- Cada ronda tiene su aviso, uno por ronda y en orden, en `round.notices.creeper` (`src/i18n/es.ts:345` y `en.ts`).
- Los comentarios de la historia (`REMARKS`, `src/ui/story/remarks.ts`) solo existen para el brote 4.
- La partida guardada solo comprueba que el índice de ronda exista en el guion (`isRound`, `src/game/save.ts:253`): una guardada del brote 1 en la ronda 10 se ignoraría, pero una en la 7 u 8 cargaría en otra ronda con otros grupos.
- Las semillas de cada ronda superada salen de `creditRound` (`src/game/core/seeds.ts:103`), que llama `stepRound` (`src/game/core/rounds.ts:563`); la escena las enseña bajo "¡Ronda N superada!" (`celebrate`, `BoardScene.ts:1071`).
- Simulación antes del cambio (`npm run sim`, bot sin escudos que fusiona a 2 cañones, 10 partidas): 9 de 10 ganadas, 17,7 min de media y 61 s de combate final.

## Objetivos
1. **Una partida del brote 1 más corta:** una ronda menos.
2. **Mantener todo lo que se enseña:** las rondas 1 a 6, con una mecánica nueva cada una, no cambian.
3. **Que Creeper siga siendo vencible** para quien fusiona, con el mismo saldo inicial y la misma escolta.
4. **Que el jugador no pierda semillas por la ronda quitada:** la ronda 1 del brote 1 da un premio especial (R9-05).

## Alcance
**Incluye:** quitar la ronda 7 de repaso, mover la preparación de Creeper a las rondas 7 y 8 y el combate a la 9, el premio de estreno de la ronda 1, avisos en español e inglés, tests, simulación (`npm run sim`) y docs.
**No incluye:** cambiar `startingBalance`, la escolta, los números de Creeper, las mecánicas de las rondas 1 a 6 ni los demás brotes.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| R9-01 | ¿Qué ronda se quita? | **Cerrada (23 nov 2026):** la 7 de repaso; Creeper se prepara en la 7 y la 8 y se le combate en la 9 | Cerrada | Carmine |
| R9-02 | ¿Se tocan el saldo inicial o la escolta? | **Cerrada (23 nov 2026):** no | Cerrada | Carmine |
| R9-03 | Si la simulación sale mucho más difícil (el bot que fusiona baja claramente de lo que ganaba), ¿qué se ajusta? | **Cerrada (24 nov 2026):** b) unas pocas tropas más en la ronda 6, para recuperar algo de la moneda, solo si hace falta | Cerrada | Carmine |
| R9-04 | ¿Se mete algo del repaso ("llegan todos a la vez") en la nueva ronda 7? | **Cerrada (24 nov 2026):** a) no, se queda como la 8 de ahora | Cerrada | Carmine |
| R9-05 | Semillas: con una ronda menos, el brote 1 da unas 43 semillas menos por partida ganada (unas 56 con las 3 vidas). ¿Se compensa? | **Cerrada (24 nov 2026):** sí, con un premio de estreno al superar la ronda 1 del brote 1: otra tirada del 100 % del tope de una ronda, con su azar (la ronda 1 da el doble). Cuenta como lo de las rondas: da menos en un brote ya vencido, al perder se cobra su 25 % y las vidas lo suben. Solo en el brote 1. Carmine propuso un 10 %; se descartó porque son unas 4 semillas y no compensa | Cerrada | Carmine |

## Criterios de aceptación
### Guion
- [x] `CREEPER_ROUNDS` tiene 9 rondas: la 1 a la 6 sin cambios, la 7 y la 8 son las antiguas 8 y 9 (con `bossPreparing`, su `haste` y sus niveles) y la 9 es el combate contra Creeper.
- [x] El saldo inicial sigue en 250 y la escolta, en cinco acorazados de nivel 10.
- [x] Creeper se ve preparándose en las rondas 7 y 8 y en la preparación de la 9.
- [x] Tras ganar la ronda 9 la partida queda ganada, Creeper queda vencido y se abre el brote 2.

### Premio de estreno (R9-05)
- [x] Al superar la ronda 1 del brote 1 se suma a la partida, además de lo de la ronda, un premio del 100 % del tope de una ronda (`openingBonus` en `OUTBREAKS`, `balance.ts`), con el mismo azar: entre el 75 y el 100 % la primera vez y entre el 15 y el 25 % en un brote ya vencido.
- [x] Se cobra como lo de las rondas: al ganar, entero y con lo de las vidas; al perder, su 25 %.
- [x] Los brotes 2 a 4 no lo tienen, y ninguna otra ronda lo da.
- [x] Bajo "¡Ronda 1 superada!" y "+N semillas" sale una línea propia, "¡Premio de estreno! +M", en el color de las semillas, en español y en inglés.
- [x] Perder a propósito sigue sin dar más que volver a ganar un brote ya vencido (el test de `seeds.test.ts`).

### Textos
- [x] `round.notices.creeper` tiene 9 avisos en español y en inglés: sin "Llegan todos a la vez…" y en el mismo orden que el guion.
- [x] El texto de "¡Ronda N superada!" y el contador de rondas enseñan 9 en total.

### Partida guardada
- [x] Una partida guardada del brote 1 con la forma anterior no rompe el juego ni carga en una ronda distinta de la que era: se sube `SAVE_VERSION` (regla 8) y las guardadas de antes se ignoran.

### Balance
- [x] Se pasa `npm run sim` y el resultado del brote 1 se anota en `02-brote-1-creeper.md`, comparado con el anterior.
- [x] Si sale mucho más difícil, se aplica lo que decide R9-03. No hizo falta: 9 de 10 ganadas, como antes (detalle en `02-brote-1-creeper.md`).

### Calidad
- [x] Los tests que daban por hecho 10 rondas en el brote 1 se ajustan, y el premio de estreno tiene los suyos.
- [x] El catálogo de jefes (`/catalog/jefes.html`) enseña los grupos de la ronda del combate.
- [x] Docs: `02-brote-1-creeper.md` (tablas de rondas y del guion, jefe en la 9), `01-mecanicas.md` (rondas en las líneas 78, 82, 86, 87, 95, 176 y 188, y las semillas: el premio, la tabla y la nota de "brotes de 10 rondas") y la tabla de `docs/tasks/README.md`.
- [x] Versión de parche (regla 12) y línea en `CHANGELOG.md`.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- **Riesgo: el jugador llega más pobre a Creeper.** La ronda de repaso da unas 760 monedas (28 × 15 + 8 × 25 + 7 × 20). Sin ella, se llega al combate con menos disparadoras fusionadas y subidas.
- **Menos práctica:** se pierde la única ronda con los tres tipos juntos antes de que Creeper acelere a las tropas.
- Partida guardada a mitad del brote 1 al actualizar la versión: no debe quedar en una ronda que ya no existe ni en otra distinta.
- El premio de estreno se suma una sola vez por partida: una partida ya cobrada no suma nada, como las rondas.
- La regla 15 (lo desbloqueado vale hacia delante y hacia atrás) no se ve afectada: la ronda quitada no desbloquea nada.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Supera la ronda 1 del brote 1 por primera vez | "¡Ronda 1 superada!", "+43 semillas" y "¡Premio de estreno! +41" |
| Supera la ronda 1 de un brote 1 ya vencido | Lo mismo, con el azar de repetir: "+9 semillas" y "¡Premio de estreno! +11" |
| Supera la ronda 1 del brote 2 | Sin premio de estreno |
| Supera la ronda 6 (fusionar) | Empieza la 7: "¡Creeper se prepara!", tropas un 25 % más rápidas y Creeper a la derecha |
| Supera la ronda 8 | Preparación de la 9 con Creeper a la vista; al atacar, la escolta y Creeper |
| Vence a Creeper en la 9 | Partida ganada, Creeper vencido y el brote 2 abierto |
| El contador de rondas | "Ronda 7 de 9" |

## Cómo probarlo (QA)
1. Empezar el brote 1 y superar la ronda 1: sale el premio de estreno bajo las semillas de la ronda.
2. Saltar rondas con la N hasta la 7: Creeper se ve preparándose.
3. Llegar a la 9 y comprobar la escolta y el combate.
4. Ganar y comprobar el progreso permanente, la ruta y las semillas cobradas.
5. Cargar una partida guardada antes del cambio y ver que no se rompe (se ignora).
6. `npm run sim` y comparar con el resultado anterior.
