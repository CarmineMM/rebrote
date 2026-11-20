# Rebrote

Juego de defensa por carriles. Stack: Phaser 4 + React 19 + Vite + TypeScript. Sin backend (ADR-0001).

## Antes de tocar nada

- Lee `docs/specs/01-mecanicas.md` (vocabulario y reglas) y la task que vayas a ejecutar en `docs/tasks/`.
- Lo que aparece en "Decisiones pendientes" no se implementa por intuición: se pregunta.
- Si la task pinta o anima algo (enemigos, plantas, efectos, escenarios, HUD), lee `docs/guias/graficos.md` y sigue sus listas de comprobación.
- Al empezar una task, pon su estado en "En curso". Al cerrarla, marca sus criterios de aceptación y pon "Completada (fecha)". El estado se cambia en la cabecera de la task y en la tabla de `docs/tasks/README.md`, en el mismo commit.

## Reglas del proyecto

1. Las reglas del juego van en `src/game/core/` como funciones puras, sin importar Phaser, y con test en Vitest. El combate avanza con `stepCombat` y la escena solo pinta el estado y anima los eventos que devuelve (ADR-0008).
2. Ningún número de balance fuera de `src/game/config/balance.ts`.
3. React no pinta entidades del juego. Phaser pinta el tablero; React pinta HUD y menús. Se hablan solo por `src/game/EventBus.ts`. Si React tiene que enseñar una planta o un enemigo (la foto de la ficha, T-010), la escena se la manda como imagen compuesta con sus texturas (`src/game/view/portrait.ts`).
4. El juego tiene que ser bonito y estar animado: arte hecho por código y libertad creativa en enemigos, escenarios y efectos para que sea amigable y divertido (ADR-0004). La vista usa la cámara inclinada del ADR-0005: la lógica trabaja en coordenadas de tablero y nunca en píxeles. Todo efecto nuevo respeta los niveles gráficos del ADR-0006 y la escala de arte (`artInv()`). El juego va a pantalla completa con menú de pausa (ADR-0007): el decorado cubre todo el mundo, lo jugable va dentro del diseño de 1600 × 900, y todo lo que pasa con el tiempo usa el reloj y los tweens de la escena para que la pausa lo congele. Detalle en `docs/guias/graficos.md`.
5. Vocabulario fijo: infundir (elemento sobre disparadora), fusionar (dos disparadoras iguales), nivel (mejora individual). No usar "combinar".
6. Código e identificadores en inglés; docs y textos del juego en español.
7. Una decisión técnica nueva que cambie el rumbo lleva su ADR en `docs/adr/`.

## Comandos

- `npm run dev`, `npm test`, `npm run build` (incluye chequeo de tipos).
