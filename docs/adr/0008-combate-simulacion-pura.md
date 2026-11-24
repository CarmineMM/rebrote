# ADR-0008: Combate como simulación pura por pasos

- **Estado:** Aceptada
- **Fecha:** 2026-11-19

## Contexto

T-002 trae lo primero que pasa con el tiempo dentro de una partida: gusanos que avanzan, plantas que disparan, balas, mordiscos y vidas. Detrás vienen más reglas que dependen del tiempo: la mina con su conteo (T-004), la quemadura (T-004), la ralentización (T-005), el escupidor (T-007) y las rondas (T-007).

Hay tres condiciones previas:
- El ADR-0003 pide las reglas en `src/game/core/`, sin Phaser y con tests.
- La guía de gráficos dice que la animación nunca decide reglas.
- Cambiar el nivel gráfico recrea el juego entero (ADR-0006). Lo que no esté en el estado de la partida se pierde.

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| Física de Phaser (Arcade) y reglas en la escena | Colisiones ya hechas | Reglas sin tests y en píxeles, no en casillas. Difícil de continuar al recrear el juego |
| Temporizadores y tweens por entidad | Rápido de escribir | La regla depende de la animación y el estado queda repartido en objetos de Phaser |
| Simulación pura por pasos en `core` | Se testea, es determinista y trabaja en casillas. El estado completo se puede continuar | La escena tiene que reconciliar sus vistas con el estado. Hay que cuidar el orden de cada paso |

## Decisión

### El estado
- `MatchState` (`src/game/core/match.ts`) contiene toda la partida: saldo, vidas, plantas con su vida y su recarga, minas con su conteo (T-004), enemigos (con su quemadura y su ralentización, T-005; su aceleración y el salto del Creeper, T-008), balas, escupitajos (T-007), ronda en curso (T-007) y siguiente id.
- Enemigos, balas y escupitajos llevan un id único. Las plantas se identifican por su casilla.

### El paso
- `stepCombat(state, dtMs, random)` (`src/game/core/combat.ts`) avanza la partida y devuelve el estado nuevo y la lista de eventos que pasaron: `shot`, `hit`, `bulletGone`, `bite`, `plantDestroyed`, `enemyKilled` y `enemyEscaped`. Desde T-004, también `mineArmed` y `mineExploded`. Desde T-007, `spat`, `spitHit` y `spitGone`. Desde T-008, `jumpWarned`, `jumped` y `landed` (el salto del Creeper).
- Es una función pura: no toca el estado recibido. Lo único al azar (a qué carril salta el Creeper, T-008) entra por `random`, que por defecto es `Math.random` y en los tests se fija: con el mismo `random`, el mismo resultado.
- Un fotograma largo se reparte en pasos de 50 ms como mucho (`MAX_STEP_MS`). Así ninguna bala atraviesa a un gusano y ningún mordisco se pierde.
- Orden dentro de cada paso:
  1. Los enemigos arden si tienen una quemadura (T-004) y atacan o avanzan, más despacio si están ralentizados (T-005) y más deprisa si están acelerados (T-008). Los que muerden atacan lo que tocan (planta o mina); el escupidor (T-007) escupe a lo primero sembrado de su carril que tiene a tiro. El Creeper (T-008), al cruzar un umbral de vida, se agacha, vuela a otro carril dejando sus copias y aterriza golpeando; las copias entran en juego al final de este punto. Los que cruzan el borde izquierdo restan una vida (el Creeper, todas).
  2. Los escupitajos (T-007) vuelan y quitan vida a lo primero sembrado que encuentran. Los que acaban de salir esperan al paso siguiente.
  3. Las minas (T-004) que detectan a un enemigo empiezan su conteo; las que lo terminan explotan: la de fuego daña y la de hielo frena. Una mina destruida en los pasos 1 o 2 ya no explota.
  4. Las balas avanzan. Cada una da al primer enemigo vivo de su carril que encuentra en su recorrido, o desaparece al salir del tablero. La de fuego deja además una quemadura y la de hielo, una ralentización.
  5. Si el Creeper cayó en este paso, caen con él los demás enemigos (T-008).
  6. Las plantas recargan y disparan si tienen a quién. Un enemigo en el aire no cuenta como objetivo, ni para las balas ni para las minas.
