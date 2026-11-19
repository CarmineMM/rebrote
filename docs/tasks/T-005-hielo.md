# [Elementos] Hielo: mina e infusión

**Estado:** Completada (19 nov 2026) · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** T-004 · **Bloquea a:** T-007 · **Origen:** conversación de diseño del 18 y 19 nov 2026

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

## Decisiones
| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| D-06 | Cuánto frena y cuánto dura el hielo solo | Cerrada el 19 nov 2026 con la recomendación: 70 % más lento durante 4 s | Carmine |
| Casos límite | ¿Un enemigo ralentizado también muerde más lento? | Decidido al implementar, como pedía la task: sí, en la misma proporción en que avanza (`ICE.slowsBites`). Se puede revisar | Carmine |
| Añadida | ¿Frena igual una disparadora de hielo de 1 cañón que una de 3? | Decidido al implementar: no, frena algo más con más cañones (30, 40 y 50 %), como el fuego quema más (ver "Añadido durante la task"). Se puede revisar | Carmine |

## Criterios de aceptación

Comprobados el 19 nov 2026 con tests de Vitest (`combat.test.ts` y `match.test.ts`) y en Chrome sin GPU (render por software) con ratón real para sembrar e infundir, en Bajo, Medio, Alto y Ultra. Casos probados:
- Carta de hielo sobre una disparadora normal, sobre una de hielo y carta de fuego sobre una de hielo.
- Mina de hielo con cuatro gusanos cerca, uno de ellos quemado, y un gusano de control en otro carril.
- Disparadoras de hielo de 1, 2 y 3 cañones disparando, junto a una de fuego y una normal.
- Cambio de calidad desde el menú de pausa con una mina de hielo en cuenta atrás y un gusano frenado.
- HUD con tres cartas en 568, 640, 812, 900 y 1280 px de ancho.

- [x] La mina de hielo sigue el mismo conteo de 2 s que la de fuego.
- [x] Al explotar no hace daño (o hace daño mínimo) y ralentiza a todos los enemigos del área.
- [x] La ralentización de la mina es mayor que la de las balas.
- [x] Las balas de hielo ralentizan al enemigo impactado durante un tiempo.
- [x] La ralentización no se acumula: se aplica la más fuerte y se reinicia la duración.
- [x] Un enemigo ralentizado se distingue a simple vista.
- [x] No se puede infundir hielo en una disparadora de fuego ni al revés.

### Calidad
- [x] Mina e infusión comparten implementación con el fuego.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Enemigo quemado y ralentizado a la vez (por dos plantas distintas): los dos efectos conviven. Con test, en los dos órdenes.
- Un enemigo ralentizado también muerde más lento: sí, en la misma proporción (`ICE.slowsBites`). Con test.
- Una semilla de hielo que da a un gusano frenado por la mina no acorta ni alarga lo que frena la mina. Con test.

## Objetivo final con ejemplos
| Acción | Resultado |
|---|---|
| Mina de hielo con 4 gusanos cerca | Los 4 avanzan mucho más lento unos segundos |
| Bala de hielo | El gusano impactado frena un poco |
| Hielo sobre disparadora de fuego | No permitido |

Las tres filas son tests: `match.test.ts` (hielo sobre la de fuego) y `combat.test.ts` (mina con un grupo y bala de hielo).

## Añadido durante la task

### Reglas
- **Ralentización:** `Slow` en el enemigo (`enemy.slow`): cuánto frena, de 0 a 1, y lo que le queda. Convive con la quemadura (`enemy.burn`).
  - Mientras dura, el enemigo avanza y muerde más despacio en la misma proporción: su reloj va más lento solo el tiempo que le queda al hielo.
  - **No se acumula (`refreshSlow`):** si llega una igual o más fuerte, se queda la nueva con la duración entera. Si llega una más débil, la que había sigue como estaba. Así una semilla no acorta lo que frena una mina, ni la alarga sin fin disparando sin parar. La quemadura no lo necesita porque todas duran lo mismo.
