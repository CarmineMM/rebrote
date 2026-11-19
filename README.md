# Rebrote (nombre de trabajo)

Defensa por carriles: plantas contra virus informáticos históricos que una IA descontrolada recreó en el mundo real.

## Arrancar

    npm install
    npm run dev      # http://localhost:5173
    npm test         # reglas del juego (Vitest)
    npm run build    # chequeo de tipos + build

## Dónde está cada cosa

- `docs/` decisiones (ADR), diseño (specs) y trabajo pendiente (tasks). Empieza por `docs/README.md`.
- `src/game/core/` reglas del juego en TypeScript puro, sin Phaser, con tests.
- `src/game/config/balance.ts` todos los números de balance.
- `src/game/scenes/` escenas de Phaser (solo pintan y leen input).
- `src/ui/` interfaz en React (HUD, menús).
