# ADR-0019: Viñetas de la historia y retratos pintados con código

- **Estado:** Aceptada. Ampliada el 2026-11-21 por T-032 y el 2026-11-23 por T-043, y completada el 2026-11-25 por el ADR-0027 (cinemáticas, T-049) (ver "Historial")
- **Fecha:** 2026-11-21
- **Modifica:** ADR-0014 (el progreso permanente guarda también la historia vista)

## Contexto

T-031 da cara a Boxer y a Patty y cuenta el arranque de la historia con viñetas: el retrato de quien habla, su nombre y un bocadillo sobre la escena del juego oscurecida (`docs/specs/04-historia.md`). Son las primeras personas que dibuja el juego.

Condiciones previas:
- Todo el arte se hace con código (ADR-0004) y cada diseño se elige en una galería de desarrollo.
- React no pinta entidades del juego: Phaser pinta el tablero y React el HUD y los menús (regla 3 de `CLAUDE.md`).
- Las viñetas salen en las dos escenas: en el tablero (la apertura y la caída de Creeper) y en la portada (Patty en el Invernadero), y tienen que sobrevivir a la pausa, al aviso de girar la pantalla y a que el juego se recree al cambiar de idioma o de calidad.
- Lo que el jugador no pierde va en el progreso permanente de su perfil (ADR-0014, ADR-0018).

## Opciones

### Quién pinta la viñeta

| Opción | A favor | En contra |
|---|---|---|
| Phaser, en cada escena | Todo en el lienzo | Dos escenas con la misma viñeta; el texto letra a letra, el foco y el teclado, a mano; se pierde al recrear el juego |
| React, encima del juego | Una sola viñeta para las dos escenas; sobrevive a recrear el juego; el texto, el foco y el teclado son HTML; mismo sistema que los tours (ADR-0012) | Hay que hacerle llegar el retrato como imagen |

### Quién pinta el retrato

| Opción | A favor | En contra |
|---|---|---|
| La escena, con sus texturas (como la foto de la ficha) | Sigue la regla 3 al pie de la letra | Los personajes no salen en el tablero: serían texturas solo para mandarlas; depende de que haya una escena lista |
| Un pintor de Canvas 2D sin Phaser, como las formas de la disparadora y el icono | Uno solo para el juego, la galería y los tests; no depende de ninguna escena | El retrato no es una textura del tablero |

## Decisión

Viñetas hechas en React encima del juego, con retratos que pinta un pintor de Canvas 2D sin Phaser.

- **Los personajes** viven en `src/game/view/characters/`: cada propuesta es un `CharacterDesign` con su pintor, que recibe la pose (expresión, ojos cerrados, boca abierta) y pinta el busto en un lienzo de 320 × 360. `CAST` (`cast.ts`) elige la propuesta de cada personaje, como `SHOOTER` elige la disparadora. `portraitUrl` pinta cada fotograma una vez y lo devuelve como imagen; React solo la enseña. Un personaje no es una entidad del tablero: la regla 3 sigue en pie para plantas y enemigos.
- **Qué secuencias hay y cuándo salen** es una tabla pura (`src/ui/story/stories.ts`): el guion de viñetas con quién habla y con qué cara, y `storiesAt`, que dice qué toca en cada momento (la partida, la victoria, el Invernadero) sin lo ya visto. Los textos están en `story.lines` de `src/i18n/`.
- **La viñeta** (`StoryOverlay`) va encima del HUD y de los tours y debajo de la pausa, la carga y el aviso de girar. En el tablero el juego queda en pausa mientras dura (como con la ficha); los tours y la victoria esperan a que acabe. El texto sale letra a letra (`typewriter.ts`) con la voz del personaje (`voiceCue` en `cues.ts`, ADR-0013). Mide su tamaño con consultas de contenedor, así la galería la enseña de verdad a 568 × 320 dentro de un marco.
- **Lo visto** va en el progreso permanente del jugador (`Progress.story`, `PROGRESS_VERSION` 2): una secuencia cuenta como vista al acabarla o al saltarla y no vuelve a salir sola. Se vuelve a ver desde el Invernadero sin apuntarla otra vez.
- **Lo que una viñeta pide al jugador** (su nombre, T-033) es un dato del paso (`prompt`): mientras nadie lo pida, el paso se salta y la frase siguiente usa un trato neutro. Desde T-033 el nombre se pide (`STORY_PROMPTS`): la viñeta enseña el campo al acabar el texto y no sigue hasta que el jugador contesta; al volver a verla, no pregunta.

