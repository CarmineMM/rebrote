# [Elementos] Hielo: mina e infusión

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** T-004 · **Bloquea a:** T-007 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
El hielo reutiliza todo lo construido en T-004 (carta, mina, infusión). Cambia el efecto: ralentiza en lugar de quemar. El tipo `ElementType` ya incluye `ice` (verificado en `src/game/core/plants.ts`).

Desde T-006, la disparadora de hielo necesita sus texturas de 1, 2 y 3 cañones (lista "Variante de planta nueva" en `docs/guias/graficos.md`).

Desde T-004 (lista "Elemento nuevo" en `docs/guias/graficos.md`):
- **Carta e infusión:** `cardPlay` y `playCard` (`match.ts`) ya valen para cualquier elemento. Basta con añadir `'ice'` a `CardId` y su carta en `App.tsx`. El precio "×N" del HUD (`cardPreview`) y "Ya tiene fuego" o "Ya tiene hielo" salen solos.
- **Mina:** `Mine` y su conteo, detección y explosión ya son comunes (`MINE` en `balance.ts`). En `explode` (`combat.ts`), el hielo hace 0 de daño: falta su ralentización. Faltan también sus texturas, porque `mineTexture` lo pinta como la de fuego.
- **Balas:** `BulletEffect` es una unión. Se añade `{ element: 'ice', ... }` y su caso en `bulletEffect`, que hoy devuelve null para el hielo. La quemadura (`Burn`, `refreshBurn`) sirve de modelo: el estado en el enemigo, se queda el más fuerte y se reinicia la duración.
- **Aspecto:** `SHOOTER_PALETTES` y `VARIANT_FX` no tienen hielo. `shooterVariant` pinta el hielo como la normal hasta entonces. `INFUSED_TEXT` ya tiene "¡Hielo!". En `PlantView.infuse`, el hielo solo saca chispas: falta su escarcha.
- **Casos límite:** "Enemigo quemado y ralentizado a la vez": `Enemy.burn` ya existe y el efecto de hielo irá en un campo propio.

## Objetivos
1. **Hielo solo.** Mina que al explotar ralentiza con fuerza en área.
2. **Hielo infundido.** Las balas ralentizan al enemigo impactado.
3. **Reutilizar.** Sin duplicar la lógica de T-004.

## Alcance
**Incluye:** carta de hielo, efecto de ralentización, color azul claro, valores en `balance.ts`, tests.
**No incluye:** congelación total, interacción entre fuego y hielo.

## Decisiones pendientes
| # | Pregunta | Recomendación | Decide |
|---|---|---|---|
| D-06 | Cuánto frena y cuánto dura el hielo solo | 70 % durante 4 s | Carmine |

## Criterios de aceptación
- [ ] La mina de hielo sigue el mismo conteo de 2 s que la de fuego.
- [ ] Al explotar no hace daño (o hace daño mínimo) y ralentiza a todos los enemigos del área.
- [ ] La ralentización de la mina es mayor que la de las balas.
- [ ] Las balas de hielo ralentizan al enemigo impactado durante un tiempo.
- [ ] La ralentización no se acumula: se aplica la más fuerte y se reinicia la duración.
- [ ] Un enemigo ralentizado se distingue a simple vista.
- [ ] No se puede infundir hielo en una disparadora de fuego ni al revés.

### Calidad
- [ ] Mina e infusión comparten implementación con el fuego.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Enemigo quemado y ralentizado a la vez (por dos plantas distintas): los dos efectos conviven.
- Un enemigo ralentizado también muerde más lento o no: definir al implementar y dejarlo en `balance.ts`.

## Objetivo final con ejemplos
| Acción | Resultado |
|---|---|
| Mina de hielo con 4 gusanos cerca | Los 4 avanzan mucho más lento unos segundos |
| Bala de hielo | El gusano impactado frena un poco |
| Hielo sobre disparadora de fuego | No permitido |

## Cómo probarlo (QA)
1. Poner una mina de hielo delante de un grupo y medir a ojo cuánto tardan en avanzar una casilla.
2. Comparar con una disparadora de hielo en otro carril.
