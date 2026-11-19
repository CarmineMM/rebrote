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
- El fuego en una casilla vacía es una mina: cuando se acerca un gusano cuenta 2 s y explota en área. Sobre una disparadora sin elemento la infunde: sus semillas queman. Infundir cuesta un fuego por cañón, y la carta lo muestra ("×3 = 225") al pasar por encima.
- El hielo funciona igual, pero frena en vez de dañar: su mina deja a los gusanos de alrededor muy lentos unos segundos, y las semillas de una disparadora de hielo frenan un poco al gusano que tocan. Una planta solo puede tener un elemento.
- Cada gusano eliminado da moneda. A veces la suelta en el suelo: haz clic en ella para recogerla, vale un poco más.
- Arrastra una disparadora sobre otra de la misma variante para fusionarlas: la de destino suma los cañones (hasta 3) y pega más que las dos por separado. Las plantas con las que se puede fusionar se marcan en verde. Si sueltas en otro sitio, vuelve a su casilla.
- Esc o clic derecho suelta la carta elegida (o devuelve a su casilla la planta que arrastras).
- Esc (sin carta elegida), P o el botón de pausa abren el menú de pausa, con los ajustes: pantalla completa, calidad gráfica y FPS.
- En desarrollo, `H` lanza la prueba de rendimiento: 20 disparadoras gratis y 60 gusanos con mucha vida.

## Dónde está cada cosa

- `docs/` decisiones (ADR), diseño (specs) y trabajo pendiente (tasks). Empieza por `docs/README.md`.
- `src/game/core/` reglas del juego en TypeScript puro, sin Phaser, con tests.
- `src/game/config/balance.ts` todos los números de balance.
- `src/game/scenes/` escenas de Phaser (solo pintan y leen input).
- `src/game/view/` cómo se ve: cámara inclinada, arte pintado por código, escenario animado y niveles gráficos. Reglas en `docs/guias/graficos.md`.
- `src/ui/` interfaz en React (HUD, menús).