- Las balas no llevan objetivo fijo. Por eso una bala cuyo objetivo murió sigue hasta el siguiente.
- Sin vidas, `stepCombat` y las rondas no hacen nada.
- No se usa la física de Phaser.

### La escena
- En cada `update`, la escena avanza la ronda y el combate con el `delta` de Phaser. Luego anima cada evento y recoloca cada vista por su id.
- `update` no corre con la escena en pausa, así que la pausa congela el combate sin código extra.
- Las vistas (`PlantView`, `WormView`, `BulletView`, `CreeperView` en `src/game/view/`) no deciden nada: siguen al estado y animan los eventos. Lo que dura (el aviso y el vuelo del salto del Creeper) se pinta desde el estado (`Enemy.jump` con `ms` y `stageMs`), así que una partida continuada se pinta igual.
- Una vista que se va (muere, se cuela, sale del tablero) se quita del mapa en el acto y termina su animación sola.

### Las rondas (T-007)
`stepRound(state, dtMs, spawnX)` (`src/game/core/rounds.ts`) cuenta la preparación, saca los grupos del guion a su hora y pasa a la siguiente ronda cuando la actual queda despejada. Devuelve el estado, los enemigos que acaban de salir y sus eventos: `attackStarted`, `roundCleared`, `roundStarted` y `won`. La ronda vive en el estado. Sustituye al generador de prueba de T-002, que sacaba gusanos al azar.

El jefe (T-008) no necesitó una fase propia: el Creeper es un grupo más del guion de la última ronda, que saca sus enemigos acelerados si la ronda lo dice (`haste`). La partida se gana cuando esa ronda queda despejada, y eso pasa al derrotarlo, porque sus copias caen con él.

## Consecuencias

- **Reglas nuevas:** toda regla de combate (mina, quemadura, ralentizar, escupidor) se añade a `stepCombat` con su evento y su test. La escena solo añade cómo se anima.
- **Cambiar la calidad (o el idioma, ADR-0009) en mitad de un combate:** la pelea continúa. Gusanos, balas, escupitajos, vidas y ronda siguen donde estaban.
- **Partida guardada (T-011, ADR-0010):** el `MatchState` entero es lo que se guarda en el navegador. Si cambia su forma, se sube `SAVE_VERSION` y se ajusta la comprobación de `src/game/save.ts`.
- **Portada del menú (T-011):** la batalla de la portada usa el mismo `stepCombat`, con los enemigos fijos en su sitio y todos inmortales.
- **Reiniciar:** es `scene.restart()` sin `resume`. La escena se crea de cero y Phaser limpia objetos, tweens y temporizadores.
- **Velocidad del juego (T-048):** acelerar es dar a `stepRound`, `stepIncome` y `stepCombat` el `delta` por la velocidad (`gameDelta`, `src/game/core/speed.ts`), en `advance` y en ningún otro sitio. Como el combate reparte cualquier `dtMs` en pasos de `MAX_STEP_MS`, a ×2 no se cuelan balas ni cambia ninguna regla, y `npm run sim` da lo mismo. Lo que la escena anima con su reloj y sus tweens va en tiempo real; si una animación fija tiene que durar lo que una regla (el salto del jefe, `OMEN_LEAP_MS`; el bocadillo del poema de Elk Cloner), se divide por la velocidad.
- **Equipos muy lentos:** la simulación usa el `delta` de Phaser, que recorta los fotogramas de más de 200 ms. En un equipo muy lento el juego va a cámara lenta en vez de dar saltos.
