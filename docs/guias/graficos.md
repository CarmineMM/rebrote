# Guía de gráficos y animación

Cómo se pinta y se anima Rebrote, para que todo lo nuevo (enemigos, mundos, efectos, plantas) encaje con lo que ya hay. Las decisiones de fondo están en los ADR-0004 (arte bonito y animado), ADR-0005 (cámara inclinada), ADR-0006 (ajustes gráficos), ADR-0007 (pantalla completa y pausa), ADR-0008 (combate como simulación pura), ADR-0010 (menú de inicio y portada), ADR-0011 (en móvil, solo en horizontal), ADR-0012 (tours de ayuda), ADR-0013 (efectos de sonido) y ADR-0019 (viñetas de la historia y retratos). Los textos que se pintan siguen la guía de idiomas (`docs/guias/idiomas.md`, ADR-0009).

## 1. Principios

- **Bonito y amigable.** Personajes simpáticos, colores alegres, formas redondeadas y reacciones exageradas. Hay libertad creativa para enemigos, escenarios y efectos mientras no cambien reglas ni balance.
- **Todo se anima.** Nada aparece ni desaparece de golpe y nada se queda quieto del todo. Si algo está en pantalla, respira, se mece, brilla o parpadea.
- **Estilo propio.** No se copia el arte de otro juego (ver el riesgo de parecido en `docs/specs/00-vision.md`).
- **La animación nunca decide reglas.** La lógica de `src/game/core/` no espera a que termine una animación: se cobra, se siembra o se daña en el acto, y la animación acompaña.
- **Bajo también tiene que verse bien.** Los niveles quitan cantidad, no cuidado.

## 2. Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `src/game/view/layout.ts` | Diseño (`VIEW`), mundo con decorado extra (`WORLD`, `BLEED`), vista según la pantalla (`viewFor`), césped (`LAWN`), franjas del decorado (`SCENERY`), capas (`DEPTH`) |
| `src/game/view/perspective.ts` | Cámara inclinada: `toScreen`, `toBoard`, `cellWidthAt` |
| `src/game/view/textures.ts` | Todo el arte pintado con Canvas 2D, una vez al arrancar (`TEX`, `registerTextures`, `artInv`) |
| `src/game/view/ambience.ts` | Lo que se mueve en el escenario: sol, nubes, pájaros, viento, partículas, flores |
| `src/game/view/quality.ts` | Niveles gráficos y modo automático |
| `src/game/view/effects.ts` | Efectos de respuesta compartidos: ráfagas de partículas (tierra, chispas, hojas, píxeles, jugo, llamas, brasas, humo, copos, esquirlas de hielo, vaho, moco, esquirlas de acero), anillos (también tumbados en el suelo), destellos y textos flotantes |
| `src/game/view/boardMarks.ts` | Marcas sobre el tablero que comparten cartas y arrastre: casilla (`drawCell`), área circular en perspectiva (`drawArea`, `areaSize`) y rótulo de lo que pasará al soltar (`BoardLabel`, `LABEL_TONES`) |
| `src/game/view/plantView.ts` | Disparadora: brota, respira, retrocede al disparar, se encoge al recibir un mordisco, se marchita y muere (`PLANT_LOOK`). Al arrastrar otra: se atenúa, se levanta o da un saltito. Al fusionarse o infundirse: cambia de textura con un rebote. Al subir de nivel: estirón y medallita nueva (`levelUp`). En los niveles con premio, su jardincito (`LevelGarden`). La de fuego suelta brasas y la de hielo, copos. Boca de cada cañón (`barrelMuzzle`) |
| `src/game/view/gardenArt.ts` | Jardincito de los niveles con premio (T-027), sin Phaser y con test: tramo según el nivel (`gardenTier`), dónde va cada trozo (`gardenSpots`) y su pintor (`paintGardenPiece`) |
| `src/game/view/levelGarden.ts` | Jardincito en pantalla (T-027): brota, se mece, destella en el tramo 4, se oscurece y se transparenta con su planta y se encoge al irse (`LevelGarden`) |
| `src/game/view/shooterShape.ts` | Qué forma de disparadora usa el juego (`SHOOTER`, T-016): desde el 21 nov 2026, Brote (`bulb`). De ahí salen sus pies (`SHOOTER_SIZE`) y sus cañones (`SHOOTER_BARRELS`). `textures.ts` los reexporta |
| `src/game/view/shooters/` | Formas de la disparadora, sin Phaser (T-016, sección 10): la del juego, Brote (`bulb.ts`), la de antes (`legacy.ts`), las otras propuestas del rediseño (`cactus.ts`, `pod.ts`), lo que comparten (`kit.ts`), qué es una forma (`design.ts`), el catálogo para la galería (`catalog.ts`) y su test de medidas (`designs.test.ts`) |
| `src/game/view/canvasKit.ts` | Utilidades de pintado con Canvas 2D (círculo, elipse, hoja, florecita) que comparten `textures.ts` y las formas de la disparadora |
| `src/game/view/levelMedal.ts` | Medallita de nivel (T-003), sin Phaser y con test: dónde va (`MEDAL`, `medalCenter`), color de cada tramo (`MEDAL_TIERS`, `medalTier`) y cuáles la llevan (`showsMedal`) |
| `src/game/view/mineView.ts` | Mina de fuego (T-004) y de hielo (T-005): se entierra, duerme, se arma con cuenta atrás visible, la muerden, explota (o estalla en escarcha) o se apaga si la destruyen |
| `src/game/view/fusionDragView.ts` | Arrastre para fusionar (T-006): planta en la mano con su sombra, casillas de destino y rótulo (`DRAG_LOOK`, `dragGround`) |
| `src/game/view/wormView.ts` | Gusano, acorazado y escupidor (`KIND_LOOK`): sale del agujero, ondula, muerde o escupe, recibe golpes y explosiones, arde, tirita frenado, muere, se cuela y celebra. Al acorazado se le caen las placas con la vida. Acelerado (T-008), lleva rayas de velocidad. Pinta también el cuerpo del Creeper y su salto de carril (`jumpPose`). Interfaz común de las vistas de enemigos (`EnemyView`) |
| `src/game/view/creeperView.ts` | Creeper (T-008): `CreeperView` envuelve un `WormView` grande y añade el aviso del salto (diana, curva de puntos y "!"), sus frases en un bocadillo de terminal, la luz de la antena, la fase 2, el aterrizaje y la derrota. `CreeperOmen`: Creeper preparándose a la derecha (`OMEN_SPOT`) con su barra de "CARGANDO" (`bossLoadProgress`), chispazos a los agujeros y el salto al combate |
| `src/game/view/bulletView.ts` | Semilla en vuelo (normal, de fuego o de hielo), impacto y salida del tablero |
| `src/game/view/spitView.ts` | Escupitajo del escupidor en vuelo (T-007), impacto y salida del tablero |
| `src/game/view/entityInfo.ts` | Ficha de información (T-010), sin Phaser y con test: nombre, nivel, vida, datos, estados y cómo funciona de una disparadora (`shooterInfo`), una mina (`mineInfo`) o un enemigo (`enemyInfo`), con los números de las reglas. Números en español (`formatNumber`) |
| `src/game/view/portrait.ts` | Foto de la ficha (T-010): compone con las texturas ya pintadas la planta, la mina o el enemigo en reposo sobre un fondo de jardín (`portraitUrl`). Las texturas de cada enemigo, en `ENEMY_ART`. Sin fondo (`backdrop: false`), los dibujos recortados de los bocadillos de los tours (T-013) |
| `src/game/view/tourSpots.ts` | Qué señala un tour de ayuda en el tablero (T-013), sin Phaser y con test: casilla libre para sembrar o para una mina, una disparadora, una que se pueda infundir, una mina y su destino, dos que se puedan fusionar (`tourCells`) |
| `src/game/scenes/BoardScene.ts` | Cartas (sembrar e infundir), monedas, rondas y combate (avanza la partida y anima sus eventos), fusionar por arrastre, seleccionar y subir de nivel, doble clic para la ficha (T-010), resaltado, pausa, derrota y victoria, partida guardada y salida al menú (T-011) |
| `src/game/scenes/TitleScene.ts` | Portada del menú de inicio (T-011): el jardín animado con la cámara corrida para dejar sitio al menú, y `TitleCover` encima. Deja paso al tablero al pedir una partida |
| `src/game/view/titleCover.ts` | Batalla de la portada (T-011): reparto fijo, combate de verdad con todos fijos en su sitio e inmortales, y respuesta al clic (`COVER_LOOK`) |
| `src/game/scenes/sceneKit.ts` | Lo que comparten las dos escenas: cámara a pantalla completa (`fitCamera`, con desplazamiento opcional), filtros de Ultra (`applyPostFx`) y fps (`FpsMeter`) |
| `src/game/audio/sfx.ts` | Efectos de sonido (T-014, ADR-0013): el único que reproduce (`sfx.play`). Espera el primer gesto, descarga y decodifica los archivos, calla el jardín en pausa y lo suspende todo con la pestaña oculta o el aviso de girar |
| `src/game/audio/cues.ts` | Qué suena con cada evento del combate y de las rondas, con el tic de las minas y con lo que hace el jugador, sin Phaser y con test (`combatCues`, `roundCues`, `mineTicks`, `actionCue`) |
| `src/game/audio/voices.ts` | Cuánto suena, sin Phaser y con test: voces a la vez, separación, ráfagas, variación de tono y volumen, paneo (`VoiceGate`, `panAt`) |
| `src/game/config/audio.ts` | Cada efecto (`SfxId`) con su volumen, voces, separación, ráfaga, variación de tono y variantes (`SFX`), y la mezcla general (`AUDIO`) |
| `scripts/audio/` | De dónde sale cada sonido (`manifest.ts`), recetas de jsfxr (`sfxr.ts`) y quien fabrica los archivos (`build.ts`, `npm run audio`) |
| `public/audio/` | Los archivos que carga el juego (OGG y MP3) y `LICENCIAS.md` con el origen y la licencia de cada uno |
| `sonidos.html`, `src/dev/` | Página de prueba de los sonidos, solo con `npm run dev` |
| `src/icons/` | Icono del juego (T-028), sin Phaser y con test: el dibujo maestro de cada propuesta y forma (`iconArt.ts`, la elegida en `ICON`) y el contexto de Canvas que escribe SVG (`svgCanvas.ts`), para sacar la disparadora de su propio pintor |
| `scripts/icons/` | Quien fabrica los iconos (`build.ts`, `npm run icons`) y el PNG con paleta para los que pesan mucho (`png.ts`) |
| `public/favicon.*`, `public/apple-touch-icon.png`, `public/icons/` | Los iconos que enlaza `index.html` (y, con T-029, el manifiesto) |
| `iconos.html`, `src/dev/iconLab*` | Galería de propuestas del icono (T-028), solo con `npm run dev` |
| `disparadoras.html`, `src/dev/shooterLab*`, `src/dev/levelFlair.ts` | Galería de las formas de la disparadora (T-016), solo con `npm run dev`: vitrina, tablero y prueba de silueta. En "Niveles", propuestas de adorno para los tramos de nivel 5, 10, 15 y 20 (`levelFlair.ts`), sin decidir |
| `src/game/view/characters/` | Personajes de la historia (T-031, ADR-0019), sin Phaser: qué es un personaje y sus poses (`design.ts`), las piezas comunes de cara, cuerpo y manos (`kit.ts`), las propuestas de Boxer (`boxer.ts`) y de Patty (`patty.ts`), el catálogo para la galería (`catalog.ts`), la que usa el juego (`CAST` en `cast.ts`), su test de medidas y poses (`characters.test.ts`) y el retrato como imagen (`portraitImage.ts`) |
| `src/ui/story/` | Viñetas de la historia (T-031, ADR-0019): secuencias, quién habla y cuándo salen (`stories.ts`, con test), el texto letra a letra (`typewriter.ts`), quién las pone en marcha (`useStory`) y la viñeta (`StoryOverlay`) |
| `personajes.html`, `src/dev/characterLab*` | Galería de propuestas de Boxer y Patty (T-031), solo con `npm run dev`: las tres de cada uno con sus expresiones, y la viñeta de verdad a 1600 × 900, 812 × 375 y 568 × 320 |
| `src/ui/tour/` | Tours de ayuda (T-013, ADR-0012): qué tours hay y sus pasos (`tours.ts`), tours vistos (`tourProgress.ts`), dónde va el bocadillo (`placeBubble.ts`), velo, aros y bocadillo (`TourOverlay`), la mano (`TourHand`), los dibujos animados y Brotito (`TourPicture`), la pista de la moneda (`CoinHint`) y quién los pone en marcha (`useTours`) |
| `src/ui/` | HUD flotante (cartas con su precio, ronda con su cuenta atrás y su aviso en `RoundHud`, barra del jefe en `BossBar`, vidas, saldo), panel de nivel de la planta seleccionada (`LevelPanel`), ficha de información (`InfoPanel`, T-010), menú de pausa, ajustes (`SettingsPanel`, con el idioma), pantallas de derrota y de victoria, menú de inicio con su título, créditos y logo de Claude (`TitleScreen`, `TitleMenu`, `Credits`, `ClaudeLogo`, T-011), Invernadero y ruta de brotes (`Greenhouse`, `GreenhouseIcon`, `RouteMap`, con la colocación en `routeLayout`, T-019), quién juega y pantalla de jugadores con su avatar y la confirmación de borrar (`PlayerChip`, `PlayersPanel`, `PlayerAvatar`, `RemovePlayer` en `Players.tsx`, T-034), y aviso de girar la pantalla en un móvil en vertical (`RotateNotice`, `useLandscapeOnly`, ADR-0011) (React) |

