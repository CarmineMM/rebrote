# ADR-0003: Reglas en lógica pura y balance en un solo archivo

- **Estado:** Aceptada
- **Fecha:** 2026-11-19

## Contexto

El corazón del juego son reglas (fusionar, infundir, niveles, costos) que van a cambiar muchas veces mientras se balancea. Si viven dentro de las escenas, cada cambio obliga a probar a mano.

## Decisión

1. Las reglas van en `src/game/core/` como funciones puras de TypeScript, sin importar Phaser.
2. Cada regla tiene test en Vitest.
3. Todos los números (costos, daño, tiempos, límites) van en `src/game/config/balance.ts`.
4. Las escenas solo pintan, leen input y llaman a `core`.

## Consecuencias

- Cambiar una regla o un número es tocar un archivo y correr `npm test`.
- Un poco más de disciplina: la escena no decide nada por su cuenta.
- Si algún día hay servidor, las mismas reglas se pueden reutilizar para validar.
