# [Plantas] Escudo: muro e infusión

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-016, T-018 · **Bloquea a:** T-025, T-026 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
Hoy hay dos elementos, fuego y hielo (`ElementType` en `src/game/core/plants.ts`). Sembrados solos son minas (`Mine` en `match.ts`); infundidos, cambian el disparo. Una disparadora admite un solo elemento (`canInfuse`).

Los escupitajos ya chocan con lo primero sembrado que encuentran en el carril (`firstSownInPath` en `combat.ts`): hoy nada dispara por encima de una planta. El escudo cobra sentido con los ataques del brote 2 (T-025 y T-026), que sí lo harán: los versos de Elk Cloner y de sus tropas cruzan el carril entero.

Decidido por Carmine: el escudo se gana en la ronda 2 del brote 2 (el de Elk Cloner desde el 21 nov 2026, cuando Blaster pasó al brote 11; el escudo no se mueve), ocupa el mismo hueco que fuego y hielo, no se puede disparar por detrás de un escudo ni saltar sobre él, y no existe la mezcla de fuego o hielo con escudo.

## Objetivos
1. **Escudo solo:** un muro que aguanta mucho y no ataca.
2. **Escudo infundido:** una disparadora con mucha más vida.
3. **Regla nueva de tablero:** ningún disparo ni salto enemigo pasa por encima de un escudo.

## Alcance
**Incluye:** carta de escudo, muro sembrado, infusión por carta y arrastrando el muro (como las minas en T-009), variante de escudo de la disparadora con 1, 2 y 3 cañones, regla de bloqueo, desbloqueo en el brote 2, tour (regla 9), ficha de información, sonido, valores en `balance.ts`, partida guardada, textos, tests.
**No incluye:** enemigos que disparan por encima (T-025) o que saltan (futuro), reparar escudos.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| E-01 | Un disparo bloqueado, ¿daña al escudo? | Sí o no | Sí: si no, un escudo por carril anula a todos los enemigos que disparan | Carmine |
| E-02 | La disparadora con escudo, ¿también bloquea lo que va hacia las de atrás? | Sí o no | Sí, pero con menos vida que el muro: el muro es la defensa pura | Carmine |
| E-03 | ¿Se fusionan entre sí dos disparadoras con escudo? | Sí o no | Sí, como cualquier variante igual (más cañones y la vida sumada) | Carmine |
| E-04 | ¿Infundir escudo en una de N cañones cuesta N escudos? | Sí o no | Sí, igual que fuego y hielo | Carmine |
| E-05 | Vida del muro y de la variante | Valores libres | Muro: unas 6 veces la disparadora. Variante: el triple de su vida normal | Carmine |
| E-06 | Creeper aterriza sobre un escudo al rejugar el brote 1: ¿qué pasa? | a) Lo golpea como a cualquier planta. b) No puede caer ahí | a: el escudo no existe en el brote 1 salvo que B-01 lo permita al rejugar | Carmine |

## Criterios de aceptación
### Muro
- [ ] Soltar la carta de escudo en una casilla vacía siembra un muro.
- [ ] El muro no dispara ni explota; los enemigos lo muerden hasta destruirlo.
- [ ] Se ve su desgaste a medida que pierde vida.

### Infusión
- [ ] Soltar el escudo sobre una disparadora sin elemento la convierte en disparadora con escudo, con el costo de E-04.
- [ ] Una disparadora con fuego o hielo no admite escudo, y una con escudo no admite fuego ni hielo.
- [ ] La disparadora con escudo dispara igual que una normal y tiene la vida de E-05.
- [ ] Al infundir, la vida que le faltaba a la planta se conserva en proporción (decidir al implementar y dejarlo escrito).

### Bloqueo
- [ ] Un disparo enemigo que encuentra un escudo en su carril no alcanza a nada de lo que hay detrás.
- [ ] Una unidad que salta no puede pasar por encima de un escudo (regla en `core` con test, aunque aún no haya unidades que salten).

### Desbloqueo
- [ ] En el brote 1 la carta de escudo no existe.
- [ ] En la ronda 2 del brote 2 se desbloquea, con su aviso y su tour. Según `docs/specs/04-historia.md`, lo presenta Patty ("He creado algo nuevo") y lo enseña Boxer; si T-032 aún no está hecha, sale como los avisos de hoy.

### Calidad
- [ ] Reglas puras con tests; valores en `balance.ts`.
- [ ] La partida guardada acepta muros y la variante nueva; sube `SAVE_VERSION`.
- [ ] Arte sobre la disparadora nueva de T-016; se distingue de fuego y hielo a 812 × 375.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Tres elementos y tres cañones dan 12 variantes de disparadora que pintar y equilibrar. Por eso no hay mezclas.
- Cuatro cartas en la bandeja: revisar que caben en 568 × 320.
- Un escudo en la primera columna de cada carril puede ser la jugada obligada. Si pasa, subir su precio o bajar su vida antes que tocar la regla.
- El escupidor ya choca con lo primero que encuentra: con el escudo no cambia, solo tarda más en romperlo.

## Objetivo final con ejemplos
| Acción | Resultado |
|---|---|
| Escudo en casilla vacía | Muro |
| Escudo sobre disparadora normal de 1 cañón | Disparadora con escudo, mucha más vida |
| Escudo sobre disparadora de fuego | No permitido |
| Fuego sobre disparadora con escudo | No permitido |
| Disparo enemigo hacia una planta que tiene un muro delante | Lo recibe el muro |

## Cómo probarlo (QA)
1. En el brote 2, llegar a la ronda 2 y seguir el tour.
2. Poner un muro delante de una disparadora y dejar que un escupidor dispare.
3. Intentar las dos mezclas prohibidas.
