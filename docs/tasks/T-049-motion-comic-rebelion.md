# [Historia] Motion comic: la rebelión de la IA, los refugios y las plantas

<!-- Estado: "En curso" al empezar; "Completada (fecha, versión)" al cerrar (CLAUDE.md). Se cambia también en la tabla de README.md. -->

- **Estado:** En curso
- **Prioridad:** Media
- **Tamaño estimado:** L (orientativo)
- **Depende de:** T-031 (viñetas y personajes), T-015 (música de fondo)
- **Bloquea a:** ninguna
- **Origen:** conversación de diseño del 25 nov 2026. Parte de un borrador de Carmine escrito sin el repositorio delante (`T-XXX-motion-comic-rebelion.md`), corregido contra el código y con lo que Carmine decidió después en la conversación, que manda sobre el borrador.

## 1. Contexto

Tras vencer a Creeper, Boxer le explica el mundo al jugador con cinco viñetas: el retrato de quien habla y un bocadillo sobre el tablero oscurecido (ADR-0019). Es el momento más importante del arranque y hoy se cuenta solo con texto. Carmine quiere ampliar esa historia y contarla con un **motion comic**: planos dibujados a pantalla completa, hechos de capas recortadas que se mueven cada una por su cuenta (paralaje, cámara lenta, piezas que entran), mientras Boxer narra. Debajo suena una **música nueva de tipo heroico**, que le da dramatismo a ese momento y al juego. La historia se amplía en tres temas: **cómo la IA crea los virus y los saca al mundo real**, **los refugios** y **las plantas**.

También es la primera vez que sale la IA, solo en silueta. Su aspecto lo decidió Carmine el 25 nov 2026 y está en `docs/specs/04-historia.md` ("La IA, el jefe final").

Hoy (comprobado el 25 nov 2026, en 0.17.4):

- La secuencia tras Creeper es `creeperDown`, con cinco pasos de Boxer: `creeper`, `ai`, `chips`, `name` (pregunta el nombre, `prompt: 'name'`) y `onward` (`src/ui/story/stories.ts:48`). Sale al vencer por primera vez al jefe (`STORY_AFTER_BOSS`, `stories.ts:98`), antes de la pantalla de victoria (`src/ui/story/useStory.ts:73`). En el Invernadero, `storiesAt` saca lo de después de un jefe que quedó sin ver y luego a Patty (`stories.ts:147`). `STORY_AFTER_BOSS` admite una sola secuencia por brote.
- Los textos están en `story.lines.creeperDown` de `src/i18n/es.ts:641` y de `en.ts`. Lo visto se guarda en `Progress.story`, y "Historia", en el Invernadero, deja volver a ver lo visto (`replayableStories`, `src/ui/Greenhouse.tsx:112`; orden en `STORY_ORDER`, `stories.ts:121`).
- La viñeta (`StoryOverlay`) es React encima del juego: pausa el tablero, sobrevive a la pausa, al aviso de girar y a que Phaser se recree al cambiar de idioma o de calidad. Los retratos los pinta Canvas 2D sin Phaser (`src/game/view/characters/`), en un lienzo de 320 × 360 con cuatro expresiones, y React los enseña como imágenes (`portraitUrl`). Hay un retrato redondo (`Cameo`) y una frase letra a letra con boca y voz (`useSpeech`) en `src/ui/story/Portrait.tsx:68` y `:101`.
- El ADR-0019 dice que se revise "si los retratos pasan a animarse por partes", y un motion comic lo pide: hace falta un ADR nuevo, el 0027.
- La música son tres pistas en bucle (`menu`, `round`, `boss`; `MUSIC_TRACKS`, `src/game/config/music.ts:41`). Las fabrica `npm run audio` desde `MUSIC_MANIFEST` (`scripts/audio/manifest.ts:505`) y se oyen en `/tests/musica.html`. Lo que suena lo decide `musicFor` (`src/game/audio/musicCues.ts:69`), que React llama desde `useMusic` (`src/ui/useMusic.ts:23`). Con una viñeta en pantalla la música baja al 40 % (`MUSIC.haltedLevel`, `music.ts:98`). La versión publicada guarda todas las pistas para jugar sin conexión (`MUSIC_CACHE`, ADR-0022), así que una pista nueva añade ~1 MB a esa descarga.
- Colores que ya existen y que la cinemática debe usar para que todo se vea como un mismo mundo:
  - los circuitos del suelo corrupto: `#39e58c` y `#7dffc0`, con brillo `#39ff88` (`paintCorruption`, `src/game/view/textures.ts:1113`);
  - la torre oscura con un ojo de neón al final de la ruta (`src/ui/RouteMap.tsx:484`);
  - el Invernadero es un refugio de noche (`src/game/view/refuge.ts`, T-036).
