# ADR-0015: Varios brotes como datos, con la partida atada a su brote

- **Estado:** Aceptada. Modificada el 2026-11-21 (ver "Historial").
- **Fecha:** 2026-11-21

## Contexto

Hasta T-018 el juego tenía una sola campaña. Su guion era una lista única, `ROUNDS` en `balance.ts`, y de ella salían el total de rondas (`ROUND_COUNT`), los desbloqueos (`unlockedAt`), el tope de nivel, la ronda del jefe y la comprobación de la partida guardada. El nombre del jefe para el progreso permanente era una constante (`OUTBREAK_ID`, ADR-0014) y el título "Mundo 1: Gusanos" un texto fijo.

Carmine decidió llamar **brote** a cada campaña que acaba en un jefe ("Brote 1: Creeper") y reservar "mundo" para el futuro. Vienen más brotes (el siguiente es el de Elk Cloner, T-024 a T-026) y el menú para elegirlos (T-019), así que la estructura tiene que admitir varios antes de añadir contenido.

Decisiones de diseño (B-01 a B-04, cerradas el 21 nov 2026 con la recomendación): lo desbloqueado en los brotes anteriores llega desbloqueado; entre brotes no pasa nada de la partida; el jefe se nombra siempre; y para entrar en un brote hay que haber vencido al anterior.

## Opciones

### Dónde vive el brote de la partida

| Opción | A favor | En contra |
|---|---|---|
| Campo en `MatchState` (`outbreak`) | La partida entera dice de qué brote es; se guarda sola con ella (ADR-0010) | Sube la versión de la guardada |
| Dentro de `RoundState` | Las reglas de rondas ya reciben la ronda | El brote no es de una ronda: es de la partida entera |
| Fuera de la partida (escena o React) | No toca la forma del estado | Al cargar una guardada no se sabría su brote; lo que no está en `MatchState` se pierde al recrear el juego (ADR-0008) |

### Cómo se identifica un brote

| Opción | A favor | En contra |
|---|---|---|
| Por su posición en la lista | Nada que escribir | Reordenar los brotes mezclaría guardadas y progreso |
| Por un nombre propio (el de su jefe), con un tipo cerrado (`OutbreakId`) | Estable; el compilador obliga a dar textos a cada brote nuevo | Al añadir un brote hay que añadir su nombre al tipo |

## Decisión

- **Lista de brotes en datos:** `OUTBREAKS` en `balance.ts`, en orden. Cada brote declara su nombre (`id`), su jefe (`boss`, un tipo de enemigo), su saldo inicial (`startingBalance`) y su guion de rondas (`rounds`, con lo que desbloquea cada una). El número de rondas es el largo del guion. El brote 1 es el de Creeper, con el mismo guion que antes, que ahora es `CREEPER_ROUNDS`. `ECONOMY.startingBalance` pasa a ser de cada brote.
- **Reglas en `src/game/core/outbreaks.ts`**, puras y con test: buscar un brote, su número, sus rondas, los brotes de antes, de qué brote es jefe un enemigo y si un brote está abierto (`isOutbreakOpen`, B-04). `OutbreakId` es la unión de los nombres; hoy, `'creeper'`.
- **La partida es de un brote:** `MatchState.outbreak`. `createMatch(balance?, round?, outbreak?)` empieza con tablero vacío y el saldo inicial del brote (B-02). Todas las reglas de `rounds.ts` que antes recibían una ronda reciben ahora también el brote (`createRound`, `unlockedAt`, `levelCapAt`, `roundUnlocks`, `isBossRound`...). La ronda del jefe es la que saca al `boss` del brote.
- **B-01 en las reglas:** lo desbloqueado y el tope de nivel se calculan sobre las rondas de los brotes anteriores más las del brote hasta la ronda en curso. `newFeaturesAt` da solo lo que una ronda desbloquea por primera vez; el aviso de lo desbloqueado y los tours salen de ahí, así que repetir algo ya sabido en el guion no lo vuelve a enseñar.
- **Guardada versión 2:** `SAVE_VERSION` sube a 2 y la comprobación mira que el brote existe y que la ronda (y el aviso sin aceptar) caben en su guion. Las guardadas de antes se ignoran, como dice ADR-0010: no hace falta soportar partidas pasadas.
- **Progreso permanente:** no cambia de forma (`PROGRESS_VERSION` sigue en 1). Al ganar se apunta el `id` del brote de la partida, que para Creeper es el mismo `'creeper'` de siempre.
- **Textos:** "Brote N: jefe" lo compone `src/ui/outbreakName.ts` con `outbreak.title` y el nombre del enemigo jefe de `info.enemy.names` (B-03: siempre con nombre). Los avisos de una línea van por brote, en `round.notices.<id>`. `RoundInfo` lleva el brote para que la pausa, la derrota, la victoria y los tours sepan el suyo.
- **Escenas:** `BoardSceneData` y `MatchRequest` aceptan el brote de una partida nueva (sin él, el primero), y "Jugar otra vez" repite el mismo brote. Elegir brote desde el menú queda para T-019.

