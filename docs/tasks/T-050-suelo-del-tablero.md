# [Arte] Suelo del tablero: adiós al césped a cuadros

- **Estado:** En curso (fase 1 desde el 26 nov 2026)
- **Prioridad:** Alta
- **Tamaño estimado:** M (orientativo)
- **Depende de:** ninguna
- **Bloquea a:** ninguna
- **Origen:** conversación de diseño del 25 nov 2026 (revisión del parecido con otros juegos, 23 nov 2026)

## 1. Contexto

Quienes probaron el juego dicen que se parece a Plants vs. Zombies. La disparadora ya se rediseñó (T-016). Lo que más pesa ahora en la primera impresión es el suelo: un césped a cuadros claros y oscuros, en carriles, con el jardín de una casa. Carmine quiere cambiarlo para que el tablero sea propio, y quiere ver al menos tres propuestas antes de decidir.

Es el primer paso de la diferenciación visual. La bandeja de cartas, la mina y el muro quedan para después.

Hoy (comprobado el 25 nov 2026, en 0.17.5):

- El césped lo pinta `paintLawn` (`src/game/view/textures.ts:1190`): un damero de dos verdes (`#7fce5d` y `#70c051`, `textures.ts:1195`), un brillo en el centro de cada casilla ("césped recién cortado"), un degradado de profundidad, unas 3400 briznas, 22 florecillas y una rejilla fina entre casillas (`textures.ts:1238`).
- Forma parte de una textura fija, `TEX.land`, que `paintLand` pinta una sola vez (`textures.ts:868`) junto con las colinas, el seto, el bancal, el camino, el suelo corrupto y el corte de tierra. Cambiar el suelo no cuesta rendimiento.
- El tablero mide 5 carriles por 9 columnas y su forma en pantalla es `LAWN` (`src/game/view/layout.ts:51`), con la cámara inclinada (ADR-0005). Alrededor están el camino a la izquierda y el suelo corrupto a la derecha (`SCENERY`, `layout.ts:61`).
- Al sembrar, infundir o fusionar, la casilla se resalta por encima del suelo (`drawCell`, `src/game/view/boardMarks.ts:12`). Es decir: el jugador ya ve la casilla cuando la necesita, aunque el suelo no la dibuje.
- El Invernadero no enseña el suelo del tablero: desde T-036 es el refugio de noche, con suelo de tablas (`src/game/view/refuge.ts`). El césped liso que describe ADR-0016 ("El escenario del Invernadero", `TEX.gardenLand`) ya no está en el código (comprobado el 26 nov 2026).
- Mucho arte está afinado para leerse sobre césped claro. La guía de gráficos lo repite: llamas y copos con mezcla normal, escupitajo y verso con contorno oscuro, sombra del Skipper "solo sobre el césped", plantas que se oscurecen en vez de transparentarse (`docs/guias/graficos.md`, secciones 5 a 7).
- Cada vez que hubo que elegir un diseño se compararon propuestas en una página de desarrollo: `/proposals/disparadoras.html`, `/proposals/invernadero.html`, `/proposals/jefes.html`, `/proposals/bichos.html` y `/proposals/variantes.html`.
- Desde el brote 5 cambia el escenario (`docs/specs/03-ruta-de-brotes.md`): habrá más de un suelo.

## 2. Objetivos

- **Un suelo propio:** que una captura del tablero no recuerde a ningún otro juego.
- **Que se siga jugando igual de bien:** carriles y casillas se leen de un vistazo, y todo lo que hay encima se distingue.
- **Elegir viendo:** tres propuestas reales, pintadas por código, antes de tocar el juego.
- **Dejarlo preparado:** que el suelo sea una pieza intercambiable, porque del brote 5 en adelante habrá otros.

## 3. Alcance

**Incluye, fase 1 (propuestas):** página `/proposals/suelo.html` con el suelo actual y tres propuestas, cada una con plantas, minas, muro, tropas y efectos de verdad encima. El juego no cambia.

**Incluye, fase 2 (sustitución):** aplicar la elegida al tablero de los brotes 1 a 4 y a la portada; forma de elegir el suelo como se elige la disparadora; retoques de lo que deje de leerse; guía de gráficos al día.

