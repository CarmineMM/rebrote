# Tasks del prototipo (mundo 1)

Una task por archivo. El tamaño es orientativo.

| # | Task | Estado | Tamaño | Depende de | Bloqueada por decisión |
|---|---|---|---|---|---|
| T-001 | [Tablero] Sembrar disparadoras con moneda y HUD | Completada (19 nov 2026) | M | Ninguna | Ninguna (D-01 cerrada) |
| T-002 | [Combate] Gusanos, disparos y derrota | Completada (19 nov 2026) | M | T-001 | D-07 |
| T-003 | [Plantas] Subir de nivel | Completada (19 nov 2026) | S | T-002 | Ninguna (D-03 y D-05 cerradas) |
| T-004 | [Elementos] Fuego: mina e infusión | Completada (19 nov 2026) | M | T-002 | Ninguna (D-04 cerrada) |
| T-005 | [Elementos] Hielo: mina e infusión | Completada (19 nov 2026) | S | T-004 | Ninguna (D-06 cerrada) |
| T-006 | [Plantas] Fusionar por arrastre | Completada (19 nov 2026) | M | T-002 | Ninguna (D-02 cerrada) |
| T-007 | [Rondas] Las 7 rondas del mundo 1 | Completada (19 nov 2026) | L | T-003 a T-006 | Ninguna |
| T-008 | [Jefe] Creeper y rondas 8 a 10 | Completada (20 nov 2026) | M | T-007 | Ninguna (J-01 a J-05 cerradas) |
| T-009 | [Rondas] Progresión y dificultad del mundo 1 | Completada (20 nov 2026) | L | T-008 | Ninguna (P-01 a P-12 cerradas) |
| T-010 | [Dificultad] Enemigos más fuertes, ficha de información y bandeja fija | Completada (20 nov 2026) | M | T-009 | Ninguna (A-01 a A-10 cerradas) |
| T-011 | [Interfaz] Menú de inicio, partida guardada, créditos e idiomas | Completada (20 nov 2026) | L | T-010 | Ninguna (I-01 a I-12 cerradas) |

## Estados

| Estado | Significa |
|---|---|
| Pendiente | Nadie la ha empezado. |
| En curso | Alguien la está haciendo. |
| Completada | Todos sus criterios de aceptación están marcados y comprobados, y `npm test` y `npm run build` pasan. Lleva la fecha de cierre. |

El estado se escribe en dos sitios: en esta tabla y en la cabecera de la task (`**Estado:**`). Al empezar o cerrar una task se cambian los dos en el mismo commit.

## Orden recomendado

T-001, T-002, T-006, T-004, T-005, T-003, T-007, T-008, T-009, T-010, T-011.

T-006 va antes que los elementos a propósito: fusionar es la mecánica que diferencia al juego. Si arrastrar una planta sobre otra no se siente bien, conviene saberlo cuanto antes.

## Punto de control

Al cerrar T-006 hay que parar y jugar 10 minutos. Si sembrar y fusionar no divierte, se revisa el diseño antes de seguir.

Las decisiones D-xx están en `../specs/01-mecanicas.md`.
