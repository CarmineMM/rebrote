# [Arte] Suelo del tablero: adiós al césped a cuadros

- **Estado:** Pendiente
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
- El Invernadero ya usa otro terreno, un césped liso sin tablero a cuadros (ADR-0016, "El escenario del Invernadero").
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

| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| SU-01 | ¿Valen estas tres propuestas para la galería? | a) Sí; b) cambiar alguna | a) Sí. Si se cambia una, que la sustituta tampoco sea un césped con franjas: se parecería demasiado a lo de hoy | Carmine |
| SU-02 | ¿Cuál pasa a la fase 2? | A, B, C, una mezcla o ninguna | Se decide con la galería delante. De partida, A es la más segura y C la más propia | Carmine |
| SU-03 | ¿Cuánto se dibuja la casilla en el suelo? | a) Carriles y columnas, siempre a la vista; b) carriles claros y columnas apenas insinuadas | b) La casilla exacta ya se resalta al sembrar (`drawCell`). Menos cuadrícula es menos parecido | Carmine |
| SU-04 | ¿La portada cambia a la vez? | Sí o no | Sí: es lo primero que se ve y lo que se comparte | Carmine |
| SU-05 | ¿El Invernadero cambia? | a) Se queda con su césped liso; b) pasa al suelo nuevo | a) Ya no tiene damero. Solo se toca si desentona con la elegida | Carmine |
| SU-06 | Si el suelo elegido obliga a retocar efectos, ¿cómo se aprueba? | a) Se retoca sobre la marcha; b) lista de retoques antes de empezar la fase 2 | b) Así Carmine sabe cuánto crece la task antes de aceptarla | Carmine |
| SU-07 | ¿Se deja la pieza para un suelo por brote? | Sí o no | Sí, solo la pieza (elegir el suelo en un sitio). Los suelos de otros brotes son otra task | Carmine |

## 5. Criterios de aceptación

### Fase 1: propuestas

- [ ] `/proposals/suelo.html` enseña el suelo actual y las tres propuestas, con la cámara inclinada del juego y el decorado de alrededor.
- [ ] Cada propuesta se ve a 1600 × 900, 812 × 375 y 568 × 320.
- [ ] Sobre cada una hay, como mínimo: las cuatro variantes de la disparadora con 1 y 3 cañones, una mina de fuego y una de hielo, un muro, un gusano, un acorazado, un Lurker oculto, un Skipper con su sombra y una tropa con el tinte del brote 4.
- [ ] Unos botones lanzan sobre cada propuesta los efectos que más dependen del suelo: explosión de fuego con su chamuscado, estallido de hielo con su escarcha, un escupitajo, un verso y una moneda soltada.
- [ ] Se puede activar el resalte de sembrar sobre una casilla, para comprobar que se lee.
- [ ] Cada propuesta se ve también en una captura reducida, del tamaño de una miniatura al compartir el juego.
- [ ] La partida, la portada y los tours siguen usando el suelo actual.
- [ ] La fase 2 no empieza hasta que SU-02 esté respondida.

### Fase 2: sustitución

- [ ] El tablero de los brotes 1 a 4 usa el suelo elegido.
- [ ] La portada lo usa también (SU-04).
- [ ] No queda damero de dos tonos ni brillo por casilla en ninguna pantalla del juego.
- [ ] Se distinguen de un vistazo los 5 carriles, y se sabe en qué casilla cae una planta al sembrarla.
- [ ] Todo lo que se pinta sobre el suelo se lee igual o mejor que antes: plantas y sus variantes, minas, muro, tropas con y sin tinte, enemigos ocultos, proyectiles, sombras, marcas en el suelo, monedas, textos flotantes y resaltes de casilla.
- [ ] Los tours siguen señalando bien las casillas.
- [ ] Las fotos de la ficha de información y las imágenes de los tours no enseñan el suelo antiguo.
- [ ] El camino de la izquierda, el corte delantero y el suelo corrupto de la derecha empalman con el suelo nuevo sin costuras.

### Regla

- [ ] El suelo se elige en un solo sitio, como la forma de la disparadora, y el antiguo queda guardado para poder comparar.
- [ ] Las reglas, las medidas del tablero, el balance y las partidas guardadas no cambian.

### Calidad

- [ ] El arte se pinta por código (ADR-0004) y respeta los niveles gráficos (ADR-0006): en la calidad más baja el suelo se ve sin adornos y se juega igual.
- [ ] El suelo sigue siendo una textura fija: no se añade nada que se pinte en cada fotograma.
- [ ] Prueba de la captura: se enseña una captura del tablero a alguien ajeno al proyecto y se le pregunta a qué juego le recuerda. Se anota la respuesta en la task.
- [ ] `docs/guias/graficos.md` al día: cómo es el suelo, cómo se añade otro y qué hay que comprobar al cambiarlo.
- [ ] `/proposals/suelo.html` apuntada en `CLAUDE.md`, como las demás páginas de propuestas.
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
