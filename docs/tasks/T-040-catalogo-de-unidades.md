# [Desarrollo] Catálogo de tropas, jefes y personajes, y páginas de desarrollo por carpetas

**Estado:** Completada (23 nov 2026, 0.15.3) · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-039 · **Bloquea a:** ninguna · **Origen:** petición de Carmine del 23 nov 2026

## Contexto
Las galerías de desarrollo estaban sueltas en la raíz (`/bichos.html`, `/jefes.html`...) y mezclaban propuestas de diseño con vistas previas de lo que ya está en el juego. No había un sitio donde ver todas las unidades de cada brote con sus números por nivel. Decisión en `docs/adr/0023-catalogo-de-unidades.md`.

## Objetivos
1. **Catálogo de tropas** en modo lista: las de cada brote, con su ficha del juego y su detalle técnico por nivel, y animadas como en el juego.
2. **Lo mismo para jefes y personajes.**
3. **Regla para lo que venga:** toda unidad nueva sale en el catálogo.
4. **Páginas por carpetas:** `catalogo/`, `propuestas/` y `pruebas/`, cada una con su ruta en `npm run dev`; lo que solo era vista previa pasa al catálogo.
5. **El build sigue limpio:** nada de esto entra en `dist/`.

## Alcance
**Incluye:** `catalogo/tropas.html`, `catalogo/jefes.html`, `catalogo/personajes.html` y su código en `src/dev/catalog/`; mover las galerías a `propuestas/` y `pruebas/`; quitar "Movimientos" de la galería de jefes (pasa al catálogo); ADR-0023; regla 16 de `CLAUDE.md`; listas de `docs/guias/graficos.md`; rutas al día en docs vivos y comentarios.
**No incluye:** cambios en el juego, textos para el jugador, rutas en las tasks ya cerradas.

## Decisiones tomadas
- Tres páginas de catálogo (tropas, jefes, personajes) enlazadas entre sí, en vez de una sola.
- Las tropas salen del guion de verdad (`OUTBREAKS`): un brote enseña las que saca, con los niveles de cada tramo de rondas y la escolta aparte.
- La ficha es la del juego (`enemyInfo`, su foto de `portrait.ts` y las clases de `InfoPanel`), quieta en la página.
- Ninguna galería era solo vista previa de tropas: todas tienen propuestas y van a `propuestas/`. Lo que era solo vista previa ("Movimientos" de los jefes) pasa al catálogo con el aspecto del juego. La viñeta de `propuestas/personajes.html` se queda allí porque deja mezclar propuestas.

## Criterios de aceptación
- [x] `/catalogo/tropas.html` enseña cada brote con sus tropas: escenario animado en tres niveles con botones, y por tropa su ficha del juego, cuándo sale y una tabla por nivel (vida, lo que sube, ataque, daño por segundo y la copia de los Copycat). Tocar una fila cambia la ficha a ese nivel.
- [x] `/catalogo/jefes.html` enseña cada jefe con sus movimientos, su ficha (y la de su fase 2), los grupos de su ronda y sus números de `balance.ts`.
- [x] `/catalogo/personajes.html` enseña a Boxer y Patty con sus expresiones, quiénes son, sus viñetas y qué presentan.
- [x] Las galerías están en `propuestas/` y las páginas de prueba en `pruebas/`, y todas cargan con su ruta nueva; la de jefes ya no tiene "Movimientos".
- [x] Una tropa que no sale en ningún brote hace fallar `roster.test.ts`; un jefe o un personaje sin su entrada en el catálogo no compila.
- [x] `npm test` y `npm run build` pasan, y `dist/` no lleva ninguna página ni código del catálogo, las propuestas o las pruebas.