## 3. Coordenadas y perspectiva

- La lógica trabaja en **coordenadas de tablero**, en unidades de casilla (`BoardPoint`). `x` avanza por las columnas y `y` por los carriles; el carril 0 es el del fondo. El centro de la casilla del carril 2 y la columna 3 es `{ x: 3.5, y: 2.5 }`.
- Nunca se calcula una casilla dividiendo píxeles. Para pintar se usa `perspective.toScreen(point)`. Para el puntero se usa `perspective.toBoard(...)` y luego `cellAt(...)`.
- Fuera del tablero también vale: `x < 0` es el camino, `x > 9` es el suelo corrupto. Así el decorado sigue la misma perspectiva.
- **Lo que está de pie** (plantas, enemigos, monedas, flores) se dibuja derecho, apoyado en su punto del suelo:
  - El origen va en los pies (`setOrigin(0.5, pieY / alto)`).
  - El tamaño sale de `perspective.cellWidthAt(punto)`, así que lo del fondo se ve más pequeño.
  - La profundidad es `entityDepth(y en pantalla)`, para que lo de delante tape lo de atrás.
  - Lleva una sombra en el suelo (`TEX.shadow`) con profundidad algo menor.
- **Dónde apoya cada cosa en su carril:**
  - Las plantas, en `carril + 0,62` (`PLANT_LOOK.footY`).
  - Los gusanos, en `carril + 0,64`: un pelo por delante, para que tapen a la planta que muerden.
  - Las balas vuelan a la altura del cañón del que salen (`barrelMuzzle`) sobre la línea de las plantas, con una sombrita en el suelo. Una semilla que se vuelve a pintar al cambiar la calidad no sabe de qué cañón salió y vuela a la altura del central.
- **Lo que mide en casillas pero se dibuja en píxeles de textura** (plantas, gusanos, semillas) usa 160 píxeles de diseño por casilla, el ancho de la textura de la disparadora.
- Velocidades y distancias de juego van en casillas por segundo y en casillas, en `balance.ts`.

## 4. Pantalla completa y decorado extra (ADR-0007)

- **Lo que siempre se ve:** el diseño de 1600 × 900. Todo lo jugable (césped, agujeros de los gusanos, lo que se pueda clicar) va dentro.
- **Lo que se ve según la pantalla:** alrededor hay mundo extra (`WORLD`): 360 por los lados, 360 arriba y 200 abajo.
  - En pantallas anchas se ve más jardín a la izquierda y más suelo corrupto a la derecha.
  - En pantallas altas se ve más cielo y un corte de tierra más hondo.
- **Todo decorado nuevo** (texturas fijas, partículas ambientales, nubes, bichos) cubre `WORLD`, no solo el diseño. Hay que comprobar que no se ve ningún borde recto ni ninguna zona vacía.
- **Lo que tapa el HUD:** la franja de arriba de la pantalla (bandeja de cartas a la izquierda, ronda en el centro, saldo y pausa a la derecha). Ahí solo va decorado. Por debajo de 1250 px de ancho la ronda baja a una segunda fila, y su aviso cuelga debajo unos segundos. Con menos de 860 px de ancho o 560 de alto (un móvil en horizontal), la ronda dice solo en cuál se está ("Ronda 3 de 10"), sin la fila de semillitas (T-012).
- **Lo que depende de la pantalla** se calcula con la cámara (`cameras.main.worldView`), nunca con 1600 × 900. Por ejemplo, las monedas vuelan a la esquina donde está el saldo.
- **Pausa:** congela la escena entera. Todo lo que pasa con el tiempo usa `this.time`, tweens y partículas de la escena; así la pausa lo congela sin código extra.
- **Solo en horizontal (ADR-0011):** en un móvil o una tableta en vertical (`(orientation: portrait) and (pointer: coarse)`) React tapa todo con el aviso de girar la pantalla (`RotateNotice`), el bucle de Phaser duerme (`setGameAsleep`) y la partida queda en pausa. Una ventana de escritorio estrecha no cuenta. Nada del juego se diseña para verse en vertical en un móvil.

## 5. Combate en pantalla (ADR-0008)

- **La escena no decide nada.** En cada `update` avanza la partida con `stepRound` y `stepCombat` (`src/game/core/`), anima los eventos que devuelven y recoloca las vistas. Ninguna vista mueve una entidad por su cuenta.
- **Cada entidad del estado tiene su vista:** los enemigos, las balas y los escupitajos se buscan por id; las plantas, por casilla. `sync(...)` recoloca la vista en cada fotograma.
- **Reacciones con valores sueltos.** Las reacciones de un gusano (salir, morder, golpe, retroceso) son valores `{ v: 0 }` que se animan con tweens y que `sync` aplica. Así una reacción nueva corta la anterior sin romper las demás.
- **Las que se van, se van solas.** Una vista que muere, se cuela o sale del tablero se quita del mapa en el acto y termina su animación sola.
- **Destello blanco:** `setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)` y, para volver, `clearTint()` (o el tinte que tuviera). En Phaser 4 el color y el modo del tinte van por separado.

| Evento | Cómo se anima |
|---|---|
| `shot` | La planta retrocede y se aplasta un instante. Fogonazo en la boca del cañón y la semilla nace ahí. Una planta de N cañones manda N eventos a la vez, uno por cañón (`cannon`, 0 es el de arriba), con fogonazos algo más pequeños |
| `hit` | La semilla revienta en jugo con un anillo lima pequeño (la de fuego, en brasas con un anillo naranja; la de hielo, en copitos con un anillo azul). El gusano destella en blanco, retrocede y pone cara de "ay" |
| `bulletGone` | La semilla se apaga mientras sigue un poco |
| `bite` | El gusano se echa atrás con la boca abierta y se lanza. La planta se encoge, destella, suelta hojas y amarillea según la vida que le queda. La mina se aplasta y destella |
| `plantDestroyed` | La planta se aplasta contra el suelo con hojas y tierra. La mina se hunde y su mecha se apaga con un hilo de humo: no explota |
| `mineArmed` | La mina abre los ojos de susto, salta, sale un "!", aparece la cuenta atrás ("2", "1") y su alcance en el suelo (sección 7) |
| `mineExploded` | Fuego: bola de fuego, llamas, brasas, humo, onda en el suelo del tamaño del alcance y chamuscado que se apaga. Los gusanos alcanzados saltan (`blasted`) y la cámara tiembla un poco. Hielo (T-005): destello helado, copos, esquirlas, vaho, onda azul, cristales que brotan del suelo y escarcha que se derrite. Los gusanos alcanzados se quedan tiesos con un destello azul y tiritan (`frosted`), y la cámara tiembla menos |
| `enemyKilled` | El gusano se infla, se encoge y se deshace en píxeles verdes y morados. Sale su moneda (`rewardKill`, con lo que da su tipo, T-009) |
| `enemyEscaped` | El gusano se mete bajo tierra en el camino. "−1 ♥", un temblor corto y React rompe un corazón |
| `spat` (T-007) | El escupidor se lanza hacia delante con un chorrito de moco en la boca y el escupitajo nace ahí, pequeño, y crece con un rebote |
| `spitHit` (T-007) | El escupitajo revienta en moco verde con un anillo. La planta o la mina reaccionan como a un mordisco |
| `spitGone` (T-007) | El escupitajo cae al camino y se desvanece |
| `attackStarted` (T-007) | Los agujeros brillan y sueltan píxeles, y salta "¡Ahí vienen!" junto a ellos, en los colores de la corrupción |
| `roundCleared` (T-007) | Las plantas dan un saltito en oleada, de izquierda a derecha, con destellos y "¡Ronda N superada!" en el centro del césped. Tras la última no sale: le sigue la victoria |
| Derrota | Las balas y los escupitajos se apagan y los gusanos saltan de contentos. A los 1,1 s React muestra la pantalla de derrota |
| Victoria (`won`, T-007) | Las balas y los escupitajos se apagan, las plantas saltan en oleada con "¡Creeper atrapado!" (T-008; antes de existir el jefe, "¡Jardín a salvo!"), y caen hojas y destellos por el césped. A los 1,6 s React muestra la pantalla de victoria |
| Enemigos acelerados (T-008) | Al salir en las rondas 8 y 9, Creeper (que se prepara a la derecha) parpadea y manda un chispazo de píxeles verdes y morados al agujero de cada carril, que brilla al llegar |
| `shout` (T-009) | Creeper, que se prepara a la derecha, se yergue de golpe, suelta píxeles y grita en su bocadillo de terminal ("¡ADELANTE, MIS ACORAZADOS!"). Su escolta sale acelerada, así que cada acorazado recibe su chispazo |
| `jumpWarned` (T-008) | El Creeper se agacha y tiembla (sale del estado, sección 7). Sale tierra a sus pies y un "!" sobre la diana del carril de destino. Una de cada dos veces suelta una frase ("¡HOP!", "¡POR AQUÍ!"…) |
| `jumped` (T-008) | Tierra, píxeles y una onda verde donde estaba. Sus copias salen del suelo ahí, con un destello y un anillo verdes de "copiarse" |
| `landed` (T-008) | Se aplasta contra el suelo y rebota, onda roja en el suelo (más encendida en la fase 2), tierra y un temblor de cámara. Lo golpeado reacciona como a un mordisco; si lo rompe, como `plantDestroyed` |
| `enemyKilled` del Creeper (T-008) | Se deshace como un gusano, con una explosión de píxeles mucho mayor, dos anillos y un temblor fuerte. Sus copias caen a la vez |
| `enemyEscaped` del Creeper (T-008) | Dice "¡NO ME ATRAPASTE!", se mete bajo tierra y sale "¡Se escapó!" en el camino, con un temblor fuerte. La derrota dice "¡Creeper se escapó!" |

- **Lo que dura, sale del estado, no de un evento.** La quemadura (`enemy.burn`), la ralentización (`enemy.slow`) y la cuenta atrás de la mina (`mine.fuseMs`) se leen en `sync`. Así una partida que se continúa (cambio de calidad) se pinta igual sin repetir eventos.

- **Varios efectos en el mismo sitio.** Varias plantas pueden dar a la vez al mismo gusano. Los efectos que se repiten mucho (impactos) van pequeños y translúcidos para no tapar la cara del enemigo.

## 6. Arrastrar y fusionar (T-006), o infundir con una mina (T-009)

