# [Progresión] Nivel base permanente de la disparadora

**Estado:** Pendiente · **Prioridad:** Baja · **Tamaño estimado:** M (orientativo) · **Depende de:** T-019, T-020, T-022 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
En la partida, cada disparadora empieza en nivel 1 y sube pagando moneda: cada nivel suma un 10 % de daño y un 3 % de cadencia (`LEVELING` en `balance.ts`, `levelBonus` en `src/game/core/plants.ts`). Cada ronda pone un tope de nivel: en el brote 1 es 5 desde la ronda 2 (`levelCap` en `ROUNDS`, T-009 y T-010). Subir de nivel se desbloquea en la ronda 2 y tiene su tour.

Carmine quiere una mejora permanente y muy cara, con tope 5, para que las plantas empiecen la partida con ese nivel ya hecho, sin cambiar el precio de sembrarlas.

**Choque encontrado en el código:** si la disparadora llega a la partida en nivel 5 y el tope del brote 1 es 5, en ese brote ya no se puede subir de nivel nunca. La mecánica de la ronda 2 y su tour se quedan sin sentido. Por eso N-01.

## Objetivos
1. **Una mejora permanente** que se note desde la primera ronda.
2. **Que no rompa** subir de nivel dentro de la partida.
3. **Que sea opcional:** todos los jefes se vencen sin ella.

## Alcance
**Incluye:** mejora de la disparadora comprable en el Invernadero, su efecto en la partida, precios en `balance.ts`, marca visual, progreso permanente con migración, textos, tests.
**No incluye:** mejoras permanentes de minas, escudo o poderes.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| N-01 | ¿Cómo se aplica la mejora? | a) La planta nace en nivel N y el tope sigue igual (en el brote 1 deja de poder subirse). b) La planta nace en nivel N y el tope de cada ronda sube lo mismo. c) Es un rango aparte (estrellas): suma daño y cadencia como N niveles, pero el nivel de partida sigue yendo de 1 al tope | c: no toca topes, costos ni tours, y se explica solo ("tu disparadora tiene 2 estrellas") | Carmine |
| N-02 | ¿Cuánto da cada paso? | Valores libres | Lo mismo que un nivel de partida: 10 % de daño y 3 % de cadencia | Carmine |
| N-03 | Precios | Valores libres | Crecientes; el quinto paso, varias victorias completas | Carmine |
| N-04 | ¿Afecta a rejugar brotes ya vencidos? | Sí o no | Sí: que el jugador sienta lo que compró | Carmine |

## Criterios de aceptación
- [ ] En el Invernadero, la disparadora muestra su mejora actual (de 0 a 5), el precio del siguiente paso y lo que aporta.
- [ ] Comprar un paso descuenta las semillas y queda guardado.
- [ ] No se puede pasar de 5; en 5 dice "Máximo".
- [ ] Toda disparadora sembrada en una partida nueva trae la mejora aplicada.
- [ ] El precio de sembrar, de infundir y de subir de nivel en la partida no cambia.
- [ ] En el brote 1, subir de nivel en la ronda 2 sigue siendo posible y su tour funciona.
- [ ] La mejora se ve en la planta y en su ficha de información, también en plantas fusionadas.
- [ ] Fusionar dos plantas no pierde ni duplica la mejora.
- [ ] Una partida guardada antes de comprar la mejora no cambia al cargarla.

### Calidad
- [ ] El efecto se calcula en `src/game/core/` con tests; valores en `balance.ts`.
- [ ] Simular el brote 1 con mejora 0 y con mejora 5 y anotar el resultado en la spec: con 0 se sigue pudiendo ganar.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Con la opción c, una disparadora de nivel 5 y mejora 5 pega como una de nivel 10: revisar que no trivialice el brote 1 al rejugarlo (y que eso no dispare el farmeo de semillas de T-020).
- La regla de fusión "queda el nivel más bajo" no se ve afectada con la opción c; con a o b habría que revisarla.
- Riesgo de muro de farmeo: ningún jefe se equilibra contando con esta mejora.
- Riesgo de percepción: si el precio es muy alto y el paso es un 10 %, se siente caro para lo que da.

## Objetivo final con ejemplos
Con la opción c y los valores recomendados:
| Mejora | Disparadora recién sembrada | Tras subir a nivel 3 en partida |
|---|---|---|
| 0 | Daño base | +20 % de daño |
| 2 | +20 % de daño, 2 estrellas | +40 % de daño |
| 5 | +50 % de daño, 5 estrellas | +70 % de daño |

Error esperado: con mejora 5, comprar otro paso no está disponible ("Máximo").

## Cómo probarlo (QA)
1. Comprar un paso, empezar el brote 1 y comparar cuánto tarda en caer el primer gusano.
2. En la ronda 2, subir de nivel con normalidad.
3. Cargar una partida anterior a la compra.
