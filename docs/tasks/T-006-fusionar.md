# [Plantas] Fusionar por arrastre

**Estado:** Completada (19 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** T-002 · **Bloquea a:** T-007 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Es la mecánica que diferencia al juego. Las reglas ya existen y están probadas: `canFuse` y `fuse` en `src/game/core/plants.ts` (misma variante, máximo 3 cañones, nivel más bajo). El multiplicador provisional está en `FUSION.damageByCannons`.

## Objetivos
1. **Arrastrar una planta sobre otra** para fusionarlas.
2. **Dejar claro qué se puede fusionar** antes de soltar.
3. **Que fusionar compense:** menos casillas y más ataque que la suma.

## Alcance
**Incluye:** arrastre de plantas sembradas, resaltado de destinos válidos y no válidos, aviso de pérdida de nivel, planta resultante con 2 o 3 cañones, vida resultante, tests.
**No incluye:** deshacer una fusión, mover plantas a casillas vacías.

## Decisiones
| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| D-02 | Cuánto más pega una fusionada | Cerrada el 19 nov 2026 con la recomendación: daño x2,2 con 2 cañones y x3,5 con 3; vida igual a la suma. Se ajusta jugando | Carmine |
| Caso límite | Vida al fusionar plantas dañadas | Cerrada con la recomendación: suma de la vida actual | Carmine |

## Criterios de aceptación

Comprobados el 19 nov 2026 con tests de Vitest (`plants.test.ts`, `match.test.ts`, `combat.test.ts`) y con arrastres de ratón automatizados en Chromium sin GPU (render por software), en Bajo, Medio y Ultra. Se probaron estos casos:
- 1+1, 2+1 y 3+1.
- Fuego sobre normal.
- Aviso de nivel.
- Soltar en una casilla vacía y fuera del tablero.
- La planta arrastrada y la de destino mueren a mitad del arrastre.
- Pausa, clic derecho y derrota durante el arrastre.
- Un clic sin arrastrar.

### Arrastre
- [x] Al empezar a arrastrar una disparadora, las plantas con las que puede fusionarse se resaltan en verde y el resto se atenúa.
- [x] Al soltar sobre un destino válido, la planta arrastrada desaparece de su casilla y el destino suma sus cañones.
- [x] Al soltar sobre un destino no válido o fuera del tablero, la planta vuelve a su casilla sin cambios.
- [x] Soltar sobre una casilla vacía no mueve la planta.

### Reglas
- [x] Solo se fusionan plantas de la misma variante.
- [x] No se puede superar 3 cañones.
- [x] La planta resultante queda con el nivel más bajo de las dos.
- [x] Si los niveles son distintos, antes de soltar se muestra el nivel resultante (p. ej. "Quedará en nivel 7").
- [x] La planta resultante muestra un punto por cañón y dispara una bala por cañón.

### Calidad
- [x] La escena decide con `canFuse` y `fuse`, sin reglas propias. Lo hace a través de `fusionBlocker`, `fusionTargets`, `fusedPlant` y `fusePlants` de `match.ts`, que usan `fuseBlocker` y `fuse` de `plants.ts`.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- **La planta de destino muere mientras se arrastra:** deja de ser destino al momento y su casilla queda vacía, así que soltar ahí ya no fusiona y la planta vuelve a la suya. El arrastre sigue para poder elegir otro destino. Si la que muere es la arrastrada, el arrastre se cancela y la planta de la mano se deshace en hojas.
- **La planta arrastrada recibe daño durante el arrastre:** sigue en su casilla a efectos de combate hasta soltar. Se ve medio transparente, dispara y la muerden.
- **Plantas dañadas:** la vida resultante suma la vida actual de las dos.
- **En móvil el arrastre compite con el scroll de la página:** el lienzo lleva `touch-action: none` y Phaser cancela los gestos táctiles del navegador sobre él. Falta probarlo en un móvil de verdad (QA).

## Objetivo final con ejemplos
| Origen | Destino | Resultado |
|---|---|---|
| Normal, 1 cañón, nivel 3 | Normal, 1 cañón, nivel 3 | Normal, 2 cañones, nivel 3 |
| Normal, 1 cañón, nivel 9 | Normal, 2 cañones, nivel 7 | Normal, 3 cañones, nivel 7, con aviso previo |
| Fuego, 1 cañón | Normal, 1 cañón | No permitido |
| Normal, 2 cañones | Normal, 2 cañones | No permitido (serían 4) |

Los cuatro ejemplos son tests en `match.test.ts`.

## Añadido durante la task

### Reglas
- **Daño repartido:** `damageMultiplier` es el daño de todo el disparo y `bulletDamage` (`combat.ts`) lo reparte entre las balas. Una de 2 cañones dispara 2 semillas de 1,1 veces el daño base; una de 3, 3 semillas de 1,17 veces. Las balas salen a la vez y cada una da al primer enemigo vivo que encuentra: si la primera lo mata, la siguiente sigue de largo.
- **Vida:** `FUSION.hpByCannons` (1, 2 y 3) da la vida máxima. Al fusionar se suma la vida actual de las dos. Si algún día cambia `hpByCannons`, se conserva la proporción de vida.
- **Recarga:** la fusionada conserva la recarga de la planta de destino.
- **Motivo del bloqueo:** `fuseBlocker` (`plants.ts`) dice por qué no se puede: `variant` o `max-cannons`. `fusionBlocker` (`match.ts`) añade los casos del tablero: `off-board`, `same-cell` y `no-plant`.

### Interacción
- Las plantas se arrastran sin carta elegida. Con una carta elegida, pulsar una planta no la arrastra (queda para sembrar, e infundir en T-004).
- Sobre una planta, el cursor es una mano abierta, y una mano cerrada mientras se arrastra.
- El arrastre empieza al mover el puntero 10 píxeles de diseño con el botón pulsado. Un clic sin mover no hace nada: queda libre para seleccionar la planta en T-003.
- Se agarra la planta por donde se pulsa. Así, al empezar, pisa su propia casilla aunque se pulse en lo alto de la cabeza, y no se puede fusionar por accidente con la de detrás.
- Al pulsar se elige la planta que se ve bajo el puntero, la de delante primero. La cabeza asoma sobre la casilla de detrás.
- La casilla de destino es la que queda bajo la sombra de la planta en la mano.
- Encima del destino sale un rótulo:
  - Válido: "Fusionar: 2 cañones" y, si cambia el nivel, "Quedará en nivel 7" en ámbar.
  - No válido: "Otra variante" o "Máximo 3 cañones" en rojo.
- Pausa (Esc o P), clic derecho, tomar una carta del HUD o perder la partida cancelan el arrastre: la planta vuelve a su casilla.

### Aspecto
- Texturas de 1, 2 y 3 cañones (`shooterTexture`). Al fusionarse, la planta crece un poco:
  - Cañones apilados.
  - Cabeza algo mayor.
  - Una hoja más en la base y en el brote.
  - La de 3 cañones, además, una flor en la coronilla y una ceja decidida.
- **Puntos por cañón:** semillitas doradas en el tallo, también en las de 1 cañón (`SHOOTER_DOTS`).
- **Cada semilla sale de la boca de su cañón** y vuela a esa altura.
- **Al arrastrar:**
  - La planta en la mano flota sobre su sombra, sigue al puntero con un poco de retraso y se inclina hacia donde va.
  - Los destinos válidos se marcan en verde y dan un saltito. El resto se oscurece.
  - La planta de origen queda medio transparente en su casilla.
- **Al fusionar:** la de la mano se mete en la de destino. La de destino se aplasta, destella, cambia de textura y rebota con un anillo, chispas y hojas. El punto nuevo del tallo destella y sale "¡Fusión!".
- Detalle en `docs/guias/graficos.md`, sección 6.

### Valores (en `balance.ts`)
| Qué | Valor |
|---|---|
| Daño por disparo (D-02) | x1, x2,2 y x3,5 con 1, 2 y 3 cañones |
| Vida máxima (D-02) | 300, 600 y 900 |

Con estos números, una de 3 cañones hace 70 de daño por disparo (3 semillas de 23,3) cada 1,4 s y aguanta 18 mordiscos de gusano. Tres disparadoras sueltas harían 60 y aguantarían 6 mordiscos cada una.

## Cómo probarlo (QA)
1. Sembrar tres disparadoras y fusionarlas hasta tener una de 3 cañones. Comprobar los puntos del tallo (1, 2, 3) y que dispara tres semillas a la vez.
2. Intentar fusionar una de 3 cañones con otra: casilla roja y "Máximo 3 cañones". Al soltar vuelve a su casilla.
3. Intentar fusionar una de fuego con una normal (cuando exista T-004): casilla roja y "Otra variante".
4. Arrastrar una planta mientras un gusano la muerde: sigue recibiendo mordiscos en su casilla. Si muere, el arrastre se cancela.
5. Soltar sobre una casilla vacía, sobre el HUD y en el cielo: la planta vuelve.
6. En un móvil o tableta: arrastrar con el dedo no mueve la página ni hace zoom.
7. **Plantas enteras:** sin GPU, las capturas salen con trozos de plantas sin pintar que cambian de un fotograma a otro (ver T-002). Hay que mirar en un equipo con GPU que las plantas de 2 y 3 cañones se ven enteras.
8. Jugar 10 minutos y anotar si fusionar se siente bien (punto de control del índice).