- **Las reglas son de core.** Qué plantas sirven de destino (`fusionTargets`), por qué no se puede (`fusionBlocker`), cómo queda la planta (`fusedPlant`) y la fusión (`fusePlants`) están en `src/game/core/match.ts`. La escena solo lleva el puntero, pinta y anima.
- **Mientras se arrastra, el combate sigue.** La planta arrastrada sigue en su casilla: dispara y la muerden. Se ve medio transparente (`PLANT_LOOK.liftedAlpha`).
- **La planta en la mano:**
  - Flota `DRAG_LOOK.lift` sobre el suelo, lo bastante para no tapar a la planta de destino.
  - Sigue al puntero con un poco de retraso y se inclina hacia donde va.
  - Se agarra por donde se pulsó (`dragGround`).
  - Su sombra marca la casilla donde caerá y solo se pinta sobre el césped.
- **Destinos:**
  - Las casillas de las plantas con las que se puede fusionar se marcan en verde (laten) y esas plantas dan un saltito al empezar.
  - Las demás plantas se oscurecen (`PLANT_LOOK.dimTint`). Se oscurecen y no se transparentan, para que se sigan leyendo sobre el césped claro.
- **Casilla bajo la sombra:** verde si se puede soltar, roja si no. Encima, un rótulo que sube y baja: "Fusionar: N cañones", "Quedará en nivel N" en ámbar si cambia el nivel, y "Otra variante" o "Máximo 3 cañones" en rojo. Sobre una casilla vacía no se marca nada.
- **Soltar:**
  - **En un destino válido:** la regla se aplica en el acto. La de la mano se mete en la de destino. La de origen se estira hacia arriba y deja tierra. La de destino se aplasta, destella, cambia de textura y rebota (`PlantView.fuse`) con anillo, chispas, hojas, destello del punto nuevo y "¡Fusión!". Esta animación va sobre la figura (cuerpo y medallita) y no sobre el contenedor de reacciones: así un disparo o un mordisco a la vez no la cortan.
  - **En cualquier otro sitio:** la de la mano vuelve volando a su casilla y la de origen recupera su aspecto con un saltito.
- **Cancelar:** pausa, clic derecho, tomar una carta o perder la partida devuelven la planta. Si la de origen muere, la de la mano se deshace en hojas.
- **Con una mina (T-009).** Una mina que aún espera se arrastra igual que una planta: el mismo `FusionDragView` con otra figura en la mano (`carriedMine`; la planta es `carriedShooter`). Las reglas son de core (`mineInfusionTargets`, `mineInfusion`, `infuseWithMine`).
  - Se agarra por la mina (`MineView.contains`) o por su casilla, y en su casilla se queda medio transparente (`MineView.setLifted`). El cursor es la mano sobre una mina que se puede arrastrar.
  - Destinos: las disparadoras que se pueden infundir, en verde. Rótulo "Infundir con la mina", o "Infundir: mina + ×2 = 150" en una fusionada; en rojo, "Ya tiene fuego" o "No alcanza la moneda".
  - Al soltar en un destino, la de la mano se mete en la planta, la de la casilla se hunde en la tierra con brasas o copos sin explotar (`MineView.consume`) y la planta se infunde con su animación de siempre (`PlantView.infuse`).
  - Si la mina se arma mientras se lleva, vuelve a su casilla. Si la rompen o explota, la de la mano se deshace.
- **Capa:** la planta en la mano va casi arriba del todo (`DEPTH.floatText - 10`). Su sombra y las marcas de casilla van en la capa `highlight`.

## 7. Cartas, minas e infundir (T-004, T-005)

- **Las reglas son de core.** Qué pasa al soltar una carta en una casilla lo dice `cardPlay` (`match.ts`): sembrar o infundir, cuánto cuesta, por cuánto se multiplica el precio y por qué no se puede. `playCard` lo aplica. La escena no tiene reglas propias.
- **A qué apunta la carta.** La disparadora y las minas se siembran en la casilla del suelo bajo el puntero. Con una carta de elemento, si el puntero está sobre una disparadora (su cabeza asoma sobre la casilla de detrás), apunta a esa planta para infundirla.
- **Resaltado con una carta elegida:**
  - Sembrar: casilla clara con la planta o la mina fantasma. La mina, además, con su alcance de explosión pintado en el suelo (`drawArea`, del color de su elemento: `mineAreaColor`).
  - Infundir: casilla del color del elemento (naranja el fuego, azul el hielo) y rótulo "Infundir: 75" o "Infundir: ×3 = 225".
  - No se puede: casilla roja. Sobre una disparadora, el rótulo dice por qué: "Ya tiene fuego" o "Ya tiene hielo", o "Infundir: ×3 = 225" y "No alcanza la moneda".
- **Precio en el HUD (D-04).** Mientras la carta apunta a una disparadora que se puede infundir, la escena manda `cardPreview` y la carta muestra "×3 = 225" con un salto, en rojo y con un temblor si no alcanza. Soltar ahí no hace nada y la carta sigue elegida.
- **Infundir.** La regla se aplica en el acto. La planta se aplasta, destella, cambia a la textura de su variante y rebota (`PlantView.infuse`), con anillo y su texto. El fuego, con llamas que suben, brasas y "¡Fuego!"; el hielo, con copos que suben, vaho y "¡Hielo!". Desde entonces suelta una brasa (fuego) o un copo que cae (hielo) cada tanto, aunque no dispare.
- **La mina:**
  - Se siembra con un saltito, tierra y unas brasas (o copos). Dormida, respira despacio con los ojos cerrados.
  - Armada: cara de susto, punta de la mecha que suelta chispas (fuego) o copitos (hielo), número de cuenta atrás que salta en cada segundo, alcance en el suelo que late y un brillo cada vez más rápido, al rojo o azul helado. El brillo es un tinte aditivo (`TintModes.ADD`), no un destello blanco, para que la cara se siga leyendo.
  - Lo que cambia con el elemento (alcance, brillo, cuenta atrás, partículas de la punta) está en `ELEMENT_LOOK` de `mineView.ts`.
  - Explota o se apaga según el evento (sección 5). Destruida antes de tiempo, la de fuego se apaga con humo y la de hielo se deshace en vaho.
- **Gusano quemado.** Mientras `enemy.burn` existe: dos llamas titilan sobre la cabeza y el lomo, el cuerpo tira a rojo (tinte aditivo `WORM_LOOK.burnTint`) y cada 0,7 s pone cara de "ay" y suelta brasas, para que se vea que sigue perdiendo vida. Si muere quemado, queda tostado y humea.
- **Acorazado (T-007).** Es el gusano, un 12 % más grande, con casco de acero (`TEX.armorHelmet`, del tamaño de la cabeza para ir encima) y una placa por anillo (`TEX.armorPlate`), solapadas de la cola a la cabeza.
  - Las placas que lleva salen de su vida en `sync`: con el 75 % se le cae la primera, y así hasta la cuarta. Cada una sale despedida girando como una copia suelta, con esquirlas de acero (`fx.scrap`). En una partida continuada se quitan sin animar.
  - Mientras le quedan placas, cada semilla que le da saca un par de esquirlas. Al morir le sale volando el casco.
  - El destello, el quemado y el frío tiñen también la armadura.
- **Escupidor (T-007).** El mismo cuerpo en rosa chicle (`WORM_PALETTES.spitter`), con la boca de piñón y una gotita de moco colgando.
  - Mientras carga (los últimos 650 ms antes de escupir, `WORM_LOOK.spitChargeMs`) se yergue más que al morder e hincha los mofletes como globos (`TEX.spitterHeadCharge`).
  - El escupitajo (`SpitView`) sale de la boca aunque la lógica lo saque del centro, vuela bombeado a lo largo de su alcance y gira un poco. Moco con mezcla normal y contorno oscuro: sobre el césped, lo aditivo se quedaría blanco.
- **Creeper (T-008).** El cuerpo de un gusano 1,7 veces mayor, hecho de ordenador antiguo: cabeza de monitor de carcasa crema, visto un poco de lado, con la cara en la pantalla en fósforo verde (ojos con pupila de píxel y líneas de barrido) y una antena con luz roja; anillos de carcasa con rejilla y una lucecita verde.
  - Caras (`TEX.creeperHead*`): tranquila, mordiendo (y agachado o en el aire) y dolorida (ojos apretados y una franja de interferencia). En la fase 2, las mismas en rojo con cejas de enfado (`angryHead` en `KIND_LOOK`). Al pasar a la fase 2 echa humo, sale un anillo rojo, tiembla la cámara y dice "¡GRRR! ¡AHORA VAS A VER!".
  - **El salto sale del estado** (`jumpPose` en `wormView.ts`, con `Enemy.jump`): agachado, se aplasta y tiembla; en el aire, sube en curva entre los dos carriles (más alto cuanto más lejos salta), cambia de tamaño y profundidad con el carril y su sombra se encoge en el suelo.
  - **Aviso (J-01):** mientras se agacha, una diana roja late en el suelo del carril de destino, una curva de puntos avanza hacia ella por encima de las plantas y un "!" da saltitos sobre la diana. Mientras vuela, la diana se cierra donde va a caer.
  - **Bocadillo de terminal:** fondo de pantalla, borde y letras de fósforo (rojo en la fase 2), con un cursor que parpadea. Sigue a la cabeza; si a la derecha no cabe en la pantalla, se abre a la izquierda.
  - **Luz de la antena:** un brillo que parpadea, más deprisa en la fase 2. Solo con `quality.glows`.
- **Creeper preparándose (T-008, `CreeperOmen`).** En las rondas 8 y 9 y en la preparación de la 10, enroscado en `OMEN_SPOT` (suelo corrupto, detrás de los agujeros, dentro del diseño de 1600 × 900). Respira, cabecea, suelta píxeles (`ambientDelay`) y tiene un halo verde que late (solo con `quality.glows`). En su pantalla, "CARGANDO" y una barra que se llena con las rondas (`bossLoadProgress`). Al aparecer brota del suelo y dice "CARGANDO… ¡YA CASI ESTOY!". Al empezar el combate salta en curva al agujero del carril del centro y el Creeper de verdad sale del suelo al caer.
- **Enemigo con nivel (T-009).** El de nivel 1 se ve como siempre. Desde el 2 lleva en la nuca la medallita de las disparadoras (la misma textura, `medalTexture`, con sus colores por tramo) y es un 1,8 % más grande por nivel (`WORM_LOOK.medal` y `growthPerLevel`). La medallita va en el contenedor del gusano, sigue a la cabeza y se inclina un poco con ella; en el acorazado va sobre el casco. El Creeper no lleva.
- **Aura de los tramos de nivel (T-030).** Desde el nivel 5, los gusanos, acorazados y escupidores (también las copias de Creeper; Creeper no) llevan un aura muy suave del color de su medallita: plata (5 a 9), oro (10 a 14), rubí (15 a 19) y cristal (20, que recorre el arcoíris). Son velos de luz (`TEX.auraVeils`, pintados por `paintAuraVeil`) que suben del suelo por detrás del gusano, se encienden y se apagan un poco por encima de su cabeza, con un halo tenue a los pies, motas que suben y un velo casi invisible por delante. Cada tramo es algo más alto e intenso y lleva más velos. La crea y la mueve su `WormView` (`wormAura.ts`; tramo, medidas y pintor en `wormAuraArt.ts`, con test) sin tocar su dibujo: sigue a sus pies (`ground()`) y a su profundidad, avanza con lo que pasó desde el último `sync` (así se para con la pausa) y se apaga al morir o escaparse. Los velos van con transparencia normal: la luz aditiva sobre el césped verde cambiaría el color del tramo (el rubí saldría amarillo); el halo y las motas, aditivos si hay brillos. Por nivel gráfico (`QualityProfile.auras`): en Bajo no hay aura; en Medio, solo los velos de detrás y el halo; en Alto y Ultra, entera. Sale también en la portada y, quieta, en la foto de la ficha (`portrait.ts`). Se eligió entre cuatro propuestas en `/gusanos.html`.
- **Gusano acelerado (T-008).** Mientras `enemy.haste` es mayor que 1: rayas de velocidad verde neón con borde oscuro detrás de la cola (`TEX.hasteStreak`), que titilan mientras avanza y se apagan si se para. Ondula más deprisa sin código extra, porque ondula según lo que avanza.
- **Gusano frenado (T-005).** Mientras `enemy.slow` existe: cristales de escarcha en la nuca y la cola, el cuerpo tira a azul frío (tinte multiplicado `WORM_LOOK.chillTint`) y cada 0,9 s tirita y suelta un copo. Ondula más despacio sin código extra, porque ondula según lo que avanza. Si muere frenado (y no ardía), queda congelado y se rompe en esquirlas.
  - Quemado y frenado a la vez: se ven las llamas y la escarcha (no se tapan: llamas en la coronilla y el lomo, escarcha en la nuca y la cola), con el cuerpo azul.
