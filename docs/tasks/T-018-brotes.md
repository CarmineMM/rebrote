# [Brotes] Varios brotes y fin de "Mundo 1"

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** L (orientativo) · **Depende de:** T-017 · **Bloquea a:** T-019, T-020, T-024, T-025, T-026 · **Origen:** conversación de diseño del 20 nov 2026

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

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| B-01 | Al empezar el brote 2, ¿qué trae el jugador desbloqueado? | a) Todo lo del brote 1 desde la ronda 1. b) Se vuelve a desbloquear | a: ya lo aprendió. Las rondas del brote 2 solo desbloquean lo nuevo | Carmine |
| B-02 | ¿Se conserva algo de la partida entre brotes (plantas, monedas)? | Sí o no | No: cada brote empieza con tablero vacío y saldo inicial propio | Carmine |
| B-03 | ¿Se muestra el nombre del jefe antes de vencerlo? | a) Siempre. b) "Brote 2: ???" hasta llegar a él | a: genera expectativa y el jefe ya aparece esperando en pantalla | Carmine |
| B-04 | ¿Se puede entrar al brote 2 sin vencer el 1? | Sí o no | No | Carmine |

## Criterios de aceptación
### Estructura
- [ ] El guion de rondas se define por brote; añadir un brote es añadir datos, sin tocar escenas.
- [ ] Cada brote declara su jefe, su número de rondas, su saldo inicial y qué desbloquea cada ronda.
- [ ] Una partida pertenece a un brote y lo conserva al guardarse y cargarse.
- [ ] El indicador de ronda y el resumen de "Cargar partida" usan el total de rondas del brote en curso.

### Nombres
- [ ] Donde hoy dice "Mundo 1: Gusanos" dice "Brote 1: Creeper", en español e inglés.
- [ ] No queda la palabra "mundo" en textos que ve el jugador.
- [ ] La spec del brote 1 queda renombrada y enlazada desde `docs/README.md`.

### Brote 1 intacto
- [ ] Las 10 rondas del brote 1, sus desbloqueos, topes de nivel y el combate con Creeper se comportan igual que antes de la task.
- [ ] Los tours siguen saliendo en las mismas rondas.

### Calidad
- [ ] Una partida guardada con la versión anterior no rompe el juego (se ignora o se migra; decidir al implementar y dejarlo escrito).
- [ ] Tests de desbloqueos por brote y de un brote de prueba con otro número de rondas.
- [ ] `npm test` y `npm run build` pasan.

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
