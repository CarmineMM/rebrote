# ADR-0002: Phaser 4 para el juego, React para la interfaz, Vite como build

- **Estado:** Aceptada
- **Fecha:** 2026-11-19

## Contexto

Hace falta un game loop, colisiones simples, input de arrastre y decenas de entidades en pantalla. Pintar eso con estado de React rinde mal. Carmine domina React y TypeScript.

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| Phaser + React | Motor 2D completo, arrastre y escenas resueltos, React queda para HUD | Dos mundos que sincronizar |
| PixiJS + React | Más ligero | Solo render: loop, input y escenas a mano |
| React + DOM/CSS | Sin curva de aprendizaje | Rendimiento y colisiones a mano |
| Kaplay | Muy rápido de prototipar | Ecosistema más pequeño |

## Decisión

Phaser 4.2 dentro de un componente React 19, con Vite 8 y TypeScript 7. Vitest para tests.

- Phaser es dueño del canvas y del loop.
- React pinta HUD, menús y pantallas.
- Se comunican solo por `src/game/EventBus.ts`.

## Consecuencias

- El bundle pesa unos 1,6 MB (426 kB con gzip) por Phaser. Aceptable para un juego.
- React no se monta en `StrictMode`: el doble montaje de desarrollo crearía dos instancias del juego.
- Phaser 4 es reciente. Si un ejemplo de internet no funciona, lo más probable es que sea de Phaser 3: comprobar contra la documentación de la versión 4.
