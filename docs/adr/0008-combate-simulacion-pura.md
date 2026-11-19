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
- `MatchState` (`src/game/core/match.ts`) contiene toda la partida: saldo, vidas, plantas con su vida y su recarga, minas con su conteo (T-004), enemigos (con su quemadura y su ralentización, T-005), balas, generador de enemigos y siguiente id.
- Enemigos y balas llevan un id único. Las plantas se identifican por su casilla.

### El paso
- `stepCombat(state, dtMs)` (`src/game/core/combat.ts`) avanza la partida y devuelve el estado nuevo y la lista de eventos que pasaron: `shot`, `hit`, `bulletGone`, `bite`, `plantDestroyed`, `enemyKilled` y `enemyEscaped`. Desde T-004, también `mineArmed` y `mineExploded`.
- Es una función pura: no toca el estado recibido.
- Un fotograma largo se reparte en pasos de 50 ms como mucho (`MAX_STEP_MS`). Así ninguna bala atraviesa a un gusano y ningún mordisco se pierde.
- Orden dentro de cada paso:
  1. Los enemigos arden si tienen una quemadura (T-004) y muerden lo que tocan (planta o mina) o avanzan, más despacio si están ralentizados (T-005). Los que cruzan el borde izquierdo restan una vida.
  2. Las minas (T-004) que detectan a un enemigo empiezan su conteo; las que lo terminan explotan: la de fuego daña y la de hielo frena. Una mina destruida a mordiscos en el paso 1 ya no explota.
  3. Las balas avanzan. Cada una da al primer enemigo vivo de su carril que encuentra en su recorrido, o desaparece al salir del tablero. La de fuego deja además una quemadura y la de hielo, una ralentización.
  4. Las plantas recargan y disparan si tienen a quién.
- Las balas no llevan objetivo fijo. Por eso una bala cuyo objetivo murió sigue hasta el siguiente.
- Sin vidas, `stepCombat` y el generador no hacen nada.
- No se usa la física de Phaser.

### La escena
- En cada `update`, la escena avanza el generador y el combate con el `delta` de Phaser. Luego anima cada evento y recoloca cada vista por su id.
- `update` no corre con la escena en pausa, así que la pausa congela el combate sin código extra.
- Las vistas (`PlantView`, `WormView`, `BulletView` en `src/game/view/`) no deciden nada: siguen al estado y animan los eventos.
- Una vista que se va (muere, se cuela, sale del tablero) se quita del mapa en el acto y termina su animación sola.

### El generador de prueba
`src/game/core/spawner.ts` saca gusanos por carriles al azar, cada vez más seguido. También vive en el estado. T-007 lo cambiará por las rondas.

## Consecuencias

- **Reglas nuevas:** toda regla de combate (mina, quemadura, ralentizar, escupidor) se añade a `stepCombat` con su evento y su test. La escena solo añade cómo se anima.
- **Cambiar la calidad en mitad de un combate:** la pelea continúa. Gusanos, balas, vidas y generador siguen donde estaban.
- **Reiniciar:** es `scene.restart()` sin `resume`. La escena se crea de cero y Phaser limpia objetos, tweens y temporizadores.
- **Equipos muy lentos:** la simulación usa el `delta` de Phaser, que recorta los fotogramas de más de 200 ms. En un equipo muy lento el juego va a cámara lenta en vez de dar saltos.