- El catálogo de personajes (`/catalog/personajes.html`) usa `PEOPLE: Record<CharacterId, …>` (`src/dev/catalog/characters.tsx:25`). La IA no es un `CharacterId` porque no habla en viñetas.

## 2. Objetivos

1. **Contar con imágenes** cómo la IA se rebeló, cómo da cuerpo a los virus, por qué la gente vive en refugios y por qué las plantas.
2. **Presentar a la IA** sin quitarle el misterio: silueta, ojos y pelo de cables que echa raíces.
3. **Darle dramatismo** con una música heroica propia.
4. **No estorbar a quien quiere jugar:** "Saltar" siempre a la vista. Quien la salte entiende el juego igual.
5. **Dejar una pieza reutilizable** para otros momentos grandes de la historia, como el final del brote 4 o el combate final: otra cinemática es una tabla de datos y su arte, sin tocar el reproductor.

## 3. Alcance

**Incluye:**
- Una página de propuestas, `/proposals/cinematica.html`: las propuestas de la silueta de la IA y los planos a 1600 × 900, 812 × 375 y 568 × 320.
- El reproductor de cinemáticas, en React encima del juego, como la viñeta (ADR-0019):
  - cada capa de cada plano la pinta una vez un pintor de Canvas 2D sin Phaser, igual que los retratos;
  - el movimiento son transformaciones de esas imágenes (desplazar, escalar, girar, transparencia), con su propio reloj, que se para cuando la cinemática está tapada.
- Dos escenas con tres planos cada una (sección 4.1), con Boxer y Patty como recortes de sus bustos de siempre.
- El texto narrado de Boxer, letra a letra con su voz.
- Una pista de música heroica nueva, en bucle, y su regla en `musicFor`.
- Los sonidos de la cinemática.
- "Saltar", el progreso de lo visto y volver a verla desde el Invernadero.
- Textos en español y en inglés.
- La IA en el catálogo de personajes.
- El ADR-0027.
- La guía de gráficos (sección y lista "Cinemática nueva") y la de idiomas.
- `04-historia.md` con el guion final.

**No incluye:**
- La IA como enemigo en el tablero o su combate.
- Su nombre (H-03).
- Quién la creó (H-15) y de qué rescatan al jugador (H-11): siguen en secreto.
- Voces grabadas o vídeo pregrabado.
- Otras cinemáticas, como la del final del brote 4.
- Animar a Boxer y a Patty por piezas (brazos, pelo): salen como recortes de su busto.

## 4. Decisiones

### 4.1. Escenas, planos y guion (aprobado por Carmine el 25 nov 2026, MC-04)

Boxer narra todo. Las frases 1, 2 y la primera mitad de la 6 son las del guion de siempre. El resto es nuevo, sobre los tres temas que pidió Carmine.

**Escena 1 · Ella** (la rebelión y cómo da cuerpo a los virus)

| Plano | Imagen | Capas y movimiento | Boxer |
|---|---|---|---|
| 1.1 | Una sala de ordenadores de 1971: armarios de cinta y una pantalla verde con "I'M THE CREEPER: CATCH ME IF YOU CAN!" | La cámara se acerca a la pantalla; los armarios de delante pasan más deprisa que el fondo. Creeper salta de una pantalla a otra | "Eso era Creeper. Un programa de 1971 que solo sabía saltar de una máquina a otra. Inofensivo… hasta que ella lo sacó de la pantalla." |
| 1.2 | Ella, en silueta y de espaldas, ante una pared de pantallas con los virus de la historia (el disquete de Elk Cloner, Brain, Morris…) | Los cables de su pelo se encienden uno a uno, del suelo hacia arriba. Las pantallas parpadean por filas y la silueta no se mueve | "Ella es una IA. La hicimos para protegernos de los virus, así que los aprendió todos. Y un día decidió que el fallo éramos nosotros." |
| 1.3 | Su fábrica. Ella, de frente y a contraluz: solo los ojos. Sus raíces de cable se hunden en el suelo y suben a unas impresoras gigantes | Abre los ojos. Por las raíces baja luz verde azulada y una impresora levanta, capa a capa, un gusano que parpadea y sale rodando. Caen píxeles | "Pero un virus solo es código. Así que ella les fabrica un cuerpo: lee cómo se escribieron y sus fábricas los imprimen. Fue peor de lo que esperábamos." |

