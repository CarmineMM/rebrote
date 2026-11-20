# [Arte] Rediseño de la disparadora

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-024 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
Quienes probaron el juego dicen que se parece bastante a Plants vs. Zombies. La pieza que más pesa en ese parecido es la disparadora: es la planta principal y la cara del juego. Su forma está definida en `src/game/view/shooterShape.ts` (`SHOOTER_BARRELS`, `shooterHead`, `SHOOTER_EYE`, `SHOOTER_DOTS`), se pinta en `src/game/view/textures.ts` y la usan `plantView.ts`, `levelMedal.ts`, `portrait.ts`, la portada (`titleCover.ts`) y los dibujos de los tours.

Carmine quiere tratar este cambio con delicadeza: cambiar la apariencia sin perder lo divertido del diseño actual. Por eso la task tiene dos fases y la segunda no empieza sin su visto bueno.

## Objetivos
1. **Silueta propia.** Que a oscuras no recuerde a ningún otro juego.
2. **Conservar el encanto.** Ojo grande y expresivo, respiración, salto al sembrar, retroceso al disparar y colores por variante.
3. **Que los cañones se lean mejor.** Uno, dos o tres de un vistazo.
4. **Decidir viendo, no imaginando.** Carmine elige entre propuestas reales pintadas por código.

## Alcance
**Incluye, fase 1 (propuestas):** galería solo de desarrollo con 3 propuestas, cada una con 1, 2 y 3 cañones en normal, fuego y hielo, a tamaño de tablero, junto a la actual y con su silueta en negro. Nada del juego cambia.
**Incluye, fase 2 (sustitución):** aplicar la elegida en tablero, ficha, portada, tours y arrastre de fusión; ajustar medallita y bocas de los cañones; actualizar `docs/guias/graficos.md`.
**No incluye:** minas, enemigos, tablero ni cartas. Cambios de reglas o de balance.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| X-01 | ¿Qué dirección toma la silueta? | a) Brote: un bulbo sentado en el suelo, sin tallo, con los cañones saliendo como brotes. b) Cactus: cuerpo vertical donde cada cañón es un brazo. c) Vaina: vaina alargada que se abre y enseña una semilla por cañón | a: encaja con el nombre del juego. Pero se decide viendo las tres | Carmine |
| X-02 | ¿Se mantiene el verde como color base? | Sí o no | Sí (lo pide ADR-0004: disparadora verde, fuego rojo, hielo azul) | Carmine |
| X-03 | ¿Qué propuesta pasa a la fase 2? | Una de las tres, una mezcla o ninguna | Se decide con la galería delante | Carmine |

## Criterios de aceptación
### Fase 1: propuestas
- [ ] Existe una galería accesible solo en desarrollo que muestra la disparadora actual y 3 propuestas.
- [ ] Cada propuesta se ve con 1, 2 y 3 cañones y en sus tres variantes (27 dibujos nuevos en total).
- [ ] Cada propuesta se ve también como silueta negra y sobre una casilla del tablero con la cámara inclinada.
- [ ] Cada propuesta está animada en reposo y al disparar.
- [ ] La partida, la portada y los tours siguen usando la disparadora actual.
- [ ] La fase 2 no empieza hasta que X-03 esté respondida.

### Fase 2: sustitución
- [ ] La disparadora elegida sustituye a la actual en tablero, ficha de información, portada, tours, cartas y arrastre de fusión.
- [ ] Las semillas salen de la boca de cada cañón nuevo.
- [ ] La medallita de nivel se lee y no tapa los cañones, con 1, 2 y 3.
- [ ] Las tres variantes se distinguen de un vistazo a 812 × 375.
- [ ] Reglas, balance y partidas guardadas no cambian.
- [ ] La galería de propuestas se retira o queda claramente como herramienta de desarrollo.

### Calidad
- [ ] Respeta los niveles gráficos (ADR-0006) y la escala de arte.
- [ ] Guía de gráficos actualizada con la forma nueva.
- [ ] `npm test` y `npm run build` pasan.

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
