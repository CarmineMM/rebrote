# [Plantas] Subir de nivel

**Estado:** Completada (19 nov 2026) · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** T-002 · **Bloquea a:** T-007 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
`Shooter` ya tiene el campo `level` y `damageMultiplier` ya lo usa (verificado en `src/game/core/plants.ts`). El tope de 20 está en `LIMITS.maxLevel`. Falta la acción del jugador y la medallita.

Desde T-006:
- **Selección:** un clic sobre una planta, sin arrastrarla, no hace nada. Queda libre para seleccionarla aquí. El arrastre empieza al mover el puntero con el botón pulsado.
- **Medallita:** los puntos de los cañones van en el tallo (`SHOOTER_DOTS` en `textures.ts`). La nuca, arriba a la izquierda de la cabeza, queda libre para la medallita (ver `docs/guias/graficos.md`, sección 10).
- **Aviso de nivel al fusionar:** ya existe. Al arrastrar una planta sobre otra de nivel distinto sale "Quedará en nivel N". Con niveles reales hay que comprobarlo jugando.

Desde T-005:
- **Hielo y nivel:** lo que frena una disparadora de hielo depende de sus cañones (`ICE.bulletSlowByCannons`), no del nivel. La quemadura sí crece con el nivel (`damageMultiplier`). Si subir de nivel una de hielo tiene que frenar más, se decide aquí.
- **Medallita:** la disparadora de hielo tiene la cabeza muy clara (`#f4fcff` a `#9fdcff`). Comprobar que la medallita se lee también sobre ella.

## Objetivos
1. **Mejorar una planta sembrada** pagando con la moneda única.
2. **Mostrar el nivel** con una medallita discreta, válida también en plantas fusionadas.

## Alcance
**Incluye:** acción de subir nivel al seleccionar una planta, costo por nivel en `balance.ts`, efecto en daño y cadencia, medallita, tests.
**No incluye:** niveles permanentes entre partidas (D-03 los dejó por partida), cambios de arte por nivel.

## Decisiones
| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| D-03 | Niveles por partida o permanentes | Cerrada el 19 nov 2026 con la recomendación: por partida | Carmine |
| D-05 | Costo de cada nivel | Cerrada el 19 nov 2026: creciente, 75 de nivel 1 a 2 y 25 más por cada nivel (75, 100, 125…), multiplicado por los cañones como al infundir | Carmine |
| Añadida | ¿Cuánto mejora cada nivel? | Decidida el 19 nov 2026: +10 % de daño y +3 % de cadencia por nivel. Con los +4 % y +2 % provisionales, dos niveles no se notaban | Carmine |
| Desde T-005 | ¿Subir de nivel una de hielo hace que frene más? | Decidido al implementar: no. Lo que frena sigue dependiendo de los cañones, como quedó en T-005; la quemadura sí crece con el nivel. Se puede revisar | Carmine |
| Añadida | ¿Llevan medallita las de nivel 1? | Decidido al implementar: no. Así se ve de un vistazo qué plantas se han subido y el tablero no se llena de "1". El panel sí muestra "Nivel 1". Se puede revisar | Carmine |

## Criterios de aceptación

Comprobados el 19 nov 2026 con tests de Vitest (`plants.test.ts`, `match.test.ts` y `levelMedal.test.ts`) y en Chrome con ratón real: primero sin GPU (render por software) en Bajo, Medio y Ultra, y después con GPU (NVIDIA RTX 4060) en Bajo, Alto y Ultra. En Ultra con GPU va a 60 FPS al subir de nivel y también en la prueba de carga (tecla H) con 22 plantas con medallita. Casos probados:
- Seleccionar una planta con un clic, subirla con el botón del panel y comprobar saldo y nivel.
- Panel sin saldo suficiente y panel de una planta de nivel 20.
- Esc, clic en una casilla vacía y muerte de la planta seleccionada por un gusano: el panel se cierra.
- Medallitas de los cinco colores sobre la cabeza normal, la de fuego y la de hielo.
- Fusión por arrastre de plantas de nivel distinto (aviso "Quedará en nivel 5"), y medallita en las de 2 y 3 cañones.
- Panel de una planta del carril del fondo a 1600 × 900 (encima de la cabeza) y a 640 × 360 (bajo los pies, porque encima choca con el HUD). Cambio de tamaño de la ventana con el panel abierto.

- [x] Al seleccionar una disparadora se muestra su nivel y el costo del siguiente.
- [x] Al subir de nivel el saldo baja en ese costo y el nivel sube en 1.
- [x] No se puede subir si el saldo no alcanza.
- [x] No se puede pasar del nivel 20; en ese nivel la acción aparece como "Máximo".
- [x] La medallita muestra el número de nivel y cambia de color cada 5 niveles.
- [x] La medallita no tapa los puntos que indican los cañones.

### Calidad
- [x] Costo y efecto por nivel calculados en `src/game/core/` con tests.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Si la planta muere mientras está seleccionada, el panel se cierra. Probado con un gusano real.
- Con incrementos muy pequeños el jugador no nota la mejora. Con +4 % no se notaba, así que se subió a +10 % de daño y +3 % de cadencia por nivel. Aun así, dos niveles se notan poco: hasta el nivel 4 el gusano no cae con una semilla menos (ver "Valores").

