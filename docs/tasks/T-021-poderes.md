# [Poderes] Tres poderes en la partida y panel izquierdo

**Estado:** Completada (22 nov 2026, 0.9.0) · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-018 · **Bloquea a:** T-022 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
En la partida el jugador siembra, infunde, fusiona y sube de nivel (`src/game/core/match.ts`). No hay habilidades de uso puntual. Carmine quiere poderes que se compran en la tienda y se usan desde un panel a la izquierda: recolocar una planta, una granada y un muro de hielo.

Al empezar la task (22 nov 2026) Carmine cambió dos de los tres poderes de la propuesta de diseño: el meteorito pasa a ser una **granada** que alguien lanza desde detrás de las plantas, y el muro de hielo que cubría una fila entera pasa a ser un **muro de tres casillas que bloquea el paso**.

Esta task construye los poderes y su panel. De dónde salen las cargas (la tienda) es T-022. Mientras tanto, las cargas se dan desde la configuración para poder probar.

## Objetivos
1. **Tres poderes** con un efecto claro y distinto cada uno.
2. **Panel izquierdo** para elegirlos y lanzarlos.
3. **Que ayuden sin sustituir a las plantas.**

## Alcance
**Incluye:** reglas de los tres poderes en `src/game/core/`, valores en `balance.ts`, panel en el HUD, apuntado sobre el tablero, efectos y sonido, un tour por poder (regla 9), cargas en la partida guardada, textos, tests.
**No incluye:** comprar o mejorar poderes (T-022), elegir cuáles se llevan (T-022), poderes nuevos.

## Decisiones
Cerradas por Carmine el 22 nov 2026, al empezar la task: O-04 a O-06 cambiadas por él, O-09 a O-11 preguntadas al empezar y las demás con la recomendación.

| # | Pregunta | Opciones | Recomendación | Decidido |
|---|---|---|---|---|
| O-01 | ¿Se gastan para siempre o se recargan? | a) Un uso: se compra cada unidad. b) Se compra una vez y trae 1 carga por partida | b: con a, el jugador los guarda "por si acaso" y no los usa, y un jefe pensado con poderes bloquea a quien se quedó sin ellos | b (la recomendación) |
| O-02 | ¿Cuántos poderes se llevan a una partida? | 1, 2 o los 3 | 2: obliga a elegir | 2 (la recomendación). Se eligen en la tienda (T-022); hasta entonces, O-08 |
| O-03 | Recolocar: ¿qué mueve y a dónde? | Cualquier planta o mina a una casilla vacía | Solo disparadoras, a cualquier casilla vacía, conservando vida, nivel, elemento y cañones | La recomendación |
| O-04 | Meteorito: ¿tamaño y daño? | Valores libres | Una casilla y sus vecinas; daño de una mina de fuego. No daña plantas | **Granada, no meteorito.** Del tamaño de una mina de fuego, con su mecha. Se lanza desde detrás de las plantas, como si la tirara alguien (en curva), cae en la casilla elegida y explota a los 2 s. Es invulnerable: los enemigos no la atacan. Alcanza más que la mina. Daño de una mina de fuego; no daña plantas |
| O-05 | Muro de hielo: ¿qué hace en la fila? | a) Bloquea el paso. b) Congela a los enemigos | b: congela unos segundos a todos los de esa fila; dura poco | **a, en tres casillas.** Bloquea el paso, con la vida de una disparadora de nivel 1 (300), y dura unos 10 s. No se puede poner si alguna de sus casillas está ocupada. Un enemigo que está dentro de una de sus casillas sale hacia atrás o hacia delante, según cuánto haya entrado |
| O-06 | ¿Afectan a los jefes? | Igual, menos o nada | Menos: la mitad de daño y de duración | **Igual.** El muro es solo un muro y la granada, solo una explosión |
| O-07 | ¿Se usan en la preparación? | Sí o no | Recolocar sí; granada y muro solo en el ataque | La recomendación |
| O-08 | Hasta la tienda (T-022), ¿qué poderes trae cada partida? | a) Los 3 para todos. b) Solo en desarrollo. c) 2 fijos | a: así se prueban todos; la tienda deja elegir 2 (O-02) | a (la recomendación): los tres, con 1 carga cada uno. En desarrollo, `?poderes=` en la dirección elige otros o ninguno |
| O-09 | El muro de 3 casillas, ¿hacia dónde se extiende? | a) 3 carriles, en una columna. b) 3 columnas de un carril | a: es una barrera que corta el paso | a (la recomendación): la casilla elegida y las de arriba y abajo. En el carril de arriba o el de abajo se mete dentro del tablero |
| O-10 | La vida del muro, ¿de cada trozo o de todo? | a) 300 cada trozo. b) 300 entre los tres | a: cada bloque se agrieta y se rompe por su cuenta | a (la recomendación) |
| O-11 | Los versos del Minstrel y de Elk Cloner, ¿los para el muro de hielo? | a) Sí, como el muro de escudo. b) No, lo cruzan | a: es un muro | a (la recomendación): para lo que va hacia lo de detrás, como el escudo (T-024) |

