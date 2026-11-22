# [Progresión] Nivel base permanente de la disparadora

**Estado:** Completada (22 nov 2026, 0.12.0) · **Prioridad:** Baja · **Tamaño estimado:** M (orientativo) · **Depende de:** T-019, T-020, T-022 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
En la partida, cada disparadora empieza en nivel 1 y sube pagando moneda: cada nivel suma un 10 % de daño y un 3 % de cadencia (`LEVELING` en `balance.ts`, `levelBonus` en `src/game/core/plants.ts`). Desde T-027 (21 nov 2026), llegar a los niveles 5 y 15 suma 1,5 veces eso y llegar al 10 y al 20, el doble: como la mejora se cuenta como niveles (N-01 a), hay que decidir si la planta nace con esos premios (N-05). Cada ronda pone un tope de nivel: en el brote 1 es 5 desde la ronda 2 (`levelCap` en las rondas de `OUTBREAKS`, T-009, T-010 y T-018). Subir de nivel se desbloquea en la ronda 2 y tiene su tour.

Carmine quiere una mejora permanente y muy cara, con tope 5, para que las plantas empiecen la partida con ese nivel ya hecho, sin cambiar el precio de sembrarlas.

**Choque encontrado en el código y cómo se resolvió (N-01, 21 nov 2026):** si la disparadora llega a la partida en nivel 5 y el tope del brote 1 es 5, en ese brote ya no se puede subir de nivel. Carmine lo acepta: los brotes siguientes subirán el tope de nivel, así que la mejora deja margen donde importa. Además, la mejora solo se puede comprar con la tienda abierta, es decir, después de vencer a Creeper: el tour de subir de nivel ya se vio. El único caso afectado es rejugar el brote 1 con la mejora comprada.

## Objetivos
1. **Una mejora permanente** que se note desde la primera ronda.
2. **Que no rompa** subir de nivel dentro de la partida.
3. **Que sea opcional:** todos los jefes se vencen sin ella.

## Alcance
**Incluye:** mejora de la disparadora comprable en el Invernadero, su efecto en la partida, precios en `balance.ts`, marca visual, progreso permanente (sin migración: ADR-0014), textos, tests.
**No incluye:** mejoras permanentes de minas, escudo o poderes.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| N-01 | ¿Cómo se aplica la mejora? | **Cerrada (21 nov 2026): a.** La planta nace en nivel N y el tope de cada ronda sigue igual; los brotes futuros suben el tope | Cerrada | Carmine |
| N-05 | La planta que nace en nivel 5, ¿trae el premio del nivel 5 (T-027)? | **Cerrada (22 nov 2026): sí.** Es una planta de nivel 5 a todos los efectos, con su jardincito | Cerrada | Carmine |
| N-06 | ¿Cuánto cuesta subirla en la partida? | **Cerrada (22 nov 2026): a.** Lo que cuesta desde su nivel; no se toca la regla de costos | Cerrada | Carmine |
| N-02 | ¿Cuánto da cada paso? | **Cerrada (22 nov 2026):** lo mismo que un nivel de partida (10 % de daño y 3 % de cadencia, con el premio del 5) | Cerrada | Carmine |
| N-03 | Precios | **Cerrada (22 nov 2026):** crecientes, 1500, 3000, 5500 y 10.000 (del 1 al 5, 20.000); el paso al 5 es el artículo más caro de la tienda | Cerrada | Carmine |
| N-04 | ¿Afecta a rejugar brotes ya vencidos? | **Cerrada (22 nov 2026): sí.** Toda partida nueva, también la de un brote ya vencido | Cerrada | Carmine |

## Criterios de aceptación
- [x] En el Invernadero, la disparadora muestra su nivel base (de 1 a 5), el precio del siguiente paso y lo que aporta.
- [x] Comprar un paso descuenta las semillas y queda guardado.
- [x] No se puede pasar de 5; en 5 dice "Máximo".
- [x] Toda disparadora sembrada en una partida nueva trae la mejora aplicada.
- [x] El precio de sembrar y de infundir en la partida no cambia. El de subir de nivel sigue N-06.
- [x] Si la planta nace en el tope de la ronda, su panel dice que está al máximo para esta ronda, igual que hoy una planta subida al tope.
- [x] En un brote con tope mayor que la mejora, se puede subir de nivel con normalidad desde el nivel con el que nace.
- [x] Un jugador sin la mejora ve el tour de subir de nivel como hasta ahora.
- [x] La mejora se ve en la planta y en su ficha de información, también en plantas fusionadas.
- [x] Fusionar dos plantas no pierde ni duplica la mejora.
- [x] Una partida guardada antes de comprar la mejora no cambia al cargarla.

