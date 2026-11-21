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
| T-017 | [Guardado] Progreso permanente separado de la partida en curso | Completada (21 nov 2026) | M | Ninguna | Ninguna (K-01 y K-02 cerradas) |
| T-018 | [Brotes] Varios brotes y fin de "Mundo 1" | Completada (21 nov 2026) | L | T-017 | Ninguna (B-01 a B-04 cerradas) |
| T-019 | [Interfaz] Invernadero y ruta de brotes | Completada (21 nov 2026) | L | T-017, T-018 | Ninguna (R-01 a R-04 cerradas) |
| T-020 | [Progresión] Moneda secundaria: semillas | Pendiente | S | T-017, T-018 | C-01 a C-05 |
| T-021 | [Poderes] Tres poderes en la partida y panel izquierdo | Pendiente | L | T-018 | O-01 a O-07 |
| T-022 | [Tienda] Tienda de poderes | Pendiente | M | T-019, T-020, T-021 | O-01, T-01 a T-04 |
| T-023 | [Progresión] Nivel base permanente de la disparadora | Pendiente | M | T-019, T-020, T-022 | N-02 a N-06 (N-01 cerrada) |
| T-024 | [Plantas] Escudo: muro e infusión | Pendiente | L | T-016, T-018 | E-01 a E-06 |
| T-025 | [Enemigos] Tropas del brote 2 y juglar | Pendiente | L | T-018, T-024 | F-01 a F-06 |
| T-026 | [Jefe] Elk Cloner y rondas del brote 2 (antes Blaster, que pasó al brote 11) | Pendiente | L | T-024, T-025 | L-01, L-03 a L-09 (L-02 cerrada) |
| T-027 | [Plantas] Premio en los niveles 5, 10, 15 y 20 y jardincito | Completada (21 nov 2026) | M | T-003 | Ninguna (Q-01 a Q-03 cerradas) |
| T-028 | [Web] Icono del juego y favicon | Completada (21 nov 2026, 0.1.1) | S | Ninguna | Ninguna (W-01 a W-03 cerradas) |
| T-029 | [Web] Instalar el juego como aplicación (PWA) | Pendiente | M | T-028 | V-02 a V-05 |
| T-030 | [Enemigos] Aura en los tramos de nivel de los gusanos | Completada (21 nov 2026) | M | T-027 | Ninguna (Z-01 a Z-04 cerradas) |
| T-031 | [Historia] Viñetas, Boxer y Patty: el arranque de la historia | Pendiente | L | T-019 | Y-01 a Y-07 |
| T-032 | [Historia] Boxer en los tours y Patty en lo nuevo | Pendiente | M | T-031 | VT-01 a VT-05 |
| T-033 | [Historia] El jugador elige su nombre | Pendiente | S | T-031, T-034 | Ninguna (NJ-01 a NJ-06 cerradas) |
| T-034 | [Guardado] Perfiles de jugador en el navegador | Completada (21 nov 2026, 0.2.0) | M | T-017, T-019 | Ninguna (PF-01 a PF-07 cerradas) |

## Estados

| Estado | Significa |
|---|---|
| Pendiente | Nadie la ha empezado. |
| En curso | Alguien la está haciendo. |
| Completada | Todos sus criterios de aceptación están marcados y comprobados, y `npm test` y `npm run build` pasan. Lleva la fecha de cierre. |

El estado se escribe en dos sitios: en esta tabla y en la cabecera de la task (`**Estado:**`). Al empezar o cerrar una task se cambian los dos en el mismo commit.

## Orden recomendado

T-001, T-002, T-006, T-004, T-005, T-003, T-007, T-008, T-009, T-010, T-011, T-012, T-013.

Después de T-013 se hicieron T-014, T-016 a T-019, T-027 y T-030.

Al cerrar una task se sube la versión del juego (ADR-0017). Mientras el juego esté en desarrollo, ninguna task migra datos guardados (ADR-0014).

Orden sugerido para lo pendiente (revisado el 21 nov 2026):

1. T-028: icono y favicon. Pequeña, no depende de nada y se nota en cada pestaña.
2. T-034: perfiles. Va antes que todo lo que guarda datos permanentes (T-020, T-022, T-023, T-031, T-033) para que nazcan dentro del perfil.
3. T-031: viñetas, Boxer y Patty. Empieza por la galería de propuestas, que necesita la decisión de Carmine: conviene lanzarla pronto.
4. T-033 y T-032: el nombre del jugador y Boxer en los tours.
5. T-020: semillas. Pequeña, y así el brote 2 ya da recompensa.
6. T-024, T-025 y T-026: escudo, tropas y Elk Cloner. Es el contenido nuevo: va antes que la tienda porque una tienda sin segundo brote vende ayuda para lo que ya se venció.
7. T-021, T-022 y T-023: poderes, tienda y nivel base.
8. T-029: instalable. Después de T-028 y de T-034.
9. T-015: música, en cuanto Carmine elija las pistas.

La lista de jefes está en `../specs/03-ruta-de-brotes.md` y la historia en `../specs/04-historia.md`.

T-006 va antes que los elementos a propósito: fusionar es la mecánica que diferencia al juego. Si arrastrar una planta sobre otra no se siente bien, conviene saberlo cuanto antes.

## Punto de control

Al cerrar T-006 hay que parar y jugar 10 minutos. Si sembrar y fusionar no divierte, se revisa el diseño antes de seguir.

Las decisiones D-xx están en `../specs/01-mecanicas.md`. Desde T-008, cada task lleva las suyas con su propia letra.
