# [Plantas] Escudo en dos pasos: muro en el brote 2, infusión en el brote 3

**Estado:** Completada (22 nov 2026, 0.13.0) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-038, T-039 · **Origen:** conversación de diseño del 22 nov 2026

## Contexto
Hoy el escudo llega entero en la ronda 2 del brote 2: el muro y la infusión juntos, con un solo aviso y un tour de dos pasos (verificado: `Feature` tiene un único valor `'shield'` en `src/game/core/rounds.ts`, y su tour en `src/ui/tour/tours.ts` enseña primero el muro y después la infusión; "Escudo (T-024)" en `docs/specs/01-mecanicas.md`).

Carmine decidió repartirlo: en el brote 2 el escudo solo se siembra como muro, y la disparadora con escudo llega en el brote 3. Así el brote 3 trae algo que estrenar sin inventar una planta nueva. Patty no crea nada: avisa de que el escudo ya se puede infundir.

El brote 3 no existe todavía. T-024 ya resolvió un caso igual: dejó el brote 2 "en preparación" (`boss: null`, cerrado al jugador, jugable en desarrollo con `?brote=2`; ADR-0015).

## Objetivos
1. **Brote 2: solo el muro.**
2. **Brote 3: la infusión,** con su aviso y su tour.
3. **Dejar el brote 3 en preparación** para que T-038 y T-039 tengan dónde trabajar.

## Alcance
**Incluye:** separar el desbloqueo del escudo en dos (sugerido: `'shield'` para el muro y `'shieldInfuse'` para la infusión), tour del muro sin el paso de infundir, tour nuevo de la infusión, aviso de Patty, brote 3 en preparación con guion provisional, textos en español e inglés, tests, simulación del brote 2, specs y guías.
**No incluye:** las tropas del brote 3 (T-038), su jefe y su guion definitivo (T-039), cambios en lo que hace el escudo.

## Decisiones
Cerradas por Carmine el 22 nov 2026: ES-03 con un sí (y como norma del juego); las demás, con la recomendación.

| # | Pregunta | Decisión |
|---|---|---|
| ES-01 | ¿Qué dice Patty al anunciarlo? | "He reforzado el escudo: ahora aguanta sobre una disparadora." No dice "he creado algo nuevo", porque no es nuevo |
| ES-02 | En el brote 2, ¿qué pasa al arrastrar un muro o la carta de escudo sobre una disparadora? | b) Se resalta en rojo con el motivo: "Infundir: aún no". En el brote 3, antes de su ronda 2, "Infundir: desde la ronda 2" |
| ES-03 | Al rejugar el brote 2 con el brote 3 ya vencido, ¿hay infusión? | **Sí, y es norma:** lo desbloqueado en un brote vencido se puede usar también en los brotes anteriores, desde su ronda 1. Lo que el propio brote enseña sigue llegando en su ronda, con su aviso y su tour |
| ES-04 | Saldo inicial del brote 3 | 300, como el brote 2 |

## Criterios de aceptación
### Brote 2
- [x] En la ronda 2 se desbloquea el escudo y su aviso habla solo del muro.
- [x] El tour del escudo enseña a sembrar el muro y termina ahí.
- [x] No se puede infundir escudo en una disparadora, ni con la carta ni arrastrando un muro, y se comporta según ES-02.
- [x] El precio de la carta sobre una disparadora no se muestra multiplicado.
- [x] La ficha del muro y los textos del brote 2 no mencionan la infusión.

### Brote 3
- [x] Existe en preparación: cerrado al jugador, visible en la ruta como siguiente, jugable en desarrollo con `?brote=3`.
- [x] En su ronda 2 se desbloquea la infusión del escudo, con el aviso de Patty (ES-01) y un tour propio que enseña Boxer.
- [x] Desde la ronda 1 del brote 3 el muro está disponible, como todo lo de los brotes anteriores.
- [x] La disparadora con escudo se comporta como hoy: doble de vida, sin mezclas con fuego o hielo, se fusiona con otra igual y para lo que va hacia lo de detrás.