**No incluye:** la bandeja de cartas, la mina, el muro y el proyectil (otras tasks); el resto del decorado (cielo, ciudad, seto, árbol); el suelo corrupto de la derecha; un suelo distinto por brote; cambios de reglas, de medidas del tablero o de balance.

### Las tres propuestas

| Propuesta | Idea | A favor | Riesgo |
|---|---|---|---|
| **A. Bancales del huerto** | Cada carril es un bancal de tierra labrada, con surcos a lo largo. Entre bancales, un pasillo estrecho de hierba o de tablones. Las columnas se marcan con estaquillas y cuerda de siembra | Es el huerto de un refugio. Los carriles, que es lo que importa al jugar, se leen mejor que hoy. Las plantas verdes resaltan sobre la tierra | El suelo pasa de verde claro a marrón: es el mayor cambio de color y puede pedir retoques en efectos |
| **B. Patio del refugio** | Losas de piedra irregulares, gastadas, con hierba y musgo en las juntas. Cada planta crece en un alcorque abierto entre las losas | Dice "refugio" sin explicarlo. La piedra clara tiene una claridad parecida al césped actual, así que casi nada pierde contraste | Unas losas siguen siendo una cuadrícula: hay que romperla con tamaños y juntas irregulares para que no parezca un tablero de mesa |
| **C. Red de raíces** | Tierra fértil y lisa, y sobre ella una red de raíces vivas, de un verde lima suave, que dibuja los carriles y se cruza en cada casilla. Son las raíces de las plantas de Patty | Es la más propia: es el reflejo del suelo corrupto de la derecha (raíces vivas contra circuitos) y de la IA, cuyo pelo de cables echa raíces. Encaja con el nombre del juego | La más difícil de dejar bonita y legible. Si las raíces brillan demasiado, compiten con los circuitos y con los efectos |

Las tres quitan el damero y el brillo de "césped recién cortado". Ninguna cambia la forma ni el tamaño del tablero.

## 4. Decisiones pendientes

| # | Pregunta | Opciones | Recomendación | Decisión |
|---|---|---|---|---|
| SU-01 | ¿Valen estas tres propuestas para la galería? | a) Sí; b) cambiar alguna | a) Sí. Si se cambia una, que la sustituta tampoco sea un césped con franjas: se parecería demasiado a lo de hoy | a) Sí, las tres (Carmine, 26 nov 2026) |
| SU-02 | ¿Cuál pasa a la fase 2? | A, B, C, una mezcla o ninguna | Se decide con la galería delante. De partida, A es la más segura y C la más propia | D, raíces al sol: la red de C con otros colores, pedida por Carmine al ver la galería (Carmine, 26 nov 2026) |
| SU-03 | ¿Cuánto se dibuja la casilla en el suelo? | a) Carriles y columnas, siempre a la vista; b) carriles claros y columnas apenas insinuadas | b) La casilla exacta ya se resalta al sembrar (`drawCell`). Menos cuadrícula es menos parecido | Con la galería delante: cada propuesta se pinta de las dos maneras, con un interruptor ("Columnas"). Al elegir D se quedó la de entrada, b), insinuadas (`FLOOR_GRID`); cambiarla es una línea (Carmine, 26 nov 2026) |
| SU-04 | ¿La portada cambia a la vez? | Sí o no | Sí: es lo primero que se ve y lo que se comparte | Sí (Carmine, 26 nov 2026). Además, la portada y el tablero comparten la textura del terreno (`TEX.land`) |
| SU-05 | ¿El Invernadero cambia? | a) Se queda con su césped liso; b) pasa al suelo nuevo | a) Ya no tiene damero. Solo se toca si desentona con la elegida | No aplica: desde T-036 el Invernadero es el refugio de noche, con suelo de tablas, y no enseña el suelo del tablero (comprobado el 26 nov 2026) |
| SU-06 | Si el suelo elegido obliga a retocar efectos, ¿cómo se aprueba? | a) Se retoca sobre la marcha; b) lista de retoques antes de empezar la fase 2 | b) Así Carmine sabe cuánto crece la task antes de aceptarla | Carmine pidió el reemplazo directamente al elegir D, sin lista previa. Los retoques que hicieron falta van en el seguimiento (26 nov 2026) |
| SU-07 | ¿Se deja la pieza para un suelo por brote? | Sí o no | Sí, solo la pieza (elegir el suelo en un sitio). Los suelos de otros brotes son otra task | Sí, solo la pieza (Carmine, 26 nov 2026) |

