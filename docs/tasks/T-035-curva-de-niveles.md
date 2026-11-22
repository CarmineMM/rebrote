# [Balance] Curva de niveles compuesta, premio cada 5 niveles y dificultad de los brotes 1 y 2

**Estado:** Completada (22 nov 2026, 0.12.2) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** T-023, T-026, T-027 · **Bloquea a:** ninguna · **Origen:** conversación de ajuste de dificultad con Carmine del 22 nov 2026

## Contexto
Hasta ahora cada nivel sumaba sobre el nivel 1: las disparadoras, un 10 % de daño y un 3 % de cadencia, con premio en los niveles 5, 10, 15 y 20 escritos a mano (`LEVELING.milestones`, T-027); los enemigos, un 15 % de vida y de daño, más un extra por tramo (+20 % desde el 5 y +40 % desde el 10, T-010). La vida de las plantas no subía con el nivel. El brote 2 subía el tope de las disparadoras a 10 en su ronda 1 (L-08) y sus tropas llegaban al nivel 12.

Carmine quiere ajustar la dificultad con un crecimiento compuesto (cada nivel sobre el anterior), una regla única de premio cada 5 niveles para todo lo que tiene nivel y un Elk Cloner más duro. Antes de implementar se probaron varias curvas con la simulación de bots (`npm run sim`): con los porcentajes de la primera propuesta (+35 % y +70 % compuestos para los enemigos) el juego quedaba casi imposible; la curva elegida deja el brote 1 como estaba y el brote 2 exigente.

Además, en la misma conversación: quitar el aviso "Combate final" del marcador de la ronda del jefe y la fila de los jefes de los créditos.

## Objetivos
1. **Una sola regla de niveles:** premio cada 5 niveles, sin listas a mano, para plantas, enemigos, poderes y nivel base.
2. **Crecimiento compuesto** del daño y la vida de plantas y enemigos.
3. **Brote 2 exigente pero ganable:** sin mejoras compradas pide escudos y fusionar a 3 cañones; con algo de nivel base, también con 2.

## Alcance
**Incluye:** `balance.ts`, las fórmulas de nivel (`levels.ts`, `plants.ts`, `combat.ts`, `powers.ts`), la vida al subir a un nivel con premio, el panel de nivel y la tienda de plantas (enseñan la vida que da el premio), la ficha de los enemigos (sin nota de tramo), el aviso de la ronda 1 del brote 2, el marcador de la ronda del jefe, los créditos, tests, simulación y specs.
**No incluye:** el brote 5 (cuando exista, su ronda 1 sube el tope a 10 y lo presenta Patty: anotado en `03-ruta-de-brotes.md`), las tablas de enemigos de los brotes 3 en adelante (se preguntan a Carmine).

## Decisiones (cerradas por Carmine el 22 nov 2026)
| # | Pregunta | Decisión |
|---|---|---|
| CN-01 | Tope de nivel de las disparadoras | 5 en los brotes 1 a 4. En el brote 5 Patty cuenta que ya pueden llegar al 10 |
| CN-02 | Nivel máximo de los enemigos | 9 en los brotes 1 y 2; el 10 solo para los aliados de los jefes (copias de Creeper y escoltas). En brotes futuros se pregunta |
| CN-03 | Crecimiento de las disparadoras | Compuesto. Daño +12,5 % por nivel y +20 % en los niveles con premio; vida +25 % en los niveles con premio. La cadencia, como estaba (+3 % por nivel, x1,5 en el 5 y el 15 y x2 en el 10 y el 20) |
| CN-04 | Crecimiento de los enemigos | Compuesto. Vida y daño +18,5 % por nivel y +27 % en los niveles con premio. Velocidad y cadencia igual. Sustituye al extra por tramo de T-010; la fuerza de todos (x1,1) se queda |
| CN-05 | Elk Cloner | Vida +10 % (9900 de base, 10.890 en partida), mordisco +30 % (143), poema +45 % (558), 0,15 casillas/s y verso de 75 en partida |
| CN-06 | Minstrel | +40 % de vida y de daño de base (210 y 21) |
| CN-07 | Regla general | Premio cada 5 niveles en todo lo que tiene nivel, también si un día el tope pasa del 20 |

## Criterios de aceptación
- [x] `LEVEL_MILESTONES` en `balance.ts` y `src/game/core/levels.ts` deciden qué niveles dan premio; ningún código lista 5, 10, 15, 20 a mano (plantas, enemigos, poderes, jardincito).
- [x] Daño y vida de las disparadoras crecen en compuesto (nivel 5: x1,71 de daño y 375 de vida); la cadencia no cambia.
- [x] Vida y daño de los enemigos crecen en compuesto (nivel 5: x2,33 con la fuerza de todos; nivel 9: x4,58; nivel 10: x5,82). Sin extra por tramo.
- [x] Al llegar a un nivel con premio la planta conserva la proporción de vida.
- [x] El panel de nivel y la tienda de plantas enseñan la vida que da el premio.
- [x] Las tablas `late` y `high` no pasan del nivel 9 (un test lo comprueba en todos los brotes); escoltas y copias de Creeper siguen en el 10.
- [x] El brote 2 no sube el tope a 10: su ronda 1 no desbloquea nada y su aviso ya no habla del nivel 10.
- [x] Elk Cloner y el Minstrel con sus valores nuevos.
- [x] Sin "Combate final": la ronda del jefe dice su número como las demás.
- [x] Los créditos no nombran a los jefes (fuera la fila "Enemigos").
- [x] `npm run sim` pasa y sus resultados están en `05-brote-2-elk-cloner.md`.
- [x] Reglas en `01-mecanicas.md`, la del brote 5 en `03-ruta-de-brotes.md` y la regla 14 en `CLAUDE.md`.
- [x] `npm test` y `npm run build` pasan.

## Resultado de la simulación (10 partidas por bot)
| Bot | Antes | Después |
|---|---|---|
| Brote 1, 2 cañones, sin mejoras | 9 de 10 | 9 de 10 |
| Brote 2 con escudos, 2 cañones, sin mejoras | 10 de 10 | 0 de 10 |
| Brote 2 con escudos, 3 cañones, sin mejoras | 10 de 10 | 10 de 10 |
| Brote 2 con escudos, 2 cañones, nivel base 3 | 10 de 10 | 8 de 10 |
| Brote 2 sin escudos, sin mejoras | 0 de 10 | 0 de 10 |
| Brote 2 sin escudos, nivel base 5 | 0 de 10 | 10 de 10 |
