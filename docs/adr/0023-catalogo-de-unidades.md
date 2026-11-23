# ADR-0023: Catálogo de unidades y páginas de desarrollo por carpetas

- **Estado:** Aceptada
- **Fecha:** 2026-11-23

## Contexto

Cada tropa, jefe o personaje nuevo traía su galería de desarrollo (`/bichos.html`, `/gusanos.html`, `/jefes.html`, `/personajes.html`...). Esas galerías mezclaban dos cosas: las propuestas de diseño entre las que eligió Carmine y la vista previa de lo que ya está en el juego (la pestaña "Movimientos" de los jefes). No había ningún sitio donde ver todas las unidades de cada brote con sus números por nivel, y las páginas estaban sueltas en la raíz del proyecto, junto a `index.html`.

Carmine pidió (23 nov 2026) una página en modo lista con todas las unidades por brote y su detalle técnico según el nivel, que se vea como en el juego, lo mismo para jefes y personajes, y que las unidades futuras se dejen ahí. Todo esto es solo para probar: el build se queda limpio.

## Decisión

Tres carpetas en la raíz, servidas por Vite en `npm run dev` con su ruta:

| Carpeta | Qué va | Páginas |
|---|---|---|
| `catalogo/` | Lo que hay en el juego, tal como lo ve el jugador | `tropas.html`, `jefes.html`, `personajes.html` |
| `propuestas/` | Propuestas de diseño entre las que se eligió | `bichos`, `gusanos`, `jefes`, `personajes`, `disparadoras`, `iconos`, `invernadero` |
| `pruebas/` | Páginas para oír o probar algo que no es un dibujo | `sonidos`, `musica` |

El catálogo (`src/dev/catalog/`):
- **Tropas:** cada brote con las tropas que saca su guion (`roster.ts`, puro y con test). Arriba, andando en el tablero con la vista del juego (`createEnemyView`) en tres de sus niveles y con un botón por reacción; debajo, en lista, su ficha del juego (`enemyInfo` y su foto de `portrait.ts`), cuándo sale (rondas y niveles, escolta aparte) y una tabla por nivel: vida, lo que sube, ataque, daño por segundo y, si deja copia, la de su copia.
- **Jefes:** la escena "Movimientos" que estaba en la galería (con el aspecto del juego), su ficha en sus dos fases, los grupos de su ronda (escolta y refuerzos) y sus números de `balance.ts`.
- **Personajes:** el dibujo de `CAST` animado, sus tres expresiones, quién es, sus viñetas y qué presenta en cada brote.

La regla para lo que venga:
- Una tropa nueva sale sola en cuanto está en el guion de un brote; si no sale en ninguno, falla `roster.test.ts`.
- Un jefe nuevo necesita su entrada en `BOSS_NUMBERS` y `ENRAGES` (`bosses.tsx`), y un personaje nuevo en `PEOPLE` (`characters.tsx`). Si falta, no compila.
- Sus propuestas de diseño, si las tiene, van en una página de `propuestas/`. Una página que solo enseñe lo que ya está en el juego no se hace: eso es el catálogo.
- El build no incluye nada de esto: Vite solo empaqueta `index.html` (no hay `rollupOptions.input`), así que `dist/` no lleva ni las páginas ni su código.

## Consecuencias

- Las rutas de las páginas cambian (`/jefes.html` pasa a `/propuestas/jefes.html`, `/sonidos.html` a `/pruebas/sonidos.html`...). Las tasks cerradas citan las rutas de antes: son historia y no se tocan.
- La galería de propuestas de los jefes se queda solo con el aspecto; sus movimientos, en el catálogo.
- El catálogo usa la ficha y las vistas del juego, así que un cambio de reglas o de arte se ve allí sin tocarlo.