## 5. Criterios de aceptación

### Fase 1: propuestas

- [x] `/proposals/suelo.html` enseña el suelo actual y las tres propuestas, con la cámara inclinada del juego y el decorado de alrededor.
- [x] Cada propuesta se ve a 1600 × 900, 812 × 375 y 568 × 320.
- [x] Sobre cada una hay, como mínimo: las cuatro variantes de la disparadora con 1 y 3 cañones, una mina de fuego y una de hielo, un muro, un gusano, un acorazado, un Lurker oculto, un Skipper con su sombra y una tropa con el tinte del brote 4.
- [x] Unos botones lanzan sobre cada propuesta los efectos que más dependen del suelo: explosión de fuego con su chamuscado, estallido de hielo con su escarcha, un escupitajo, un verso y una moneda soltada.
- [x] Se puede activar el resalte de sembrar sobre una casilla, para comprobar que se lee.
- [x] Cada propuesta se ve también en una captura reducida, del tamaño de una miniatura al compartir el juego.
- [x] La partida, la portada y los tours siguen usando el suelo actual.
- [x] La fase 2 no empieza hasta que SU-02 esté respondida.

### Fase 2: sustitución

- [x] El tablero de los brotes 1 a 4 usa el suelo elegido.
- [x] La portada lo usa también (SU-04).
- [x] No queda damero de dos tonos ni brillo por casilla en ninguna pantalla del juego.
- [x] Se distinguen de un vistazo los 5 carriles, y se sabe en qué casilla cae una planta al sembrarla.
- [ ] Todo lo que se pinta sobre el suelo se lee igual o mejor que antes: plantas y sus variantes, minas, muro, tropas con y sin tinte, enemigos ocultos, proyectiles, sombras, marcas en el suelo, monedas, textos flotantes y resaltes de casilla.
- [x] Los tours siguen señalando bien las casillas.
- [x] Las fotos de la ficha de información y las imágenes de los tours no enseñan el suelo antiguo.
- [x] El camino de la izquierda, el corte delantero y el suelo corrupto de la derecha empalman con el suelo nuevo sin costuras.

### Regla

- [x] El suelo se elige en un solo sitio, como la forma de la disparadora, y el antiguo queda guardado para poder comparar.
- [x] Las reglas, las medidas del tablero, el balance y las partidas guardadas no cambian.

### Calidad

- [ ] El arte se pinta por código (ADR-0004) y respeta los niveles gráficos (ADR-0006): en la calidad más baja el suelo se ve sin adornos y se juega igual.
- [x] El suelo sigue siendo una textura fija: no se añade nada que se pinte en cada fotograma.
- [ ] Prueba de la captura: se enseña una captura del tablero a alguien ajeno al proyecto y se le pregunta a qué juego le recuerda. Se anota la respuesta en la task.
- [x] `docs/guias/graficos.md` al día: cómo es el suelo, cómo se añade otro y qué hay que comprobar al cambiarlo.
- [x] `/proposals/suelo.html` apuntada en `CLAUDE.md`, como las demás páginas de propuestas.
- [ ] `npm test` y `npm run build` pasan.
- [ ] Versión subida (regla 12) y línea nueva en `CHANGELOG.md`.

## 6. Casos límite y riesgos

