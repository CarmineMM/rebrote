# [Arte] Rediseño de la disparadora

**Estado:** Completada (21 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-024 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
Quienes probaron el juego dicen que se parece bastante a Plants vs. Zombies. La pieza que más pesa en ese parecido es la disparadora: es la planta principal y la cara del juego. Su forma está definida en `src/game/view/shooterShape.ts` (`SHOOTER_BARRELS`, `shooterHead`, `SHOOTER_EYE`, `SHOOTER_DOTS`), se pinta en `src/game/view/textures.ts` y la usan `plantView.ts`, `levelMedal.ts`, `portrait.ts`, la portada (`titleCover.ts`) y los dibujos de los tours.

Carmine quiere tratar este cambio con delicadeza: cambiar la apariencia sin perder lo divertido del diseño actual. Por eso la task tiene dos fases y la segunda no empieza sin su visto bueno.

**Diseño actual guardado como legacy (pedido por Carmine el 21 nov 2026).** Al empezar la fase 1, la forma de siempre se guardó entera (medidas, colores y pintor) en `src/game/view/shooters/legacy.ts`, para poder volver a ella. Cada forma vive en `src/game/view/shooters/` y el juego usa la que elige `SHOOTER` en `src/game/view/shooterShape.ts`: hoy, `legacy`. Volver a ella después de la fase 2 es cambiar esa línea.

## Objetivos
1. **Silueta propia.** Que a oscuras no recuerde a ningún otro juego.
2. **Conservar el encanto.** Ojo grande y expresivo, respiración, salto al sembrar, retroceso al disparar y colores por variante.
3. **Que los cañones se lean mejor.** Uno, dos o tres de un vistazo.
4. **Decidir viendo, no imaginando.** Carmine elige entre propuestas reales pintadas por código.

## Alcance
**Incluye, fase 1 (propuestas):** galería solo de desarrollo con 3 propuestas, cada una con 1, 2 y 3 cañones en normal, fuego y hielo, a tamaño de tablero, junto a la actual y con su silueta en negro. Nada del juego cambia.
**Incluye, fase 2 (sustitución):** aplicar la elegida en tablero, ficha, portada, tours y arrastre de fusión; ajustar medallita y bocas de los cañones; actualizar `docs/guias/graficos.md`.
**No incluye:** minas, enemigos, tablero ni cartas. Cambios de reglas o de balance.

## Decisiones tomadas
| # | Pregunta | Decisión (21 nov 2026) | Decide |
|---|---|---|---|
| X-01 | ¿Qué dirección toma la silueta? | a) Brote: un bulbo sentado en el suelo, sin tallo, con los cañones saliendo como brotes | Carmine |
| X-02 | ¿Se mantiene el verde como color base? | Sí: verde la normal, naranja y rojo el fuego, azul claro el hielo (ADR-0004) | Carmine |
| X-03 | ¿Qué propuesta pasa a la fase 2? | "Brote" (`shooters/bulb.ts`), tal como se vio en la galería | Carmine |

## Criterios de aceptación
### Fase 1: propuestas

Hecha el 21 nov 2026. `npm run dev` y abrir `/disparadoras.html` (`src/dev/shooterLab.tsx` y `shooterLabScenes.ts`; `npm run build` no la incluye ni las propuestas). Tres vistas:
- **Vitrina:** una fila por forma (la actual y las tres propuestas) con 1, 2 y 3 cañones en normal, fuego y hielo, y su silueta en negro, a tamaño de tablero (el ancho de casilla del carril del centro). Respiran y disparan con la vista de verdad (`PlantView`). Botones para volver a sembrar, ver cómo crecen al fusionar (1 → 2 → 3), subir de nivel (1, 2, 5, 10, 15 y 20: la medallita en sus cinco colores), dejar de disparar y verlas marchitas, oscurecidas o medio transparentes.
- **Tablero:** el jardín de verdad con la cámara inclinada y la batalla de la portada (combate de verdad, nadie se mueve): todas a la vez, un carril cada una, o una sola forma en todo el césped con variantes, cañones y medallitas de varios tramos. Clic en una planta: dispara.
- **Silueta:** las cuatro en negro sobre blanco, grandes, como A, B, C y D en orden al azar y sin nombres (las notas de abajo se esconden), para la prueba de la silueta. "Mostrar nombres" y "Barajar".

Las propuestas son: **a) Brote** (`shooters/bulb.ts`), bulbo gordito sentado en la tierra con raicillas, sin tallo, y los cañones como brotes que le salen del hombro y terminan en un capullo abierto; **b) Cactus** (`shooters/cactus.ts`), columna con costillas, areolas y pinchos que asoman por el borde, un mechón lanudo en la coronilla y cada cañón un brazo que apunta a los gusanos (sin flor en la cabeza ni brazos levantados, para no recordar a otro cactus); **c) Vaina** (`shooters/pod.ts`), vaina de pie con la punta enroscada, abierta hacia los gusanos, con una semilla dorada por cañón que sobresale del borde (también se cuentan en la silueta). Todas conservan el ojo grande mirando a la derecha, la mejilla, el brote o la flor de la de 3 cañones, la ceja decidida y los colores de cada variante (X-02 sin decidir: siguen en verde). Comprobado en Chrome sin ventana sobre la RTX 4060, en Bajo, Alto y Ultra.