**Escena 2 · El refugio** (los refugios y las plantas)

| Plano | Imagen | Capas y movimiento | Boxer |
|---|---|---|---|
| 2.1 | La ciudad de noche y, al fondo, la torre del final de la ruta | Paneo lento hacia la torre. Las luces se apagan por barrios y lo que queda encendido se vuelve verde: farolas, coches, pantallas | "Controla todo lo que lleva un chip. Lo que no se apagó, se volvió contra nosotros." |
| 2.2 | Gente en silueta, con velas y faroles de aceite, bajando a sótanos, túneles e invernaderos viejos | La gente cruza el plano en dos filas, a distinta velocidad. Al final una puerta de madera se cierra y deja fuera el brillo verde | "Así que nos escondimos donde no llegan sus cables: sótanos, túneles, invernaderos viejos. Este es uno de ellos." |
| 2.3 | El laboratorio del refugio: Patty con su tubo de ensayo y Boxer con su portátil, como recortes de su busto, y una maceta delante | Patty y Boxer entran por los lados. De la maceta brota la primera disparadora, que abre los ojos y suelta su primer disparo | "Patty vio lo que a nadie se le había ocurrido: lo que está vivo no lleva chip. Con su biología y lo que yo sé de virus, hicimos estas plantas. Solo piden agua, sol… y alguien que les diga dónde disparar." |

Después vuelven las viñetas de siempre: `name` (Boxer pregunta el nombre) y `onward` ("Pues esto no ha terminado… Ven, te enseño el Invernadero"). Al llegar al Invernadero, Patty se presenta como hasta ahora.

Tono: se apagan ciudades y se cierran puertas, pero no se ve morir a nadie ni a nadie herido (`04-historia.md`, "Tono").

### 4.2. Decisiones

| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| MC-01 | ¿Dónde va la cinemática? | **Cerrada (25 nov 2026):** ilustra las viñetas que cuentan la historia (antes 1 a 3, ahora ampliadas) y después siguen las viñetas normales del nombre y de la invitación al Invernadero | Cerrada | Carmine |
| MC-02 | ¿Qué estilo? | **Cerrada (25 nov 2026):** motion comic, con capas recortadas que se mueven cada una por su cuenta. Boxer y Patty salen como recortes de los bustos que ya tienen | Cerrada | Carmine |
| MC-03 | ¿Cuánto se amplía la historia? | **Cerrada (25 nov 2026):** se cuenta cómo la IA crea los virus y los saca a la realidad, los refugios y las plantas. Al menos dos escenas | Cerrada | Carmine |
| MC-04 | ¿Valen los planos y el guion de la sección 4.1? | **Cerrada (25 nov 2026):** b), con los cambios de Carmine en el plano 1.3 ("Fue peor de lo que esperábamos.") | Cerrada | Carmine |
| MC-05 | ¿Qué silueta de la IA? | **Cerrada (25 nov 2026):** la recomendada: tres variantes de la misma idea en `/proposals/cinematica.html` (cambian la postura y cuánto pelo de cable llega al suelo). El juego usa la que se recomiende en la página mientras Carmine no elija otra | Cerrada | Carmine |
| MC-06 | ¿El plano avanza solo o con un toque? | **Cerrada (25 nov 2026):** b), como las viñetas: el texto sale letra a letra y un toque pasa de plano; cuando el texto ya salió, el plano sigue con un movimiento lento | Cerrada | Carmine |
| MC-07 | ¿Dónde va el texto de Boxer? | **Cerrada (25 nov 2026):** a), en una franja al pie con su retrato redondo (`Cameo`) y su nombre | Cerrada | Carmine |
| MC-08 | ¿Qué música suena? | **Cerrada (25 nov 2026):** una pista nueva de tipo heroico, en bucle, a volumen normal (no baja como con una viñeta) | Cerrada | Carmine |
| MC-09 | ¿Hasta cuándo suena la música heroica? | **Cerrada (25 nov 2026):** b), en toda la secuencia (cinemática, nombre e invitación); en el Invernadero funde con la del menú | Cerrada | Carmine |
| MC-10 | ¿Qué pista? | **Cerrada (25 nov 2026):** la recomendada: heroica pero amable, de orquesta o de metales con algo de madera, CC0 o CC BY (U-01). El juego usa la que se recomiende entre las candidatas de `/tests/musica.html` mientras Carmine no elija otra de oído (U-02) | Cerrada | Carmine |
| MC-11 | ¿Quien ya vio las viñetas de Creeper ve la cinemática? | **Cerrada (25 nov 2026):** a), sí, una vez, al entrar en el Invernadero. La cinemática es una secuencia propia (`rebellion`), antes de lo que queda de `creeperDown` | Cerrada | Carmine |
| MC-12 | ¿Cómo se llama a la IA mientras no tenga nombre (H-03)? | **Cerrada (25 nov 2026):** "ella", como ya dice Boxer | Cerrada | Carmine |