- **Colores de efecto por variante.** El fogonazo del cañón y los destellos de fusionar o infundir salen de `VARIANT_FX` (`plantView.ts`): lima la normal, naranja la de fuego, azul claro la de hielo.
- **Llamas con mezcla normal.** Las llamas de partículas no son aditivas: sobre el césped claro se quedarían blancas. Las brasas sí, solo con `quality.glows`.
- **Hielo sin blancos.** Copos, esquirlas y vaho van con mezcla normal, y el copo (`TEX.snowflake`) lleva borde azul: un copo blanco liso no se leería sobre el césped claro.

## 8. Subir de nivel (T-003) y ficha de información (T-010)

- **Las reglas son de core.** Lo que cuesta y si se puede (`levelUpOffer`) y la subida (`levelUpPlant`) están en `src/game/core/match.ts`; el costo y lo que suma cada nivel, en `plants.ts` (`levelUpCost`, `levelBonus`). La escena selecciona, cobra en el acto y anima.
- **Seleccionar:**
  - Un clic sobre una planta sin arrastrarla (el arrastre empieza al moverse, sección 6). Otro clic sobre ella la deselecciona y un clic sobre otra la cambia.
  - Se cierra al hacer clic fuera de las plantas, con Esc o clic derecho, al tomar una carta, al empezar a arrastrar, si la planta muere y al perder.
  - La casilla se marca en dorado y late despacio (`LOOK.pickedColor`, capa `highlight`), y la planta da un saltito.
- **Panel (React, `LevelPanel`).** Es HUD: lo pinta React, no Phaser.
  - La escena le manda `plantPanel` con el nivel, el precio, si alcanza, el tramo de la medallita y cuatro puntos de la página: sobre la cabeza, bajo los pies y a cada lado del cuerpo (`right`, `left`, T-012). Lo reenvía cuando algo cambia, también si cambia la ventana: lo comprueba en cada `update` y solo avisa si cambió.
  - El panel va encima de la cabeza; si ahí choca con el HUD, bajo los pies; si tampoco cabe (un móvil en horizontal, en las filas de abajo), a un lado de la planta, a la derecha o a la izquierda. Siempre dentro de la pantalla, sin meterse bajo lo que del HUD le cae encima (bandeja, ronda y su aviso, marcadores), y con la flechita apuntando a la planta. Lo decide `placeLevelPanel` (`src/ui/levelPanelPlace.ts`, con test).
  - El botón manda `levelUpRequested`. Con la pausa se oculta.
  - Para pasar del mundo a la página: `worldToPage` en la escena, el inverso de lo que hacen las cartas (`cardCellAtPage`).
- **Al subir (`PlantView.levelUp`):**
  - La planta da un estirón y destella, sale un anillo dorado en el suelo con destellos, y la medallita sale girando con el número nuevo.
  - Si la medallita cambia de color, un anillo y un brillo mayores de su color.
  - En los niveles con premio (5, 10, 15 y 20, T-027), además le brota o le crece el jardincito a los pies (sección 10): el de antes se encoge y cada trozo nuevo sale con un salto y unas hojas.
  - Sin texto flotante: subiría por detrás del panel, que hace saltar la medallita y el nivel nuevos.
- **Premio en el panel (T-027).** Si el siguiente nivel da premio, el panel lo anuncia en dorado con un título que late ("¡Premio en el nivel 5!") y lo que suma debajo. En pantallas bajas (menos de 560 px de alto) solo el título, para que el panel no crezca hasta la bandeja. El título del botón dice lo que suma el siguiente nivel.
- **Medallita:** cómo se pinta, en la sección 10. Va dentro de la figura que respira (`PlantView`: contenedor de reacciones > figura > cuerpo y medallita), así no se despega de la cabeza al respirar, brotar ni rebotar. Al fusionarse se recoloca en la cabeza nueva y toma el nivel resultante.
- **Ficha de información (T-010).** Doble clic (o doble toque) sobre una disparadora, una mina o un enemigo, sin carta elegida: el juego queda en pausa y React muestra su ficha (`InfoPanel`). Se cierra con su botón, con Esc o haciendo clic fuera.
  - **Doble clic:** lo reconoce la escena (`checkDoubleTap`): dos pulsaciones sobre lo mismo en menos de `LOOK.doubleTap.ms` y sin moverse más de `LOOK.doubleTap.distance`. El primer toque hace lo de siempre (seleccionar una planta, por ejemplo), así que al cerrar la ficha su panel de nivel sigue ahí. Con una carta elegida el clic la juega y no abre fichas.
  - **Qué hay bajo el puntero** (`infoTargetAt`): lo que se ve ahí, y lo de delante tapa a lo de atrás, sea planta, mina o enemigo. Las vistas lo dicen con `contains`: la planta y la mina con su caja, el gusano con `WORM_LOOK.hitBox`, que sigue su postura y su tamaño (también en el aire). Si no hay nada, lo sembrado en la casilla.
  - **Datos:** los arma `entityInfo.ts` con las reglas de core (nunca números propios) y la escena los manda con `entityInfo`. React no calcula nada.
  - **Foto:** la escena la compone con las texturas ya pintadas (`portrait.ts`) y la manda como imagen; React solo la muestra. No se pinta arte nuevo para la foto: sale igual que en el tablero, con sus cañones, su elemento, su armadura, sus rayas de velocidad y su medallita. Cielo y loma de césped de fondo (de suelo corrupto con lucecitas para los enemigos) y un halo del color de lo fotografiado. Se guarda: la misma foto no se compone dos veces.
  - **Aspecto:** tarjeta del color de lo inspeccionado (`tone-*`: verde la planta, naranja el fuego, azul el hielo, morado el gusano, acero el acorazado, rosa el escupidor y fósforo Creeper). La foto es una polaroid algo torcida con un trozo de cinta, que cae girando. A la derecha, nombre y subtítulo, nivel con la medallita del panel de nivel (y su tope o su tramo de fuerza), corazón con la barra de vida que se llena al abrir, estados del momento en pastillas de color que saltan una tras otra (quemado, frenado, acelerado, mordiendo, contando...), los datos en dos columnas con la aclaración en pequeño debajo y cómo funciona.
  - En pantallas bajas (un móvil en horizontal) la foto encoge y la ficha se aprieta para caber sin desplazarse.

## 9. Capas

Orden de dibujo, de atrás hacia delante (`DEPTH` en `layout.ts`):

| Capa | Qué va |
|---|---|
| `sky`, `sun`, `clouds`, `birds` | Cielo y todo lo que pasa por él |
| `land` | Textura fija: colinas, ciudad, seto, laterales, césped, corte de tierra |
| `canopy` | Copa del árbol |
| `groundFx` | Efectos pegados al suelo: viento, sombras de nubes, brillos del suelo corrupto, rocío, haces de luz, chamuscado de una explosión, escarcha de la mina de hielo |
| `highlight - 1` | Alcance de una mina armada |
| `highlight` | Resaltado de casilla (y alcance de la mina que se va a sembrar), casilla de la planta seleccionada (T-003). Justo encima, la onda de una explosión y la diana del salto del Creeper (T-008) |
| `entities + y` | Plantas, enemigos, balas (`+0,5`, delante de su planta), sombras de las monedas soltadas, flores y cristales de la mina de hielo, ordenados por su `y` en pantalla |
| `pollen - 2`, `pollen - 1` | Chispazos de Creeper preparándose y curva de puntos del salto (T-008): pasan por encima de las plantas |
| `pollen`, `butterflies` | Partículas y bichos que flotan por encima |
| `foreground` | Matas del primer plano |
| `droppedCoins` | Monedas soltadas que esperan a que las recojan (T-010): siempre por encima de enemigos y matas, en el sitio donde cayeron, para que se vean y se puedan pulsar. Entre ellas, la de delante tapa a la de atrás (`+ y / 900`). Su sombra sigue en el suelo, con las entidades |
| `floatText - 10` | La planta que se arrastra para fusionar |
| `floatText - 4`, `floatText - 3` | "!" del aviso del salto y bocadillo del Creeper (T-008) |
| `floatText - 5` | Cuenta atrás de las minas: no la tapa una planta del carril de delante |
| `floatText` | Textos flotantes (+25), rótulos del arrastre y de las cartas, y monedas volando al marcador |

## 10. Cómo se pinta el arte

- Cada pieza es una función pintora en `textures.ts` que recibe un contexto de Canvas 2D y su **tamaño de diseño**. Se registra con una clave en `TEX`.
- **Estilo:**
  - Degradado radial con la luz arriba a la izquierda.
  - Contorno oscuro del mismo tono.
  - Un reflejo blanco suave.
  - Detalles tiernos: ojos con brillo, mejillas sonrosadas.
- **Paleta de referencia:**

  | Elemento | Colores |
  |---|---|
  | Planta | `#80d153`, contorno `#2a6b22` |
  | Moneda | `#ffd23f` a `#dc9d16`, borde `#b07a0e` |
  | Corrupción | verde neón `#39ff88`, morado `#b48cff` sobre `#2b2034` |
  | Fuego (T-004) | cabeza `#fff0b0` a `#ff8f3a` a `#e0401c`, contorno `#8a2410`, cañones `#ffd27a` a `#e2581f` con una brasa `#ffcf4a` dentro, brote `#ffb22e` |
  | Hielo (T-005) | cabeza `#f4fcff` a `#9fdcff` a `#4a9fd8`, contorno `#1f5a8a`, cañones `#e4f7ff` a `#6cbce8` con escarcha `#c8f4ff` dentro, brote `#d4f2ff`. Copos blancos con borde `#3f8fc8` |
  | Gusano | cabeza `#ead6ff` a `#b48cff` a `#7a4cc8`, contorno `#4a2a7a`, luces verde neón `#39ff88` |
  | Escupidor (T-007) | cabeza `#ffe6f3` a `#ff8cc6` a `#d8458f`, contorno `#7a1d4c`, labios `#ff5c9a`, luces verde neón. Moco `#f0fff6` a `#6dffad` a `#1cc066`, contorno `#0e6a3a` |
  | Armadura (T-007) | acero `#f5f9fd` a `#b4c5d6` a `#6d8399`, contorno `#2f4155`, remaches `#e8f0f8` |
  | Creeper (T-008) | carcasa `#fff7e2` a `#efe0bc` a `#c9b48a`, fondo `#b9a479`, contorno `#5a4528`. Pantalla `#123a24` a `#071a10` con fósforo `#39ff88`; en la fase 2, `#40101e` a `#1c050b` con fósforo `#ff5a7a`. Luz de la antena y diana del salto `#ff5a5f` (fase 2 `#ff2e63`) |