## Consecuencias

- Un personaje nuevo es un archivo en `characters/` con su pintor y su propuesta en `CAST`; una secuencia nueva, una entrada en `STORIES`, su momento en `storiesAt` y sus textos en los dos idiomas. La guía de gráficos tiene las dos listas.
- Cambiar la forma de lo visto cambia `Progress`: se sube `PROGRESS_VERSION` y lo guardado con otra versión se descarta (ADR-0014). Al pasar a la versión 2 se pierden los jefes vencidos guardados antes.
- La viñeta se ve igual en la portada y en el tablero, y su estilo (bocadillo de tebeo, placa con el nombre del color del personaje) es el de toda la historia que venga (T-032).

## Cuándo se revisa

Si los comentarios de una línea (T-043) se quedan cortos para contar algo y empiezan a pedir varias frases seguidas: entonces son viñetas. Si una viñeta tiene que salir dentro del lienzo (por ejemplo, un personaje que habla junto a algo del tablero), o si los retratos pasan a animarse por partes (brazos, pelo), que con imágenes enteras no se puede.

## Historial

- **2026-11-21, versión original (T-031).**
- **2026-11-21, ampliación (T-032):** los personajes salen también fuera de las viñetas: Boxer en el bocadillo de los tours y al pie de la ficha de un jefe, quien presenta cada desbloqueo arriba del aviso y Patty en el Invernadero. Siguen siendo imágenes del mismo pintor que React solo enseña: los fotogramas, el retrato redondo (`Cameo`) y la frase dicha letra a letra con la boca y la voz (`useSpeech`) están en `src/ui/story/Portrait.tsx`, que usa también la viñeta. Quién presenta cada desbloqueo es un dato del guion de cada brote (`presenter` en `OUTBREAKS`, `unlockPresenter` en `rounds.ts`). Lo que cuenta Boxer antes de cada jefe es una secuencia más, una por brote (`lore:<brote>`), que no se declara en `STORIES`: sale de la lista de brotes y de su texto en `story.lore`.
- **2026-11-23, ampliación (T-043, el giro):** la historia se cuenta también **sin parar el juego**. Un brote largo (9 rondas) con una viñeta en cada ronda cansa (HG-01), así que solo tres secuencias lo paran (apertura, mitad y final del brote 4) y el resto son **comentarios de una línea**: el retrato redondo de quien habla y un bocadillo pequeño en la esquina de abajo a la derecha, durante la preparación, que se van solos en unos 5 s o con un toque y se cortan al empezar el ataque. Son otra tabla pura (`REMARKS` y `remarkAt` en `src/ui/story/remarks.ts`, textos en `story.remarks`), con su regla de qué hacer en cada momento (`remarkFate`: salir, esperar tapado debajo de lo que pare el juego o cortarse). Lo visto sigue en `Progress.story`, con claves `remark:<brote>:<frase>`: sin cambiar la forma de `Progress`, así que no se sube `PROGRESS_VERSION`. No se vuelven a ver desde el Invernadero (HG-06). Las secuencias de una ronda concreta pasan a ser un dato (`STORY_AT_ROUND`), como las de después de un jefe (`STORY_AFTER_BOSS`), y `STORY_ORDER` las ordena por ronda. Los personajes ganan una cuarta expresión, dudoso (HG-05), pintada en `kit.ts` para todos.
- **2026-11-25, cinemáticas (T-049, ADR-0027):** los momentos grandes de la historia se cuentan con un motion comic: planos a pantalla completa con capas que se mueven por su cuenta, narrados en una franja abajo. Es una secuencia más (`CINEMATIC_STORIES`), con un paso por plano, y se ve donde las viñetas (`CinematicOverlay`); lo visto y volver a verla son lo de siempre. Se cumple la condición de "Cuándo se revisa" (animar por partes), y la respuesta está en el ADR-0027: las capas las pinta Canvas 2D en React, no se animan los retratos. Tras un jefe pueden salir varias secuencias (`STORY_AFTER_BOSS`): tras Creeper, la cinemática de la rebelión y las viñetas del nombre y del Invernadero (`creeperDown` se queda con esas dos).
