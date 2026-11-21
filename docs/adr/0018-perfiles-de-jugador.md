# ADR-0018: Perfiles de jugador en el navegador

- **Estado:** Aceptada
- **Fecha:** 2026-11-21
- **Modifica:** ADR-0010 (partida guardada), ADR-0012 (tours vistos) y ADR-0014 (progreso permanente)

## Contexto

Hasta T-034 el navegador guardaba un solo jugador, repartido en cuatro huecos de `localStorage`: `rebrote.progreso` (ADR-0014), `rebrote.partida` (ADR-0010), `rebrote.tours` (ADR-0012) y `rebrote.ajustes`. Carmine quiere varios jugadores en el mismo aparato, cada uno con su progreso, y dejar preparado el día en que haya cuentas para compartirlo.

Decisiones de diseño (PF-01 a PF-07, cerradas el 21 nov 2026 con la recomendación): como máximo 3 jugadores; los tours vistos son de cada jugador; los ajustes son del aparato; la pantalla de jugadores solo se abre con un botón de la portada; un jugador sin nombre se llama "Jugador N"; "Borrar progreso" pasa a ser "Borrar jugador" y borra el perfil entero; los nombres se pueden repetir.

Condiciones previas:
- Sin backend (ADR-0001): todo va en el navegador.
- Mientras el juego esté en desarrollo no se migran ni se exportan datos guardados (ADR-0014, ADR-0017). Lo guardado antes de esta decisión se descarta.
- La escena guarda la partida y apunta los jefes vencidos sin pasar por React (`writeSave`, `playerProgress`); React lee lo mismo para el menú.

## Opciones

### Cómo se guarda lo de cada jugador

| Opción | A favor | En contra |
|---|---|---|
| Un solo hueco por jugador con todo dentro (progreso, partida y tours) | Una lectura por jugador | La partida se escribe en cada ronda y al ocultar la pestaña: cada vez se reescribiría todo. Junta tres versiones (`SAVE_VERSION`, `PROGRESS_VERSION` y la de los tours) en un mismo texto: una rota arrastra a las otras |
| Un hueco por jugador y por cosa (`rebrote.perfil.<id>.partida`...) | Cada módulo sigue con su formato, su versión y su comprobación, sin saber de perfiles: solo recibe otro almacén. Borrar un jugador es borrar sus claves | Más claves en `localStorage` (tres por jugador) |
| IndexedDB | Más espacio y objetos sin JSON | Asíncrono: al cerrar la pestaña no asegura la escritura (mismo motivo que en ADR-0010). Cada jugador ocupa unos pocos kilobytes |

### Qué jugador está activo

| Opción | A favor | En contra |
|---|---|---|
| Lo guardado manda siempre | Una sola fuente | Si otra pestaña cambia de jugador, esta escribiría la partida en curso en el jugador de la otra |
| Cada pestaña tiene el suyo en memoria; lo guardado es el que se recuerda al abrir | Cada pestaña escribe en su jugador. El que se recuerda es el de la última pestaña que cambió | Una pestaña puede seguir usando un jugador que otra borró (se acepta: sus restos se barren al arrancar) |

## Decisión

Un hueco por jugador y por cosa, con el jugador activo en memoria en cada pestaña. Código en `src/game/profiles.ts` y `src/game/storage.ts`, con tests en `profiles.test.ts`.

- **Lista de jugadores:** `rebrote.perfiles` = `{ version: 1, active, profiles: [{ id, name, number, createdAt, updatedAt }] }`, en el orden en que se crearon. `PROFILES_VERSION` sube si cambia su forma; una lista de otra versión se descarta con lo de sus jugadores.
  - `id`: identificador al azar (`crypto.randomUUID`, o a mano en http), que no cambia aunque cambie el nombre. Es el que algún día enlazará el perfil con una cuenta.
  - `name`: el que elija el jugador (T-033), o null; entonces se le llama "Jugador N" en el idioma del juego, con `number` el menor libre al crearlo (PF-05).
  - `updatedAt`: la última vez que se escribió algo suyo que cambiaba (partida, progreso o tours). Escribir lo mismo que había no cuenta, así abrir el juego no es "jugar".
  - `active`: el que se recuerda al recargar.
