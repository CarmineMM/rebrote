# Rebrote

Juego de defensa por carriles. Stack: Phaser 4 + React 19 + Vite + TypeScript. Sin backend (ADR-0001).

## Antes de tocar nada

- Lee `docs/specs/01-mecanicas.md` (vocabulario y reglas) y la task que vayas a ejecutar en `docs/tasks/`.
- Lo que aparece en "Decisiones pendientes" no se implementa por intuición: se pregunta.

## Reglas del proyecto

1. Las reglas del juego van en `src/game/core/` como funciones puras, sin importar Phaser, y con test en Vitest.
2. Ningún número de balance fuera de `src/game/config/balance.ts`.
3. React no pinta entidades del juego. Phaser pinta el tablero; React pinta HUD y menús. Se hablan solo por `src/game/EventBus.ts`.
4. Gráficos con formas simples (ADR-0004). Nada de buscar sprites todavía.
5. Vocabulario fijo: infundir (elemento sobre disparadora), fusionar (dos disparadoras iguales), nivel (mejora individual). No usar "combinar".
6. Código e identificadores en inglés; docs y textos del juego en español.
7. Una decisión técnica nueva que cambie el rumbo lleva su ADR en `docs/adr/`.

## Comandos

- `npm run dev`, `npm test`, `npm run build` (incluye chequeo de tipos).
