# Tasks

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
| T-012 | [Interfaz] Móvil: solo en horizontal, panel de nivel en las filas de abajo y ronda en pantalla pequeña | Completada (20 nov 2026) | S | T-011 | Ninguna (M-01 a M-05 cerradas) |
| T-013 | [Interfaz] Tours de ayuda: cada cosa nueva se enseña la primera vez | Completada (20 nov 2026) | L | T-012 | Ninguna (G-01 a G-10 cerradas) |
| T-014 | [Audio] Efectos de sonido y volumen | Completada (21 nov 2026) | M | Ninguna | Ninguna (S-01 a S-06 cerradas) |
| T-015 | [Audio] Música de fondo | Pendiente | S | T-014 | U-01, U-02 (faltan las pistas) |
| T-016 | [Arte] Rediseño de la disparadora | Completada (21 nov 2026) | M | Ninguna | Ninguna (X-01 a X-03 cerradas) |
| T-017 | [Guardado] Progreso permanente separado de la partida en curso | Pendiente | M | Ninguna | Ninguna |
| T-018 | [Brotes] Varios brotes y fin de "Mundo 1" | Pendiente | L | T-017 | B-01 a B-04 |
| T-019 | [Interfaz] Invernadero y ruta de brotes | Pendiente | L | T-017, T-018 | R-01 a R-03 |
| T-020 | [Progresión] Moneda secundaria: semillas | Pendiente | S | T-017, T-018 | C-01 a C-05 |
| T-021 | [Poderes] Tres poderes en la partida y panel izquierdo | Pendiente | L | T-018 | O-01 a O-07 |
| T-022 | [Tienda] Tienda de poderes | Pendiente | M | T-019, T-020, T-021 | O-01, T-01 a T-04 |
| T-023 | [Progresión] Nivel base permanente de la disparadora | Pendiente | M | T-019, T-020, T-022 | N-01 a N-04 |
| T-024 | [Plantas] Escudo: muro e infusión | Pendiente | L | T-016, T-018 | E-01 a E-06 |
| T-025 | [Enemigos] Tropas del brote 2 y francotirador | Pendiente | L | T-018, T-024 | F-01 a F-06 |
| T-026 | [Jefe] Blaster y rondas del brote 2 | Pendiente | L | T-024, T-025 | L-01 a L-08 |
| T-027 | [Plantas] Premio en los niveles 5, 10, 15 y 20 y jardincito | Completada (21 nov 2026) | M | T-003 | Ninguna (Q-01 a Q-03 cerradas) |

## Estados

| Estado | Significa |
|---|---|
| Pendiente | Nadie la ha empezado. |
| En curso | Alguien la está haciendo. |
| Completada | Todos sus criterios de aceptación están marcados y comprobados, y `npm test` y `npm run build` pasan. Lleva la fecha de cierre. |

El estado se escribe en dos sitios: en esta tabla y en la cabecera de la task (`**Estado:**`). Al empezar o cerrar una task se cambian los dos en el mismo commit.

## Orden recomendado

T-001, T-002, T-006, T-004, T-005, T-003, T-007, T-008, T-009, T-010, T-011, T-012, T-013.

Después, para progresión, audio y brote 2 (planificado el 20 nov 2026):

1. T-014: efectos de sonido. No depende de nada y se nota al instante.
2. T-016, fase 1: propuestas de la disparadora. Va pronto porque el escudo (T-024) se pinta sobre la forma nueva.
3. T-017 y T-018: guardado permanente y estructura de brotes. Son los cimientos de todo lo demás.
4. T-019 y T-020: Invernadero, ruta y semillas.
5. T-021 y T-022: poderes y tienda.
6. T-016, fase 2, y después T-024, T-025 y T-026: escudo, tropas y Blaster.
7. T-023: nivel base permanente.
8. T-015: música, en cuanto Carmine elija las pistas.

La lista de jefes y las preguntas de la historia están en `../specs/03-ruta-de-brotes.md`.

T-006 va antes que los elementos a propósito: fusionar es la mecánica que diferencia al juego. Si arrastrar una planta sobre otra no se siente bien, conviene saberlo cuanto antes.

## Punto de control

Al cerrar T-006 hay que parar y jugar 10 minutos. Si sembrar y fusionar no divierte, se revisa el diseño antes de seguir.

Las decisiones D-xx están en `../specs/01-mecanicas.md`. Desde T-008, cada task lleva las suyas con su propia letra.
