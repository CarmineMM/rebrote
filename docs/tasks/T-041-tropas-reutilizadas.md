# [Enemigos] Tropas reutilizadas con variante de color y brote 4 en preparación

**Estado:** Completada (23 nov 2026, 0.15.4) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-042, T-043 · **Origen:** conversación de diseño del 23 nov 2026

## Contexto
El diseño del brote 4 está en `docs/specs/07-brote-4-morris.md`. Carmine decidió que no trae tropas nuevas: vuelven las de los tres brotes anteriores, con otro color y más nivel, conservando su nombre. Es la primera vez que un brote reutiliza tropas, y los brotes siguientes lo harán también (`docs/specs/03-ruta-de-brotes.md`).

Hoy cada tropa pertenece a un brote (verificado en `ENEMIES` de `balance.ts`): gusano, acorazado y escupidor (brote 1); Copycat, Copycat acorazado, Copycat escupidor y Minstrel (brote 2); Lurker, Lurker escupidor, Lurker acorazado y Skipper (brote 3). El catálogo de desarrollo las enseña por brote (`/catalog/tropas.html`, T-040, regla 16 de `CLAUDE.md`).

El brote 4 no existe todavía. El patrón para crearlo está probado dos veces: un brote "en preparación" (`boss: null`, cerrado al jugador, jugable en desarrollo; ADR-0015), como hicieron T-024 y T-037.

## Objetivos
1. **Que una tropa pueda volver en otro brote** con otro color, sin duplicarla.
2. **Que el jugador la reconozca:** mismo nombre, misma ficha, color distinto.
3. **Dejar el brote 4 en preparación** con sus 600 monedas, para T-042 y T-043.

## Alcance
**Incluye:** forma de declarar en el guion que una tropa sale con la variante del brote, variante de color para las once tropas que vuelven, ficha y catálogo al día, brote 4 en preparación con guion provisional y saldo inicial de 600, tests, guía de gráficos.
**No incluye:** el guion definitivo, la sobrecarga y el jefe (T-042), la historia (T-043), tropas nuevas.

## Decisiones cerradas (23 nov 2026)
- El brote 4 reutiliza tropas; no trae ninguna nueva.
- Vuelven todas las que tengan sentido, también el Minstrel.
- Conservan su nombre y cambian de color.
- El brote 4 empieza con 600 monedas, el doble que el brote 3.

## Decisiones (cerradas el 23 nov 2026 con la recomendación)
| # | Pregunta | Opciones | Decisión | Decide |
|---|---|---|---|---|
| MT-01 | ¿Cómo se elige el color de la variante? | a) Un tinte por brote, igual para todas sus tropas. b) Un color pensado para cada tropa | **Cerrada: a.** Se lee como "las tropas de Morris" y cuesta mucho menos. Tres propuestas en `/proposals/variantes.html` (Sombra, Pizarra y Fotocopia). Se recomienda A, Sombra, que es la que usa el juego (`VARIANT_TINTS` en `src/game/view/troopTint.ts`) hasta que Carmine elija otra en la galería | Carmine |
| MT-02 | ¿La ficha dice que es una variante? | Sí o no | **Cerrada: sí.** Una pastilla corta, "Reclutado por Morris" ("Recruited by Morris") | Carmine |
| MT-03 | ¿Cambia algo más que el color y el nivel? | Sí o no | **Cerrada: no.** Mismas reglas y mismos valores base. La diferencia la pone el nivel | Carmine |
| MT-04 | ¿Los Copycat siguen dejando copia y los Lurker siguen llegando ocultos? | Sí o no | **Cerrada: sí.** Es lo que el jugador aprendió de ellos | Carmine |
| MT-05 | ¿El aura de nivel se ve bien sobre el color nuevo? | Se comprueba | **Comprobado en la galería:** el aura no se tiñe y con Sombra se lee mejor que en la original (más contraste detrás de un cuerpo oscuro). Si con otra propuesta no se distingue, se ajusta el tinte, no el aura | Carmine |

Un tinte de un solo color (se probó un ámbar de terminal, por las pantallas de 1988) no sirve: entre las once tropas ya usan casi todos los colores y deja igual a la que ya era de ese color (el Lurker es naranja). El azul se confunde con el frenado y el verde, con las plantas. Por eso las tres propuestas cambian también la luz o el color entero.