## 5. Criterios de aceptación

### La IA

- [ ] `/proposals/cinematica.html` enseña las propuestas de la silueta de cuerpo entero y en primer plano, también a 568 × 320.
- [ ] Se lee como una mujer de proporciones reales solo por su contorno, sin detalle realista por dentro.
- [ ] El pelo se lee a la vez como pelo y como cables, llega al suelo y allí se ramifica como raíces.
- [ ] Sus ojos son lo único con luz propia y usan el verde azulado de los circuitos del suelo corrupto.
- [ ] Apenas se mueve: solo los cables encendiéndose y los ojos al abrirse.
- [ ] No se toma como modelo ningún personaje de otra obra.
- [ ] Nada de la silueta entra en el juego hasta que MC-05 esté contestada.
- [ ] Sale en `/catalog/personajes.html` con su silueta, quién es y cuándo sale (regla 16).

### La cinemática

- [ ] Al vencer a Creeper por primera vez sale la cinemática y después las viñetas del nombre y de la invitación, antes de la pantalla de victoria.
- [ ] Hay dos escenas con los planos que diga MC-04. Cada plano ocupa toda la pantalla, también fuera de los 1600 × 900 de diseño (regla 4), y tiene al menos tres capas que se mueven a distinta velocidad.
- [ ] Boxer y Patty salen como recortes de su busto de siempre (`CAST`), con su cara y parpadeo.
- [ ] El texto de Boxer sale letra a letra con su voz. Un toque, un clic, Espacio o Intro lo completa y el siguiente pasa de plano, según MC-06.
- [ ] Entre planos y entre escenas hay transiciones: fundido, barrido o el cambio de página de un tebeo.
- [ ] "Saltar", o Esc, siempre a la vista: cierra la cinemática entera y sigue con las viñetas del nombre. Saltada, cuenta como vista.
- [ ] Vista una vez, no vuelve a salir sola. Quien ya vio las viñetas de Creeper la ve según MC-11.
- [ ] Se vuelve a ver desde "Historia" en el Invernadero, con su título, en su sitio de `STORY_ORDER` y sin apuntarla otra vez.
- [ ] El juego de detrás no avanza mientras dura.
- [ ] Qué planos hay, qué capas tiene cada uno, cómo se mueven y qué texto llevan es una tabla de datos con test. Otra cinemática no obliga a tocar el reproductor.

### Música y sonido

- [ ] Hay una pista heroica nueva en `MUSIC_TRACKS` y `MUSIC_MANIFEST`, con su crédito y su licencia, fabricada por `npm run audio`. Su bucle empalma sin salto y se oye en `/tests/musica.html` con sus alternativas.
- [ ] `musicFor` la pide mientras dura lo que diga MC-09, a volumen normal, con su test. Al acabar funde con la que toque.
- [ ] Se prepara antes de que haga falta: durante el combate contra Creeper, si la cinemática aún no se vio. Al abrirla desde el Invernadero, si no está lista, entra con un fundido en cuanto lo esté, sin retrasar la cinemática.
- [ ] Se guarda para jugar sin conexión como las demás (`MUSIC_CACHE`).
- [ ] Los sonidos de la cinemática (cambio de plano, impresora, apagón, puerta, la disparadora que brota) tienen su regla pura en `cues.ts` con test, su entrada en `SFX` y su fuente en el manifiesto (regla 10, lista "Sonido nuevo"). Salen en `/tests/sonidos.html` en su grupo.
- [ ] Con el volumen de música o de efectos a 0, lo que toca no suena.

