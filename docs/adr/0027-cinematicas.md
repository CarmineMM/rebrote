# ADR-0027: Cinemáticas de motion comic pintadas con Canvas 2D en React

- **Estado:** Aceptada
- **Fecha:** 2026-11-25
- **Modifica:** ADR-0019 (la historia también se cuenta con cinemáticas, además de viñetas y comentarios) y ADR-0022 (una pista de música que no va por tramos sino con la historia)

## Contexto

T-049 cuenta la rebelión de la IA con un **motion comic**: planos dibujados a pantalla completa, hechos de capas recortadas que se mueven cada una por su cuenta (paralaje, cámara lenta, piezas que entran), mientras Boxer narra, con música heroica propia. Es la primera vez que el juego enseña algo que no es el tablero ni un retrato: una sala de 1971, una fábrica, una ciudad, un refugio.

Lo que condiciona:
- Todo el arte se hace con código (ADR-0004) y respeta los niveles gráficos (ADR-0006) y "reducir movimiento".
- La cinemática sale en dos sitios: sobre el tablero al vencer a Creeper y en el Invernadero, al volver a verla desde "Historia" o la primera vez para quien ya había visto las viñetas (MC-11). Tiene que sobrevivir a la pausa, al aviso de girar y a que Phaser se recree al cambiar de idioma o de calidad, como las viñetas (ADR-0019).
- React no pinta entidades del juego (regla 3): Creeper, el gusano y la disparadora que salen en los planos tienen que llegar de la escena.
- La revisión del ADR-0019 decía que se repensara "si los retratos pasan a animarse por partes". Un motion comic anima por partes.
- Tiene que ir bien en un móvil modesto y verse a 1600 × 900, 812 × 375 y 568 × 320, cubriendo la pantalla entera (regla 4).

## Opciones

### Quién la pinta

| Opción | A favor | En contra |
|---|---|---|
| Una escena de Phaser propia | Texturas, tweens y el reloj de la escena; sus entidades sin pasar por React | Dos escenas (tablero e Invernadero) tendrían que lanzarla; se pierde al recrear el juego; el texto, el foco y el teclado, a mano |
| Vídeo pregrabado | Lo más bonito posible | Pesa decenas de MB, no es arte por código, no se adapta a la calidad ni a la pantalla, no se traduce |
| React con un lienzo de Canvas 2D | Mismo sitio que las viñetas: sobrevive a todo lo anterior; el texto, el foco y el teclado son HTML; los pintores son funciones sin Phaser, que también usa la galería | El reloj, las transiciones y el paralaje se hacen a mano; las entidades del juego hay que pedírselas a la escena |

### Cómo se mueven las capas

| Opción | A favor | En contra |
|---|---|---|
| Pintar el plano entero en cada fotograma | Sencillo | Demasiado caro en un móvil: los fondos llevan cientos de trazos y degradados |
| Cada capa en su propio `<canvas>` movido con CSS | Lo compone la GPU | Decenas de elementos, la pausa y la transición entre planos repartidas por el CSS |
| Capas fijas pintadas una vez en lienzos aparte y compuestas en un solo lienzo, más capas vivas pintadas en cada fotograma | Un fotograma es poner unas pocas imágenes y dibujar lo que cambia; un solo reloj; las transiciones son mezclar dos planos | Memoria de las capas fijas: hay que soltar las de los planos que ya pasaron |

## Decisión

Cinemáticas en React (`CinematicOverlay`, donde las viñetas) con un lienzo de Canvas 2D que compone capas.