## Consecuencias

- **Añadir un brote es añadir datos:** su entrada en `OUTBREAKS`, su nombre en `OutbreakId`, sus avisos en `round.notices` (es y en) y, si desbloquea algo nuevo, su tour (regla 9). Si falta un texto, `npm run build` falla; si falta un aviso de ronda, falla el test de idiomas.
- Si un brote desbloquea una mecánica nueva, se añade a `Feature` con su tour en `TOUR_OF_FEATURE`, como hasta ahora.
- Las reglas reciben el brote explícito: cualquier código nuevo que necesite una ronda necesita también su brote. Los tests de reglas comunes usan el brote 1; `outbreaks.test.ts` cambia la lista por dos brotes de prueba (`vi.mock` de `balance.ts`) para probar lo que depende de que haya varios.
- El brote 1 se juega igual que antes: una simulación con azar fijo da el mismo estado, evento a evento, antes y después del cambio.
- Lo que hace cada jefe (Creeper salta, se prepara, grita) sigue siendo suyo en `combat.ts` y en sus vistas; un jefe nuevo traerá lo suyo (T-026).
- **El orden de los brotes** es el de la lista de `docs/specs/03-ruta-de-brotes.md`: 25 jefes y el final. El brote 2 es Elk Cloner; Blaster es el 11.
- **Datos guardados durante el desarrollo:** una guardada o un progreso de otra versión se descarta (ADR-0010 y ADR-0014, modificado el 21 nov 2026). Añadir o reordenar brotes no obliga a migrar nada.

## Brotes en preparación (T-024)

El escudo llega en la ronda 2 del brote 2 antes de que exista su jefe (Elk Cloner, T-026). Para que se pueda desbloquear y jugar sin enseñar un brote a medias:

- **El jefe puede faltar:** `OutbreakScript.boss` es `EnemyKind | null`. Con `null` el brote está en preparación (`isOutbreakReady`): tiene su guion (el del brote 2, provisional, con tropas del brote 1), pero `isOutbreakOpen` nunca lo abre y `routeStops` lo trata como si aún no estuviera en el juego ("Próximamente"). Los brotes en preparación van al final de la lista (test).
- **Su nombre:** como su jefe aún no es un enemigo, "Brote 2: Elk Cloner" sale de `outbreak.comingBoss` de `src/i18n/` (`bossName` en `src/ui/outbreakName.ts`). Cuando el jefe exista, sale de `info.enemy.names` como el de Creeper.
- **En desarrollo** se juega con `?brote=2` en la dirección (`outbreakFromParam`): "Nueva partida" empieza ese brote. Ganarlo apunta el brote como vencido en el perfil de quien prueba, como cualquier otro.
- Cuando T-026 traiga a Elk Cloner, basta con poner su `boss` y su guion de verdad: nada más cambia.

## Historial

- **2026-11-21, versión original (T-018):** el contexto daba a Blaster como siguiente brote.
- **2026-11-21, modificación:** Carmine decidió usar los 25 jefes en el orden de la lista. El brote 2 pasa a ser Elk Cloner y Blaster se va al puesto 11. La decisión técnica no cambia.
- **2026-11-21, ampliación (T-024):** brotes en preparación, sin jefe todavía (sección "Brotes en preparación"). Carmine eligió que el brote 2 exista con un guion provisional, cerrado al jugador hasta T-026.
