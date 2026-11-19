# [Plantas] Fusionar por arrastre

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** T-002 · **Bloquea a:** T-007 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Es la mecánica que diferencia al juego. Las reglas ya existen y están probadas: `canFuse` y `fuse` en `src/game/core/plants.ts` (misma variante, máximo 3 cañones, nivel más bajo). El multiplicador provisional está en `FUSION.damageByCannons`.

## Objetivos
1. **Arrastrar una planta sobre otra** para fusionarlas.
2. **Dejar claro qué se puede fusionar** antes de soltar.
3. **Que fusionar compense:** menos casillas y más ataque que la suma.

## Alcance
**Incluye:** arrastre de plantas sembradas, resaltado de destinos válidos y no válidos, aviso de pérdida de nivel, planta resultante con 2 o 3 cañones, vida resultante, tests.
**No incluye:** deshacer una fusión, mover plantas a casillas vacías.

## Decisiones pendientes
| # | Pregunta | Recomendación | Decide |
|---|---|---|---|
| D-02 | Cuánto más pega una fusionada | x2,2 y x3,5; vida igual a la suma | Carmine |

## Criterios de aceptación
### Arrastre
- [ ] Al empezar a arrastrar una disparadora, las plantas con las que puede fusionarse se resaltan en verde y el resto se atenúa.
- [ ] Al soltar sobre un destino válido, la planta arrastrada desaparece de su casilla y el destino suma sus cañones.
- [ ] Al soltar sobre un destino no válido o fuera del tablero, la planta vuelve a su casilla sin cambios.
- [ ] Soltar sobre una casilla vacía no mueve la planta.

### Reglas
- [ ] Solo se fusionan plantas de la misma variante.
- [ ] No se puede superar 3 cañones.
- [ ] La planta resultante queda con el nivel más bajo de las dos.
- [ ] Si los niveles son distintos, antes de soltar se muestra el nivel resultante (p. ej. "Quedará en nivel 7").
- [ ] La planta resultante muestra un punto por cañón y dispara una bala por cañón.

### Calidad
- [ ] La escena decide con `canFuse` y `fuse`, sin reglas propias.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- La planta de destino muere mientras se arrastra: el arrastre se cancela.
- La planta arrastrada recibe daño durante el arrastre: sigue en su casilla a efectos de combate hasta soltar.
- Plantas dañadas: definir si la vida resultante suma la vida actual o la máxima. Recomendación: la actual.
- En móvil el arrastre compite con el scroll de la página.

## Objetivo final con ejemplos
| Origen | Destino | Resultado |
|---|---|---|
| Normal, 1 cañón, nivel 3 | Normal, 1 cañón, nivel 3 | Normal, 2 cañones, nivel 3 |
| Normal, 1 cañón, nivel 9 | Normal, 2 cañones, nivel 7 | Normal, 3 cañones, nivel 7, con aviso previo |
| Fuego, 1 cañón | Normal, 1 cañón | No permitido |
| Normal, 2 cañones | Normal, 2 cañones | No permitido (serían 4) |

## Cómo probarlo (QA)
1. Sembrar tres disparadoras y fusionarlas hasta tener una de 3 cañones.
2. Intentar fusionar una de fuego con una normal.
3. Jugar 10 minutos y anotar si fusionar se siente bien (punto de control del índice).
