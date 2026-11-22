# ADR-0020: Poderes de un uso, en la partida y fuera de las rondas

- **Estado:** Aceptada
- **Fecha:** 2026-11-22

## Contexto

T-021 añade tres poderes que el jugador lanza desde un panel a la izquierda: recolocar una disparadora, una granada y un muro de hielo de tres casillas (O-01 a O-11, `docs/tasks/T-021-poderes.md`). Hasta ahora todo lo que el jugador podía hacer lo desbloqueaba una ronda (`Feature` en `rounds.ts`) y costaba moneda. Los poderes son otra cosa:

- No los trae una ronda: los compra el jugador en la tienda (T-022) y traen una carga por partida (O-01, b). Hasta la tienda, cada partida trae los tres (O-08).
- No cuestan moneda: cuestan una carga, que no vuelve en esa partida.
- Dos de ellos dejan cosas en el tablero que duran (la granada que vuela y cuenta, los bloques de hielo que se derriten) y tienen que congelarse con la pausa, guardarse con la partida y pintarse igual al recrear el juego.
- La regla 9 pide un tour por mecánica nueva, y los tours salen con lo que desbloquea cada ronda (ADR-0012).

## Opciones

### Dónde viven las cargas

| Opción | A favor | En contra |
|---|---|---|
| En el progreso permanente, gastándose | Una sola cuenta de cargas | Mezcla lo que se compra (permanente) con lo que se gasta en una partida; una partida abandonada no devolvería nada |
| En la partida (`MatchState.powers`), llenas al empezar | Se guardan y se cargan con la partida (ADR-0010); cada partida empieza igual; la tienda solo decide qué trae | Al cambiar la forma, sube `SAVE_VERSION` |

### Cómo son la granada y el muro en el estado

| Opción | A favor | En contra |
|---|---|---|
| Animaciones de la escena (temporizadores) | Poco código | La regla dependería de la vista (ADR-0008); se perderían al recrear el juego y no se guardarían |
| Entidades del estado que avanza `stepCombat` | Se congelan con la pausa, se guardan, se testean y la vista solo las sigue | Más tipos en `MatchState` |

Para el muro, dentro de las entidades: una entidad aparte con su vida y sus tres carriles, o un `Sown` más en cada casilla.

### Cuándo sale su tour

| Opción | A favor | En contra |
|---|---|---|
| Al tomar el poder por primera vez | Justo cuando hace falta | El tour para la preparación, y la granada y el muro solo se usan en el ataque |
| En la primera preparación en que se llevan, detrás de los de la ronda | Mismo sistema de siempre | En la ronda 1 del brote 1 se juntarían con lo básico (seis pasos más) |
| En la primera preparación en que se llevan y la ronda no trae otro tour por ver | Mismo sistema y sin amontonarse | Con los poderes de prueba, un jugador nuevo los ve en la ronda 7 del brote 1 |

## Decisión

- **Las cargas van en la partida** (`MatchState.powers`: cada poder con sus cargas, en el orden del panel). `createMatch` las llena con lo que traiga la partida (`loadout`; sin él, `POWERS.trialLoadout`). La tienda (T-022) solo decidirá qué se trae; lo comprado irá en el progreso (ADR-0014). La partida guardada pasa a la versión 7.
- **Las reglas son de core** (`src/game/core/powers.ts`, con tests): qué se puede usar ahora (`powerBlocker`), recolocar, lanzar la granada y poner el muro. Cada uso gasta exactamente una carga.
- **La granada es una entidad del combate** (`Grenade` en `MatchState.grenades`): `stepCombat` la hace volar, caer y explotar, con sus eventos (`grenadeLanded`, `grenadeExploded`). No ocupa casilla ni tiene vida.
- **Cada bloque del muro de hielo es un `Sown` más** (`IceBlock`, `kind: 'ice'`, con su vida y su tiempo): así lo muerden, le escupen, le dan los versos y lo golpea Creeper sin reglas nuevas, y para lo de detrás como el escudo (`isShield`). `stepCombat` lo derrite (`iceMelted`). Se eligió por casilla porque la vida es de cada trozo (O-10).
- **El tour de cada poder** (`TOUR_OF_POWER`, que obliga a tener uno por poder) sale en la primera preparación en que se lleva y la ronda no trae otro por ver.
- **El panel es HUD** (React, `PowerPanel`) y habla con la escena por `EventBus` (`powersChanged`, `powerSelected`, `powerPicked`); un poder se lanza como una carta: se toca y luego el tablero, o se arrastra.

## Consecuencias

- Un poder nuevo es: su `PowerId`, sus reglas en `powers.ts` (y, si deja algo en el tablero, su paso en `stepCombat`), sus valores en `balance.ts`, su tour en `TOUR_OF_POWER` y `TOURS`, su sonido (regla 10), su dibujo en el panel y sus textos.
- Las rondas se siguen equilibrando sin contar con los poderes: los bots de `npm run sim` no los usan.
- `Sown` crece: todo lo que mira lo sembrado (ficha, cues, tours, guardado) tiene que saber del hielo. El compilador avisa en los `switch` completos.
- Hasta la tienda, todos los jugadores llevan los tres poderes en cada partida (O-08). En desarrollo, `?poderes=` en la dirección elige otros o ninguno.

## Después: T-022 (22 nov 2026)

La tienda siguió este camino sin cambiar el rumbo. Lo comprado va en el progreso del jugador (`Progress.powers`, con su nivel, y `Progress.carried`, los que se llevan; versión 4, ADR-0014), y la partida sigue llevando sus cargas. Cada hueco lleva además el nivel del poder (`PowerSlot.level`), y lo que depende de él se guarda en lo que deja en el tablero: el daño y el alcance en cada granada y la vida entera en cada bloque de hielo (partida guardada, versión 8). Así, una partida guardada se juega igual aunque luego se mejore el poder. `POWERS.trialLoadout` desaparece: sin poderes elegidos, la partida no trae ninguno.
