# [Combate] Gusanos, disparos y derrota

**Estado:** Completada (19 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** T-001 · **Bloquea a:** T-003, T-004, T-006 · **Origen:** conversación de diseño del 18 y 19 nov 2026

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

Comprobados el 19 nov 2026 con tests de Vitest (`combat.test.ts`, `spawner.test.ts`) y con partidas automatizadas en Chromium sin GPU (render por software): partida jugando, partida sin sembrar hasta la derrota con pausa a mitad, prueba de rendimiento con la tecla `H` y capturas en Bajo y Medio. El rendimiento en Medio y Ultra y el aspecto con la prueba de `H` los confirmó Carmine en su equipo con GPU.

### Enemigos
- [x] El gusano aparece fuera del borde derecho y avanza a velocidad constante por un carril.
- [x] Al tocar una planta se detiene y le quita vida a intervalos hasta destruirla, y luego sigue.
- [x] Al quedarse sin vida desaparece con animación y paga su recompensa con `BoardScene.rewardKill(punto)`, donde `punto` es su posición en coordenadas de tablero (T-001 ya resuelve si se cobra sola o la suelta).

### Disparo
- [x] Una disparadora sin enemigos en su carril no dispara.
- [x] Una disparadora no dispara a enemigos que ya la pasaron.
- [x] Cada bala desaparece al impactar o al salir del tablero.

### Derrota
- [x] Cada enemigo que cruza el borde izquierdo resta una vida y desaparece.
- [x] Con 0 vidas el juego se detiene y React muestra la pantalla de derrota con un botón que reinicia la partida.

### Aspecto (ADR-0004, ADR-0005, ADR-0006)
- [x] Gusano, balas y daño siguen `docs/guias/graficos.md`, incluida su lista de comprobación de enemigo nuevo.
- [x] El gusano sale del agujero de su carril (`SCENERY.holeX`), avanza ondulando y tiene animación de mordisco, golpe recibido y muerte.
- [x] La disparadora reacciona al disparar (retroceso del cañón) y al recibir un mordisco.
- [x] Posiciones y velocidades en coordenadas de tablero (casillas y casillas por segundo); se pintan con `perspective.toScreen`.
- [x] Se ve bien en Bajo y aguanta en Ultra.
- [x] Con el menú de pausa abierto, gusanos, balas y mordiscos se quedan congelados (usan el reloj y los tweens de la escena, ADR-0007).
- [x] La pantalla de derrota es una superposición de React como el menú de pausa. Reiniciar empieza una partida nueva, sin continuar la anterior (`resume`).

### Calidad
- [x] El daño usa `damageMultiplier` de `src/game/core/plants.ts`.
- [x] Con 60 enemigos y 20 plantas en pantalla el juego se mantiene fluido en Medio (medir con "Mostrar FPS"). Sin GPU, el JavaScript ocupa un 5 % del tiempo con la prueba y sin ella: el coste es de rellenar píxeles.
- [x] `npm test` y `npm run build` pasan.

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

Hecho: se quitaron los atajos de depuración `K` y `D` de `BoardScene` (los añadió T-001 para probar la moneda sin enemigos). En su lugar queda `H`, solo en `npm run dev`, para medir el rendimiento.

## Añadido durante la task
- **Simulación pura (ADR-0008):** el combate avanza con `stepCombat` en `src/game/core/combat.ts` y devuelve eventos que la escena anima. La partida guarda también enemigos, balas, vidas y generador, así que cambiar la calidad gráfica en mitad de una pelea la continúa.
- **Vidas en el HUD:** un corazón por vida, junto al saldo. Laten por turnos; el que se pierde se rompe y se apaga.
- **Generador de prueba** (`src/game/core/spawner.ts`): el primer gusano sale a los 12 s y luego uno cada 10 s, cada vez 0,35 s antes, hasta uno cada 3 s. Carril al azar. Lo cambiará T-007.
- **Prueba de rendimiento:** la tecla `H` (solo en desarrollo) siembra gratis las cuatro primeras columnas y suelta 60 gusanos con 20 veces su vida, repartidos por la derecha del césped.
- **Vistas nuevas** en `src/game/view/`: `plantView.ts`, `wormView.ts`, `bulletView.ts` y `effects.ts`. La guía de gráficos explica cómo se anima cada evento (sección 5).

### Valores provisionales (en `balance.ts`)
| Qué | Valor |
|---|---|
| Vidas (D-07) | 3 |
| Disparadora | 300 de vida, 20 de daño cada 1,4 s, semilla a 6 casillas/s |
| Gusano | 100 de vida, 0,25 casillas/s, muerde 50 cada 1 s (el primero a los 0,45 s) |

Con estos números una disparadora sola elimina un gusano de su carril en unos 7 s y un gusano se come una disparadora en unos 5,5 s.

## Cómo probarlo (QA)
1. `npm run dev`. Sembrar una disparadora en un carril y dejar otro vacío.
2. Comprobar que solo dispara al carril propio y que el gusano de su carril muere antes de llegar.
3. Dejar que un gusano llegue a una planta: se para, muerde, la planta se encoge y amarillea, y al destruirla el gusano sigue.
4. Con gusanos y balas en pantalla, pausar (Esc o P) unos segundos: todo queda quieto. Al continuar sigue donde estaba.
5. En mitad de una pelea, cambiar la calidad en Ajustes: la pelea continúa con los mismos gusanos, balas y vidas.
6. No sembrar nada y esperar a la derrota (unos 70 s). Esc y P no abren la pausa. Pulsar "Jugar otra vez": tablero limpio, 3 vidas y 250 de saldo.
7. **Rendimiento:** en Medio, activar "Mostrar FPS" y pulsar `H`. Durante los primeros segundos hay 20 plantas y 60 gusanos: debe mantenerse fluido. Repetir en Ultra.
8. **Plantas enteras:** con la prueba de `H` en marcha, mirar que ninguna planta se ve a trozos. Sin GPU, algunas capturas salían con trozos sin pintar que cambiaban de un fotograma a otro; leyendo el lienzo directamente salían enteras, así que parece cosa del render por software.