### Decidido al implementar
- **Cómo se lanza un poder:** como una carta. Se toca en el panel y luego el tablero, o se arrastra desde el panel. Volver a tocarlo, Esc, clic derecho o tocar fuera del tablero lo sueltan sin gastarlo; soltarlo arrastrado fuera del tablero también. Tomar una carta lo suelta, y con un poder elegido no se arrastra ni se selecciona ninguna planta (no se mezclan los gestos).
- **Recolocar:** se toca la disparadora (o se arrastra hasta su destino, como al fusionar); con ella en la mano, otro toque en una casilla vacía la lleva allí. Tocarla otra vez la deja en su sitio y tocar otra disparadora cambia de planta. Si la destruyen mientras se lleva, se deshace y el poder sigue elegido, sin gastar. Conserva también la recarga.
- **Granada:** puede caer en cualquier casilla del tablero, también junto a una planta (no ocupa la casilla). Vuela 0,9 s desde el camino, a la izquierda del césped, y la cuenta de 2 s empieza al caer. Alcanza 1,8 casillas (la mina, 1,5). A Creeper en el aire no le alcanza, como a las minas. Los Copycat que tumba dejan como mucho dos copias, como con la mina. Si la partida acaba con ella en vuelo, se apaga sin explotar. Es una granada de fruta, con su corona y una anilla.
- **Muro de hielo:** un enemigo está "dentro" de una casilla si su centro cae en ella, y sale con el cuerpo entero por el lado más cercano. Los que llegan mientras dura se paran a morderlo: es un muro. Se derrite también en la preparación si dura hasta ella, y avisa en sus últimos 3 s (gotea, encoge y parpadea). No se arrastra ni se infunde; tiene ficha.
- **Tours:** uno por poder. Salen en la primera preparación en que se lleva y la ronda no trae otro tour por ver: así no se juntan con lo básico de la ronda 1. Con los poderes de prueba, un jugador nuevo los ve en la ronda 7 del brote 1; en el brote 2, en la 1. Recolocar se prueba de verdad; la granada y el muro, que en la preparación no se usan, se enseñan con su dibujo y "Siguiente".
- **Panel:** a la izquierda, a media altura del césped y fuera de él; botones de 60 px (44 en un móvil en horizontal), con las cargas en una pastilla dorada. Sin cargas, apagado; la granada y el muro, en la preparación, en espera con un relojito.
- **Sonido:** ocho efectos nuevos (`relocate`, `grenadeThrow`, `grenadeLand`, `grenadeBoom`, `iceWallRise`, `iceHit`, `iceBreak`, `iceMelt`), elegidos de los paquetes de Kenney con dos alternativas cada uno; la cuenta atrás de la granada hace el tic de la mina. Carmine los puede cambiar de oído en `/sonidos.html`.
- **Cómo se hace:** ADR-0020 (las cargas en la partida, la granada como entidad del combate y cada bloque de hielo como lo sembrado de una casilla).

