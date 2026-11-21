# [Historia] El jugador elige su nombre

**Estado:** Completada (21 nov 2026, 0.4.0) · **Prioridad:** Baja · **Tamaño estimado:** S (orientativo) · **Depende de:** T-031, T-034 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 21 nov 2026

## Contexto
El protagonista es el propio jugador: no tiene cara ni se le muestra. Carmine quiere que elija su nombre: Boxer se lo pregunta, el jugador lo escribe y la partida guardada se identifica con ese nombre.

El nombre pertenece al perfil del jugador (T-034, ADR-0018): `Profile` (`src/game/profiles.ts`) ya tiene `name`, null mientras no lo elija (entonces se le llama "Jugador N", `playerName` en `src/ui/playerCards.ts`), y la lista de perfiles se guarda con su versión (`PROFILES_VERSION`). El progreso permanente vive en `src/game/progress.ts` (`Progress`, `PROGRESS_VERSION`; ADR-0014) y hoy solo guarda los brotes vencidos. Los textos admiten datos dentro de la frase (por ejemplo, `t.title.waiting` recibe el brote y la ronda). El juego se usa mucho en móvil en horizontal (ADR-0011), donde el teclado en pantalla tapa media pantalla o más.

## Objetivos
1. **Que el jugador se ponga nombre** sin que sea un trámite.
2. **Que el nombre se use:** en las viñetas y para identificar su partida.
3. **Que no moleste** a quien no quiera escribir nada.

## Alcance
**Incluye:** la viñeta en la que Boxer pregunta, campo de texto, nombre por defecto, guardado en el perfil (sin migración: ADR-0014), nombre en la portada y en el Invernadero, uso en las viñetas, cambio de nombre desde Opciones, textos en español e inglés, tests.
**No incluye:** la gestión de perfiles (crear, elegir y borrar jugador), que es T-034; cuentas; nombres visibles para otros jugadores.

## Decisiones (cerradas el 21 nov 2026)
| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| NJ-01 | ¿Cuándo pregunta Boxer? | Tras vencer a Creeper, después de explicar el mundo y el porqué, dentro de las viñetas | Carmine |
| NJ-02 | ¿Es obligatorio escribir? | No: con "Prefiero no decirlo" Boxer le pone un apodo | Carmine |
| NJ-03 | ¿Qué apodo pone Boxer? | "Rookie", el mismo en todos los idiomas (cambiado el 21 nov 2026: antes era "Recluta" en español) | Carmine |
| NJ-04 | ¿Cuántos caracteres? | De 1 a 12 | Carmine |
| NJ-05 | ¿Varios perfiles con nombres distintos? | Sí. Los perfiles son T-034; el nombre se guarda en el perfil activo | Carmine |
| NJ-06 | Quien ya venció a Creeper antes de esta task, ¿cuándo se lo preguntan? | Sin caso especial (cambiado el 21 nov 2026): no se migran datos ni se atiende a partidas anteriores. Quien ya vio las viñetas de Creeper sigue con el nombre provisional y puede ponerse uno en Opciones | Carmine |

## Criterios de aceptación
### Preguntar
- [x] En el momento de NJ-01, Boxer pregunta el nombre y aparece un campo de texto.
- [x] El jugador confirma con un botón o con Intro.
- [x] No se acepta un nombre vacío o solo de espacios: el botón de confirmar está apagado.
- [x] Los espacios del principio y del final se quitan, y no se pueden escribir más caracteres que el máximo.
- [x] "Prefiero no decirlo" usa el apodo de NJ-03.
- [x] Saltar las viñetas también usa el apodo; nunca queda un jugador sin nombre.

### Usar
- [x] Las viñetas siguientes llaman al jugador por su nombre.
- [x] La portada y el Invernadero muestran el nombre junto a "Continuar" o en el título.
- [x] El nombre se conserva al recargar y al empezar partidas nuevas.
- [x] En Opciones se puede cambiar.
- [x] Borrar el jugador (T-034) borra también su nombre.
- [x] Un perfil que aún no eligió nombre se muestra con el nombre provisional de T-034.

