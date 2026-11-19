# Tasks del prototipo (mundo 1)

Una task por archivo. El tamaño es orientativo.

| # | Task | Tamaño | Depende de | Bloqueada por decisión |
|---|---|---|---|---|
| T-001 | [Tablero] Sembrar disparadoras con moneda y HUD | M | Ninguna | Ninguna (D-01 cerrada) |
| T-002 | [Combate] Gusanos, disparos y derrota | M | T-001 | D-07 |
| T-003 | [Plantas] Subir de nivel | S | T-002 | D-03, D-05 |
| T-004 | [Elementos] Fuego: mina e infusión | M | T-002 | D-04 |
| T-005 | [Elementos] Hielo: mina e infusión | S | T-004 | D-06 |
| T-006 | [Plantas] Fusionar por arrastre | M | T-002 | D-02 |
| T-007 | [Rondas] Las 7 rondas del mundo 1 | L | T-003 a T-006 | Ninguna |
| T-008 | [Jefe] Creeper | M | T-007 | Diseño del jefe |

## Orden recomendado

T-001, T-002, T-006, T-004, T-005, T-003, T-007, T-008.

T-006 va antes que los elementos a propósito: fusionar es la mecánica que diferencia al juego. Si arrastrar una planta sobre otra no se siente bien, conviene saberlo cuanto antes.

## Punto de control

Al cerrar T-006 hay que parar y jugar 10 minutos. Si sembrar y fusionar no divierte, se revisa el diseño antes de seguir.

Las decisiones D-xx están en `../specs/01-mecanicas.md`.
