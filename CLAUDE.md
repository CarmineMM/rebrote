# Rebrote

Juego de defensa por carriles. Stack: Phaser 4 + React 19 + Vite + TypeScript. Sin backend (ADR-0001).

## Antes de tocar nada

- Lee `docs/specs/01-mecanicas.md` (vocabulario y reglas) y la task que vayas a ejecutar en `docs/tasks/`.
- Lo que aparece en "Decisiones pendientes" no se implementa por intuición: se pregunta.
- Si la task pinta o anima algo (enemigos, plantas, efectos, escenarios, HUD), lee `docs/guias/graficos.md` y sigue sus listas de comprobación. Si algo suena, su sección 16 y la lista "Sonido nuevo".
- Si la task añade o cambia algún texto que ve el jugador, lee `docs/guias/idiomas.md`.
- Si la task añade una mecánica o un gesto nuevo, lleva su tour de ayuda (regla 9) y su sonido (regla 10).
- Al empezar una task, pon su estado en "En curso". Al cerrarla, marca sus criterios de aceptación y pon "Completada (fecha)". El estado se cambia en la cabecera de la task y en la tabla de `docs/tasks/README.md`, en el mismo commit.

## Reglas del proyecto

1. Las reglas del juego van en `src/game/core/` como funciones puras, sin importar Phaser, y con test en Vitest. El combate avanza con `stepCombat` y la escena solo pinta el estado y anima los eventos que devuelve (ADR-0008).
2. Ningún número de balance fuera de `src/game/config/balance.ts`.
3. React no pinta entidades del juego. Phaser pinta el tablero; React pinta HUD y menús. Se hablan solo por `src/game/EventBus.ts`. Si React tiene que enseñar una planta o un enemigo (la foto de la ficha, T-010), la escena se la manda como imagen compuesta con sus texturas (`src/game/view/portrait.ts`).
4. El juego tiene que ser bonito y estar animado: arte hecho por código y libertad creativa en enemigos, escenarios y efectos para que sea amigable y divertido (ADR-0004). La vista usa la cámara inclinada del ADR-0005: la lógica trabaja en coordenadas de tablero y nunca en píxeles. Todo efecto nuevo respeta los niveles gráficos del ADR-0006 y la escala de arte (`artInv()`). El juego va a pantalla completa con menú de pausa (ADR-0007): el decorado cubre todo el mundo, lo jugable va dentro del diseño de 1600 × 900, y todo lo que pasa con el tiempo usa el reloj y los tweens de la escena para que la pausa lo congele. En móvil solo se juega en horizontal (ADR-0011): en vertical sale el aviso de girar la pantalla, así que lo pequeño que se prueba es el móvil en horizontal (812 × 375 y 568 × 320). Detalle en `docs/guias/graficos.md`.
5. Vocabulario fijo: infundir (elemento sobre disparadora), fusionar (dos disparadoras iguales), nivel (mejora individual). No usar "combinar".
6. Código e identificadores en inglés; docs en español. Los textos del juego van en español (el de referencia) y en inglés en `src/i18n/` (ADR-0009), nunca escritos a mano en componentes, escenas o vistas.
7. Una decisión técnica nueva que cambie el rumbo lleva su ADR en `docs/adr/`.
8. La partida guardada es el `MatchState` entero (ADR-0010): si cambia su forma, se sube `SAVE_VERSION` y se ajusta la comprobación en `src/game/save.ts`.
9. Una mecánica nueva llega con su tour de ayuda (ADR-0012): la mano enseña el gesto sobre el tablero de verdad la primera vez que sale. Cada `Feature` de `rounds.ts` tiene su tour en `TOUR_OF_FEATURE` (`src/ui/tour/tours.ts`; si falta, no compila), con sus pasos en `TOURS`, una frase corta por paso en `tour.steps` de `src/i18n/` y un dibujo animado en `TourPicture`. Lista en `docs/guias/graficos.md` ("Mecánica nueva").
10. Una mecánica nueva llega también con su sonido (ADR-0013). Solo `src/game/audio/` reproduce (`sfx.play`); lo que suena con cada evento lo decide una regla pura de `cues.ts` con test, y cada efecto lleva su entrada en `SFX` (`src/game/config/audio.ts`) y su fuente en `scripts/audio/manifest.ts` (`npm run audio`). Lista en `docs/guias/graficos.md` ("Sonido nuevo").

## Comandos

- `npm run dev`, `npm test`, `npm run build` (incluye chequeo de tipos).
- `npm run build` no necesita nada más: los sonidos terminados están en `public/audio/`. `npm run audio` los vuelve a fabricar (necesita ffmpeg y unzip; los paquetes de Kenney ya están en `audio-lab/kenney/`). Si falta algo, se para sin tocar `public/audio/`, y dos pasadas dan los mismos archivos. Con `npm run dev`, `/sonidos.html` deja oírlos.
