# ADR-0024: Tropas reutilizadas con variante de color

- **Estado:** Aceptada
- **Fecha:** 2026-11-23

## Contexto

Hasta el brote 3, cada brote traía sus tropas y cada tropa salía en un solo brote. Desde el brote 4 (Morris) los brotes reutilizan las tropas de los anteriores en vez de traer las suyas (`docs/specs/03-ruta-de-brotes.md`): vuelven con el mismo nombre, las mismas reglas y los mismos valores base, más nivel y otro color, para que se lean como "las tropas de Morris" (T-041, MT-01 a MT-05). Los brotes siguientes harán lo mismo.

Hacía falta decidir cómo se declara que una tropa vuelve, dónde vive su color y cómo se pinta sin duplicar tropas, texturas ni vistas. El juego ya usa el tinte de Phaser (`setTint`) para el quemado (suma rojo), el frenado (multiplica azul), el oculto (relleno morado) y los destellos, así que la variante no puede ir por ahí: se pisarían.

## Decisión

**En las reglas (`src/game/core/variants.ts`, puro y con test):**
- Una tropa es de su brote de origen (`troopHome`): el primero cuyo guion la saca. No hay que apuntarlo en ningún sitio.
- Un brote que recluta lo dice en su guion (`recruits: true` en `OUTBREAKS`). En él, las tropas de los brotes anteriores salen con su variante (`troopVariant`): el `id` del brote. Las suyas propias, si las tuviera, y los jefes, nunca.
- La variante va con el enemigo (`Enemy.variant`): la pone `spawnEnemy` según el brote de la partida (se puede pedir otra a mano), la hereda la copia de un Copycat y se guarda con la partida (`SAVE_VERSION` 12). Depende del brote de la partida, no de lo vencido: rejugar el brote 1 saca los gusanos de su color.
- Nada más cambia: ni el tipo (`kind`), ni la vida, el daño, la moneda, el sigilo, el salto o la copia. Una tropa de variante es la misma tropa.

**En la vista (`src/game/view/troopTint.ts`, puro y con test):**
- Un tinte por brote, igual para todas sus tropas (MT-01): `VARIANT_TINTS`, con las propuestas en `TROOP_TINTS` y la galería `/proposals/variantes.html`.
- La variante no se dibuja aparte: es la textura de siempre pasada por el tinte (`variantTexture` en `textures.ts`), que se pinta la primera vez que se pide, a partir de la ya pintada y a su resolución, con la clave `<textura>@<brote>`. Cada píxel conserva su luz y cambia su color, más cuanto más color tenía: los blancos, el acero y las luces verde neón de los virus no cambian.
- Se tiñe el dibujo de la tropa (cuerpo, cabeza, patas, armadura, disquete, gorro). La medallita, el aura, las llamas, la escarcha y las rayas de velocidad no: son de su nivel o de su estado y se leen igual (MT-05). Oculta, el relleno de la silueta tapa el color.
- `WormView` (`variantLook`), `BugView` y la foto de la ficha (`portrait.ts`, piezas `own`) piden sus texturas con la variante del enemigo. La ficha dice quién la reclutó con una pastilla ("Reclutado por Morris", MT-02); su nombre no cambia.

## Alternativas descartadas

- **Duplicar las tropas** (`morrisWorm`...): once tipos más en `ENEMIES`, en el guion, en la ficha, en los textos y en cada regla que pregunta por el tipo. Y la copia de un Copycat tendría que saber de qué tipo copiarse.
- **Tintar con `setTint`:** choca con el quemado, el frenado, el oculto y los destellos, que ya lo usan.
- **Una paleta pensada para cada tropa** (MT-01 b): once diseños por brote, y no se leerían como una familia.
- **Un tinte de un solo color:** las once tropas ya usan entre todas casi todos los colores, así que siempre queda alguna igual a su original (con un ámbar, el Lurker). Los tintes propuestos cambian también la luz o el color entero.

## Consecuencias

- Un brote nuevo que reutilice tropas solo pone `recruits: true` y su tinte en `VARIANT_TINTS` (un test avisa si falta). Sus tropas salen en el catálogo con su variante.
- Una tropa nueva tiene que portarse bien teñida: probarla en `/proposals/variantes.html` (sale sola si un brote la recluta) y mirar que su aura y sus estados se siguen leyendo.
- Las texturas teñidas se pintan al vuelo la primera vez (unos milisegundos por textura) y ocupan su memoria, como las de siempre.
- Un arte de tropa que no salga de una textura (un `Graphics` dibujado a mano en la vista) no se teñiría solo: hay que pasarle el tinte.