- **Lo de cada jugador:** `rebrote.perfil.<id>.partida` (ADR-0010), `.progreso` (ADR-0014) y `.tours` (ADR-0012). `save.ts`, `progress.ts` y `tourProgress.ts` leen y escriben con la clave corta (`partida`, `progreso`, `tours`) en el almacén que reciben; por defecto, el del jugador activo (`profiles.store()`). La escena no cambia: sigue llamando a `writeSave`, `clearSave` y `playerProgress`.
- **Ajustes:** `rebrote.ajustes` se queda fuera de los perfiles (PF-03): calidad, volumen, idioma y ayuda son del aparato.
- **Arranque:** la primera vez que se usa (`ProfileKeeper.read` o `store`) borra los huecos de antes (`rebrote.progreso`, `rebrote.partida`, `rebrote.tours`) sin convertirlos, barre las claves de jugadores que ya no están en la lista y, si no hay lista, crea el primer jugador sin enseñar ninguna pantalla.
- **Reglas puras** (`addProfile`, `selectProfile`, `removeProfile`, `touchProfile`, `freeNumber`, `decodeProfiles`) sin Phaser, con test. `ProfileKeeper` las aplica sobre lo guardado: cada cambio parte de la lista guardada, así lo que haga otra pestaña (crear o borrar a alguien) no se pisa.
- **Borrar un jugador (PF-06):** primero sale de la lista y luego se borran sus claves; si la pestaña se cierra en medio, los restos se barren al arrancar. Si era el activo, pasa a serlo el que jugó por última vez; si era el último, queda uno nuevo y vacío.
- **Sin almacenamiento** (ventana privada, lleno o bloqueado): `SessionStore` guarda en memoria lo que no se pudo escribir y lo da por bueno al leer. Crear, cambiar y borrar jugadores funciona igual y dura lo que dure la pestaña. Sustituye a la memoria propia que tenía `ProgressKeeper`.
- **Datos rotos:** un jugador roto en la lista se descarta y los demás se quedan; un hueco roto de un jugador se lee vacío (cada módulo lo comprueba como antes) y no afecta a los demás.
- **Interfaz:** la portada dice quién juega y lleva el botón para cambiar de jugador (`PlayerChip`). La pantalla de jugadores (`PlayersPanel`, en el panel de la portada) lista a cada uno con su avatar, sus jefes vencidos y la última vez que jugó, deja elegir, crear (apagado con el máximo, diciendo por qué) y borrar con confirmación (`RemovePlayer`). Solo desde la portada: nunca en mitad de una partida. "Borrar progreso" desaparece de Opciones.

## Consecuencias

- **Todo dato permanente nuevo va dentro del perfil** (regla 13 de `CLAUDE.md`): un campo de `Progress` (T-020, T-022, T-023) o, si no es progreso, un hueco nuevo del perfil leído con `profiles.store()`. Nunca una clave suelta en `localStorage`, salvo lo que sea del aparato, como los ajustes.
- Quien jugaba la versión publicada pierde su progreso, su partida a medias y sus tours vistos al llegar esta decisión. Sus ajustes se conservan.
- Perfiles locales no son cuentas: no se sincronizan ni se protegen; cualquiera con el aparato entra en cualquier jugador. El identificador y la fecha de cada perfil son lo que hará falta para enlazarlos con una cuenta.
- Con dos pestañas, cada una escribe en su jugador; el que se recuerda es el de la última que cambió. Si una borra el jugador que la otra está usando, la otra lo sigue usando hasta cambiar de jugador, y lo que escriba se barre la próxima vez que arranque el juego.
- En iPhone, la aplicación instalada (T-029) no ve los jugadores de Safari. Se acepta durante el desarrollo.
- `ProgressKeeper.erase` y el texto "Borrar progreso" desaparecen. Las migraciones de `progress.ts` (`MIGRATIONS`, `migrate`) se retiran, como permitía ADR-0014.

## Cuándo se revisa

Cuando haya cuentas o guardado en la nube (sería revisar ADR-0001), o al llegar a la versión mayor 1, cuando lo guardado vuelva a ser intocable (ADR-0014).
