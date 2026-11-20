# ADR-0006: Ajustes gráficos por niveles

- **Estado:** Aceptada
- **Fecha:** 2026-11-19

## Contexto

El ADR-0004 pide que el juego sea bonito y esté animado en todo. Eso tiene un coste: un equipo modesto (portátil sin GPU dedicada, móvil) no mueve lo mismo que uno potente. Carmine pidió ajustes gráficos para que quien tenga más CPU y GPU vea mejores gráficos, sin dejar fuera a los equipos modestos.

Medido en un navegador sin GPU (renderizado por software), el JavaScript gasta alrededor del 1 % del fotograma. El coste está en rellenar píxeles: capas grandes, brillos aditivos y resolución.

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| Un solo nivel fijo | Simple | O se ve pobre en equipos buenos o va lento en los modestos |
| Solo un control de resolución | Fácil de entender | No quita el coste de efectos y capas |
| Niveles con perfil completo y modo automático | Cada equipo recibe lo que puede mover, y el jugador elige si quiere | Cada efecto nuevo debe decir a qué nivel pertenece |

## Decisión

Niveles **Bajo, Medio, Alto y Ultra**, más **Automático** (por defecto). Cada nivel es un perfil en `src/game/view/quality.ts`:

| Ajuste | Bajo | Medio | Alto | Ultra |
|---|---|---|---|---|
| Resolución interna (`renderScale`) | 0,75 | 1 | 1,25 | 2 |
| Partículas (`particles`) | ×0,25 | ×0,6 | ×1 | ×1,6 |
| Vida en el escenario (`life`) | ×0,5 | ×0,8 | ×1 | ×1,4 |
| Sol con halo y rayos (`sunRays`) | No | Sí | Sí | Sí |
| Viento sobre el césped (`wind`) | No | Sí | Sí | Sí |
| Sombras de nubes (`cloudShadows`) | No | No | Sí | Sí |
| Brillos aditivos (`glows`) | No | Sí | Sí | Sí |
| Extras: rocío y haces de luz (`extras`) | No | No | Sí | Sí |
| Filtros de cámara: color y viñeta (`postFx`) | No | No | No | Sí |

- **Resolución:** cada unidad de diseño son `renderScale` píxeles del lienzo y la cámara amplía en la misma proporción. Todo el código sigue trabajando en coordenadas de diseño (1600 × 900). Las texturas se pintan a esa misma escala y las imágenes se muestran con `artInv()` para que midan lo mismo.
- **Modo automático:** empieza según el equipo (`suggestQuality`: núcleos, memoria, pantalla táctil) y nunca propone Ultra. Tras unos segundos mide los fps reales. Si la mediana queda por debajo de 45, baja un nivel (`autoDowngrade`). Nunca sube solo.
- **Cambiar de nivel:** (igual que cambiar de idioma, ADR-0009) recrea el juego con el perfil nuevo y continúa la misma partida (saldo, plantas y, desde T-002, el combate entero: ver ADR-0008; con `snapshotMatch`). Así cada efecto lee su nivel una sola vez, al crearse, y no hace falta reconfigurar nada en caliente.
- **Dónde se guarda:** la preferencia vive en `localStorage` de cada navegador (`rebrote.ajustes`, sin backend, ADR-0001). Si el almacenamiento falla, se usa Automático.
- **Dónde se cambia:** en Ajustes, dentro del menú de pausa (ADR-0007), y en Opciones del menú de inicio (T-011, ADR-0010), junto con el idioma, la pantalla completa y la opción de mostrar los FPS.
- **Resolución y proporción:** el lienzo mide (trozo de mundo visible) × `renderScale`; el trozo visible depende de la proporción de la pantalla (ADR-0007).
- **Filtros de Ultra:** solo filtros de una lectura por píxel (matriz de color y viñeta). Se probó el tilt-shift y se descartó: hace 100 lecturas por píxel, unas 576 millones por fotograma a doble resolución.

## Consecuencias

- Todo efecto visual nuevo declara a qué ajuste pertenece y se prueba en Bajo y en Ultra. Las reglas están en `docs/guias/graficos.md`.
- Las partículas que responden a una acción del jugador (sembrar, recoger una moneda) se reducen en Bajo pero nunca desaparecen: son parte de la respuesta del juego.
- En Bajo el juego tiene que seguir siendo bonito: menos cantidad, no peor diseño.
- Las mediciones de fps usan tiempo real (`performance.now()`): el reloj de Phaser se frena cuando el juego va lento y daría números falsos.
