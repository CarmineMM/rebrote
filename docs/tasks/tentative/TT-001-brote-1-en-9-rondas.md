# [Rondas] Brote 1 en 9 rondas: Creeper se prepara desde la 7

**Estado:** Tentativa · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** ninguna · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 23 nov 2026

> Task tentativa (ADR-0026): antes de pasarla a `docs/tasks/` con su número T-xxx, hay que revisar el código y comprobar que el contexto, las rutas y las líneas citadas siguen siendo ciertos.

## Contexto
Carmine quiere acortar el brote 1 de 10 a 9 rondas, sin tocar el saldo inicial (`startingBalance`, 250) ni la escolta de Creeper (5 acorazados de nivel 10).

Hoy (verificado el 23 nov 2026, en 0.16.2):
- El guion está en `CREEPER_ROUNDS` (`src/game/config/balance.ts:625`). La ronda 7 (`balance.ts:733`) no desbloquea nada (`unlocks: []`) y es el repaso: 28 gusanos, 8 acorazados y 7 escupidores, con niveles `ENEMY_LEVELS.tables.mid`.
- Las rondas 8 y 9 llevan `bossPreparing: true` y `haste` 1,25 y 1,35; la 10 es el combate.
- El código cuenta las rondas por la longitud del guion (`roundCount`, `src/game/core/outbreaks.ts:79`), y que Creeper se vea preparándose depende de `bossPreparing`, no del número de ronda.
- Cada ronda tiene su aviso, uno por ronda y en orden, en `round.notices.creeper` (`src/i18n/es.ts:345` y `en.ts`).
- Los comentarios de la historia (`REMARKS`, `src/ui/story/remarks.ts`) solo existen para el brote 4.

## Objetivos
1. **Una partida del brote 1 más corta:** una ronda menos.
2. **Mantener todo lo que se enseña:** las rondas 1 a 6, con una mecánica nueva cada una, no cambian.
3. **Que Creeper siga siendo vencible** para quien fusiona, con el mismo saldo inicial y la misma escolta.

## Alcance
**Incluye:** quitar la ronda 7 de repaso, mover la preparación de Creeper a las rondas 7 y 8 y el combate a la 9, avisos en español e inglés, tests, simulación (`npm run sim`) y docs.
**No incluye:** cambiar `startingBalance`, la escolta, los números de Creeper, las mecánicas de las rondas 1 a 6 ni los demás brotes.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| R9-01 | ¿Qué ronda se quita? | **Cerrada (23 nov 2026):** la 7 de repaso; Creeper se prepara en la 7 y la 8 y se le combate en la 9 | Cerrada | Carmine |
| R9-02 | ¿Se tocan el saldo inicial o la escolta? | **Cerrada (23 nov 2026):** no | Cerrada | Carmine |
| R9-03 | Si la simulación sale mucho más difícil (el bot que fusiona baja claramente de 12 victorias de 12), ¿qué se ajusta? | a) Nada, se acepta más difícil · b) Unas pocas tropas más en la ronda 6 o en la 7 nueva, para recuperar algo de la moneda · c) Bajar algo la cantidad de tropas de la 7 y la 8 | b, solo si hace falta | Carmine |
| R9-04 | ¿Se mete algo del repaso ("llegan todos a la vez") en la nueva ronda 7? | a) No, se queda como la 8 de ahora · b) Sí, un tramo con los tres tipos a la vez | a | Carmine |
| R9-05 | Semillas: con una ronda menos, el brote 1 da unas 50 semillas menos por partida ganada (`01-mecanicas.md`, "Ronda superada"). ¿Se compensa? | a) No · b) Subir el tope de semillas del brote 1 | a | Carmine |

## Criterios de aceptación
### Guion
- [ ] `CREEPER_ROUNDS` tiene 9 rondas: la 1 a la 6 sin cambios, la 7 y la 8 son las antiguas 8 y 9 (con `bossPreparing`, su `haste` y sus niveles) y la 9 es el combate contra Creeper.
- [ ] El saldo inicial sigue en 250 y la escolta, en cinco acorazados de nivel 10.
- [ ] Creeper se ve preparándose en las rondas 7 y 8 y en la preparación de la 9.
- [ ] Tras ganar la ronda 9 la partida queda ganada, Creeper queda vencido y se abre el brote 2.

### Textos
- [ ] `round.notices.creeper` tiene 9 avisos en español y en inglés: sin "Llegan todos a la vez…" y en el mismo orden que el guion.
- [ ] El texto de "¡Ronda N superada!" y el contador de rondas enseñan 9 en total.

### Partida guardada
- [ ] Una partida guardada del brote 1 en la ronda 10 (o en cualquiera) con la forma anterior no rompe el juego: se decide si se sube `SAVE_VERSION` (regla 8) o si basta con que el índice de ronda siga siendo válido.

### Balance
- [ ] Se pasa `npm run sim` y el resultado del brote 1 se anota en `02-brote-1-creeper.md`, comparado con el anterior.
- [ ] Si sale mucho más difícil, se aplica lo que decida R9-03.

### Calidad
- [ ] Los tests que daban por hecho 10 rondas en el brote 1 (`rounds.test.ts`, `creeper.test.ts`, que usa `createMatch(1000, 9)`, y los que salgan) se ajustan.
- [ ] El catálogo de jefes (`/catalog/jefes.html`) enseña los grupos de la ronda del combate.
- [ ] Docs: `02-brote-1-creeper.md` (tablas de rondas y del guion, jefe en la 9), `01-mecanicas.md` (líneas 77, 85, 86, 93, 174 y 186 y la nota de "brotes de 10 rondas" de las semillas) y la tabla de `docs/tasks/README.md`.
- [ ] Versión de parche (regla 12) y línea en `CHANGELOG.md`.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- **Riesgo: el jugador llega más pobre a Creeper.** La ronda de repaso da unas 760 monedas (28 × 15 + 8 × 25 + 7 × 20). Sin ella, se llega al combate con menos disparadoras fusionadas y subidas.
- **Menos práctica:** se pierde la única ronda con los tres tipos juntos antes de que Creeper acelere a las tropas.
- Partida guardada a mitad del brote 1 al actualizar la versión: no debe quedar en una ronda que ya no existe.
- La regla 15 (lo desbloqueado vale hacia delante y hacia atrás) no se ve afectada: la ronda quitada no desbloquea nada.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Supera la ronda 6 (fusionar) | Empieza la 7: "¡Creeper se prepara!", tropas un 25 % más rápidas y Creeper a la derecha |
| Supera la ronda 8 | Preparación de la 9 con Creeper a la vista; al atacar, la escolta y Creeper |
| Vence a Creeper en la 9 | Partida ganada, Creeper vencido y el brote 2 abierto |
| El contador de rondas | "Ronda 7 de 9" |

## Cómo probarlo (QA)
1. Empezar el brote 1 y saltar rondas con la N hasta la 7: Creeper se ve preparándose.
2. Llegar a la 9 y comprobar la escolta y el combate.
3. Ganar y comprobar el progreso permanente y la ruta.
4. Cargar una partida guardada antes del cambio y ver que no se rompe.
5. `npm run sim` y comparar con el resultado anterior.
