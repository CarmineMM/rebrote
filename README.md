# Rebrote (nombre de trabajo)

Defensa por carriles: plantas contra virus informáticos históricos que una IA descontrolada recreó en el mundo real.

## Arrancar

    npm install
    npm run dev      # http://localhost:5173
    npm test         # reglas del juego (Vitest)
    npm run build    # chequeo de tipos + build

## Cómo se juega

- Los gusanos salen de los agujeros de la derecha y avanzan por su carril. Si un gusano cruza el césped, pierdes una vida; con 3 vidas perdidas se acaba la partida.
- Arrastra la carta de la bandeja a una casilla del césped, o haz clic en la carta y luego en la casilla. Cada disparadora dispara solo a los gusanos de su carril.
- Cada gusano eliminado da moneda. A veces la suelta en el suelo: haz clic en ella para recogerla, vale un poco más.
- Esc o clic derecho suelta la carta elegida.
- Esc (sin carta elegida), P o el botón de pausa abren el menú de pausa, con los ajustes: pantalla completa, calidad gráfica y FPS.
- En desarrollo, `H` lanza la prueba de rendimiento: 20 disparadoras gratis y 60 gusanos con mucha vida.

## Dónde está cada cosa

- `docs/` decisiones (ADR), diseño (specs) y trabajo pendiente (tasks). Empieza por `docs/README.md`.
- `src/game/core/` reglas del juego en TypeScript puro, sin Phaser, con tests.
- `src/game/config/balance.ts` todos los números de balance.
- `src/game/scenes/` escenas de Phaser (solo pintan y leen input).
- `src/game/view/` cómo se ve: cámara inclinada, arte pintado por código, escenario animado y niveles gráficos. Reglas en `docs/guias/graficos.md`.
- `src/ui/` interfaz en React (HUD, menús).
