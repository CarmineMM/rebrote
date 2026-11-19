# [Tablero] Sembrar disparadoras con moneda y HUD

**Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-002 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Hoy `BoardScene` solo dibuja el tablero de 5 carriles por 9 columnas (verificado en `src/game/scenes/BoardScene.ts`). No hay moneda, ni cartas, ni plantas. React muestra una cabecera fija en `src/App.tsx`.

## Objetivos
1. **Sembrar.** El jugador elige la disparadora y la coloca en una casilla vacía.
2. **Moneda única.** Sembrar cuesta moneda y el saldo se ve siempre.
3. **Puente React y Phaser.** El HUD vive en React y se entera de los cambios por `EventBus`.

## Alcance
**Incluye:** estado de partida en `src/game/core/` (saldo, casillas ocupadas), carta de disparadora en el HUD, sembrar con clic o arrastre, dibujo de la disparadora con formas (ADR-0004), eventos nuevos en `GameEvents`, tests de las reglas.
**No incluye:** enemigos y disparos (T-002), elementos (T-004, T-005), quitar plantas.

## Decisiones pendientes
| # | Pregunta | Recomendación | Decide |
|---|---|---|---|
| D-01 | Cómo se gana la moneda | Por enemigo eliminado más goteo pasivo | Carmine |

Mientras D-01 no esté cerrada, la partida arranca con un saldo fijo definido en `balance.ts` y no se gana más.

## Criterios de aceptación
### Tablero
- [ ] Al pasar el cursor con una carta seleccionada, la casilla bajo el cursor se resalta.
- [ ] Al soltar sobre una casilla vacía con saldo suficiente, aparece la disparadora y el saldo baja en el costo de `COSTS.shooter`.
- [ ] No se puede sembrar sobre una casilla ocupada.
- [ ] No se puede sembrar si el saldo no alcanza, y la carta se ve desactivada.

### HUD
- [ ] El saldo se muestra en React y cambia en el mismo instante que en el juego.
- [ ] La carta muestra su costo.

### Calidad
- [ ] Las reglas de saldo y ocupación están en `src/game/core/` sin importar Phaser, con tests.
- [ ] Ningún número fuera de `balance.ts`.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Soltar la carta fuera del tablero no cobra ni siembra.
- Dos clics muy rápidos sobre la misma casilla siembran una sola vez.
- El canvas se escala (`Scale.FIT`): las coordenadas del puntero deben seguir cayendo en la casilla correcta con la ventana pequeña.

## Objetivo final con ejemplos
Con saldo 250 y disparadora a 100:
| Acción | Resultado |
|---|---|
| Sembrar en casilla vacía | Planta visible, saldo 150 |
| Sembrar otra | Saldo 50 |
| Intentar una tercera | No siembra, carta desactivada, saldo 50 |
| Soltar sobre casilla ocupada | No siembra, saldo sin cambios |

## Cómo probarlo (QA)
1. `npm run dev` y abrir el juego.
2. Sembrar hasta agotar el saldo y comprobar la tabla anterior.
3. Reducir la ventana a la mitad y sembrar en una esquina del tablero.