- Se ve un cañón por cada cañón de la planta, y el nivel se muestra con una medallita con número.
  - **Forma (T-016):** cada forma de la disparadora es un `ShooterDesign` en `src/game/view/shooters/`, sin Phaser: medidas de su textura y pies (`size`), cañones de arriba abajo con su boca (`barrels`), una marca por cañón (`marks`), dónde va la medallita (`medal`), el ojo (`eye`) y su pintor (`paint`, que recibe los cañones y la variante). El juego usa una sola, `SHOOTER` en `shooterShape.ts`; `registerTextures` pinta solo esa y `shooterTexture(cañones, elemento, forma)` da la clave de su textura. `PlantView` y la batalla de la portada aceptan otra forma: así la galería pinta las propuestas con las animaciones de verdad.
  - **Brote (`bulb.ts`, la del juego desde T-016):** un bulbo gordito sentado en la tierra, sin tallo, con raicillas, vetas de bulbo y un brote de hojas en la punta. Ojo grande mirando a la derecha, sonrisa y mejilla. Se eligió en la galería entre tres propuestas porque su silueta (una cebolla con brotes) no recuerda a ningún otro juego.
  - **La de antes (`legacy.ts`):** cabeza redonda sobre un tallo, guardada tal cual al empezar el rediseño (T-016), con sus medidas, sus colores y su pintor, para poder volver a ella cambiando `SHOOTER`. No se toca: sus colores son una copia y no dependen de los de las demás (`SHOOTER_COLORS` en `kit.ts`).
  - **Galería (`/disparadoras.html`, T-016):** solo con `npm run dev`. Compara todas las formas en vitrina (1, 2 y 3 cañones en sus tres variantes y en silueta, a tamaño de tablero), en el tablero de verdad y en una prueba de silueta sin nombres. Las propuestas no entran en `npm run build`: el juego solo importa la activa.
  - **Jardincito de los niveles con premio (T-027):** matas y flores a los pies de la disparadora en los niveles 5, 10, 15 y 20, sin tocar su dibujo y con los colores de la medallita: margaritas (plata), botones de oro (oro), un arbusto con bayas (rubí) y flores de cristal que destellan (cristal). Cada tramo tiene tres trozos (`GARDEN_PARTS`): dos detrás, a los lados, y uno pequeño delante, que desde el 15 sale también al otro lado (`gardenSpots`). Los de detrás van por debajo de la planta y los de delante por encima, sin tapar su centro. No va en el contenedor de la planta: se queda en el suelo aunque ella retroceda o respire. Se mece con fases distintas; los destellos, solo con `quality.extras`. Se oscurece con la planta mientras se arrastra otra (no se marchita) y se queda medio transparente si se arrastra ella. Sale en la foto de la ficha, más recogido (`PORTRAIT_GARDEN`). Se eligió en la galería entre cuatro propuestas; las otras tres (aura, luciérnagas y gemas) siguen en `src/dev/levelFlair.ts` para verlas combinadas con él en la vista "Niveles".
  - **Cañones:** la disparadora tiene una textura por número de cañones (`shooterTexture(1 | 2 | 3)`). En Brote cada cañón es un brote que sale del hombro del bulbo, sube, se dobla hacia los gusanos y termina en un capullo abierto (copa de hoja con dos pétalos hacia fuera y la boca en el centro); van de arriba abajo y abiertos en abanico. Sus medidas están en `SHOOTER_BARRELS` (los `barrels` de la forma), de donde sale también la boca de cada uno. Al fusionarse crece un poco: el bulbo engorda, le sale otro brote y una hoja más en la base y en la punta. La de 3 cañones lleva además una flor en la punta y una ceja decidida.
  - **Marcas:** una por cañón (`marks`). En Brote, el sitio del hombro por donde asoma cada brote; en la de antes, los puntos dorados del tallo. Al fusionarse destella la marca del cañón nuevo.
  - **Carta (`CardIcon`):** un Brote en miniatura en SVG, con los colores de la textura. Si cambia la forma, se redibuja a mano.
  - **Medallita de nivel (T-003):** un sello redondo con el borde ondulado, contorno oscuro y el número en blanco con borde, prendido en la nuca (arriba a la izquierda de la cabeza, medio fuera).
    - Una textura por nivel, del 2 al 20 (`medalTexture`), pintada por `paintMedal`. Las de nivel 1 no llevan.
    - Color por tramos (`MEDAL_TIERS`): bronce (2 a 4), plata (5 a 9), oro (10 a 14), rubí (15 a 19) y cristal irisado con dos destellos en el 20. El panel de React repite los mismos colores en CSS (`.medal-tier-N`).
    - El contorno oscuro hace que se lea sobre la cabeza normal, la de fuego y la azul clarita del hielo. Tamaño pensado para leerse en el carril del fondo.
    - `shooters/designs.test.ts` comprueba, para cada forma, que va en la nuca (arriba a la izquierda del ojo), dentro de su textura y sin tapar las marcas, el ojo ni los cañones, con 1, 2 y 3 cañones. Si cambia una forma, se cambia en su archivo de `shooters/` y el test lo vigila.
  - Las variantes de fuego y hielo (T-004, T-005) deben conservar los cañones y los puntos de cada textura.
  - **Variantes:** el pintor de cada forma recibe la variante y toma sus colores (Brote y las otras propuestas, de `SHOOTER_COLORS` en `kit.ts`; la de antes, de su copia en `legacy.ts`). Las hojas de la base son siempre verdes (y las raicillas de Brote, de tierra); cambian el cuerpo, los cañones, la boca, el brillo del fondo del cañón, el brote, la flor y la mejilla. `shooterTexture(cañones, elemento)` da la textura.
  - **Mina:** bulbo medio enterrado con un rabito de mecha (`MINE_SIZE` guarda pies, bulbo y punta de la mecha). `paintMine` recibe una paleta (`MINE_PALETTES`): guindilla con chispa (fuego) o bulbo escarchado con gorro de nieve y un copo (hielo). Una textura dormida y otra armada por elemento (`mineTexture`).
- **Escala de arte (obligatorio):** las texturas se pintan a la resolución del nivel gráfico.
  - Al crear una imagen, su escala se multiplica por `artInv()`.
  - Las partículas también: `scale: { start: 1 * artInv(), ... }`.
  - `setDisplaySize(...)` no lo necesita, porque fija el tamaño en pantalla.
  - Si una escala sale de `textura.width`, tampoco: ya incluye la resolución.
  - Los textos usan el estilo de la escena (`textStyle()`), que fija `resolution` para que no se vean borrosos en Alto y Ultra.
- `shadowBlur` de Canvas no lo escala el contexto: se multiplica por la escala de arte, como en `paintCorruptionGlow`.
- Lo que no se mueve va a una textura grande pintada una vez (cielo y terreno), no a cientos de objetos.
- Las texturas muy grandes se limitan a 4096 px (límite seguro de WebGL). Si el nivel pide más, bajan algo de resolución: sus imágenes se escalan con `artInvOf(clave)` en vez de `artInv()`.

## 11. Cómo se anima

- **Reposo:** `breathe(...)` hace un ida y vuelta infinito con `Sine.InOut`. Las plantas se aplastan y estiran un poco, y se mecen. Flores, matas y la copa del árbol se balancean con fases distintas (`delay` aleatorio) para que no vayan al unísono.
- **Entradas:** con rebote (`Back.Out`, `Elastic.Out`). Ejemplos: la planta brota de la tierra con un estirón y un puñado de tierra; la moneda sale despedida, cae con `Bounce.Out` y se queda flotando y girando.
- **Salidas:** encogerse o desvanecerse en 200–300 ms, nunca un `destroy()` en seco a la vista del jugador.
- **Respuesta a acciones:** cada acción del jugador tiene una respuesta visible: partículas, texto flotante (+29) o un vuelo al marcador. La regla se aplica en el acto y la animación es solo decorado.
- **Avisos:** lo que va a desaparecer avisa antes. La moneda soltada parpadea durante el último 30 % de su vida.
- **HUD y menús (React):** transiciones y animaciones CSS.
  - La bandeja y el saldo caen al empezar.
  - **Cartas de tamaño fijo (T-010):** todas miden lo mismo (`--card-w` × `--card-h` en `.seed-tray`: 148 × 46 px, o 86 × 44 en el HUD compacto), para poder cambiar en el futuro las que se llevan sin que la bandeja baile. El nombre se corta con puntos suspensivos si no cabe; el precio siempre cabe, también el de infundir ("×3 = 225"), que en el HUD compacto baja de tamaño y parte en dos líneas. Las ranuras vacías no se pintan: la bandeja solo enseña las cartas que hay.
  - Con menos de 860 px de ancho, las cartas pierden el nombre y el HUD se aprieta para que quepan tres cartas, vidas, saldo y pausa (probado hasta 568 px).
  - La carta elegida flota.
  - El saldo da un salto dorado al subir y rojo al bajar.
  - Los corazones de las vidas laten por turnos. El que se pierde se rompe y se apaga.
  - La pantalla de derrota entra como el menú de pausa, con un corazón que se parte en dos.
  - El panel de nivel (T-003) entra con un salto desde la planta. Al subir saltan la medallita y el nivel. Sin saldo, el precio tiembla al pulsar.
  - La ronda (T-007) cae con el resto del HUD. Su número salta al cambiar y la semillita de la ronda actual late. La cuenta atrás salta cada segundo y se pone roja en los tres últimos.
  - El aviso de la ronda entra con un salto, se queda 7 s y se va. Lo lleva una animación CSS que se congela con la pausa (`.app.is-paused`). Con `prefers-reduced-motion` lo quita un temporizador.
  - Una carta recién desbloqueada entra en la bandeja con un salto y brilla tres veces. La animación va en un envoltorio (`.card-slot`) y no en la carta, que ya anima su `transform` al estar elegida.
  - **Aviso de desbloqueo (T-009, `UnlockModal`).** Velo dorado con rayos que giran despacio detrás de la tarjeta, que tiene el borde dorado y un halo que late. "¡YA LO TIENES!" entra de un salto y un brillo le cruza las letras cada poco. Debajo, una fila por cosa nueva con su dibujo (los iconos de las cartas, `CardIcon`, que se balancean; una flecha dorada para subir de nivel y la medallita del tope) que entran una tras otra. Destellos como los de la victoria. El juego queda en pausa detrás (también se congela el aviso de una línea de la ronda).
  - En el tope de nivel de la ronda (T-009), el panel de nivel dice "Máximo" y, si el tope fuera a subir en otra ronda, lo dice en dorado ("Tope 5: sube en la ronda 7"). En el brote 1 el tope ya no sube (T-010).
  - **Ficha de información (T-010):** entra con un salto, la foto cae girando a su sitio, la barra de vida se llena y los estados saltan uno tras otro. El juego queda en pausa detrás. Detalle en la sección 8.
  - La pantalla de victoria entra como la de derrota, con una copa con un brote que salta y destellos que titilan.
  - **Jefe (T-008):** en la ronda del jefe la ronda dice "Combate final" y su semillita es una pantallita de monitor. La barra del Creeper (`BossBar`) entra con un salto bajo la ronda: monitor en miniatura que parpadea, nombre, fase y vida con una marca por umbral de salto (las gastadas, apagadas). Lo que pierde se queda un momento en claro y luego se va. En la fase 2 se pone roja y su halo late; derrotado, dice "¡Atrapado!".
  - El menú de pausa entra con un pequeño rebote.
  - La pantalla de carga muestra un brote que crece.
  - **Aviso de girar la pantalla (ADR-0011, `RotateNotice`):** fondo de la carga, un móvil de pie que gira con un rebote hasta ponerse de lado, con una flecha dorada curva que se dibuja marcando el sentido. El jardín de su pantalla (cielo, sol, brote y gusanito) está pintado en horizontal: de pie sale tumbado y apagado; al girar queda derecho, se ilumina y el brote salta. Debajo, "Gira la pantalla", la explicación y, si hay partida, "Tu partida te espera en pausa". Tapa también la pausa y la carga.
  - Con `prefers-reduced-motion` las animaciones CSS se apagan.
- **Duraciones orientativas:** reacciones de 150 a 450 ms, reposo de 0,9 a 3,5 s por ciclo y cielo de 15 a 120 s.

## 12. Niveles gráficos (ADR-0006)

Todo efecto nuevo se engancha a un ajuste del perfil (`QualityProfile`):