### Calidad
- [x] El nombre se guarda en el perfil activo (T-034). Sin migración: lo guardado con otra versión se descarta (ADR-0014).
- [x] El nombre se muestra siempre como texto, nunca se interpreta.
- [x] A 812 × 375 y 568 × 320, con el teclado en pantalla abierto, se ve lo que se escribe y se puede confirmar.
- [x] Tests de las reglas del nombre: vacío, espacios, longitud y apodo.
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Cómo quedó (21 nov 2026)
- **Reglas del nombre** en `src/game/playerName.ts`, sin React ni Phaser y con test: de 1 a 12 letras contadas como las ve el jugador (`Intl.Segmenter`: una eñe, una tilde aparte, un emoji o una familia de emojis cuentan como una), sin espacios a los lados, un solo espacio entre palabras, sin saltos de línea ni caracteres que den la vuelta al texto o sean invisibles. `NICKNAME` es "Rookie" (NJ-03), igual en todos los idiomas.
- **Dónde se guarda:** en `Profile.name` (`renameProfile` y `profiles.rename` en `src/game/profiles.ts`). La forma de la lista de perfiles no cambia, así que `PROFILES_VERSION` sigue en 1; lo guardado se lee limpio (un nombre que no vale se lee como null). Renombrar apunta la fecha del perfil y no cambia el jugador activo que se recuerda.
- **La pregunta:** la viñeta 4 de la caída de Creeper (`prompt: 'name'`, que ya no se salta) enseña, al acabar el texto, el campo (`NameField`), "✓ ¡Listo!" (apagado sin nombre; Intro también confirma) y, al pie, "Prefiero no decirlo" junto a "Saltar". El campo trae el nombre si ya lo puso en Opciones. Esc salta. Al acabar o saltar esa secuencia sin nombre, se pone el apodo (`nameAfterStory`). Al volver a verla desde "Historia" no pregunta: se lee como las demás.
- **Dónde se ve:** Boxer en la viñeta 5 y Patty en la 6 ("¿Así que tú eres quien ha parado a Creeper, Carmine?": se añadió el nombre al final de su pregunta, con el mismo texto aprobado); "Continuar · Carmine" en la portada (cortado con puntos suspensivos si no cabe); "¡Hola, Carmine!" bajo el título del Invernadero (en lugar del lema); la fila del jugador y la lista de jugadores (T-034).
- **Opciones de la portada** empiezan por "Jugador": el campo con el nombre, "Guardar" y "Ahora te llamas…". En los Ajustes de la pausa no está: son del aparato.
- **Teclado en pantalla:** `useKeyboardArea` (con la regla pura `keyboardArea`, con test) mira `visualViewport`: con un campo enfocado y el teclado tapando lo suficiente, la viñeta y el panel del menú se meten en el trozo que se ve (`.app.has-keyboard`). Por debajo de 260 px de alto la viñeta quita el busto y aprieta el bocadillo; por debajo de 170, deja el texto en dos líneas. La letra del campo nunca baja de 16 px (el iPhone amplía la página con menos). Al tocar "¡Listo!" o "Prefiero no decirlo" con el teclado abierto no se mueve nada hasta que el teclado se cierra, para que el toque no caiga fuera del botón. Escribiendo, las teclas no llegan al juego: la P no pausa.
- **Probado** en Chrome headless (GPU, Ultra) a 1600 × 900, 812 × 375 y 568 × 320, en español y en inglés, con el teclado simulado (lo que se ve: 170 px y 118 px de alto): la pregunta, confirmar con el botón y con Intro, solo espacios, "Prefiero no decirlo", saltar con Esc, doce emes, emojis, la portada, el Invernadero, Opciones, la lista de jugadores, volver a ver la historia y la caída de Creeper en el tablero escribiendo una P. **Falta probarlo en un Android y en un iPhone de verdad** (QA 2): el teclado se ha simulado.
- No es una mecánica del tablero ni un gesto nuevo: no lleva tour (regla 9) ni sonido propio (regla 10); los botones suenan como los demás.
- NJ-03 y NJ-06 cambiaron al empezar: "Rookie" en todos los idiomas, y sin caso especial para quien ya vio las viñetas de Creeper.

## Casos límite y riesgos
- **El teclado en móvil horizontal** es el riesgo real: puede tapar el campo y sacar al juego de la pantalla completa. Hay que probarlo en un Android y en un iPhone de verdad.
- Nombres con emojis, tildes, eñes o letras de otros alfabetos: se aceptan y se cuentan bien.
- Un nombre muy ancho (doce letras M) no rompe el botón de la portada.
- Frases que usan el nombre: en inglés y en español el orden cambia; el nombre va como dato dentro de la frase.
- Cambiar el idioma no cambia el nombre. Con NJ-03 cambiada, el apodo tampoco: es "Rookie" en todos los idiomas.

## Objetivo final con ejemplos
| Lo que escribe | Resultado |
|---|---|
| "Carmine" | Boxer: "Pues esto no ha terminado, Carmine." La portada: "Continuar · Carmine" |
| "   Ana  " | Se guarda "Ana" |
| Nada, y pulsa "Prefiero no decirlo" | Boxer le llama "Rookie" (en cualquier idioma) |
| Solo espacios | El botón de confirmar no se activa |
| 13 letras | La decimotercera no entra |

## Cómo probarlo (QA)
1. Vencer a Creeper, escribir un nombre y comprobarlo en las viñetas, la portada y el Invernadero.
2. Repetir en un móvil en horizontal con el teclado en pantalla.
3. Cambiar el nombre en Opciones y borrar el progreso.