### Calidad
- [x] El efecto se calcula en `src/game/core/` con tests; valores en `balance.ts`.
- [x] Simular el brote 1 con nivel base 1 y con nivel base 5 y anotar el resultado en la spec: con nivel base 1 se sigue pudiendo ganar.
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Cómo quedó (22 nov 2026)
- Carmine aceptó todas las recomendaciones al empezar la task (N-02 a N-06).
- Al revisarla (22 nov 2026), Carmine dio por buenos la marca del brote en la medallita, los sonidos reutilizados y que no lleve tour. Los precios se quedan como están; si hace falta, se ajustarán junto con el resto de la economía (siguen como PROVISIONAL en `BASE_LEVEL`, como los de la tienda).
- Reglas en `src/game/core/baseLevel.ts` (con test); precios y tope en `BASE_LEVEL` de `balance.ts`. El nivel base va en el progreso (`Progress.baseLevel`, `PROGRESS_VERSION` 5) y en la partida (`MatchState.baseLevel`, `SAVE_VERSION` 9): se copia al empezarla, así que comprar con una partida a medias no la cambia. Lo guardado con la versión anterior se descarta (ADR-0014, regla 11).
- Se compra en "Plantas", en el Invernadero (antes con candado). La foto de la disparadora la compone la escena (`nurseryPortraits`).
- Marca visual: el brote del Invernadero, dos hojitas con ribete crema prendidas en la medallita (también en las fusionadas y en la foto de la ficha), y en la ficha la pastilla "Nivel base N, del Invernadero".
- Suena como mejorar un poder; llegar al 5, como un desbloqueo (`shopCue`).
- No lleva tour: no es una mecánica de partida (no tiene `Feature`), sino un artículo del Invernadero, como los poderes de la tienda.
- En desarrollo, `?nivelbase=N` hace que las partidas nuevas nazcan con ese nivel base.
- Simulación (`npm run sim`, bot sin escudos, 10 partidas del brote 1): nivel base 1, 9 de 10 ganadas y combate final de 57 s; nivel base 3, 10 de 10 y 50 s; nivel base 5, 10 de 10 y 44 s. Las rondas duran casi lo mismo (salen por tiempo): la mejora ayuda pero no trivializa el brote.

## Casos límite y riesgos
- Rejugar el brote 1 con nivel base 5: todas las disparadoras nacen al tope y subir de nivel no hace nada en ese brote. Revisar que no lo trivialice (y que eso no dispare el farmeo de semillas de T-020).
- Fusionar: queda el nivel más bajo de las dos. Como ninguna baja del nivel base, nunca queda por debajo de él.
- El tope de la mejora (5) tiene que ser siempre menor o igual que el tope de nivel de cualquier ronda donde se pueda sembrar; si no, la planta nacería por encima del tope.
- En la ronda 1 de cada brote, subir de nivel puede estar bloqueado y aun así las plantas nacen con su nivel base.
- Riesgo de muro de farmeo: ningún jefe se equilibra contando con esta mejora.
- Riesgo de percepción: si el precio es muy alto y el paso es un 10 %, se siente caro para lo que da.

## Objetivo final con ejemplos
Con los valores de `LEVELING` y los premios de T-027 (el nivel 5 da +45 % de daño):
| Nivel base | Disparadora recién sembrada | Brote 1 (tope 5) | Brote con tope 10 |
|---|---|---|---|
| 1 (sin comprar nada) | Nivel 1, daño base | Sube hasta el 5 | Sube hasta el 10 |
| 3 | Nivel 3, +20 % de daño | Le quedan 2 niveles | Le quedan 7 |
| 5 | Nivel 5, +45 % de daño y jardincito (si N-05 es sí) | Al máximo desde que nace | Le quedan 5 |

Error esperado: con nivel base 5, comprar otro paso no está disponible ("Máximo").

## Cómo probarlo (QA)
1. Comprar un paso, empezar el brote 1 y comparar cuánto tarda en caer el primer gusano.
2. Con nivel base 5, rejugar el brote 1 y abrir el panel de una disparadora.
3. Cargar una partida anterior a la compra.