- **El riesgo principal es la legibilidad.** Buena parte del arte está afinado para un césped claro. Un suelo oscuro o marrón puede apagar las llamas, el escupitajo, las sombras o la silueta de los ocultos. Por eso la galería pone todo eso encima de cada propuesta antes de decidir.
- **La task puede crecer.** Si la elegida obliga a retocar muchos efectos, se lista antes (SU-06) y, si hace falta, los retoques van en otra task.
- Disparadora verde sobre suelo verde: hoy contrasta por el contorno. Un suelo de tierra o de piedra la hace resaltar más; uno de raíces verdes, menos.
- Tropas con el tinte del brote 4 (grises y oscuras): comprobar que no se pierden sobre tierra oscura.
- Personas que distinguen mal los colores: los carriles no pueden distinguirse solo por el color.
- Pantallas anchas y decorado extra (ADR-0007): el suelo nuevo tiene que llegar donde llega el actual.
- La cinemática de la rebelión (T-049) y las viñetas se ven sobre el tablero oscurecido: revisar que no enseñen el suelo antiguo.
- **Un suelo distinto no basta para dejar de parecerse.** Quedan la bandeja de cartas, la mina y el muro. Esta task es la primera, no la única.
- Riesgo de cariño: el jardín actual es alegre. Una tierra muy oscura cambia el ánimo del juego; la galería tiene que enseñar el tablero entero, no solo un trozo de suelo.

## 7. Objetivo final con ejemplos

- **Captura del tablero en la ronda 5 del brote 1, enseñada a tres personas:** ninguna nombra otro juego por el suelo.
- **Jugador que siembra en la tercera casilla del carril 2:** sabe dónde va a caer la planta antes de soltar.
- **Explosión de una mina de fuego:** la llamarada y el chamuscado se ven igual de bien que hoy.
- **Lurker oculto cruzando el tablero:** su silueta que tiembla se distingue del suelo.
- **Calidad gráfica en "bajo", en un móvil a 568 × 320:** los cinco carriles se distinguen.
- **Partida guardada antes del cambio:** carga y sigue, con el suelo nuevo.
- **Error que no debe pasar:** una propuesta que solo cambia el damero por franjas de césped a lo largo. Sigue siendo un césped a rayas.

## 8. Cómo probarlo (QA)

1. Abrir `/proposals/suelo.html` y comparar las tres propuestas con el suelo actual, en los tres tamaños.
2. Lanzar todos los efectos sobre cada una y activar el resalte de sembrar.
3. Hacer la prueba de la captura con alguien ajeno al proyecto.
4. Tras la fase 2, jugar el brote 1 entero y las tres primeras rondas del brote 3 (ocultos y Skipper).
5. Mirar la portada, un tour, la ficha de una planta y la cinemática de la rebelión.
6. Repetir en un móvil en horizontal con la calidad más baja.

## 9. Seguimiento

### Fase 1 (26 nov 2026)

- **La pieza.** El suelo es un `FloorDesign` en `src/game/view/floors/`, como la forma de la disparadora, y el juego usa el que elige `FLOOR` en `src/game/view/boardFloor.ts` (SU-07). El de siempre se guardó tal cual en `floors/legacy.ts` (era `paintLawn` de `textures.ts`). Sigue en el juego: la textura del terreno sale idéntica píxel a píxel (comparada antes y después del cambio, 2900 × 1063 en Alto).
- **Las propuestas.** A, bancales (`beds.ts`); B, patio (`patio.ts`); C, raíces (`roots.ts`). Cada una se pinta con las columnas insinuadas o a la vista (SU-03). Su geometría (bancales, losas, red de raíces) sale de funciones puras con test (`floors.test.ts`): lo que se apoya en un carril cae en su carril, las losas no cruzan columnas con las columnas a la vista y las raíces se paran antes del suelo corrupto.
- **La galería.** `/proposals/suelo.html` (`src/dev/floorLab.tsx` y `floorLabScene.ts`), con todo lo que piden los criterios. Detalle en `docs/guias/graficos.md` (sección 10 y lista "Suelo nuevo o cambiado") y en `CLAUDE.md`.

**Primeras observaciones** (en la VM sin GPU, a confirmar con la galería delante; son la base de la lista de retoques de SU-06):