## Criterios de aceptación
### Panel
- [x] A la izquierda aparecen los poderes que lleva el jugador, con sus cargas.
- [x] Un poder sin cargas se ve apagado y no se puede elegir.
- [x] Sin ningún poder, el panel no aparece.
- [x] Elegir un poder y cancelarlo (Escape, clic derecho o tocar fuera) no gasta la carga.

### Recolocar
- [x] Se elige una planta y luego una casilla vacía; la planta aparece allí tal como estaba.
- [x] No se puede soltar sobre una casilla ocupada ni fuera del tablero.

### Granada
- [x] Antes de soltarla se ve el área afectada, mayor que la de la mina.
- [x] Vuela en curva desde detrás de las plantas, cae en la casilla elegida y explota a los 2 s.
- [x] Los enemigos no la atacan ni la paran.
- [x] Daña a los enemigos del área, también a los jefes, y no a las plantas.

### Muro de hielo
- [x] Se elige una casilla y se ven resaltadas sus tres casillas antes de confirmar; si alguna está ocupada, no se puede.
- [x] Bloquea el paso: los enemigos lo muerden y le disparan como a un muro, también los jefes.
- [x] Cada trozo tiene la vida de una disparadora de nivel 1 y se derrite al acabar su tiempo.
- [x] Un enemigo dentro de una de sus casillas sale hacia atrás o hacia delante según cuánto haya entrado.

### Calidad
- [x] Cada uso gasta exactamente una carga, también si no alcanza a ningún enemigo.
- [x] Las cargas restantes se guardan con la partida y se respetan al cargarla.
- [x] En pausa no corre ninguna duración.
- [x] Reglas puras con tests; valores en `balance.ts`; un tour por poder; sonido por poder.
- [x] El panel no tapa el tablero a 812 × 375 ni a 568 × 320.
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Recolocar una planta a la que un gusano está mordiendo: el gusano sigue avanzando.
- Recolocar durante un arrastre de fusión: no se pueden mezclar los dos gestos.
- Granada sobre Creeper en el aire: no le alcanza, como las minas.
- Muro de hielo sobre un enemigo en el carril de abajo del todo o en la primera columna.
- La forma de la partida guardada cambia: sube `SAVE_VERSION` (regla 8).
- Riesgo de balance: si los poderes resuelven las rondas difíciles, las plantas pierden peso. Las rondas se equilibran sin contar con ellos.
- Riesgo: un muro de hielo de tres carriles para el poema entero de Elk Cloner en tres carriles. Es un poder de un uso por partida: se acepta.

## Objetivo final con ejemplos
| Acción | Resultado |
|---|---|
| Granada sobre un grupo de 4 gusanos | Vuela en curva, cae, cuenta 2 s y explota: los 4 reciben daño; las plantas vecinas, nada; queda 0 cargas |
| Muro de hielo en el carril 2, columna 5 | Tres bloques de hielo en los carriles 1, 2 y 3 de la columna 5; los gusanos se paran a morderlos y a los 10 s se derriten |
| Muro de hielo en el carril 0 | Ocupa los carriles 0, 1 y 2 |
| Muro de hielo con una disparadora en el carril 3 de esa columna | No se puede poner; no se gasta |
| Recolocar una disparadora de fuego de 2 cañones, nivel 4 | Aparece en la casilla nueva con lo mismo |
| Elegir la granada y pulsar Escape | No se gasta |

## Cómo probarlo (QA)
1. Con las cargas que da la configuración, usar cada poder una vez.
2. Guardar con una carga gastada, cargar y comprobar que sigue gastada.
3. Con `?poderes=` en la dirección (en desarrollo), comprobar que el panel no sale.
4. Probar el panel en un móvil en horizontal.
