# ADR-0016: Invernadero y ruta de brotes como vistas de React sobre la portada

- **Estado:** Aceptada
- **Fecha:** 2026-11-21

## Contexto

Hasta T-019 el flujo de pantallas era el del ADR-0010: portada (menú de inicio) ↔ tablero. La portada tenía "Nueva partida", "Cargar partida", "Opciones", "Jefes" (desactivado, "Próximamente") y "Créditos", y la victoria ofrecía "Jugar otra vez" y "Menú principal". Con varios brotes (ADR-0015) y el progreso permanente (ADR-0014) hacía falta un sitio entre un brote y el siguiente para elegir brote y, más adelante, comprar (T-022) y mejorar plantas (T-023).

Decisiones de diseño (R-01 a R-04, cerradas el 21 nov 2026 con la recomendación): el Invernadero aparece al vencer a Creeper; en la portada, "Continuar" lleva al Invernadero y "Jefes" desaparece; la ruta enseña los vencidos, el actual, el siguiente en sombra y el destino final; y la pantalla se llama Invernadero.

Condiciones previas:
- React pinta menús y Phaser el tablero; lo que React tenga que enseñar de una entidad llega como imagen desde la escena (regla 3 de `CLAUDE.md`).
- Pasar de la portada al tablero no recrea el juego (ADR-0010).

## Opciones

### Dónde vive el Invernadero

| Opción | A favor | En contra |
|---|---|---|
| Una escena de Phaser propia | Escenario propio | Otra escena que mantener; es un menú, y los menús son de React |
| Una vista de React sobre la escena de portada | El jardín animado sigue detrás; nada nuevo en Phaser; mismo panel que el menú de la portada | Comparte la portada (aún no hay escenario propio) |

### Cómo se pinta la ruta

| Opción | A favor | En contra |
|---|---|---|
| Dibujada en Phaser | Arte del juego directamente | Un menú en el lienzo: textos, foco y teclado a mano |
| React con SVG y CSS, y los jefes como recortes de la escena | Foco, teclado y textos como el resto de menús; los jefes salen con sus texturas de verdad | Hay que pedir los recortes a la escena |

## Decisión

- **El Invernadero es una vista de React** (`src/ui/Greenhouse.tsx`) sobre la escena de portada, en el mismo panel de la derecha que el menú de la portada. `App` sabe dónde se está fuera de la partida (`MenuPlace` en `EventBus.ts`: portada o Invernadero) y `TitleScreen` es el contenedor con el título, que en el Invernadero dice "INVERNADERO" en vez de "REBROTE" (sus letras vuelven a caer y encoge si la palabra es larga). No hay escena nueva.
- **La escena de portada pinta el sitio:** en la portada, la batalla de Creeper; en el Invernadero, el jardín del jugador, con solo las plantas que ya tiene y sin enemigos. Es la misma `TitleCover` con otro reparto (`greenhouseCast` en `view/greenhouseGarden.ts`, con test): sin enemigos las disparadoras no disparan, al clic dan su saltito (y suena `sow`) y las minas se arman, explotan y vuelven a brotar. Lo que el jugador tiene lo da la regla pura `ownedSoFar` (`core/route.ts`): lo que desbloquean las rondas hasta el brote vencido más avanzado, con los de antes (B-01), y su tope de nivel. Una partida a medias no cuenta.
- **El escenario del Invernadero** es el mismo jardín con otro terreno (`TEX.gardenLand`): un césped liso y continuo, sin el tablero a cuadros ni el suelo corrupto con sus agujeros y cables, y el seto todo verde (`paintLand(ctx, true)` en `textures.ts`). Como es tan grande como el terreno del juego, no se pinta al arrancar: `registerGardenLand` lo pinta la primera vez que se entra en el Invernadero (durante el fundido) y se queda en el juego. El ambiente va sin el brillo de los agujeros ni los bits que suben de ellos (`createAmbience(..., { garden: true })`). Las plantas siguen en una casilla para las reglas, pero se pintan algo corridas de su centro (`nudge` en el reparto, `TitleCover.placeOf`) y cada disparadora tiene a sus pies un trozo de tierra removida (`TEX.soilPatch`): sembradas a mano, no en una cuadrícula.
- **Cómo cambia:** React avisa con `menuPlaceChanged` al entrar o salir del Invernadero; la escena se funde (`LOOK.fadeOutMs`), vuelve a empezar en el otro sitio y entra con otro fundido, y todo brota de nuevo. Para no enseñar un instante la batalla al llegar desde la victoria, el sitio también viaja al crear el juego (`GameData.place`, desde `GameCanvas`) y al salir del tablero (`exitRequested` lleva el sitio, que el tablero pasa a `TitleSceneData`).
- **Reglas puras en `src/game/core/route.ts`**, con test: si el Invernadero está abierto (`isGreenhouseOpen`, R-01), el estado de cada brote (`outbreakStanding`: vencido, abierto o cerrado, con la regla de B-04), el brote que toca (`currentOutbreak`) y los lugares de la ruta (`routeStops`, R-03). Si se acaban los brotes del juego, el siguiente lugar es uno "Próximamente" con el número que tendrá; al final, siempre, el destino final.
- **La ruta** (`src/ui/RouteMap.tsx`) es un mapa ancho encima del jardín. Dónde va cada lugar lo calcula una función pura con test (`src/ui/routeLayout.ts`): de izquierda a derecha, subiendo y bajando; con pocos lugares se juntan en el centro y con muchos el mapa se desplaza. El suelo está sano hasta donde llegó el jugador y corrupto después.
- **Los jefes de la ruta los compone la escena:** la portada manda `routeArt` (`EventBus`) con el recorte de cada jefe (`bossCutouts` en `view/portrait.ts`, sobre las texturas ya pintadas) al arrancar y al pedirle el estado. React los enseña en color o, si el brote está cerrado, en silueta con CSS. El destino final es un lugar (una torre), no el jefe, que aún no está diseñado.
- **Flujo nuevo:**
  - Portada sin el Invernadero (no se ha vencido a Creeper): "Nueva partida" (brote 1) y "Continuar", que reanuda la partida guardada como hacía "Cargar partida".
  - Portada con el Invernadero: "Continuar" lleva a él. No hay "Nueva partida" ni "Jefes": eso está en el Invernadero (un solo menú).
  - Invernadero: reanudar la partida a medias, jugar el siguiente brote, la ruta, la tienda y las plantas (con candado) y volver a la portada. Empezar cualquier brote con una partida a medias pide confirmación.
  - Victoria: "Al Invernadero" y "Jugar otra vez". La derrota y "Salir al menú" de la pausa siguen yendo a la portada.