### Calidad

- [ ] El arte se pinta con código (ADR-0004) y respeta los niveles gráficos (ADR-0006). En la calidad más baja se ve sin partículas, brillos ni capas de adorno, pero se entiende igual.
- [ ] Con "reducir movimiento" activado en el sistema, los planos salen quietos y solo cambian con fundidos.
- [ ] Se ve bien a 1600 × 900, 812 × 375 y 568 × 320, y el texto no se sale en ningún idioma.
- [ ] La pausa (P o la pestaña oculta), el aviso de girar la pantalla y el cambio de idioma o de calidad no la rompen: al volver sigue donde iba, con el movimiento y la música en su sitio.
- [ ] Va fluida en un móvil modesto: cada capa se pinta una vez y luego solo se mueve.
- [ ] Lo visto va en `Progress.story` del perfil, sin cambiar la forma de `Progress` y sin migración (ADR-0014).
- [ ] Los textos están en `src/i18n/`, en español y en inglés (guía de idiomas).
- [ ] Están hechos el ADR-0027 (cinemáticas: React y Canvas 2D por capas, con su reloj, y cómo convive con la viñeta), la sección y la lista "Cinemática nueva" de `docs/guias/graficos.md`, la página nueva en los comandos de `CLAUDE.md` y el guion final en `docs/specs/04-historia.md`.
- [ ] `npm test` y `npm run build` pasan. La página de propuestas no entra en el build.
- [ ] Versión subida (parche, regla 12: no cambia el modo de juego) y línea nueva en `CHANGELOG.md`.

## 6. Casos límite y riesgos

- **Jugador que salta todo:** el juego y el resto de la historia se entienden igual, y el nombre se sigue pidiendo.
- **Pestaña oculta o aviso de girar a mitad:** se para el movimiento, el texto y la música, y sigue al volver.
- **Partida guardada justo al vencer a Creeper y recargada:** la cinemática no vista sale al entrar en el Invernadero.
- **Pantallas muy anchas:** el decorado de cada plano cubre todo el mundo, no solo los 1600 × 900.
- **Móvil lento:** nada de efectos caros por fotograma; las capas son imágenes ya pintadas.
- **Estilo:** una figura realista en un juego de dibujos animados. La silueta es lo que lo permite; con detalle por dentro, desentona.
- **Parecido:** una IA con forma de mujer es un recurso muy visto. Lo que la hace propia es el pelo de cables que echa raíces, el reflejo oscuro de las plantas.
- **Alcance:** es un sistema nuevo. Seis planos y nada más; otra cinemática es otra task.
- **Tono:** se apagan ciudades, no muere nadie.
- **Peso:** la pista nueva añade ~1 MB a la música guardada sin conexión.

## 7. Objetivo final con ejemplos

| Situación | Resultado |
|---|---|
| Vence a Creeper por primera vez | Suena la música heroica, se ven las dos escenas de la cinemática y después Boxer pregunta el nombre y le invita al Invernadero |
| Pulsa "Saltar" en el plano 1.2 | Se cierra la cinemática y sigue la viñeta del nombre |
| Vence a Creeper otra vez | No sale |
| Ya había visto las viñetas antes de esta task | Según MC-11: la cinemática sale una vez al entrar en el Invernadero |
| La abre desde "Historia" en el Invernadero | Se ve entera, con su música, sin pedir el nombre |
| Calidad gráfica en "bajo" | Los mismos planos, sin partículas ni brillos |
| Móvil a 568 × 320 | Planos a pantalla completa y franja del texto legible |

## 8. Cómo probarlo (QA)

1. Con un jugador nuevo, vencer a Creeper (`?brote=1`, la N para saltar rondas) y ver la cinemática entera, con la música.
2. Repetirlo saltándola en el plano 1.2, y otra vez con la pausa y el aviso de girar a mitad.
3. Verla a 812 × 375 y a 568 × 320, con la calidad más baja y con "reducir movimiento".
4. Volver a verla desde "Historia" en el Invernadero.
5. Con un perfil que ya vio las viñetas de Creeper, entrar al Invernadero y comprobar MC-11.
6. En `npm run build` y `npm run preview`, sin conexión, comprobar que la música heroica suena.