| Si el efecto es... | Usa |
|---|---|
| Partículas ambientales | `frequency: base / quality.particles`; con un temporizador propio, `fx.ambientDelay(base)` (brasas de la planta de fuego, chispas de la mecha) |
| Partículas de respuesta a una acción | `effectCount(base)` en la escena: menos en Bajo, nunca cero |
| Más o menos bichos, nubes, flores... | `amount(base, quality.life, mínimo)` |
| Un brillo aditivo (`BlendModes.ADD`) | Solo si `quality.glows` |
| Un adorno extra sin función (destellos, haces) | Solo si `quality.extras` |
| Un filtro de cámara o de objeto | Solo si `quality.postFx`, y solo filtros de una lectura por píxel |

- Prohibidos los filtros de muchas lecturas por píxel (bokeh, tilt-shift, blur grande) a pantalla completa.
- Hay que probar en **Bajo** (¿se sigue leyendo bien?) y en **Ultra** (¿aguanta y se ve mejor, no más oscuro?).
- Para medir: menú de pausa (Esc o P) > Ajustes > "Mostrar FPS".

## 13. Rendimiento

- **Presupuesto (T-002):** con 60 enemigos y 20 plantas, el juego sigue fluido en Medio.
- **Prueba de rendimiento:** en `npm run dev`, la tecla `H` siembra gratis las cuatro primeras columnas (20 disparadoras) y suelta 60 gusanos con mucha vida. Se mide con "Mostrar FPS".
- Medido el 19 nov 2026 en un equipo sin GPU (Chromium con render por software): el JavaScript ocupa un 5 % del tiempo, igual con la prueba que sin ella. Lo que cuesta es rellenar píxeles.
- El coste está en rellenar píxeles, no en JavaScript. Hay que evitar capas grandes transparentes: el cielo y el terreno ya se recortaron a lo que se ve.
- Un `Graphics` redibujado en cada frame solo para pocos polígonos (el viento dibuja 8).
- Los enemigos y las balas, si son muchos, conviene que sean imágenes de una textura compartida, no `Graphics`.
- Nada de `setInterval` ni `setTimeout` en escenas: usar `this.time` y los tweens, que se pausan y se limpian con la escena. La excepción es la medición de fps, que necesita tiempo real.

## 14. Menú de inicio y portada (T-011)

- **Dos escenas, un juego.** `TitleScene` (portada) y `BoardScene` (tablero) viven en el mismo juego de Phaser y pasan de una a otra con `scene.start`, sin volver a pintar texturas (ADR-0010). React pinta encima el título y el menú (`TitleScreen` con `TitleMenu`, o el Invernadero, T-019).
- **La portada es el jardín de siempre**, a toda pantalla, con `createAmbience` y los filtros de Ultra. La cámara se corre `shiftX` unidades a la derecha (`fitCamera`) para que el césped quede bajo el título y el menú tape sobre todo el suelo corrupto; nunca se sale del mundo pintado.
- **La batalla de la portada es el combate de verdad** (`TitleCover`): un reparto fijo (`CAST`) que avanza con `stepCombat`. Tras cada paso, cada enemigo vuelve a su sitio con la vida llena y lo sembrado recupera la suya. Los eventos se animan como en el tablero (sección 5), sin monedas ni vidas.
  - **Andar sin moverse:** el que no ataca ondula como si avanzara. `WormView.sync(enemy, stride)` suma a la onda lo que "anda" (`stride`, en casillas), sin cambiar dónde se pinta.
  - **Quién ataca:** el que muerde se coloca a su alcance de la planta y el escupidor a su distancia (`engagedX`); las minas, lejos de los enemigos para que no se armen solas.
  - **Al clic:** la disparadora dispara en el acto y da un saltito (`beckon`); el gusano se queja ("¡Ay!", jugo y destello); Creeper suelta una frase (`CreeperView.taunt`, `cover.creeperLines`); la mina se arma, explota con su regla y vuelve a brotar (`COVER_LOOK.mineRegrowMs`). Con el puntero encima, la mano.
  - Creeper dice su frase de entrada al salir y otra cada `COVER_LOOK.tauntEveryMs`.
- **Título (React).** "REBROTE" en letras gordas de hoja verde con contorno oscuro (texto con degradado recortado y `-webkit-text-stroke`), cada letra algo torcida (`--tilt`). Caen una tras otra con rebote y luego se mecen por turnos. De la "O" sale un brote en SVG que brota y se balancea. Debajo, el lema en un cartel de madera como la bandeja de cartas.
- **Menú (React).** Panel a la derecha con la tarjeta del menú de pausa, que entra deslizándose. Las opciones, los créditos y la confirmación de partida nueva salen en el mismo panel; si no caben, se desplaza con una barra fina. Sin el Invernadero, "Continuar" lleva debajo la ronda, las vidas, las monedas y cuándo se guardó; con él, "Al Invernadero" y la partida a medias que espera allí. En el pie, el selector de idioma corto y la versión.
- **Invernadero (React, T-019).** El mismo panel de la derecha. El título grande dice "INVERNADERO" ("GREENHOUSE" en inglés) en vez de "REBROTE": sus letras vuelven a caer al cambiar, el brote sale de su primera "O" y encoge con `--logo-fit` para que una palabra larga no se meta bajo el panel. Lo que aún no existe (tienda, plantas, el siguiente brote si no hay más) va con candado, apagado y sin sonido; la tienda y las plantas, en una fila de dos, que pasa a ser de tres con "Historia" delante cuando ya se vio alguna viñeta (T-031): así el panel, con la partida a medias, sigue cabiendo a 568 × 320. La casita de cristal en SVG (`GreenhouseIcon`) va en el botón de la victoria que lleva al Invernadero.
- **Jardín del Invernadero (Phaser, T-019).** La escena de portada cambia la batalla por las plantas que el jugador ya tiene, en calma y sin enemigos: una normal, una de nivel con su medallita y su jardincito, las fusionadas de 2 y 3 cañones, una de fuego, una de hielo y las dos minas, repartidas por las columnas 0 a 4 (`greenhouseCast`, con test; cada pieza sale solo si se tiene lo que pide). El terreno es otro (`TEX.gardenLand`, pintado la primera vez que se entra con `registerGardenLand`): césped liso y continuo con manchas suaves de luz y sombra, briznas, tréboles y florecillas, sin casillas, sin líneas y sin suelo corrupto, agujeros ni cables; el seto, todo verde, y el corte de tierra, sano. El ambiente va sin el brillo de los agujeros. Las plantas no están en el centro de su casilla (`nudge`) y cada disparadora tiene a sus pies un trozo de tierra removida (`TEX.soilPatch`) que se abre cuando brota: sembradas a mano. Al clic, la disparadora da su saltito con el sonido de sembrar y la mina se arma y explota. Al pasar de la portada al Invernadero, o al revés, la escena se funde con el verde oscuro del juego y vuelve a empezar: todo brota otra vez.
- **Ruta de brotes (React, T-019).** Un mapa ancho sobre el jardín desenfocado: cielo y una loma ondulada en SVG, sana (verde, con matas y flores) hasta pasado el lugar que toca y corrupta después (morada, con lucecitas y pistas de circuito neón que laten), como el suelo del tablero; el cielo se enturbia igual. El camino es de tierra con pasitos claros que avanzan hacia lo que toca; lo que viene, apagado y morado; el último tramo, punteado. Cada lugar es un cerco redondo con cielo y loma y el jefe dentro: el recorte lo manda la escena (`routeArt`), React no pinta enemigos. Superado: el jefe algo apagado y un sello de oro que cae; el que toca: borde dorado que late, el jefe que se mece y una flecha que salta encima; en sombra: el jefe en silueta (CSS) y un candado; por llegar: una interrogación que se balancea; el destino final: pequeño y alto, a lo lejos, con una torre oscura, un ojo neón que parpadea y bits que flotan. La partida a medias lleva un circulito naranja con la pausa. Los lugares entran uno tras otro. Dónde va cada uno lo decide `layoutRoute` (con test): siempre cabe la flecha encima y el nombre debajo, y con muchos lugares el mapa se desplaza y sigue al elegido. Los nombres van en una línea y se cortan con puntos si no caben.
- **Pantallas pequeñas en el Invernadero y la ruta:** con menos de 860 px de ancho o 560 de alto, todo más recogido, los botones de la ficha uno encima de otro y sin la línea de las teclas; con menos de 420 de alto, la tienda y las plantas sin su "Próximamente" debajo y la confirmación sin la línea de lo que se conserva.
- **Jugadores (React, T-034).** Arriba del menú de la portada, una fila que es un botón: el avatar del jugador, "Juega" en pequeño, su nombre y la pastilla "⇄ Cambiar". Abre la pantalla de jugadores en el mismo panel, con la flecha de volver como Opciones y Créditos: una fila por jugador que entran una tras otra (botón con avatar, nombre, jefes vencidos y última vez que jugó, y al lado la papelera rojiza), el activo con borde dorado y "Jugando", y debajo "+ Nuevo jugador" (apagado con el máximo). La confirmación de borrar dice qué se pierde, como la de partida nueva.
  - **Avatar (`PlayerAvatar`):** un brote en SVG sobre un montoncito de tierra, en un círculo con brillo del color del jugador según su número: 1 amarillo sol, 2 coral (con un capullo rosa) y 3 cielo (con una tercera hoja). El del activo se mece. No es una planta del juego: es un dibujo de menú, como el brote del título.
  - **Pantallas pequeñas:** con menos de 860 px de ancho, "Jugando" se queda en un punto dorado para que quepa el nombre. Con menos de 420 de alto, la fila de la portada pierde "Juega" y encoge; la lista aprieta filas, avatares y textos y quita la línea de debajo de "Nuevo jugador", y la confirmación pone sus dos botones en fila. Así el menú, los tres jugadores y la confirmación caben sin desplazarse a 568 × 320.
- **Créditos.** Una fila por crédito que entra una tras otra; la de Claude, en su terracota, con su logo (`ClaudeLogo`, la chispa dibujada con código) que respira.
- **Pantallas pequeñas:** con menos de 860 px de ancho o 560 de alto, el título y el panel encogen; con menos de 700 px de ancho, el lema se parte para no meterse bajo el panel; con menos de 420 de alto, se quitan el subtítulo del panel y la fecha de la guardada. En una ventana de escritorio en vertical, el panel baja y ocupa el ancho (en un móvil o una tableta en vertical sale el aviso de girar la pantalla, ADR-0011).

## 15. Tours de ayuda (T-013)

Detalle y porqué en el ADR-0012. Los pinta React encima del juego vivo; la escena dice qué señalar y qué hizo el jugador.

- **Cuándo salen.** Al empezar la preparación de una ronda que desbloquea algo (tras aceptar "¡YA LO TIENES!"), si la ayuda está encendida y ese tour no se vio en este navegador. En la ronda 1, lo básico. Esperan debajo de la pausa, la ficha, los avisos y el aviso de girar.
- **La preparación se para.** Mientras hay tour, `tourHold` hace que la escena no descuente la preparación (`advance`); el resto del juego sigue vivo para que el jugador pueda hacer el gesto. "¡Que vengan!" sigue funcionando y cierra el tour.
- **Velo y aros.** Un SVG a pantalla completa oscurece todo menos lo que se enseña (huecos con máscara). Alrededor de cada hueco, un aro dorado que late; los contornos (un carril, el borde del jardín) van con raya que avanza. Al hacer el gesto, los aros se ponen verdes y salta "¡Bien!". Nada de esto recoge clics.
- **Qué se señala.** Piezas del HUD con `data-tour` (cartas, saldo, vidas, "¡Que vengan!", el botón "Subir" del panel de nivel), medidas en cada fotograma. Lo del tablero lo elige `tourCells` y la escena lo manda ya en la página (`tourBoard`: elipses de casillas, plantas, minas y alcance de la explosión, y contornos). Si falta algo, el paso sale sin iluminarlo y sin mano: queda el bocadillo con su dibujo.
- **La mano.** SVG hecho con código (guante blanco, puño verde), con la punta del dedo justo en el punto. Toca (onda en la punta), toca dos veces o arrastra en curva, con un camino de puntos que avanza hasta una punta de flecha; al arrastrar una carta lleva su dibujo. Se aparta mientras el jugador tiene una carta elegida. En pantallas bajas mide 46 px en vez de 60.
- **Bocadillo.** La tarjeta de los menús con borde dorado y Brotito (una semillita con hojas que se mecen y ojos que parpadean) asomado por la esquina. A la izquierda, el dibujo animado del paso; a la derecha, "Ayuda · tour", los puntos de los pasos, una frase corta, "Saltar" y "Siguiente" (o "¡Entendido!" en el último). Lo coloca `placeBubble` (con test): junto a lo iluminado sin taparlo y, si puede, sin taparse con la mano, su camino, el HUD ni el panel de nivel.
- **Dibujos (`TourPicture`).** Un trocito de jardín de 128 × 92 donde el paso pasa en bucle de 2,8 s, sin palabras: la carta vuela y brota la planta, las semillas recorren su carril, el gusano suelta su moneda, cruza la raya y se rompe un corazón, sale la foto de la ficha, la mina cuenta y explota... Plantas, minas y el gusano son imágenes que compone la escena con sus texturas (`tourArt`, `portraitUrl` sin fondo); cartas, monedas, corazones y ondas son HUD. En pantallas bajas, al 70 %.
- **Pista de la moneda.** Sin velo ni pausa: un aro dorado alrededor de la moneda del suelo, la mano que la toca y un bocadillo pequeño encima (sobre el "+18" de la escena). La escena avisa con `coinDropped` (también si cambia la ventana) y `coinGone`.
- **Capa.** `z-index` 3: encima del HUD y del panel de nivel, debajo de la pausa, los avisos y el aviso de girar.

