# [Combate] Gusanos, disparos y derrota

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** T-001 · **Bloquea a:** T-003, T-004, T-006 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Tras T-001 se pueden sembrar disparadoras, pero no hay nada contra qué defenderse. Esta task crea el bucle mínimo de juego.

## Objetivos
1. **Enemigo básico.** El gusano entra por la derecha y avanza por su carril.
2. **Disparo.** La disparadora dispara solo si hay un enemigo en su carril.
3. **Daño en ambos sentidos.** Las balas dañan al gusano y el gusano muerde a la planta.
4. **Derrota.** Se pierde cuando los enemigos cruzan el tablero.

## Alcance
**Incluye:** entidad gusano, proyectiles, vida de plantas y enemigos, generador simple de enemigos para pruebas, pantalla de derrota con reiniciar, valores en `balance.ts`, tests del cálculo de daño.
**No incluye:** rondas con guion (T-007), acorazado y escupidor (T-007), victoria.

## Decisiones pendientes
| # | Pregunta | Recomendación | Decide |
|---|---|---|---|
| D-07 | Cómo se pierde | 3 vidas | Carmine |

Mientras D-07 no esté cerrada se implementa con un contador de vidas configurable en `balance.ts`, con valor 3.

## Criterios de aceptación
### Enemigos
- [ ] El gusano aparece fuera del borde derecho y avanza a velocidad constante por un carril.
- [ ] Al tocar una planta se detiene y le quita vida a intervalos hasta destruirla, y luego sigue.
- [ ] Al quedarse sin vida desaparece con animación y paga su recompensa con `BoardScene.rewardKill(punto)`, donde `punto` es su posición en coordenadas de tablero (T-001 ya resuelve si se cobra sola o la suelta).

### Disparo
- [ ] Una disparadora sin enemigos en su carril no dispara.
- [ ] Una disparadora no dispara a enemigos que ya la pasaron.
- [ ] Cada bala desaparece al impactar o al salir del tablero.

### Derrota
- [ ] Cada enemigo que cruza el borde izquierdo resta una vida y desaparece.
- [ ] Con 0 vidas el juego se detiene y React muestra la pantalla de derrota con un botón que reinicia la partida.

### Aspecto (ADR-0004, ADR-0005, ADR-0006)
- [ ] Gusano, balas y daño siguen `docs/guias/graficos.md`, incluida su lista de comprobación de enemigo nuevo.
- [ ] El gusano sale del agujero de su carril (`SCENERY.holeX`), avanza ondulando y tiene animación de mordisco, golpe recibido y muerte.
- [ ] La disparadora reacciona al disparar (retroceso del cañón) y al recibir un mordisco.
- [ ] Posiciones y velocidades en coordenadas de tablero (casillas y casillas por segundo); se pintan con `perspective.toScreen`.
- [ ] Se ve bien en Bajo y aguanta en Ultra.
- [ ] Con el menú de pausa abierto, gusanos, balas y mordiscos se quedan congelados (usan el reloj y los tweens de la escena, ADR-0007).
- [ ] La pantalla de derrota es una superposición de React como el menú de pausa. Reiniciar empieza una partida nueva, sin continuar la anterior (`resume`).

### Calidad
- [ ] El daño usa `damageMultiplier` de `src/game/core/plants.ts`.
- [ ] Con 60 enemigos y 20 plantas en pantalla el juego se mantiene fluido en Medio (medir con "Mostrar FPS").
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Una bala en vuelo cuando su objetivo muere sigue hasta el siguiente enemigo o sale del tablero.
- Dos gusanos mordiendo la misma planta: al morir la planta, los dos siguen avanzando.
- Reiniciar no deja balas, enemigos ni temporizadores de la partida anterior.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Disparadora en carril 2, gusano en carril 2 | Dispara y lo elimina antes de que llegue |
| Disparadora en carril 2, gusano en carril 3 | No dispara; el gusano cruza y resta una vida |
| Tres gusanos cruzan | Pantalla de derrota |

Al cerrar esta task se quitan los atajos de depuración `K` y `D` de `BoardScene` (los añadió T-001 para probar la moneda sin enemigos).

## Cómo probarlo (QA)
1. Sembrar una disparadora en un carril y dejar otro vacío.
2. Comprobar que solo dispara al carril propio.
3. No sembrar nada y esperar a la derrota. Pulsar reiniciar y verificar que el tablero queda limpio.