- **Mina de hielo:** la misma mina de T-004 (detecta, cuenta 2 s, explota en área y deja la casilla). Lo que hace al explotar sale de `mineBlast(element)`: la de fuego daña y la de hielo no daña y frena.
- **Balas de hielo:** `BulletEffect` tiene `{ element: 'ice', slow }`. Cada semilla frena según los cañones de la planta (`ICE.bulletSlowByCannons`). Infundir 3 cañones cuesta 3 hielos; si frenara igual que una de 1 cañón, sembrar otra disparadora de hielo en el carril saldría siempre mejor. El nivel no cambia lo que frena.
- **Carta:** `CardId` es `'shooter' | ElementType`. `cardPlay` y `playCard` no cambian.

### Aspecto
- **Disparadora de hielo:** cabeza de escarcha azul clara, cañones de hielo con un brillo frío dentro, brote de cristal y mejillas más sonrosadas, en sus texturas de 1, 2 y 3 cañones. Conserva cañones y puntos del tallo. Suelta un copo cada tanto.
- **Semilla de hielo:** azul clara con un cristal blanco y estela de escarcha. Revienta en copitos con un anillo azul.
- **Infundir:** la escarcha sube por la planta con vaho, que se aplasta, cambia de textura, rebota y dice "¡Hielo!".
- **Mina de hielo:** bulbo escarchado con gorro de nieve y un copo en la punta del rabito (la mina de fuego y la de hielo comparten `paintMine`, con su paleta).
  - Armada: cara de susto, cuenta atrás en azul helado, alcance azul en el suelo, copitos en la punta y un brillo frío cada vez más rápido.
  - Al estallar: destello helado, copos, esquirlas y vaho, onda azul en el suelo, cristales que brotan del suelo y se deshacen, y una capa de escarcha que se derrite. Los gusanos alcanzados se quedan tiesos con un destello azul y tiritan. Temblor de cámara más corto que el del fuego.
  - Si la destruyen: el copo se deshace en vaho y se hunde.
- **Gusano frenado:** cristales de escarcha en la nuca y la cola, cuerpo azul frío y, cada 0,9 s, una tiritona y un copo. Ondula más despacio solo, porque ondula según lo que avanza. Si muere frenado, queda congelado y se rompe en esquirlas. Quemado y frenado a la vez: llamas y escarcha a la vez, con el cuerpo azul.
- **Carta de hielo:** un copo en CSS que gira y brilla sobre un montoncito de tierra.
- **HUD compacto:** con tres cartas, en pantallas de menos de 860 px de ancho las cartas pierden el nombre y el HUD se aprieta; por debajo de 600 px los iconos se reducen. Antes, a 640 px, el botón de pausa ya quedaba fuera.
- Detalle en `docs/guias/graficos.md`, sección 7.

### Valores (en `balance.ts`, PROVISIONAL)
| Qué | Valor |
|---|---|
| Daño de la mina de hielo (`ICE.blastDamage`) | 0 |
| Lo que frena la mina (`ICE.blastSlow`, `ICE.blastSlowMs`) | 70 % durante 4 s (D-06) |
| Lo que frena cada semilla (`ICE.bulletSlowByCannons`) | 30, 40 y 50 % con 1, 2 y 3 cañones |
| Lo que dura la de las semillas (`ICE.bulletSlowMs`) | 2,5 s: más que la recarga de la planta, así no se suelta entre disparo y disparo |
| ¿Muerde más despacio? (`ICE.slowsBites`) | Sí, en la misma proporción |

Con estos números, un gusano tarda 4 s en avanzar una casilla; frenado por la mina, 13,3 s; frenado por una disparadora de hielo de un cañón, 5,7 s.

## Cómo probarlo (QA)
1. Poner una mina de hielo delante de un grupo y medir a ojo cuánto tardan en avanzar una casilla.
2. Comparar con una disparadora de hielo en otro carril.
3. **Con GPU:** en Medio y en Ultra, los copos y la escarcha se ven azules sobre el césped, no blancos, y el juego sigue fluido con varias plantas de hielo disparando. Sin GPU las capturas salen con trozos sin pintar.
4. Jugar unos minutos y anotar si 75 por hielo y lo que frena compensan (todo es PROVISIONAL).
