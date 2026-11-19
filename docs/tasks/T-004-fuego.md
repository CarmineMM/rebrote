# [Elementos] Fuego: mina e infusión

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** T-002 · **Bloquea a:** T-005, T-007 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Las reglas de infusión ya existen y están probadas: `canInfuse`, `infuse` e `infusionCost` en `src/game/core/plants.ts`. El conteo de la mina está en `FIRE_MINE.countdownMs` (2000 ms). Falta todo lo visible.

Desde T-006:
- **Plantas fusionadas:** ya existen plantas de 2 y 3 cañones. Disparan una semilla por cañón a la vez, y el daño del disparo se reparte entre ellas (`bulletDamage` en `combat.ts`). Hay que decidir si la quemadura va en cada semilla o una vez por disparo. Como no se acumula, da casi igual.
- **Arrastre:** con una carta elegida, pulsar una planta no la arrastra para fusionar. Queda libre para infundir.
- **Fusión entre variantes:** de fuego con fuego ya funciona en core. El rótulo "Otra variante" ya sale al intentar fusionar una de fuego con una normal.
- **Aspecto:** la disparadora de fuego necesita sus texturas de 1, 2 y 3 cañones (lista "Variante de planta nueva" en `docs/guias/graficos.md`).

## Objetivos
1. **Fuego solo.** Sembrado en casilla vacía es una mina con conteo de 2 s.
2. **Fuego infundido.** Soltado sobre una disparadora sin elemento, sus balas aplican daño progresivo.
3. **Costo por cañón.** Infundir una planta de N cañones cuesta N fuegos.

## Alcance
**Incluye:** carta de fuego, mina (detección, conteo visible, explosión en área), infusión por arrastre, efecto de quemadura en enemigos, color rojo en la planta infundida, valores en `balance.ts`, tests.
**No incluye:** hielo (T-005), quitar un elemento ya infundido.

## Decisiones pendientes
| # | Pregunta | Recomendación | Decide |
|---|---|---|---|
| D-04 | Interfaz al infundir una planta de 2 o 3 cañones | Un solo arrastre con precio multiplicado visible | Carmine |

## Criterios de aceptación
### Mina
- [ ] Soltar fuego en una casilla vacía siembra una mina.
- [ ] Al entrar un enemigo en su radio de detección empieza un conteo visible de 2 s.
- [ ] Al terminar el conteo explota, daña a todos los enemigos dentro del radio de explosión y desaparece.
- [ ] Una mina destruida antes de terminar el conteo no explota.

### Infusión
- [ ] Soltar fuego sobre una disparadora sin elemento la convierte en disparadora de fuego y cobra el costo.
- [ ] No se puede infundir una planta que ya tiene elemento; la casilla se marca como no válida.
- [ ] Las balas de fuego aplican el daño de impacto más una quemadura durante un tiempo.
- [ ] La quemadura no se acumula: un nuevo impacto reinicia su duración.

### Calidad
- [ ] El costo sale siempre de `infusionCost`.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Enemigo que entra y sale del radio durante el conteo: la mina explota igual al terminar.
- Dos minas juntas: cada una lleva su propio conteo.
- El escupidor (T-007) podrá destruir minas a distancia: la mina necesita vida propia.

## Objetivo final con ejemplos
Con fuego a 75:
| Acción | Resultado |
|---|---|
| Fuego sobre casilla vacía | Mina, saldo menos 75 |
| Fuego sobre disparadora de 1 cañón | Disparadora de fuego, saldo menos 75 |
| Fuego sobre disparadora de 3 cañones | Disparadora de fuego de 3 cañones, saldo menos 225 |
| Fuego sobre disparadora de fuego | No permitido, saldo sin cambios |

## Cómo probarlo (QA)
1. Sembrar una mina delante de un gusano y contar los 2 s.
2. Infundir una disparadora y comprobar que el gusano sigue perdiendo vida después del impacto.