- Los cinco carriles se leen en las tres propuestas, también en Bajo y a 568 × 320. A, por los pasillos de hierba y la tabla de cada bancal; B, por los bordillos; C, por las raíces. En miniatura, A se lee como un huerto a rayas de tierra, B como un patio gris con hoyos, y en C las raíces casi desaparecen a 160 × 90.
- **B (piedra clara):** el resalte de sembrar (crema, `highlightOk`) casi no se ve sobre la piedra. Habría que retocarlo si se elige B. La escarcha de la mina de hielo (un brillo azul claro) también se pierde algo; los cristales y los copos, con su borde azul, sí se leen.
- **A y C (tierra):** el chamuscado de la mina de fuego (una sombra marrón oscura) apenas se ve sobre tierra; las llamas, sí. Sobre tierra se leen mejor que sobre el césped las plantas verdes (también la planta fantasma del resalte de sembrar, que sobre el césped casi se pierde) y la escarcha, sobre todo en C.
- El Lurker oculto (silueta morada oscura) se lee en los cuatro suelos: mejor sobre los claros (césped y piedra) que sobre tierra.
- **Las cuatro:** las matas y flores del jardincito de los niveles con premio (T-027) se pensaron para el césped. Sobre tierra o piedra se leen bien, pero quedan como un parterre: decidir si es lo que se quiere.
- Sin probar aún con GPU de verdad: el viento (una franja de luz que barre el suelo) y el rocío de `ambience.ts` sobre tierra y piedra, en Alto y Ultra.

**Propuesta D (26 nov 2026).** A Carmine le gusta C pero no sus colores: D es la misma red de raíces (`SUNNY_ROOTS_FLOOR`, la paleta en `RootsPalette` de `roots.ts`) con tierra clara de arena dorada, de una claridad parecida al césped de antes, y raíces de un verde vivo y saturado, un 30 % más gruesas. En la galería se leen bien los carriles, el resalte de sembrar, la planta fantasma, las llamas y la escarcha.

**Propuesta E (26 nov 2026).** Carmine pidió una quinta, distinta de las demás, con libertad creativa: la placa reconquistada (`reclaimed.ts`). El tablero es una placa de circuito vieja tirada en el jardín, que las plantas han hecho suya: barniz verde, un bus de cobre dorado por cada línea entre carriles (los dibuja, también por claridad), una vía donde lo cruza cada columna, pistas finas detrás de lo que se apoya, serigrafía blanca y musgo, hiedra y florecillas por encima. Encaja con la historia (los virus de ordenadores antiguos) y es lo contrario del suelo corrupto: el jardín se come la tecnología, sin neón ni morado. Riesgo: que, al ser también un circuito, se confunda la parte sana con la corrupta; en la galería se distinguen por el color (verde y cobre frente a morado y neón).

**Pendiente para empezar la fase 2:** SU-02 (cuál pasa: A, B, C, D o E), SU-03 (columnas insinuadas o a la vista) y SU-06 (cómo se aprueban los retoques), con la galería delante.

### Fase 2 (26 nov 2026)

- **D en el juego.** `FLOOR` es `SUNNY_ROOTS_FLOOR` y `FLOOR_GRID`, `hinted` (`src/game/view/boardFloor.ts`). Como el suelo va en la textura del terreno, lo usan a la vez el tablero de los cuatro brotes, la portada, el catálogo y las galerías. El césped a cuadros queda guardado en `floors/legacy.ts` y se ve en la galería.
- **Retoques.** La foto de la ficha pintaba una loma de césped: ahora sale del suelo del juego (`swatch` de cada suelo, en `FloorDesign`), arena con una raíz verde que la cruza. El dibujo de los bocadillos de los tours (`.tour-pic`) pasa a arena con una raíz. En la galería, el terreno del juego ya no es el de siempre: cada suelo pinta el suyo (`registerFloorLand`).
- **Comprobado en la VM sin GPU:** la portada, el tablero de una partida nueva con la historia y el primer tour (la mano señala bien la casilla), la foto de la ficha y la galería con todo encima (efectos, resaltes, 812 × 375 en Bajo). Nada más hizo falta retocar: el resalte de sembrar, las plantas, la escarcha, las llamas y el Lurker oculto se leen.

**Falta para cerrar la task:** la prueba de la captura con alguien ajeno al proyecto; jugar el brote 1 entero y las tres primeras rondas del brote 3 en un equipo con GPU y en un móvil en horizontal con la calidad más baja (QA, puntos 4 a 6); mirar el viento y el rocío en Alto y Ultra; y, al cerrarla, subir la versión (parche) con su línea en `CHANGELOG.md`.