## 16. Sonido (T-014)

Detalle y porqué en el ADR-0013. El arte se pinta con código; el sonido sale de archivos (Kenney y jsfxr) que fabrica `npm run audio`.

- **Un solo módulo reproduce** (`sfx.play(id, pan)`). Nadie más usa Phaser ni Web Audio para sonar. Phaser va sin audio.
- **Lo decide una regla pura.** La escena pasa los eventos de cada paso a `combatCues` y `roundCues` y reproduce lo que devuelven; el tic de la mina sale del estado (`mineTicks`), como su número. Lo que hace el jugador suena en `emitAction` (`actionCue`), desde su casilla. Las vistas solo suenan con lo que sale de su `sync` y no es un evento: la voz y el rugido del Creeper.
- **Suena desde donde pasa.** El paneo sale de la columna en el tablero (`panAt`), nunca de los píxeles.
- **Sin saturar.** Una planta de 3 cañones suena como un disparo. Cada efecto tiene un máximo de voces, una separación mínima y una ráfaga: diez cosas iguales en el mismo instante suenan como unas pocas, escalonadas y con tonos algo distintos. Lo que no cabe no suena; nunca se corta uno que suena. Lo grande tapa lo pequeño: los que caen en una explosión no suenan aparte.
- **Pausa.** Lo del jardín se calla con un fundido corto y no suena nada nuevo; al reanudar sigue (la mina vuelve a hacer tic). Los botones de los menús siguen sonando. Con la pestaña oculta o el aviso de girar no suena nada.
- **Portada.** Solo suena lo que el jugador pulsa y lo que eso provoca (S-04). La batalla de fondo y las frases que Creeper suelta solo van calladas (`CreeperView.voiced = false`).
- **Botones de los menús.** Suenan todos con un solo oyente (`useButtonSounds`). Lo que ya suena por lo que hace (cartas, "Subir", "¡Que vengan!") lleva `data-silent`.
- **Archivos.** Mono, OGG Vorbis con respaldo en MP3, con el volumen igualado (`build.ts`). La mezcla entre efectos se ajusta con el `volume` de cada uno en `SFX`, no editando archivos.
- **Elegir de oído.** `npm run dev` y abrir `/sonidos.html`: cada efecto con el elegido y sus alternativas, y pruebas de carga con el combate de verdad. Para cambiar uno, se mueve la alternativa a `pick` en `scripts/audio/manifest.ts` y se pasa `npm run audio`.

| Momento | Efecto |
|---|---|
| Sembrar, infundir fuego o hielo, fusionar, subir de nivel | `sow`, `infuseFire`, `infuseIce`, `fuse`, `levelUp`; subir a un nivel con premio (5, 10, 15 y 20, T-027), `unlock` |
| `shot` (uno por planta) y `hit` | `shot`, `shotFire`, `shotIce`; `hit`, `hitFire`, `hitIce` y `hitArmor` (semilla normal en un acorazado) |
| `bite`, `spat`, `spitHit`, `plantDestroyed` | `bite`, `spit`, `spitHit`, `plantDestroyed` |
| `enemyKilled`, `enemyEscaped` | `enemyKilled` (más bajo que el disparo), `enemyEscaped`; el Creeper, `creeperDefeated` |
| Mina armada y cada segundo de su cuenta; `mineExploded` | `mineTick`; `fireExplosion` o `iceExplosion` |
| `jumpWarned`, `jumped`, `landed`, bocadillo de Creeper, fase 2 | `creeperWarn`, `creeperTakeoff`, `creeperLand`, `creeperTalk`, `creeperRage` |
| Moneda recogida del suelo (la que se cobra sola no suena, S-05) | `coin` |
| `attackStarted`, `roundCleared`, aviso de desbloqueo, derrota, victoria | `attackStarted`, `roundCleared`, `unlock`, `defeat`, `victory` |
| Botón de un menú | `button` |
| Habla un personaje en una viñeta (T-031), una de cada tres letras | `voiceBoxer`, `voicePatty` |

## 17. Icono del juego (T-028)

- **Es la disparadora del juego** sobre el cielo y el césped de la portada (W-03, elegida por Carmine entre cinco propuestas). No se dibuja aparte: `drawShooter` llama al pintor de la forma activa (`SHOOTER.paint`, de un cañón y sin elemento) con un contexto de Canvas que escribe SVG (`SvgCanvas`). Si la disparadora se redibuja o `SHOOTER` cambia, el icono la sigue con `npm run icons`; mientras no se pase, el test de `iconArt.test.ts` falla.
- **Un dibujo, cuatro formas** (`iconSvg`), todas en un lienzo de 512:
  - `tab`, la pestaña: sin fondo, con los contornos más gruesos (`SHOOTER_TAB_STROKE`) y sin lo semitransparente (vetas, brillo, mejilla), que a 16 px solo ensucia.
  - `tile`, icono de aplicación (192 y 512): ficha con las esquinas redondeadas.
  - `full`, iPhone (180): cuadrado, a sangre y sin canal alfa; iOS redondea las esquinas.
  - `maskable`, Android (192 y 512): a sangre, con la disparadora entera dentro del círculo central de radio 40 % (test).
- **El motivo se mide solo.** Lo que se pinta va ampliando una caja (con el grosor de los trazos) y la composición encaja esa caja en su margen o en la zona segura. El césped se coloca a la altura de los pies.
- **Archivos.** `npm run icons` pinta los SVG con ffmpeg (librsvg) y escribe `favicon.svg`, `favicon.ico` (32), `apple-touch-icon.png` y `icons/` en `public/`, que es lo que enlaza `index.html`. El lector de SVG de ffmpeg entrega los colores premultiplicados: el script lo deshace (`unpremultiply`) o los bordes salen oscuros. Cada PNG va sin pérdida; si pasa de 50 kB, con paleta de 256 colores que guarda el alfa de cada borde (`png.ts`), porque la de ffmpeg deja las esquinas dentadas. Dos pasadas dan los mismos archivos.
- **Color de tema** (`THEME_COLOR`, `<meta name="theme-color">`): el azul de arriba del cielo de la portada, `#2a80d2`.
- **Elegir viendo.** `/iconos.html` enseña cada propuesta en la pestaña clara y oscura, a 16, 32, 180 y 512 píxeles (16 y 32 también ampliados píxel a píxel), recortada como Android y en la pantalla de inicio de un iPhone. Para cambiar de icono se pone otra en `ICON` y se pasa `npm run icons`.

## 18. Viñetas y personajes (T-031)

Detalle y porqué en el ADR-0019. React pinta la viñeta encima del juego; el retrato lo pinta un pintor de Canvas 2D sin Phaser y React lo enseña como imagen.

- **Cuándo salen.** Lo dice `storiesAt` (`src/ui/story/stories.ts`): la apertura al empezar el brote 1 (preparación de la ronda 1, antes del tour), lo que cuenta Boxer al vencer a Creeper por primera vez (antes de la pantalla de victoria) y Patty al llegar al Invernadero (antes, lo de Boxer si quedó sin ver). Una secuencia vista (acabada o saltada) no vuelve a salir sola: va en `Progress.story`. En el Invernadero, "Historia" deja volver a verlas.
- **El juego espera.** En el tablero, la viñeta pone el juego en pausa como la ficha; los tours y la victoria esperan a que acabe. La pausa (P o la pestaña oculta) y el aviso de girar la tapan sin desmontarla: al volver sigue donde iba. Cambiar el idioma a mitad deja el texto nuevo entero.
- **La viñeta (`StoryOverlay`).** Velo oscuro sobre la escena, el busto de quien habla a la izquierda, apoyado en el borde de abajo, y a su lado un bocadillo de tebeo (crema, con el borde del color del personaje y un pico hacia él) con la placa de su nombre, el texto, los puntos de las viñetas, "Saltar" y "Seguir". El texto sale letra a letra (`TYPEWRITER`: 30 ms por letra y una pausa tras cada signo que corta la frase); lo que falta ocupa su sitio, así el bocadillo no salta. Un toque, un clic, Espacio o Intro lo completa y el siguiente pasa de viñeta; Esc o "Saltar" cierran la secuencia. El menú y el HUD de detrás quedan inertes.
- **Animación.** El velo aparece y se va con un fundido; el busto sube con un rebote al entrar quien habla, respira sin parar y da un saltito al cambiar de viñeta o de cara; el bocadillo entra de un salto; la flecha de "Seguir" empuja cuando el texto ya salió. Mientras habla abre y cierra la boca (cada 115 ms, callada en espacios y signos) y parpadea cada 3,4 s. Los cuatro fotogramas de cada cara (ojos y boca) van apilados, así cambiar de uno a otro no parpadea.
- **Tamaño.** Todo se mide con el sitio que tiene (`container-type: size`, unidades `cqh` y `cqw`): el busto mide el 52 % del alto (entre 140 y 420 px), el bocadillo ocupa lo que queda al lado (hasta 780 px) y el texto va de 14 a 26 px. Así se lee igual a 1600 × 900 que a 568 × 320, y la galería la enseña de verdad dentro de un marco de ese tamaño.
- **Voz.** Mientras sale el texto suena la voz de quien habla (`voiceBoxer`, `voicePatty`) una de cada tres letras (`voiceCue` en `cues.ts`). Va por el canal de los menús, porque el jardín está en pausa detrás; completar el texto de golpe no suena.
- **Cómo se pinta un personaje.** Busto de frente en un lienzo de 320 × 360 (`PORTRAIT_SIZE`), con la luz arriba a la izquierda y los ojos mirando un poco a la derecha, hacia el bocadillo. Mismo estilo que el resto (sección 10): degradado de piel y de ropa, contorno oscuro del mismo tono, reflejo suave, ojos grandes con brillo y mejillas sonrosadas. Las piezas comunes están en `kit.ts` (cara, orejas, cuello, hombros, ojos, cejas, narices, boca, mejillas, arrugas, gafas, mangas y puño que agarra algo). Lo que dice quién es va en la ropa y en la mano: las gafas y el portátil con pegatinas de Boxer, el tubo con un brote de Patty.
- **Expresiones (Y-04).** Normal (sonrisa tranquila), apurado (cejas de preocupación, ojos más abiertos, boca tensa o gritando y una gota de sudor) y contento (cejas altas, el párpado de abajo sube, sonrisa grande o riendo). Cada una con los ojos abiertos o cerrados y la boca abierta o cerrada: 12 fotogramas por personaje. `characters.test.ts` comprueba con el lienzo que escribe SVG que cada pose cabe en el retrato y que cada una cambia el dibujo.
- **Patty** (la de la bata, Y-02) lleva el pelo negro con un flequillo que le tapa parte de las cejas (las puntas bajan a distinta altura sobre ellas) y una flor rosa en el pelo.
- **Boxer** (Y-01) es un informático moderno: pelo oscuro con raya, barba completa con bigote (la barba deja libre la boca para que se lean los labios), gafas de pasta negras, sudadera negra con cremallera y un portátil con pegatinas (`BOXER_MIX`, mezcla de dos propuestas de la segunda ronda, que siguen en la galería como referencia). Las de la primera ronda se descartaron.
- **Galería (`/personajes.html`).** Solo con `npm run dev`. "Propuestas": las tres de cada personaje, animadas (hablando o no), con sus tres expresiones; la que usa el juego, con borde dorado. "Viñeta": la viñeta de verdad con las propuestas que se elijan, a 1600 × 900, 812 × 375 y 568 × 320, en español o en inglés. Las propuestas no elegidas no entran en `npm run build`: el juego solo importa `CAST`.