## Objetivo final con ejemplos
| Planta | Acción | Resultado |
|---|---|---|
| Nivel 1 | Subir | Nivel 2, medallita "2", saldo reducido |
| Nivel 20 | Subir | No disponible, "Máximo" |
| Nivel 3, saldo insuficiente | Subir | No disponible, saldo sin cambios |

Las tres filas son un test de `match.test.ts`.

## Añadido durante la task

### Reglas
- **Costo y subida:** en `plants.ts`, `levelUpCost` (null en el nivel 20), `levelUp` y `levelBonus` (lo que suma el nivel en daño y cadencia sobre el nivel 1). En `match.ts`, `levelUpOffer` (nivel, costo, por cuánto se multiplica y por qué no se puede: `max-level` o `insufficient-funds`) y `levelUpPlant`, que cobra y sube.
- **Subir no cura ni recarga:** la planta conserva su vida y su recarga. El nivel nuevo cuenta desde el siguiente disparo.

### Interfaz
- **Seleccionar:** clic sobre una planta sin arrastrarla. Otro clic sobre ella la deselecciona y un clic sobre otra la cambia. Se cierra al hacer clic fuera, con Esc o clic derecho, al tomar una carta, al empezar a arrastrar, si la planta muere y al perder.
- **Casilla:** la de la planta seleccionada se marca en dorado y late despacio. La planta da un saltito.
- **Panel (React):** flota sobre la cabeza de la planta y la apunta con una flechita. Si arriba choca con el HUD, va bajo sus pies.
  - Muestra la medallita, "Nivel N", lo que suma ese nivel ("Daño +20 % · Cadencia +6 %") y el botón "Subir" con su precio ("×3 = 225" si tiene varios cañones, como al infundir).
  - Sin saldo, el botón se pone gris con el precio en rojo, y al pulsarlo el precio tiembla. En el nivel 20 dice "Máximo".
  - Sigue a la planta si cambia la ventana y se oculta con la pausa.
  - La escena le manda `plantPanel` y el botón responde con `levelUpRequested`. `selectionCancelled` (Esc) también lo cierra.

### Aspecto
- **Medallita:** un sello redondo con el borde ondulado, contorno oscuro y el número en blanco, prendido en la nuca. Se lee sobre la cabeza normal, la de fuego y la de hielo.
  - Color por tramos: bronce (2 a 4), plata (5 a 9), oro (10 a 14), rubí (15 a 19) y cristal irisado con dos destellos en el 20.
  - Va por encima de la figura que respira, así no se despega de la cabeza. Al fusionarse se recoloca en la cabeza nueva (más grande) y toma el nivel resultante. Si queda en nivel 1, desaparece.
  - Un test comprueba que no tapa los puntos del tallo, el ojo ni los cañones, con 1, 2 y 3 cañones.
- **Subir:** la planta da un estirón y destella, sale un anillo dorado en el suelo con destellos, y la medallita sale girando con el número nuevo. Si cambia de color, un anillo y un brillo mayores de su color. No hay texto flotante: subiría por detrás del panel, que ya hace saltar el nivel nuevo.
- **Forma de la disparadora en `shooterShape.ts`** (pies, cañones, puntos del tallo, cabeza y ojo), sin Phaser, para poder probar la medallita con Vitest. `textures.ts` la reexporta.
- Detalle en `docs/guias/graficos.md`, secciones 8 y 10.

### Valores (en `balance.ts`, PROVISIONAL)
| Qué | Valor |
|---|---|
| Daño por nivel (`LEVELING.damagePerLevel`) | +10 % sobre el nivel 1 (también la quemadura) |
| Cadencia por nivel (`LEVELING.fireRatePerLevel`) | +3 % sobre el nivel 1 |
| Costo (`LEVELING.baseCost`, `LEVELING.costStep`, D-05) | 75 de nivel 1 a 2 y 25 más por nivel, por cañón. De 19 a 20, 525. Llevar una de un cañón al 20 cuesta 5700 |

Con estos números, una disparadora de un cañón tarda en matar un gusano (5 semillas en nivel 1) 5,6 s en nivel 1 y 5,3 s en nivel 3. En nivel 4 lo mata con 4 semillas, en 3,9 s. En nivel 10 hace 1,9 veces el daño por disparo y dispara 1,27 veces más seguido.

## Cómo probarlo (QA)
1. Sembrar una disparadora, seleccionarla con un clic y subirla dos niveles. El saldo baja 75 y luego 100, y la medallita pasa a "2" y a "3".
2. Comparar a ojo contra una de nivel 1 cuánto tarda cada una en eliminar un gusano. En nivel 3 la diferencia es pequeña; en nivel 4 se ve bien (una semilla menos).
3. Con poco saldo: el botón se pone gris y el precio en rojo. Al pulsarlo tiembla y no pasa nada.
4. Seleccionar una planta y pulsar Esc, hacer clic en una casilla vacía o dejar que un gusano se la coma: el panel se cierra.
5. Fusionar dos plantas de nivel distinto: aviso "Quedará en nivel N" y la fusionada lleva esa medallita.
6. **Plantas enteras:** sin GPU, las capturas salen con trozos sin pintar (ver T-002). Comprobado con GPU en Alto y Ultra: las medallitas se ven enteras y nítidas sobre las tres variantes y en las fusionadas de 2 y 3 cañones.