### Calidad
- [x] Reglas en `core` con tests: qué se puede infundir en cada brote y ronda.
- [x] La simulación del brote 2 (`npm run sim`) se repite y sus resultados se anotan en `docs/specs/05-brote-2-elk-cloner.md`. Si cambian las victorias del bot con escudos, se avisa a Carmine antes de tocar valores.
- [x] Una partida guardada del brote 2 con una disparadora con escudo no rompe el juego (se descarta o se acepta; decidir y dejarlo escrito. Sin migración: ADR-0014).
- [x] `docs/specs/01-mecanicas.md`, la spec del brote 2 y las guías, al día.
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Cómo quedó (22 nov 2026)
- **Reglas:** `Feature` tiene `shield` (el muro, brote 2) y `shieldInfuse` (infundirlo, ronda 2 del brote 3); `infuseFeature('shield')` pide la segunda. La norma ES-03 es `carriedFeatures` (`rounds.ts`): lo de los brotes posteriores vencidos que este brote no enseña, guardado en la partida (`MatchState.carried`, `SAVE_VERSION` 10). Tests en `shield.test.ts`.
- **Antes de poder infundir (ES-02):** la carta sobre una disparadora sale en rojo con "Infundir: aún no" (brote 2) o "Infundir: desde la ronda 2" (ronda 1 del brote 3), sin precio multiplicado. El muro se levanta igual y sobre una disparadora sale en rojo con el mismo motivo; la mina sigue sin levantarse antes de su ronda.
- **Partida guardada del brote 2 con una disparadora con escudo:** se descarta, como todas las de la versión 9. Sin migración.
- **Brote 3 en preparación:** `boss: null`, saldo 300 (ES-04), 3 rondas provisionales con las tropas del brote 2 sin el Minstrel; en desarrollo, `?brote=3`. Lleva ya el texto de Boxer sobre Brain (`story.lore.brain`) y su nombre en la ruta (`outbreak.comingBoss`).
- **Tour:** el del escudo acaba en el muro; el nuevo, "Disparadora con escudo", enseña la carta sobre una disparadora (se completa haciéndolo) y llevarle un muro (se pasa con "¡Entendido!"), con su dibujo `wallInfuse`. Sonido: el de siempre (`infuseShield`); no hace falta uno nuevo.
- **Simulación:** el brote 2 da exactamente lo mismo que antes (el bot con escudos solo siembra muros); anotado en `05-brote-2-elk-cloner.md`.
- **Probado** con Chrome sin ventana en Ultra, a 1600 × 900, 812 × 375 y 568 × 320: brote 3 (rótulos en rojo en la ronda 1, aviso de Patty y tour en la 2) y brote 2 (aviso solo del muro y "Infundir: aún no").

## Casos límite y riesgos
- El tour de la infusión necesita una disparadora sin elemento en el tablero; si no la hay, se comporta como los demás tours cuando falta lo que señalar.
- El invento de recolocar mueve disparadoras con escudo: en el brote 2 ya no habrá ninguna.
- El bot "con escudos" de la simulación usa muros; si en algún punto infunde, hay que cambiarlo.
- Riesgo: quien ya jugó el brote 2 con infusión la pierde ahí. Se acepta: el juego está en desarrollo.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Brote 2, ronda 3: carta de escudo sobre una casilla vacía | Muro |
| Brote 2, ronda 3: carta de escudo sobre una disparadora | No se infunde |
| Brote 3, ronda 1: muro arrastrado sobre una disparadora | No se infunde todavía |
| Brote 3, ronda 2 en adelante: carta de escudo sobre una disparadora de 2 cañones | Disparadora con escudo; cuesta 2 escudos |

## Cómo probarlo (QA)
1. Jugar el brote 2 hasta la ronda 3 e intentar infundir.
2. Abrir `?brote=3`, llegar a la ronda 2 y seguir el tour.
3. Comparar la tabla de la simulación del brote 2 con la anterior.
