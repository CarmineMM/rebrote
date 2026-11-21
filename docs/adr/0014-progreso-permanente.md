# ADR-0014: Progreso permanente aparte de la partida en curso, con versión

- **Estado:** Aceptada. Modificada el 2026-11-21 (ver "Historial").
- **Fecha:** 2026-11-21

## Contexto

Hasta T-017 solo se guardaba la partida en curso (ADR-0010): un hueco en `localStorage` (`rebrote.partida`) con el `MatchState` entero, que se borra al ganar o perder y que se ignora si es de otra versión (`SAVE_VERSION`). Para una partida está bien. Para lo que tiene que durar (jefes vencidos, la moneda secundaria de T-020, las compras de T-022 y las mejoras de T-023) sería un desastre: subir una versión borraría todo lo ganado. Y no quedaba constancia de que el jugador venció a Creeper.

Condiciones previas:
- Sin backend (ADR-0001): lo que se guarde va en el navegador.
- Ya hay otros dos huecos que duran entre partidas: los ajustes (`rebrote.ajustes`) y los tours vistos (`rebrote.tours`, ADR-0012).
- La escena (Phaser) sabe cuándo se vence a un jefe; el menú (React) tiene que poder enseñar y borrar el progreso.

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| Meter el progreso en la partida guardada | Un solo hueco | Se borra al ganar o perder y se descarta al cambiar de versión: justo lo contrario de lo que hace falta |
| Un hueco propio en `localStorage`, con versión y migraciones | Independiente de la partida; síncrono, como los otros; cabe de sobra | Hay que escribir cada migración |
| IndexedDB | Más espacio | Asíncrono y más código para unos pocos bytes (mismo motivo que en ADR-0010) |

## Decisión

Un hueco propio, `rebrote.progreso`, en `src/game/progress.ts`, con tests en `progress.test.ts`.

- **Forma (versión 1):** `{ version: 1, defeated: ['creeper'] }`. `defeated` son los brotes cuyo jefe se venció al menos una vez, por su nombre (el del jefe: `OUTBREAK_ID` en `core/rounds.ts` hasta T-018; desde entonces, el `id` de cada brote en `OUTBREAKS`, ADR-0015), en el orden en que se vencieron. Se guarda el nombre y no la posición para que reordenar los brotes no mezcle el progreso.
- **Reglas puras** (`recordDefeat`, `isOutbreakDefeated`, `hasProgress`) sin Phaser, como pide la regla 1 de `CLAUDE.md`.
- **Sin migraciones durante el desarrollo (modificado el 21 nov 2026):** mientras el juego esté en desarrollo, es decir, hasta la versión mayor 1 (ADR-0017), no se escriben migraciones ni se mantiene compatibilidad con lo guardado antes. `PROGRESS_VERSION` sube cuando cambia la forma, y un progreso de otra versión se descarta: el jugador empieza de cero, igual que pasa con la partida guardada (ADR-0010). El mecanismo de `MIGRATIONS` puede quedarse vacío o retirarse, y el test que exigía una migración por versión deja de aplicar.
- **Datos rotos:** lo que no se entiende (texto corrupto, sin versión) cuenta como vacío y no da error. De un progreso que se entiende a medias se queda lo que vale. Leer nunca toca la partida guardada.
- **Versión distinta de la del juego:** se ignora y se parte de cero. Ya no hace falta conservarla sin pisar.
- **Sin almacenamiento** (ventana privada, lleno, bloqueado): lo que no se pudo escribir se queda en memoria (`ProgressKeeper`) y manda sobre lo guardado hasta que se pueda escribir. El juego sigue igual y el progreso dura lo que dure la sesión.
- **Quién escribe:** la escena, al ganar (`enterVictory`), apunta el brote como vencido **antes** de borrar la partida guardada: si la pestaña se cierra en ese momento, la victoria no se pierde. Volver a ganar no escribe nada. El menú de inicio lee el progreso al abrirse (`playerProgress`, una sola instancia que comparten Phaser y React, como `save.ts`, sin pasar por `EventBus`).
- **Borrado (sustituido por "Borrar jugador" en T-034, ADR-0018):** solo si el jugador lo pide, con "Borrar progreso" en Opciones del menú de inicio (no en los ajustes de la pausa: borraría la partida que se está jugando). La confirmación dice qué se pierde. Se borran el progreso y la partida guardada; los ajustes, el idioma y los tours vistos se quedan.
- **"Nueva partida"** sigue pidiendo confirmación para pisar la partida guardada, y dice que el progreso se conserva.
- Quien venció a Creeper antes de T-017 no lo tiene vencido: no hay forma de saberlo (K-01). No hay código para exportar o importar el progreso (K-02), y durante el desarrollo no se va a hacer.
- **Varios jugadores por navegador (decidido el 21 nov 2026, hecho en T-034 con ADR-0018):** el progreso, la partida a medias y los tours vistos pasan a ser de cada perfil. El progreso va en el hueco `progreso` de cada perfil (`rebrote.perfil.<id>.progreso`) y se borra con el jugador ("Borrar jugador", en la pantalla de jugadores). Cada perfil tiene un identificador estable y la fecha de su último guardado, pensando en enlazarlo algún día con una cuenta. Lo guardado antes de los perfiles no se convierte: se descarta.

## Consecuencias

- **Si cambia la forma del progreso** (un campo nuevo como las semillas de T-020, otro significado), se sube `PROGRESS_VERSION` y lo guardado con la versión anterior se descarta (regla 11 de `CLAUDE.md`). Durante el desarrollo no se escribe migración.
- Las tasks que guardan algo permanente (T-020, T-022, T-023, T-031) amplían `Progress`, sin migración, en vez de abrir otro hueco. El nombre del jugador (T-033) no: va en el perfil (`Profile.name`, ADR-0018).
- **Quien juega la versión publicada pierde su progreso cada vez que cambia la forma de lo guardado.** Es el precio aceptado de no migrar mientras el juego cambia tanto.
- Con dos pestañas abiertas gana la última que escribe. Se acepta.
- Cualquiera puede editar `localStorage`. No importa mientras no haya ranking ni pagos.
- El progreso vive en el navegador: quien borre los datos del sitio lo pierde. Es el límite conocido de ADR-0001 y el primer motivo real para revisarlo (cuentas o guardado en la nube).

## Cuándo se revisa

Al llegar a la versión mayor 1, que decide Carmine (ADR-0017). A partir de ahí, lo guardado por los jugadores vuelve a ser intocable: migraciones obligatorias y, si hace falta, exportar e importar.

## Historial

- **2026-11-21, versión original (T-017):** progreso con versión y migraciones en cadena; un progreso viejo nunca se descartaba.
- **2026-11-21, modificación:** Carmine decidió que, mientras el juego esté en desarrollo, no se tiene en cuenta la migración, la compatibilidad ni la exportación de datos. Se retiran las migraciones obligatorias y la conservación de progresos de versiones más nuevas. Se añade la decisión de tener varios perfiles por navegador (T-034).
- **2026-11-21, T-034 (ADR-0018):** el progreso es de cada jugador, en el hueco `progreso` de su perfil; `rebrote.progreso` se borra al arrancar, sin convertirlo. Se retiran `MIGRATIONS`, `migrate` e `isNewerProgress`: un progreso de otra versión se descarta y se pisa. "Borrar progreso" desaparece de Opciones: lo sustituye "Borrar jugador", que borra el perfil entero (PF-06). Lo que no se pudo escribir ya no lo guarda `ProgressKeeper` en memoria sino el almacén del perfil (`SessionStore`).
