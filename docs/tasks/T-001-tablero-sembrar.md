# [Tablero] Sembrar disparadoras con moneda y HUD

**Estado:** Completada (19 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-002 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Hoy `BoardScene` solo dibuja el tablero de 5 carriles por 9 columnas (verificado en `src/game/scenes/BoardScene.ts`). No hay moneda, ni cartas, ni plantas. React muestra una cabecera fija en `src/App.tsx`.

## Objetivos
1. **Sembrar.** El jugador elige la disparadora y la coloca en una casilla vacía.
2. **Moneda única.** Sembrar cuesta moneda, se gana por goteo pasivo y por enemigo eliminado, y el saldo se ve siempre.
3. **Puente React y Phaser.** El HUD vive en React y se entera de los cambios por `EventBus`.

## Alcance
**Incluye:** estado de partida en `src/game/core/` (saldo, casillas ocupadas), carta de disparadora en el HUD, sembrar con clic o arrastre, dibujo de la disparadora con formas (ADR-0004), eventos nuevos en `GameEvents`, goteo pasivo, recompensa por enemigo eliminado lista para que la use T-002 (`BoardScene.rewardKill`), moneda soltada que se recoge con clic, tests de las reglas.
**No incluye:** enemigos y disparos (T-002), elementos (T-004, T-005), quitar plantas.

## Decisiones
| # | Pregunta | Decisión | Decidió |
|---|---|---|---|
| D-01 | Cómo se gana la moneda | Cerrada (19 nov 2026). Por enemigo eliminado más goteo pasivo. Al eliminar un enemigo, el 90 % de las veces se cobra sola; el 10 % el enemigo la suelta y solo se cobra con un clic, que da un 15 % más redondeado hacia arriba. Sin decimales. | Carmine |

Cuánto dura en el suelo la moneda soltada no se decidió: queda en 8 s como PROVISIONAL en `ECONOMY.dropLifetimeMs`.

## Criterios de aceptación

Todos comprobados el 19 nov 2026: con tests de Vitest y jugando en el navegador. Las bajas de enemigos se simularon con las teclas `K` y `D` hasta que exista T-002.

### Tablero
- [x] Al pasar el cursor con una carta seleccionada, la casilla bajo el cursor se resalta.
- [x] Al soltar sobre una casilla vacía con saldo suficiente, aparece la disparadora y el saldo baja en el costo de `COSTS.shooter`.
- [x] No se puede sembrar sobre una casilla ocupada.
- [x] No se puede sembrar si el saldo no alcanza, y la carta se ve desactivada.

### HUD
- [x] El saldo se muestra en React y cambia en el mismo instante que en el juego.
- [x] La carta muestra su costo.

### Moneda
- [x] El saldo sube `ECONOMY.passiveIncome` cada `ECONOMY.passiveIntervalMs`.
- [x] Al eliminar un enemigo, el 90 % de las veces suma `ECONOMY.killReward` sin hacer nada.
- [x] El otro 10 % aparece una moneda en el suelo con su valor; al hacerle clic suma `ceil(killReward × 1,15)` (29 con 25) y desaparece.
- [x] Hacer clic en una moneda con una carta elegida recoge la moneda y no siembra debajo.
- [x] La moneda que no se recoge parpadea al final y se pierde sin sumar nada.
- [x] El saldo nunca tiene decimales.

### Calidad
- [x] Las reglas de saldo y ocupación están en `src/game/core/` sin importar Phaser, con tests.
- [x] Ningún número fuera de `balance.ts`.
- [x] `npm test` y `npm run build` pasan.

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

## Añadido durante la task

Carmine pidió además mejorar los gráficos. Quedó así:
- **Cámara y escena:** la cámara está inclinada y el césped es parte de un escenario animado: cielo, sol, nubes, árbol, ciudad lejana, camino, bancal de flores, suelo corrupto con agujeros y corte de tierra (ADR-0005).
- **Arte y animación:** la disparadora brota, respira y se mece; las monedas saltan, giran y vuelan al marcador; el HUD está animado (ADR-0004).
- **Pantalla completa:** el juego ocupa toda la pantalla con cualquier proporción, mostrando más decorado en vez de bandas. El HUD flota encima (ADR-0007).
- **Menú de pausa:** con el botón de pausa, Esc o P se congela el juego y se llega a los ajustes: pantalla completa, calidad gráfica (Bajo, Medio, Alto, Ultra y Automático, ADR-0006) y FPS.

Reglas para lo que venga: `docs/guias/graficos.md`.

## Cómo probarlo (QA)
1. `npm run dev` y abrir el juego.
2. Sembrar hasta agotar el saldo y comprobar la tabla anterior.
3. Reducir la ventana a la mitad y sembrar en una esquina del tablero (también en las del fondo, que se ven más pequeñas).
4. Esperar 10 s sin hacer nada: el saldo sube 25.
5. Hasta que exista T-002, en `npm run dev` hay dos atajos: `K` simula un enemigo eliminado con la probabilidad real y `D` uno que siempre suelta la moneda. Pulsar `D`, hacer clic en la moneda y comprobar que suma 29. Pulsar `D` otra vez y no tocarla: desaparece a los 8 s sin sumar.
6. Pausar (Esc o P), entrar en Ajustes y pasar de Medio a Bajo y a Alto: el escenario se recarga en pausa y el saldo y las plantas siguen ahí.
7. Con una moneda en el suelo, pausar más de 10 s y continuar: ni el saldo subió durante la pausa ni la moneda caducó.
8. Cambiar el tamaño de la ventana (más ancha, más alta): el juego sigue llenándola sin bandas y se siembra en la casilla correcta.
