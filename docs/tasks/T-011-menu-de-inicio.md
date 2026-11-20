# [Interfaz] Menú de inicio, partida guardada, créditos e idiomas

**Estado:** Completada (20 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** L (orientativo) · **Depende de:** T-010 · **Bloquea a:** ninguna · **Origen:** pedido de Carmine del 20 nov 2026 ("el juego requiere un menú de inicio")

## Contexto
Hasta ahora el juego arranca directamente en la ronda 1 y, al cerrar la pestaña, la partida se pierde. Esta task añade la puerta de entrada al juego: un menú de inicio con el título, una portada animada con Creeper, gusanos y plantas, y las opciones de siempre. Además, la partida se guarda sola en el navegador para poder seguirla otro día, hay créditos y el juego se puede jugar en español y en inglés.

## Objetivos
1. **Menú de inicio** con el título "Rebrote": nueva partida, cargar partida, opciones, lista de jefes (desactivada de momento) y créditos, a la derecha.
2. **Portada animada** a la izquierda, bajo el título: el primer jefe, algunos gusanos y plantas en movimiento, como en el juego, pero sin desplazarse.
3. **Partida guardada** en el navegador, que se carga desde el menú.
4. **Créditos**: autor, desarrollo con Claude (con su logo), estética inspirada en Plants vs. Zombies y algún crédito más.
5. **Dos idiomas**: español e inglés en todo el juego.

## Alcance
**Incluye:** escena de portada, menú de inicio (React), opciones con idioma, ajustes gráficos y FPS de siempre, guardado automático con un hueco, salir al menú desde la pausa, la derrota y la victoria, créditos, traducción al inglés de todos los textos del juego (HUD, menús, fichas, rótulos del tablero, avisos de ronda y frases de Creeper).
**No incluye:** la lista de jefes (solo el botón desactivado), varios huecos de guardado, progreso entre partidas (D-03 sigue igual: los niveles se pierden al acabar la partida), más idiomas, cambios de reglas o de balance.

## Decisiones
| # | Pregunta | Decisión (20 nov 2026) | Decide |
|---|---|---|---|
| I-01 | ¿Cómo va la portada? | Jardín a toda pantalla: el fondo del menú es el mismo escenario animado del juego. Creeper, gusanos y plantas están sobre el césped, en la mitad izquierda, bajo el título. El menú flota a la derecha | Carmine |
| I-02 | ¿Cuándo se guarda? | Solo automático: al empezar la partida y cada ronda, y en el momento exacto al salir al menú o al ocultar o cerrar la pestaña. No hay botón de guardar | Carmine |
| I-03 | ¿Cuántas partidas guardadas? | Una sola. "Cargar partida" dice en qué ronda va, con cuántas vidas y monedas, y cuándo se guardó | Carmine |
| I-04 | ¿Qué pasa con la guardada al perder? | Se borra: perder sigue obligando a empezar desde la ronda 1, y no se puede esquivar cerrando la pestaña. Al ganar también se borra (la partida acabó) | Carmine (al ganar, Claude) |
| I-05 | ¿localStorage o IndexedDB? | `localStorage` (`rebrote.partida`, con número de versión). La partida ocupa unos pocos KB, se escribe de golpe (se puede guardar al cerrar la pestaña, cosa que IndexedDB, que es asíncrono, no asegura) y los ajustes ya van ahí (ADR-0001). Una guardada que no se entiende o de otra versión se ignora | Claude |
| I-06 | Nueva partida con una guardada | Pide confirmar: "Se borrará tu partida guardada (ronda N)" | Claude |
| I-07 | Idioma | Por defecto, el del navegador si es español o inglés; si no, inglés. Se cambia en Opciones (en el menú de inicio y en la pausa) y con el selector ES/EN del menú. Al cambiarlo se recarga el escenario, como con la calidad, y la partida sigue | Claude |
| I-08 | ¿Se traduce "Rebrote"? | No: es el nombre (D-08 sigue abierta) | Claude |
| I-09 | ¿Dónde van los créditos? | Botón "Créditos" en el menú de inicio, con su propia tarjeta en el panel de la derecha | Claude (el sitio lo dejó Carmine) |
| I-10 | Lista de jefes | Botón visible y desactivado, con un candado y "Próximamente" | Carmine |
| I-11 | ¿Cómo se vuelve al menú? | "Salir al menú" en la pausa y "Menú principal" en la derrota y la victoria. La partida se guarda sola al salir | Claude |
| I-12 | ¿"Interactiva"? | Se mueve como en el juego (gusanos que avanzan en el sitio, plantas que disparan, mordiscos, escupitajos, Creeper con su luz y sus frases) y además responde al clic: la planta dispara, el gusano se queja, Creeper habla y la mina explota y vuelve a brotar | Carmine (moverse), Claude (el clic) |

## Criterios de aceptación

Comprobados el 20 nov 2026 con tests de Vitest (los nuevos `save.test.ts` e `i18n.test.ts`, la ficha en inglés en `entityInfo.test.ts` y los de rondas ajustados; 272 en total) y en el Chromium por software del equipo de desarrollo (sin GPU), a 1600 × 900, 812 × 375 y 568 × 320, en calidad Baja, Media y Ultra. Casos probados en el juego:
- Al abrir: título, lema, portada y menú; "Cargar partida" desactivado sin guardada. En la portada, mano sobre Creeper y no sobre el césped; clic en Creeper (frase), en el gusano que muerde ("¡Ay!") y en la mina (se arma, explota y vuelve a brotar dormida).
- "Nueva partida": ronda 1 y partida guardada al momento. Con la tecla M (+500) y la pestaña oculta a mano (`visibilitychange`), la guardada pasa a 750 en ese instante y el juego queda en pausa.
- Pausa > Ajustes > English: el juego se recarga en inglés con el mismo saldo y la misma ronda, y sigue en pausa. "Quit to menu" vuelve a la portada y "Load game" dice "Round 1 of 10 · 3 lives · 250 coins · Saved just now".
- Partida guardada preparada a mano (ronda 3, una vida, 333 monedas, una disparadora de fuego de 2 cañones, una mina de hielo, un gusano a punto de colarse y el aviso de la mina de fuego sin aceptar): se carga con todo eso y el aviso sale; al aceptarlo el gusano se cuela, sale la derrota con "Menú principal", la guardada se borra y "Cargar partida" queda desactivado.
- "Nueva partida" con guardada: pide confirmar; "Mejor no" la conserva y "Sí, nueva partida" la sustituye por una nueva (250 monedas).
- Créditos y opciones en el panel de la derecha, también a 568 × 320 (créditos en una columna; el panel se desplaza si no cabe).

- [x] Al abrir el juego sale el menú de inicio con el título "Rebrote", la portada animada a la izquierda y el menú a la derecha.
- [x] La portada se mueve sin desplazarse: los gusanos ondulan en su sitio, las plantas disparan y las semillas les dan, un gusano muerde, el escupidor escupe y Creeper respira, parpadea y habla. Respeta los niveles gráficos y `artInv()` (usa las mismas vistas y efectos que el tablero).
- [x] "Nueva partida" empieza en la ronda 1; si hay partida guardada, antes pide confirmar.
- [x] La partida se guarda sola al empezar, al empezar cada ronda, al salir al menú y al ocultar o cerrar la pestaña. "Cargar partida" la sigue donde estaba (saldo, vidas, plantas, enemigos y ronda), también con el aviso de lo desbloqueado si estaba sin aceptar.
- [x] Sin partida guardada, "Cargar partida" está desactivado. Al perder o ganar, la guardada se borra (al ganar: que una partida ganada no se guarda y borra la guardada tiene test, y `enterVictory` la borra igual que `enterDefeat`; no se jugó una victoria entera en el navegador).
- [x] Opciones: idioma, pantalla completa, calidad gráfica y FPS, en el menú de inicio y en la pausa.
- [x] "Jefes" se ve desactivado con "Próximamente".
- [x] Créditos con el autor, Claude con su logo, la estética inspirada en Plants vs. Zombies y los créditos técnicos.
- [x] Todo el juego (menús, HUD, fichas, rótulos, avisos y frases de Creeper) se puede jugar en español y en inglés, y el cambio de idioma no pierde la partida.
- [x] Probado a 1600 × 900, 812 × 375 y 568 × 320.
- [x] Reglas y formato de guardado con tests; `npm test` y `npm run build` pasan; docs al día.

## Cómo quedó (para tareas siguientes)
- **Escenas:** `TitleScene` (portada) y `BoardScene` (tablero) en el mismo juego (`createGame` arranca la de `screen`). Claves en `scenes/keys.ts`. React pide el paso con `GameEvents.matchRequested` (`MatchRequest`: partida nueva o `resume` y `pendingUnlock`) y `GameEvents.exitRequested`; cada escena avisa con `sceneReady` y su clave, y `App` pone la pantalla (`screen`) que toca. Lo común (`fitCamera`, `applyPostFx`, `FpsMeter`) está en `scenes/sceneKit.ts`.
- **Portada:** `view/titleCover.ts`. Reparto en `CAST` y aspecto en `COVER_LOOK`. Es `stepCombat` de verdad; `pin` devuelve a cada enemigo a su sitio y a todos la vida. `WormView.sync(enemy, stride)` ondula sin moverse y `CreeperView.taunt` suelta una frase. La cámara de la portada se corre `shiftX` (110) a la derecha.
- **Guardado:** `src/game/save.ts` (`writeSave`, `readSave`, `clearSave`, `decodeSave` con `isMatchState`, `summarizeSave`), clave `rebrote.partida`, `SAVE_VERSION` 1. La escena guarda en `saveGame` (al crearse, en `roundStarted`, con `saveRequested` y al salir) y borra en `enterDefeat` y `enterVictory`. `App` pide guardar en `visibilitychange` (oculta) y `pagehide`.
- **Idiomas:** `src/i18n/` (ADR-0009, guía `docs/guias/idiomas.md`). `Settings.language` en `rebrote.ajustes`. `GameCanvas` recrea el juego al cambiar `quality` o `language`. Los avisos de ronda salieron de `balance.ts` (`round.notices`) y el grito de la escolta es la clave `'escort'` (`CreeperShout`). Las etiquetas de calidad salieron de `quality.ts` (`settings.levels`). La ficha (`entityInfo.ts`) y la pantalla "CARGANDO" de Creeper (`textures.ts`) leen el idioma en curso.
- **Menú (React):** `TitleScreen` (vistas `main`, `options`, `credits`, `confirm`), `SettingsPanel` (compartido con la pausa) y `LanguagePicker`, `Credits` y `ClaudeLogo`. `PauseMenu` tiene "Salir al menú"; `DefeatScreen` y `VictoryScreen`, "Menú principal". La versión del pie sale de `package.json` (`__APP_VERSION__`, en `vite.config.ts`).

## Casos límite y riesgos
- Una partida guardada con otra versión del juego (otro formato o un guion de rondas distinto) no se carga: se ignora.
- Si el navegador no deja guardar (ventana privada, sin espacio), el juego sigue igual y "Cargar partida" queda desactivado.
- Si se cierra la pestaña a mitad de un ataque, se carga en ese momento exacto, con los enemigos donde estaban. Las monedas soltadas en el suelo no se guardan (son de la vista).
- El cambio de idioma recrea el juego: tarda lo mismo que cambiar la calidad.

## Cómo probarlo (QA)
1. Abrir el juego: menú de inicio con la portada en movimiento. Hacer clic en una planta, un gusano, Creeper y la mina.
2. "Nueva partida", sembrar algo, pulsar Esc y "Salir al menú": "Cargar partida" dice la ronda, las vidas y las monedas; cargarla y comprobar que todo sigue.
3. Recargar la página a mitad de un ataque y cargar: sigue en ese momento.
4. Perder: "Cargar partida" queda desactivado.
5. Cambiar a inglés desde Opciones en el menú y en la pausa: todo el texto cambia y la partida sigue.
6. "Créditos" y "Jefes" (desactivado).
