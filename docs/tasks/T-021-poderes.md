# [Poderes] Tres poderes en la partida y panel izquierdo

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-018 · **Bloquea a:** T-022 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
En la partida el jugador siembra, infunde, fusiona y sube de nivel (`src/game/core/match.ts`). No hay habilidades de uso puntual. Carmine quiere poderes que se compran en la tienda y se usan desde un panel a la izquierda: recolocar una planta, un meteorito pequeño y un muro de hielo que cubre una fila entera.

Esta task construye los poderes y su panel. De dónde salen las cargas (la tienda) es T-022. Mientras tanto, las cargas se dan desde la configuración para poder probar.

## Objetivos
1. **Tres poderes** con un efecto claro y distinto cada uno.
2. **Panel izquierdo** para elegirlos y lanzarlos.
3. **Que ayuden sin sustituir a las plantas.**

## Alcance
**Incluye:** reglas de los tres poderes en `src/game/core/`, valores en `balance.ts`, panel en el HUD, apuntado sobre el tablero, efectos y sonido, un tour por poder (regla 9), cargas en la partida guardada, textos, tests.
**No incluye:** comprar o mejorar poderes (T-022), poderes nuevos.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| O-01 | ¿Se gastan para siempre o se recargan? | a) Un uso: se compra cada unidad. b) Se compra una vez y trae 1 carga por partida | b: con a, el jugador los guarda "por si acaso" y no los usa, y un jefe pensado con poderes bloquea a quien se quedó sin ellos | Carmine |
| O-02 | ¿Cuántos poderes se llevan a una partida? | 1, 2 o los 3 | 2: obliga a elegir | Carmine |
| O-03 | Recolocar: ¿qué mueve y a dónde? | Cualquier planta o mina a una casilla vacía | Solo disparadoras, a cualquier casilla vacía, conservando vida, nivel, elemento y cañones | Carmine |
| O-04 | Meteorito: ¿tamaño y daño? | Valores libres | Una casilla y sus vecinas; daño de una mina de fuego. No daña plantas | Carmine |
| O-05 | Muro de hielo: ¿qué hace en la fila? | a) Bloquea el paso. b) Congela a los enemigos | b: congela unos segundos a todos los de esa fila; dura poco | Carmine |
| O-06 | ¿Afectan a los jefes? | Igual, menos o nada | Menos: la mitad de daño y de duración | Carmine |
| O-07 | ¿Se usan en la preparación? | Sí o no | Recolocar sí; meteorito y muro solo en el ataque | Carmine |

## Criterios de aceptación
### Panel
- [ ] A la izquierda aparecen los poderes que lleva el jugador, con sus cargas.
- [ ] Un poder sin cargas se ve apagado y no se puede elegir.
- [ ] Sin ningún poder, el panel no aparece.
- [ ] Elegir un poder y cancelarlo (Escape, clic derecho o tocar fuera) no gasta la carga.

### Recolocar
- [ ] Se elige una planta y luego una casilla vacía; la planta aparece allí tal como estaba.
- [ ] No se puede soltar sobre una casilla ocupada ni fuera del tablero.

### Meteorito
- [ ] Antes de soltar se ve el área afectada.
- [ ] Daña a los enemigos del área y no a las plantas.

### Muro de hielo
- [ ] Se elige una fila y se ve resaltada entera antes de confirmar.
- [ ] Todos los enemigos de esa fila quedan afectados durante el tiempo configurado, también los que entran mientras dura (decidir al implementar y dejarlo escrito).

### Calidad
- [ ] Cada uso gasta exactamente una carga, también si no alcanza a ningún enemigo.
- [ ] Las cargas restantes se guardan con la partida y se respetan al cargarla.
- [ ] En pausa no corre ninguna duración.
- [ ] Reglas puras con tests; valores en `balance.ts`; un tour por poder; sonido por poder si T-014 está hecha.
- [ ] El panel no tapa el tablero a 812 × 375 ni a 568 × 320.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Recolocar una planta a la que un gusano está mordiendo: el gusano sigue avanzando.
- Recolocar durante un arrastre de fusión: no se pueden mezclar los dos gestos.
- Meteorito sobre Creeper en el aire: decidir si le alcanza.
- La forma de la partida guardada cambia: sube `SAVE_VERSION` (regla 8).
- Riesgo de balance: si los poderes resuelven las rondas difíciles, las plantas pierden peso. Las rondas se equilibran sin contar con ellos.

## Objetivo final con ejemplos
| Acción | Resultado |
|---|---|
| Meteorito sobre un grupo de 4 gusanos | Los 4 reciben daño; las plantas vecinas, nada; queda 0 cargas |
| Muro de hielo en la fila 3 | Todos los enemigos de la fila 3 se detienen unos segundos |
| Recolocar una disparadora de fuego de 2 cañones, nivel 4 | Aparece en la casilla nueva con lo mismo |
| Elegir meteorito y pulsar Escape | No se gasta |

## Cómo probarlo (QA)
1. Con cargas dadas por configuración, usar cada poder una vez.
2. Guardar con una carga gastada, cargar y comprobar que sigue gastada.
3. Probar el panel en un móvil en horizontal.