## 19. Listas de comprobación

### Enemigo nuevo
Ejemplos: el acorazado y el escupidor de T-007, en `wormView.ts` (`KIND_LOOK`).
- [ ] Forma y color propios que se lean de un vistazo, con cara simpática aunque sea un virus.
- [ ] Textura en `textures.ts`, con origen en los pies y sombra.
- [ ] Animaciones de entrada (sale del agujero de su carril, `SCENERY.holeX`), avance, mordisco, golpe recibido (destello o retroceso) y muerte (encoge y suelta partículas).
- [ ] Sus reglas están en `stepCombat` con su evento y su test; la vista, en un módulo como `wormView.ts`, sigue al estado en `sync` y anima cada evento (sección 5).
- [ ] Se mueve en coordenadas de tablero y se pinta con `toScreen`, `cellWidthAt` y `entityDepth`.
- [ ] Tiene su `reward` en `ENEMIES`, y al morir la escena llama a `rewardKill(punto, tipo)`.
- [ ] Con nivel (T-009): de nivel 2 en adelante lleva la medallita en la nuca y no le tapa la cara; desde el 5, el aura de su tramo (T-030), que sale sola si usa `WormView`.
- [ ] Su vida y su daño salen de `enemyMaxHp` y `enemyDamage`, que ya llevan la fuerza de todos y los tramos de nivel (T-010): nada de usar `ENEMIES[tipo].hp` como vida real.
- [ ] Tiene ficha (T-010): nombre, subtítulo y cómo funciona en `entityInfo.ts`, sus texturas en `ENEMY_ART` de `portrait.ts` para la foto, y su caja de doble clic (`contains`) le cubre cabeza y cuerpo.
- [ ] Partículas según el nivel gráfico; probado en Bajo y en Ultra.
- [ ] Se mueve con el reloj y los tweens de la escena: con el menú de pausa abierto se queda quieto.
- [ ] Suena: sus ataques y su muerte siguen la lista "Sonido nuevo" (si muerde o escupe como los de ahora, ya suena).

### Variante de planta nueva (fuego, hielo...)
- [ ] Una textura por número de cañones (1, 2 y 3) en cada forma de `shooters/`, con sus cañones (`barrels`) y sus marcas (`marks`). Se distingue de la normal por el color (paleta de la sección 10), no por la forma.
- [ ] Sus semillas salen de la boca de su cañón (`barrelMuzzle`) y se distinguen de las normales.
- [ ] Al fusionarse, `PlantView.fuse` pasa a la textura de su variante con los cañones nuevos.
- [ ] Se sigue leyendo marchita, oscurecida (mientras se arrastra otra planta) y medio transparente (mientras se arrastra ella).
- [ ] La medallita de nivel (T-003) no tapa las marcas, el ojo ni los cañones (`shooters/designs.test.ts`) y se lee sobre su cabeza.
- [ ] Su ficha (T-010) dice su nombre y lo que hace su elemento, y su foto sale con su textura (`entityInfo.ts`, `portrait.ts`).

### Elemento nuevo (mina e infusión, como el fuego de T-004)
- [ ] Colores en la paleta de cada forma de `shooters/` (la de siempre en `legacy.ts`, las propuestas en `SHOOTER_COLORS`) y colores de efecto en `VARIANT_FX`; `shooterVariant` y `mineTexture` dejan de caer en la normal.
- [ ] Texturas de su mina dormida y armada, con la mecha en `MINE_SIZE.tipX/tipY`.
- [ ] Semilla propia (`seedTexture`) e impacto propio en `BulletView`.
- [ ] Su efecto en el enemigo se ve a simple vista y sale del estado en `sync` (como `burn` en `WormView`).
- [ ] Su explosión en `MineView` y su infusión en `PlantView.infuse` (partículas y `INFUSED_TEXT`).
- [ ] Carta en el HUD con su icono en CSS.
- [ ] Ficha de su mina y de su disparadora infundida (T-010), con su foto.
- [ ] Probado en Bajo y en Ultra: sus partículas no se quedan blancas sobre el césped.
- [ ] Su disparo, su impacto, su explosión y su infusión suenan distinto de los demás elementos (lista "Sonido nuevo").

### Carta nueva (T-010)
- [ ] Cabe en el tamaño fijo de las cartas (`--card-w` × `--card-h`) con su nombre, su icono y su precio, también con el de infundir ("×3 = 225") y en el HUD compacto (860 y 568 px de ancho).
- [ ] No cambia el tamaño de las demás ni deja huecos: la bandeja solo pinta las cartas que hay.

### Mundo o escenario nuevo
- [ ] Pintores propios de cielo y terreno (o variantes), respetando `SKY_HEIGHT` y `LAND_TOP`, y cubriendo `WORLD` entero.
- [ ] Probado en 16:9, en una pantalla ancha (21:9) y en una alta (4:3): sin bordes rectos ni zonas vacías.
- [ ] Animación ambiental propia en un módulo como `ambience.ts`, con todos sus efectos enganchados al perfil de calidad.
- [ ] Si cambia la forma del césped, se cambia `LAWN` y los tests de `perspective.test.ts` siguen pasando.

### Efecto nuevo
- [ ] Aparece y desaparece con animación.
- [ ] Respeta `artInv()` y su ajuste de calidad.
- [ ] No bloquea ni retrasa la regla que acompaña.

### Mecánica nueva (T-013, regla 9 de `CLAUDE.md`)
- [ ] Su `Feature` en `rounds.ts` tiene su tour en `TOUR_OF_FEATURE` (sin él no compila). Si es un gesto sin ronda propia, una pista como la de la moneda.
- [ ] Pasos en `TOURS` (`src/ui/tour/tours.ts`): qué se ilumina, el gesto de la mano y qué cuenta como hecho. Pocos pasos (uno a tres) y una frase corta por paso.
- [ ] Lo que hace el jugador llega como `playerAction` desde la escena (con su `TourCue` en `cueOf`), para que hacerlo de verdad complete el paso.
- [ ] Lo que haya que señalar en el tablero, en `tourCells` (`view/tourSpots.ts`, con test) y en `emitTourBoard`; en el HUD, con `data-tour`.
- [ ] Su dibujo animado en `TourPicture`, con el arte de la escena (`tourArt`), no pintado en React.
- [ ] Frases en `tour.steps` de `es.ts` y `en.ts` (el test lo comprueba) y nombre en `tour.names`.
- [ ] Probado a 1600 × 900, 812 × 375 y 568 × 320: el bocadillo no tapa lo que señala, y si falta lo que señalar el paso sale igual.
- [ ] Suena (regla 10 de `CLAUDE.md`): su gesto y lo que provoca siguen la lista "Sonido nuevo".

### Sonido nuevo (T-014, ADR-0013)
- [ ] Su efecto en `SfxId` y en `SFX` (`src/game/config/audio.ts`): canal (`world` si es del jardín, `ui` si es de un menú), volumen, voces, separación, ráfaga, variación de tono y variantes. Si se repite mucho, bajo, corto y con pocas voces.
- [ ] Su fuente en `scripts/audio/manifest.ts`, con dos o tres alternativas: capas de Kenney (CC0) o una receta nueva en `scripts/audio/sfxr.ts`. Otra fuente o licencia se anota en el manifiesto y sale en `LICENCIAS.md`.
- [ ] `npm run audio` y, en `/sonidos.html`, se oye solo y en su prueba de carga. Lo elige Carmine de oído.
- [ ] Lo pide una regla de `cues.ts` con su test (o, si sale del estado y no de un evento, la vista con `sfx.play`). Nunca Phaser ni Web Audio directamente.
- [ ] Suena desde su columna (`panAt`) si pasa en el tablero.
- [ ] Con el menú de pausa abierto no suena; en la portada, solo si lo provoca un clic.

### HUD o menú nuevo (React)
- [ ] Probado en un móvil en horizontal (812 × 375 y 568 × 320): no se sale de la pantalla y no tapa lo que se juega.
- [ ] Si un tour lo puede señalar, lleva `data-tour` con su nombre en `HudTarget`.
- [ ] En un móvil en vertical no hace falta: sale el aviso de girar la pantalla (ADR-0011). Si va por encima de todo, va por debajo de ese aviso (`z-index` menor que 10).
- [ ] Si flota junto a algo del tablero (como el panel de nivel), se coloca con una función pura con test que lo mantenga dentro de la pantalla y fuera del HUD.

### Texto nuevo en pantalla (T-011)
- [ ] Sigue la lista de `docs/guias/idiomas.md`: en `es.ts` y en `en.ts`, leído con `text()` o `useText()`, y cabe en los dos idiomas.

### Personaje nuevo (T-031)
- [ ] Su archivo en `src/game/view/characters/` con un `CharacterDesign`: busto en 320 × 360, con las piezas de `kit.ts` y lo suyo (pelo, ropa, lo que lleva en la mano). Algo en la ropa o en las manos dice quién es, sin texto.
- [ ] Sus tres expresiones (normal, apurado y contento), con los ojos abiertos y cerrados y la boca abierta y cerrada: el test de `characters.test.ts` lo pinta todo, comprueba que cabe y que cada pose cambia el dibujo.
- [ ] Su color (`tone`) para la placa del nombre y el borde del bocadillo, distinto del de los demás.
- [ ] Sus propuestas en `catalog.ts` y en la galería (`/personajes.html`); la elegida, en `CAST`.
- [ ] Su id en `CharacterId`, su nombre en `story.names` de `src/i18n/` y su voz (`voice<Nombre>` en `SFX` y en el manifiesto, lista "Sonido nuevo").
- [ ] Probado en la viñeta a 1600 × 900, 812 × 375 y 568 × 320.

### Secuencia de viñetas nueva (T-031)
- [ ] Sus viñetas en `STORIES` (`src/ui/story/stories.ts`): quién habla, con qué cara y, si pide algo al jugador, su `prompt`. Pocas y cortas.
- [ ] Cuándo sale, en `storiesAt` (con su test) y en `STORY_ORDER` para volver a verla.
- [ ] Sus textos en `story.lines` y su título en `story.titles`, en los dos idiomas (lista "Viñeta nueva" de la guía de idiomas).
- [ ] La historia nunca explica controles: eso es de los tours. Quien la salte entiende el juego igual.
- [ ] Probada saltándola, con la pausa y el aviso de girar a mitad, y recargando: vista no vuelve a salir.

### Disparadora redibujada (T-028)
- [ ] `npm run icons`: el icono sale del pintor de la disparadora y el test de `iconArt.test.ts` falla hasta que se rehace.
- [ ] En `/iconos.html`, la propuesta "Disparadora" se sigue leyendo a 16 px en pestaña clara y oscura, y entera en el círculo de Android.

### Enemigo o planta nuevos en la portada (T-011)
- [ ] Si se quiere en la portada, se añade a `CAST` de `titleCover.ts`: el que ataca, a su distancia (`engagedX`); las minas, lejos de los enemigos.
- [ ] Probado en la portada a 1600 × 900 y a 568 × 320: se ve a la izquierda del menú y no lo tapa nada importante.
