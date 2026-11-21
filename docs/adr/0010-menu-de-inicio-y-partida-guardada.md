# ADR-0010: Menú de inicio con portada y partida guardada en el navegador

- **Estado:** Aceptada. Modificada el 2026-11-21 por ADR-0018 (ver "Historial").
- **Fecha:** 2026-11-20

## Contexto

T-011 pide un menú de inicio con el título, una portada en movimiento (Creeper, gusanos y plantas) y las opciones, y que la partida se pueda guardar y cargar. Hasta ahora el juego arrancaba directamente en la ronda 1 con una sola escena (`BoardScene`) y la partida se perdía al cerrar la pestaña.

Condiciones previas:
- Sin backend (ADR-0001): lo que se guarde va en el navegador.
- El estado de la partida es un solo objeto serializable, `MatchState`, con el combate entero (ADR-0008). Ya se usa para continuar la partida al recrear el juego (ADR-0006).
- La pausa congela la escena; React pinta HUD y menús encima (ADR-0007).

## Opciones

### Portada

| Opción | A favor | En contra |
|---|---|---|
| Imagen fija o animación en CSS | Barato | Arte nuevo que no es el del juego, o parado (Carmine lo quiere "en movimiento como si fuera el juego") |
| Coreografía a mano con las vistas del juego | Control total | Repite a mano lo que ya hacen las reglas: disparos, impactos, mordiscos, quemaduras |
| El combate de verdad con un reparto fijo, sin que nadie avance ni muera | Se mueve exactamente como el juego, con su arte y sus efectos | Hay que "fijar" a los enemigos tras cada paso |

### Dónde guardar

| Opción | A favor | En contra |
|---|---|---|
| `localStorage` | Síncrono: se puede guardar al cerrar la pestaña. Ya guarda los ajustes. Sobra para unos KB | 5 MB por sitio, solo texto |
| IndexedDB | Mucho espacio, objetos sin JSON | Asíncrono: al cerrar la pestaña no asegura que termine de escribir. Más código para una sola partida |

## Decisión

### Dos escenas en el mismo juego
- `TitleScene` (portada) y `BoardScene` (tablero) se registran en `createGame`, que arranca la de la pantalla en curso (`screen`). Pasar de una a otra no recrea el juego: las texturas ya están pintadas. Las claves están en `src/game/scenes/keys.ts`.
- React pide el cambio por `EventBus`: `matchRequested` (portada → tablero, con la partida nueva o la guardada) y `exitRequested` (tablero → portada). Cada escena avisa con `sceneReady` y su clave, y React sabe así en qué pantalla está.
- Lo que comparten las dos escenas (cámara a pantalla completa, filtros de Ultra y medición de fps) está en `src/game/scenes/sceneKit.ts`.

### Portada
- El mismo jardín animado del juego a toda pantalla (`createAmbience`), con la cámara algo corrida a la derecha para dejar sitio al menú.
- `TitleCover` (`src/game/view/titleCover.ts`) monta un combate con un reparto fijo y lo avanza con `stepCombat`. Tras cada paso, cada enemigo vuelve a su sitio con la vida llena y lo sembrado recupera la suya: nadie avanza, nadie muere y el combate sigue sin fin. Los que andan ondulan en su sitio (`stride` de `WormView.sync`). Los eventos se animan igual que en el tablero.
- Responde al clic: la planta dispara, el gusano se queja, Creeper habla (`CreeperView.taunt`) y la mina explota y vuelve a brotar.

### Partida guardada
- Un solo hueco en `localStorage` (`rebrote.partida`; desde T-034, uno por jugador: `rebrote.perfil.<id>.partida`, ADR-0018), con versión (`SAVE_VERSION`), la fecha y el `MatchState` entero, más el aviso de desbloqueo sin aceptar (T-009). Código y validación en `src/game/save.ts`, con tests.
- Se guarda sola: la escena guarda al empezar la partida y cada ronda, y cuando React se lo pide (`saveRequested`) al ocultar o cerrar la pestaña; y al salir al menú. No hay botón de guardar (I-02).
- Al perder o ganar se borra (I-04): perder sigue obligando a empezar desde la ronda 1, y no se esquiva cerrando la pestaña porque se guarda el momento exacto.
- Al cargar, se comprueba la forma entera del estado (tipos de enemigos, carriles, ronda dentro del guion...). Lo que no se entiende, de otra versión o de una partida acabada, se ignora: "Cargar partida" queda desactivado (desde T-019 se llama "Continuar", ADR-0016).

## Consecuencias

- **Si cambia la forma de `MatchState`** (un campo nuevo, otro significado), se sube `SAVE_VERSION` y se ajusta `isMatchState` en `save.ts`. Las guardadas viejas dejan de cargarse; es lo esperado en el prototipo.
- Lo que no se pierde al acabar una partida (jefes vencidos y lo que venga) no va aquí: va en el progreso permanente, con migraciones en vez de descartes (ADR-0014, T-017).
- Si cambia el guion de rondas, una guardada puede quedar en una ronda que ya no existe: se ignora.
- Todo lo que pase con el tiempo en la portada usa el reloj y los tweens de su escena, como en el tablero.
- Las monedas soltadas en el suelo no se guardan: son de la vista.
- La lista de jefes tenía su botón desactivado en el menú. Desde T-019 no existe: la sustituye la ruta de brotes del Invernadero, y el flujo de pantallas fuera de la partida es el del ADR-0016.

## Historial

- **2026-11-20, versión original (T-011).**
- **2026-11-21, modificación (T-034, ADR-0018):** la partida guardada es de cada jugador. Va en el hueco `partida` de su perfil (`rebrote.perfil.<id>.partida`) y `save.ts` escribe, por defecto, en el del jugador activo. El hueco `rebrote.partida` se borra al arrancar, sin convertirlo.
