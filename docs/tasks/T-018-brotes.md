# [Brotes] Varios brotes y fin de "Mundo 1"

**Estado:** Completada (21 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** L (orientativo) · **Depende de:** T-017 · **Bloquea a:** T-019, T-020, T-024, T-025, T-026 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
El juego está construido para una sola campaña. El guion vive en una lista única, `ROUNDS` en `src/game/config/balance.ts`, y de ella salen `ROUND_COUNT` y los desbloqueos (`unlockedAt` en `src/game/core/rounds.ts`). El texto "Mundo 1: Gusanos" es la clave `world1` de `src/i18n/` y se muestra en la portada y en la victoria. La spec se llama `docs/specs/02-mundo-1-gusanos.md`.

Carmine decidió llamar **brote** a cada campaña que termina en un jefe ("Brote 1: Creeper") y reservar "mundo" para el futuro. "Gusanos" deja de ser el nombre de la campaña: habrá más jefes gusano con tropas modificadas.

## Objetivos
1. **Varios brotes.** Cada uno con su guion de rondas, sus tropas y su jefe.
2. **Nombre nuevo.** "Brote N: nombre del jefe" en todo el juego.
3. **Sin romper el brote 1.** Se juega exactamente igual que hoy.

## Alcance
**Incluye:** lista de brotes en configuración (sugerido `OUTBREAKS`), partida que sabe a qué brote pertenece, desbloqueos por brote, textos nuevos en español e inglés, cambio de versión de la partida guardada, renombrar la spec a brote 1, tests.
**No incluye:** el contenido del brote 2 (T-024 a T-026), el menú para elegir brote (T-019), cambios de escenario.

## Decisiones tomadas
| # | Pregunta | Decisión (21 nov 2026, con la recomendación) | Decide |
|---|---|---|---|
| B-01 | Al empezar el brote 2, ¿qué trae el jugador desbloqueado? | a) Todo lo del brote 1 desde la ronda 1: ya lo aprendió. Las rondas del brote 2 solo desbloquean lo nuevo | Carmine |
| B-02 | ¿Se conserva algo de la partida entre brotes (plantas, monedas)? | No: cada brote empieza con tablero vacío y saldo inicial propio | Carmine |
| B-03 | ¿Se muestra el nombre del jefe antes de vencerlo? | a) Siempre: genera expectativa y el jefe ya aparece esperando en pantalla | Carmine |
| B-04 | ¿Se puede entrar al brote 2 sin vencer el 1? | No | Carmine |

Cómo quedó (ADR-0015):
- Los brotes son datos: `OUTBREAKS` en `balance.ts`, cada uno con `id` (el nombre de su jefe), `boss`, `startingBalance` y `rounds`. El brote 1 es el de Creeper, con el guion de siempre y 250 monedas al empezar (antes, `ECONOMY.startingBalance`). Las reglas están en `src/game/core/outbreaks.ts` y la partida sabe su brote (`MatchState.outbreak`).
- **B-01:** lo desbloqueado y el tope de nivel suman los brotes anteriores; un brote que vuelve a nombrar algo ya sabido no lo avisa ni saca su tour (`newFeaturesAt`). El tope de nivel del brote siguiente empieza en el último del anterior hasta que una de sus rondas ponga otro.
- **B-04:** la regla está escrita y probada (`isOutbreakOpen`); la usará el menú de brotes (T-019). Hoy "Nueva partida" empieza el brote 1 y "Jugar otra vez" repite el brote de la partida.
- **Partida guardada de la versión anterior: se ignora** (decidido por Carmine el 21 nov 2026: no hace falta soportar partidas pasadas). `SAVE_VERSION` pasa a 2; una guardada de la versión 1 no se carga y "Cargar partida" queda desactivado, sin errores.
- El progreso permanente no cambia de forma: vencer a Creeper sigue apuntando `'creeper'`.
- Comprobado con una simulación de azar fijo (un bot sembrando, subiendo de nivel e infundiendo) contra la versión publicada: el brote 1 entero, hasta vencer a Creeper, da el mismo estado y los mismos eventos.

## Criterios de aceptación
### Estructura
- [x] El guion de rondas se define por brote; añadir un brote es añadir datos, sin tocar escenas.
- [x] Cada brote declara su jefe, su número de rondas, su saldo inicial y qué desbloquea cada ronda.
- [x] Una partida pertenece a un brote y lo conserva al guardarse y cargarse.
- [x] El indicador de ronda y el resumen de "Cargar partida" usan el total de rondas del brote en curso.

### Nombres
- [x] Donde hoy dice "Mundo 1: Gusanos" dice "Brote 1: Creeper", en español e inglés ("Outbreak 1: Creeper"). También la ficha de Creeper: "Jefe del brote 1".
- [x] No queda la palabra "mundo" en textos que ve el jugador (lo comprueba un test de idiomas).
- [x] La spec del brote 1 queda renombrada (`specs/02-brote-1-creeper.md`) y enlazada desde `docs/README.md`.

### Brote 1 intacto
- [x] Las 10 rondas del brote 1, sus desbloqueos, topes de nivel y el combate con Creeper se comportan igual que antes de la task (los tests de siempre y la simulación contra la versión publicada).
- [x] Los tours siguen saliendo en las mismas rondas.

### Calidad
- [x] Una partida guardada con la versión anterior no rompe el juego: se ignora (ver "Cómo quedó").
- [x] Tests de desbloqueos por brote y de un brote de prueba con otro número de rondas (`outbreaks.test.ts`).
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- `ROUND_COUNT` se usa en la validación de la guardada (`isRound` en `save.ts`): ahora depende del brote.
- `Feature` tiene un tour obligatorio por cada valor (regla 9): un brote que desbloquea algo nuevo necesita su tour.
- Vencer al jefe registra el brote como vencido (T-017).
- Riesgo: es un cambio transversal. Conviene hacerlo antes de añadir contenido nuevo.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Portada | "Brote 1: Creeper" |
| Brote de prueba con 3 rondas | El HUD dice "Ronda 1 de 3" y la victoria llega tras la tercera |
| Partida del brote 1, ronda 6 | Fusionar desbloqueado, igual que hoy |

## Cómo probarlo (QA)
1. Jugar el brote 1 de la ronda 1 a la 3 y comparar con la versión publicada.
2. Guardar, salir al menú y cargar.
3. Buscar la palabra "mundo" en la interfaz en ambos idiomas.
