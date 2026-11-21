# [Historia] Viñetas, Boxer y Patty: el arranque de la historia

**Estado:** Completada (21 nov 2026, 0.3.0) · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-019 · **Bloquea a:** T-032, T-033 · **Origen:** conversación de diseño del 21 nov 2026

## Contexto
El juego no cuenta ninguna historia todavía: la portada dice "Solo la naturaleza puede salvarnos" y nada más. La historia y los personajes están decididos en `docs/specs/04-historia.md`: Boxer (mentor, unos 50 años, complexión normal, antes informático) y Patty (botánica, creadora de las plantas), contada con viñetas y en tono de aventura de dibujos animados.

Hasta ahora el juego no ha dibujado ninguna persona. Todo el arte se hace por código (ADR-0004) y cada vez que hubo que elegir un diseño se enseñaron propuestas en una galería de desarrollo (`/disparadoras.html`, `/gusanos.html`). Los menús los pinta React y, tras vencer a Creeper, la victoria lleva al Invernadero (ADR-0016).

## Objetivos
1. **Dar cara a Boxer y a Patty,** con un estilo que sirva para los personajes que vengan.
2. **Un sistema de viñetas** sencillo: retrato, nombre y bocadillo sobre la escena del juego.
3. **Contar el arranque:** la frase de apertura y la explicación tras vencer a Creeper.

## Alcance
**Incluye:** galería con propuestas de los dos personajes, retratos definitivos con unas pocas expresiones, componente de viñetas, las viñetas del arranque según el guion de la spec, botón de saltar, registro de viñetas vistas, sonido al hablar, textos en español e inglés, ADR si hace falta, sección en la guía de gráficos.
**No incluye:** Boxer en los tours y Patty en los avisos (T-032), pedir el nombre del jugador (T-033; aquí la viñeta 4 queda preparada), viñetas de otros brotes, voces grabadas, ilustraciones a pantalla completa.

## Decisiones
Contestadas por Carmine el 21 nov 2026: Y-01 e Y-02 tras ver la galería (Boxer, después de una segunda ronda); Y-03 a Y-07, con la recomendación.

| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| Y-01 | ¿Qué aspecto tiene Boxer? | Complexión normal; algo en su ropa o sus manos dice "informático" sin texto. Las tres primeras propuestas (cables, disquete, cascos) no gustaron; la segunda ronda fue un informático moderno de pelo oscuro con edades distintas. Elegida una mezcla de a) y b): la piel, la sudadera negra con cremallera y el portátil con pegatinas de a), con el peinado, la barba completa con bigote y las gafas de pasta de b); sin cascos al cuello ni auricular | Carmine |
| Y-02 | ¿Qué aspecto y edad tiene Patty? | a) Bata: joven (unos 28), media melena negra con un flequillo que le tapa parte de las cejas, bata blanca y un tubo de ensayo con un brote; con una flor en el pelo en vez de la horquilla de hoja | Carmine |
| Y-03 | ¿Cuánto se ve de cada uno? | b) Busto: da sitio a la ropa y a las manos | Carmine |
| Y-04 | ¿Cuántas expresiones? | Tres por personaje: normal, apurado y contento | Carmine |
| Y-05 | ¿Se pueden volver a ver las viñetas? | Sí, desde el Invernadero (Opciones son ajustes del aparato, ADR-0018) | Carmine |
| Y-06 | Quien ya venció a Creeper, ¿ve la explicación? | Sí, la primera vez que entre al Invernadero | Carmine |
| Y-07 | ¿El texto aparece letra a letra? | Sí, y un toque lo completa de golpe | Carmine |

## Criterios de aceptación
### Personajes
- [x] Una galería de desarrollo enseña 3 propuestas de Boxer y 3 de Patty, a tamaño de viñeta, también a 568 × 320.
- [x] Los dos comparten estilo entre sí y con el resto del juego.
- [x] Nada se usa en el juego hasta que Y-01 e Y-02 estén respondidas.
- [x] Cada personaje tiene las expresiones de Y-04.

### Viñetas
- [x] Una viñeta muestra el retrato de quien habla, su nombre y el texto, sobre la escena del juego oscurecida.
- [x] Se avanza con un toque, un clic, Espacio o Intro.
- [x] Hay un botón "Saltar" que cierra toda la secuencia.
- [x] Mientras hay una viñeta, el juego de detrás no avanza ni corre ninguna cuenta atrás.
- [x] Una secuencia vista no vuelve a salir sola, tampoco tras recargar ni en otra partida.