## Cómo quedó
- **Reglas** (`src/game/core/variants.ts`, ADR-0024): cada tropa es de su brote de origen, el primero cuyo guion la saca (`troopHome`). Un brote que recluta lo dice en `OUTBREAKS` (`recruits: true`) y saca con su variante las tropas de los brotes anteriores (`troopVariant`). La variante va con el enemigo (`Enemy.variant`), la pone `spawnEnemy`, la hereda la copia de un Copycat y se guarda (`SAVE_VERSION` 12).
- **Vista** (`src/game/view/troopTint.ts`): un tinte por brote (`VARIANT_TINTS`). La textura teñida se pinta la primera vez a partir de la de siempre (`variantTexture` en `textures.ts`). Se tiñe el dibujo de la tropa; la medallita, el aura, las llamas, la escarcha y las rayas no.
- **Brote 4** en preparación (`morris` en `OUTBREAKS`): 600 monedas, 3 rondas provisionales (brote 1 en masa; brote 2; brote 3 y todos juntos) con las once tropas, niveles hasta el 9, sin desbloquear nada. Su nombre ("Morris") en `outbreak.comingBoss`, sus avisos en `round.notices.morris` y lo que cuenta Boxer en `story.lore.morris`.
- **Catálogo:** el brote 4 sale en tres páginas de cinco carriles; cada tropa, con su variante, su ficha con la pastilla y una nota de dónde viene.

## Criterios de aceptación
### Variantes
- [x] El guion de un brote puede sacar una tropa de un brote anterior, y esa tropa se pinta con la variante de color del brote en curso.
- [x] Las once tropas que vuelven tienen su variante y se distinguen de la original puestas una al lado de la otra.
- [x] Cada tropa se sigue reconociendo por su silueta: un Skipper sigue pareciendo un Skipper.
- [x] Su nombre no cambia, en español ni en inglés.
- [x] Sus reglas no cambian: los Copycat dejan copia, los Lurker llegan ocultos, el Skipper salta, el Minstrel recita.
- [x] Una tropa en su brote de origen se ve igual que antes de esta task.

### Brote 4 en preparación
- [x] Existe en la lista de brotes, sin jefe todavía, cerrado al jugador y jugable en desarrollo.
- [x] Empieza con 600 monedas y el tablero vacío.
- [x] Trae desbloqueado todo lo de los brotes anteriores, incluida la infusión del escudo.
- [x] No desbloquea nada nuevo en ninguna ronda.
- [x] Su guion provisional saca al menos una tropa de cada brote anterior.

### Calidad
- [x] El catálogo de desarrollo enseña las tropas del brote 4 con su variante (regla 16).
- [x] La partida guardada conserva de qué brote es la variante; sin migración (ADR-0014).
- [x] Niveles gráficos, aura y escala de arte según `docs/guias/graficos.md`, con la forma de añadir una variante explicada.
- [x] Tests de la regla que decide la variante.
- [x] `npm test` y `npm run build` pasan. Los brotes 1 a 3 dan el mismo resultado en `npm run sim`.

## Casos límite y riesgos
- Rejugar el brote 1 después de vencer el 4: los gusanos salen con su color original.
- Una copia de un Copycat de variante: sale con la misma variante.
- Una tropa oculta de variante: oculta se sigue viendo como silueta.
- Personas que no distinguen bien los colores: la variante no puede ser lo único que diga algo importante. Aquí solo es estética, y la ficha lo aclara.
- Riesgo: que el tinte haga ilegible el aura de nivel o el estado quemado o frenado, que también usan color.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Gusano en el brote 1 | Como siempre |
| Gusano en el brote 4 | Mismo gusano, con el color de Morris; la ficha dice "Gusano" y "Reclutado por Morris" |
| Brote 4 en desarrollo, ronda 1 | 600 monedas y todas las cartas disponibles |
| Jugador normal mira la ruta | El brote 4 aún no se puede jugar |

## Cómo probarlo (QA)
1. Abrir el catálogo de tropas y comparar cada tropa con su variante.
2. Jugar el brote 4 en desarrollo y tocar varias tropas para ver su ficha.
3. Rejugar el brote 1 y comprobar que nada cambió.
