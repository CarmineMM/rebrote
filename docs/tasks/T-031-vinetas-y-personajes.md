# [Historia] Viñetas, Boxer y Patty: el arranque de la historia

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-019 · **Bloquea a:** T-032, T-033 · **Origen:** conversación de diseño del 21 nov 2026

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

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| Y-01 | ¿Qué aspecto tiene Boxer? | Propuestas en la galería | Tres propuestas; algo en su ropa o sus manos debe decir "informático" sin texto | Carmine |
| Y-02 | ¿Qué aspecto y edad tiene Patty? | Propuestas en la galería | Tres propuestas; algo debe decir "botánica" | Carmine |
| Y-03 | ¿Cuánto se ve de cada uno? | a) Solo la cara. b) Busto | b: da sitio a la ropa y a las manos, que cuentan quiénes son | Carmine |
| Y-04 | ¿Cuántas expresiones? | Libre | Tres por personaje: normal, apurado y contento | Carmine |
| Y-05 | ¿Se pueden volver a ver las viñetas? | Sí o no | Sí, desde Opciones o el Invernadero | Carmine |
| Y-06 | Quien ya venció a Creeper, ¿ve la explicación? | Sí o no | Sí, la primera vez que entre al Invernadero | Carmine |
| Y-07 | ¿El texto aparece letra a letra? | Sí o no | Sí, y un toque lo completa de golpe | Carmine |

## Criterios de aceptación
### Personajes
- [ ] Una galería de desarrollo enseña 3 propuestas de Boxer y 3 de Patty, a tamaño de viñeta, también a 568 × 320.
- [ ] Los dos comparten estilo entre sí y con el resto del juego.
- [ ] Nada se usa en el juego hasta que Y-01 e Y-02 estén respondidas.
- [ ] Cada personaje tiene las expresiones de Y-04.

### Viñetas
- [ ] Una viñeta muestra el retrato de quien habla, su nombre y el texto, sobre la escena del juego oscurecida.
- [ ] Se avanza con un toque, un clic, Espacio o Intro.
- [ ] Hay un botón "Saltar" que cierra toda la secuencia.
- [ ] Mientras hay una viñeta, el juego de detrás no avanza ni corre ninguna cuenta atrás.
- [ ] Una secuencia vista no vuelve a salir sola, tampoco tras recargar ni en otra partida.

### Arranque
- [ ] Al empezar el brote 1 por primera vez, antes del primer tour, Boxer dice la frase de apertura.
- [ ] Al vencer a Creeper por primera vez, salen las viñetas de Boxer del guion y, al llegar al Invernadero, la de Patty.
- [ ] La viñeta que pide el nombre funciona sin T-033: sin esa task, la secuencia sigue sin preguntar y usa un trato neutro.
- [ ] Los textos son los de `docs/specs/04-historia.md`, en español e inglés.

### Calidad
- [ ] Se lee bien a 1600 × 900, 812 × 375 y 568 × 320; el texto no se sale del bocadillo en ningún idioma.
- [ ] Se maneja con teclado y el botón de saltar es alcanzable.
- [ ] La pausa, el aviso de girar la pantalla y el cambio de idioma no rompen una secuencia a medias.
- [ ] Qué secuencias se vieron se guarda en el progreso permanente (sin migración: ADR-0014), y borrar el progreso lo borra.
- [ ] Guía de gráficos: cómo se añade un personaje y una secuencia.
- [ ] `npm test` y `npm run build` pasan.

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