- **Si el Invernadero deja de estar abierto** (se borró el progreso, otra pestaña), `App` enseña la portada aunque se estuviera en él.

## Consecuencias

- La partida guardada no cambia de forma (`SAVE_VERSION` sigue en 2) ni el progreso (`PROGRESS_VERSION` sigue en 1).
- **Añadir un brote** no toca la ruta: sale de `OUTBREAKS` y del progreso. El jefe nuevo sale en su lugar con su recorte; si su jefe no se puede recortar con `portrait.ts` (otra forma de cuerpo), se añade allí.
- Cuando exista el último jefe como brote, el lugar "destino final" pasará a ser ese brote: se cambia `routeStops`.
- La tienda (T-022) y las plantas (T-023) ocupan sus botones con candado del Invernadero. Como el Invernadero solo se ve con Creeper vencido, la tienda no necesita decir que se abre al vencerlo.
- El Invernadero tiene su terreno, pero comparte el resto del escenario de la portada (cielo, ciudad, árbol, bancal). Un escenario del todo propio, o uno por brote para el tablero, es otra task.
- El terreno del Invernadero ocupa en memoria lo mismo que el del juego (en Ultra, una textura grande más) desde la primera vez que se entra.
- **Una planta nueva** (el escudo de T-024) sale en el jardín del Invernadero cuando se añade su pieza a `EXHIBITS` en `greenhouseGarden.ts`, con lo que necesita y su casilla.
- El texto del ADR-0010 sobre "Cargar partida" y la lista de jefes queda sustituido por este.

## Actualización (T-036, 22 nov 2026)
El jardín del Invernadero se quitó. Carmine eligió un refugio de noche entre tres propuestas (`/invernadero.html`). La decisión de fondo no cambia: la escena de portada pinta el sitio y React pinta encima el panel y lo demás. Lo que cambia:
- En el Invernadero la escena no crea ni el ambiente del jardín ni `TitleCover`: pinta el refugio (`createRefuge` en `view/refuge.ts`, con sus medidas y pintores en `view/refugeArt.ts`). Sus tres texturas grandes (fuera, circuitos y sala) se pintan la primera vez que se entra, como antes el terreno del jardín, que ya no existe (ni `greenhouseCast`, ni `registerGardenLand`, ni la tierra removida).
- La tienda y las plantas ya no se abren encima: son el Laboratorio de Patty (`ui/PattyLab.tsx`), siempre abierto a la izquierda del panel. La foto del vivero la sigue mandando la escena (`nurseryArt`), ahora recortada sin fondo.
- Una planta nueva ya no sale en el Invernadero: el punto sobre `EXHIBITS` de arriba deja de valer.