### Arranque
- [x] Al empezar el brote 1 por primera vez, antes del primer tour, Boxer dice la frase de apertura.
- [x] Al vencer a Creeper por primera vez, salen las viñetas de Boxer del guion y, al llegar al Invernadero, la de Patty.
- [x] La viñeta que pide el nombre funciona sin T-033: sin esa task, la secuencia sigue sin preguntar y usa un trato neutro.
- [x] Los textos son los de `docs/specs/04-historia.md`, en español e inglés.

### Calidad
- [x] Se lee bien a 1600 × 900, 812 × 375 y 568 × 320; el texto no se sale del bocadillo en ningún idioma.
- [x] Se maneja con teclado y el botón de saltar es alcanzable.
- [x] La pausa, el aviso de girar la pantalla y el cambio de idioma no rompen una secuencia a medias.
- [x] Qué secuencias se vieron se guarda en el progreso permanente (sin migración: ADR-0014), y borrar el progreso lo borra.
- [x] Guía de gráficos: cómo se añade un personaje y una secuencia.
- [x] `npm test` y `npm run build` pasan.

## Cómo quedó (21 nov 2026)
- Galería en `/personajes.html` (`npm run dev`): "Propuestas" con las tres de cada personaje y sus expresiones, y "Viñeta" con la viñeta de verdad a 1600 × 900, 812 × 375 y 568 × 320 en los dos idiomas.
- Boxer, segunda ronda: a) Portátil (unos 30: tupé, sudadera con cremallera, cascos al cuello y un portátil con pegatinas), b) Tableta (unos 40: barba, gafas de pasta, auricular, bomber y una tableta con un radar), c) Visor (unos 50: sienes canosas, perilla, visor de realidad aumentada en la frente, chaqueta técnica, reloj inteligente y señalando con el dedo). Las tres de la primera ronda se descartaron y ya no están en el código. Carmine eligió una mezcla de a) y b) (`BOXER_MIX`); las tres de la segunda ronda siguen en la galería como referencia.
- Patty: a) Bata, con la flor en el pelo. La jardinera y la exploradora siguen en la galería como referencia.
- Pintores sin Phaser en `src/game/view/characters/`; el juego usa los de `CAST` (`cast.ts`) y solo esos entran en `npm run build`. Decisión técnica en el ADR-0019.
- La historia vista va en `Progress.story` (`PROGRESS_VERSION` 2): al llegar esta versión se pierden los jefes vencidos guardados antes (ADR-0014).
- Orden al caer Creeper por primera vez: celebración en el tablero, viñetas de Boxer y luego la pantalla de victoria, cuyo botón lleva al Invernadero, donde se presenta Patty.
- Voz al hablar: `voiceBoxer` y `voicePatty` (un pluc de Kenney, grave y agudo), con dos alternativas cada uno en `/sonidos.html` para elegir de oído.
- "Historia" en el Invernadero comparte fila con la tienda y las plantas para que el panel quepa a 568 × 320 con la partida a medias.

## Casos límite y riesgos
- Jugador que salta todo: el juego tiene que entenderse igual. La historia nunca explica controles; eso es de los tours.
- La apertura y el tour de la ronda 1 van seguidos: que no se sienta como dos interrupciones.
- Textos en inglés más largos o más cortos que en español: el bocadillo se adapta.
- **Riesgo principal: dibujar personas por código es más difícil que dibujar gusanos.** Si las propuestas no convencen, parar ahí y valorar retratos más simples (siluetas con rasgos mínimos) antes de invertir más.
- Riesgo de tono: una IA que quiere acabar con la humanidad, contada sin mostrar muertes.

## Objetivo final con ejemplos
| Momento | Lo que ve el jugador |
|---|---|
| Primera partida | Boxer, apurado: "¡No hay tiempo para explicarte! Toma esa planta y sígueme el juego." Después, el tour |
| Cae Creeper por primera vez | Las viñetas de Boxer y, en el Invernadero, la de Patty |
| Cae Creeper por segunda vez | Nada de historia; directo a la victoria |
| Pulsa "Saltar" en la segunda viñeta | Se cierra toda la secuencia y cuenta como vista |

## Cómo probarlo (QA)
1. Con progreso vacío, empezar una partida y leer la apertura.
2. Vencer a Creeper y leer la secuencia entera en español; repetir en inglés con el progreso borrado.
3. Probar "Saltar" y recargar.
4. Repetir en un móvil en horizontal.