- [x] Existe una galería accesible solo en desarrollo que muestra la disparadora actual y 3 propuestas.
- [x] Cada propuesta se ve con 1, 2 y 3 cañones y en sus tres variantes (27 dibujos nuevos en total).
- [x] Cada propuesta se ve también como silueta negra y sobre una casilla del tablero con la cámara inclinada.
- [x] Cada propuesta está animada en reposo y al disparar.
- [x] La partida, la portada y los tours siguen usando la disparadora actual. Las 9 texturas de la de siempre salen idénticas píxel a píxel a las de antes de la fase 1 (comparadas en Bajo y en Ultra con el código del commit anterior), y `shooters/designs.test.ts` comprueba que el juego sigue con `legacy`.
- [x] La fase 2 no empieza hasta que X-03 esté respondida.

### Fase 2: sustitución

Hecha el 21 nov 2026. Comprobada con Vitest (354 tests) y en Chrome sin ventana sobre la RTX 4060, en una partida de verdad: portada, cartas con su icono nuevo, aviso de desbloqueo de la ronda 6 (dos Brote), tour de la ronda 1, 1, 2 y 3 cañones en las tres variantes con medallitas del 2 al 20 y su jardincito (T-027), arrastre de fusión con el ratón (la planta en la mano, el rótulo y la fusionada), ficha de una de hielo de 3 cañones con su foto y la prueba de carga (tecla H) con 60 gusanos: las semillas salen de la boca de cada capullo. A 812 × 375 las tres variantes se distinguen y las medallitas se leen. Queda para Carmine la prueba de la silueta con personas ajenas al proyecto ("Objetivo final", primera fila): en `/disparadoras.html`, vista "Silueta", sin nombres.

Cómo se hizo: la elegida pasó a ser `SHOOTER` en `shooterShape.ts`. Vistas, foto de la ficha, portada, tours y arrastre ya toman de ahí la forma (textura, bocas, marcas y medallita); también la planta fantasma de las cartas. Queda a mano el icono de la carta, dibujado en CSS (`CardIcon` en `src/ui/Card.tsx`, cabeza y tubo), y revisar la caja de clic de la planta (`PlantView.contains`) con la forma nueva. `shooters/designs.test.ts` ya comprueba para las cuatro formas que la medallita no tapa el ojo, los cañones ni las marcas, y que los cañones van de arriba abajo con la boca a la derecha.

- [x] La disparadora elegida sustituye a la actual en tablero, ficha de información, portada, tours, cartas y arrastre de fusión. El icono de la carta es un Brote en miniatura en SVG (`CardIcon`).
- [x] Las semillas salen de la boca de cada cañón nuevo (`barrelMuzzle` lee los `barrels` de Brote).
- [x] La medallita de nivel se lee y no tapa los cañones, con 1, 2 y 3 (`shooters/designs.test.ts`).
- [x] Las tres variantes se distinguen de un vistazo a 812 × 375.
- [x] Reglas, balance y partidas guardadas no cambian: la forma solo es vista; la partida guardada no lleva nada del dibujo. (El premio de nivel que llegó a la vez es otra task, T-027.)
- [x] La galería de propuestas queda claramente como herramienta de desarrollo: `/disparadoras.html`, solo con `npm run dev` y fuera de `npm run build`, con la de antes como "Legacy".

### Calidad
- [x] Respeta los niveles gráficos (ADR-0006) y la escala de arte: se pinta con `registerShooterTextures` a la resolución de cada nivel. Probado en Bajo, Alto y Ultra.
- [x] Guía de gráficos actualizada con la forma nueva (secciones 2 y 10) y nota en el historial del ADR-0004.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- **Prueba de la silueta:** enseñar la silueta negra a alguien que no conoce el proyecto y preguntarle a qué le recuerda. Si nombra otro juego, esa propuesta no vale.
- Fusionar anima el paso de 1 a 2 y a 3 cañones: la forma nueva tiene que crecer sin saltos raros.
- La portada compone plantas a mano: revisar que no queden restos de la forma antigua.
- El césped a cuadros y la disposición en carriles también recuerdan al género. No se tocan aquí, pero conviene saberlo.
- Riesgo de perder cariño por el personaje: por eso la fase 1 no toca el juego.

## Objetivo final con ejemplos
| Prueba | Resultado esperado |
|---|---|
| Silueta negra de la elegida ante 3 personas | Ninguna nombra otro juego |
| Disparadora de fuego de 3 cañones, nivel 5 | Se leen los 3 cañones, el fuego y la medallita |
| Partida guardada antes del cambio | Carga igual, con el aspecto nuevo |

## Cómo probarlo (QA)
1. Abrir la galería y comparar las tres propuestas con la actual.
2. Hacer la prueba de la silueta con alguien ajeno al proyecto.
3. Tras la fase 2, jugar las rondas 1 a 6 y mirar portada, ficha y tours.