- **La tabla es pura y con test** (`src/game/view/cinematic/shots.ts` y `rebellion.ts`). Una cinemática son escenas y planos; un plano, el paso de la secuencia que narra (su texto es el de ese paso, en `story.lines`), un movimiento de cámara largo y suave, sus capas de atrás hacia delante y lo que suena en cada momento. Una capa dice su pintor, su profundidad (paralaje: 0, el fondo quieto; 1, lo de delante), sus cambios de pose (`tweens`), su vaivén (`sway`) y si es un adorno que algún nivel gráfico quita (`decor`). La pose y la cámara en cada instante las calculan funciones puras (`poseAt`, `cameraAt`, `parallax`); con movimiento reducido, todo en su estado final y sin vaivén.
- **Dos clases de capas** (`art.ts`). Las fijas (`PaintedArt`) se pintan una vez, en su caja, a la resolución de la pantalla (entre 0,5 y 1,5 píxeles por unidad de diseño, menos en la calidad baja), y luego solo se colocan. Las vivas (`LiveArt`) se pintan en cada fotograma con el tiempo del plano: pantallas, luces que se apagan, cables que se encienden, gente que anda. El que compone (`CinematicRenderer`, `render.ts`) prepara las fijas del plano y del siguiente y suelta las demás.
- **Cubre toda la pantalla.** El diseño (1600 × 900) cabe entero y centrado; cada plano pinta además un margen (`OVERSCAN`) que cubre de 4:3 a más de 21:9 y lo que se mueve la cámara. Un test comprueba que la cámara no se sale del margen.
- **Transiciones.** El primer plano sale de negro; dentro de una escena, los planos se funden; al cambiar de escena se pasa página, con un borde de papel inclinado, y sale el título de la escena como el rótulo de un tebeo.
- **Narración y avance (MC-06, MC-07).** Una franja abajo con el retrato redondo de quien narra, su nombre y el texto letra a letra con su voz (`useSpeech`). Como en las viñetas: un toque completa el texto y el siguiente pasa de plano, mientras el plano sigue moviéndose; "Saltar" siempre a la vista. Tapada por la pausa o el aviso de girar, el reloj se para.
- **Las entidades del juego las recorta la escena.** La portada y el tablero mandan por `EventBus` (`cinematicArt`) a Creeper, el gusano y la disparadora recortados con sus texturas (`cinematicCutouts`, como los jefes de la ruta). En las pantallas de 1971 salen teñidas de fósforo verde. Mientras no llegan, la capa que los usa no los pinta. Boxer y Patty salen con sus bustos de siempre (`CAST`), sin reflejar.
- **Es una secuencia de la historia.** `CINEMATIC_STORIES` marca qué secuencias son cinemáticas; lo demás (cuándo sale, lo visto en `Progress.story`, volver a verla desde el Invernadero) es lo de siempre. Tras Creeper salen dos secuencias (`STORY_AFTER_BOSS` admite varias): la cinemática (`rebellion`) y las viñetas del nombre y del Invernadero (`creeperDown`).
- **Su sonido** (ADR-0013). Lo que suena en cada momento es un dato del plano (`beats`) y `cinematicCue` (`cues.ts`) dice qué efecto; pasar página, `cinematicTransitionCue`. Van por el canal de los menús, porque el juego está en pausa detrás.
- **Su música** (ADR-0022). Una secuencia puede llevar su pista (`STORY_MUSIC`): mientras se ve, `musicFor` la pide a volumen normal (no baja como con una viñeta) y, en la victoria, sigue hasta salir del tablero. Se prepara una ronda antes, en la del jefe, si lo que saldrá al vencerlo la lleva.

## Consecuencias

- Otra cinemática es otra tabla como `REBELLION`, sus pintores y su paso en `STORIES`: el reproductor no cambia. La guía de gráficos tiene la lista "Cinemática nueva".
- La IA tiene silueta (`aiArt.ts`, tres propuestas en `/proposals/cinematica.html`, la del juego en `AI_DESIGN`), y sale en el catálogo de personajes aunque no hable.
- Las capas fijas de un plano ocupan unos MB cada una; solo se guardan las del plano anterior, el actual y el siguiente.
- Los pintores son Canvas 2D sin Phaser: se pueden reutilizar en la galería y, si algún día hace falta, en una escena.

## Cuándo se revisa

Si una cinemática necesita que los personajes se muevan por partes (brazos, bocas en el plano, no solo en la franja), si alguna tiene que ir dentro del tablero (sin parar el juego) o si el coste de las capas vivas no deja ir fluido un móvil de verdad.
