# [Plantas] Subir de nivel

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** T-002 · **Bloquea a:** T-007 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
`Shooter` ya tiene el campo `level` y `damageMultiplier` ya lo usa (verificado en `src/game/core/plants.ts`). El tope de 20 está en `LIMITS.maxLevel`. Falta la acción del jugador y la medallita.

Desde T-006:
- **Selección:** un clic sobre una planta, sin arrastrarla, no hace nada. Queda libre para seleccionarla aquí. El arrastre empieza al mover el puntero con el botón pulsado.
- **Medallita:** los puntos de los cañones van en el tallo (`SHOOTER_DOTS` en `textures.ts`). La nuca, arriba a la izquierda de la cabeza, queda libre para la medallita (ver `docs/guias/graficos.md`, sección 9).
- **Aviso de nivel al fusionar:** ya existe. Al arrastrar una planta sobre otra de nivel distinto sale "Quedará en nivel N". Con niveles reales hay que comprobarlo jugando.

## Objetivos
1. **Mejorar una planta sembrada** pagando con la moneda única.
2. **Mostrar el nivel** con una medallita discreta, válida también en plantas fusionadas.

## Alcance
**Incluye:** acción de subir nivel al seleccionar una planta, costo por nivel en `balance.ts`, efecto en daño y cadencia, medallita, tests.
**No incluye:** niveles permanentes entre partidas (depende de D-03), cambios de arte por nivel.

## Decisiones pendientes
| # | Pregunta | Recomendación | Decide |
|---|---|---|---|
| D-03 | Niveles por partida o permanentes | Por partida en el prototipo | Carmine |
| D-05 | Costo de cada nivel | Creciente suave | Carmine |

## Criterios de aceptación
- [ ] Al seleccionar una disparadora se muestra su nivel y el costo del siguiente.
- [ ] Al subir de nivel el saldo baja en ese costo y el nivel sube en 1.
- [ ] No se puede subir si el saldo no alcanza.
- [ ] No se puede pasar del nivel 20; en ese nivel la acción aparece como "Máximo".
- [ ] La medallita muestra el número de nivel y cambia de color cada 5 niveles.
- [ ] La medallita no tapa los puntos que indican los cañones.

### Calidad
- [ ] Costo y efecto por nivel calculados en `src/game/core/` con tests.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Si la planta muere mientras está seleccionada, el panel se cierra.
- Con incrementos muy pequeños el jugador no nota la mejora: hay que probar si +4 % por nivel se percibe.

## Objetivo final con ejemplos
| Planta | Acción | Resultado |
|---|---|---|
| Nivel 1 | Subir | Nivel 2, medallita "2", saldo reducido |
| Nivel 20 | Subir | No disponible, "Máximo" |
| Nivel 3, saldo insuficiente | Subir | No disponible, saldo sin cambios |

## Cómo probarlo (QA)
1. Sembrar una disparadora, seleccionarla y subirla dos niveles.
2. Comparar a ojo contra una de nivel 1 cuánto tarda cada una en eliminar un gusano.
