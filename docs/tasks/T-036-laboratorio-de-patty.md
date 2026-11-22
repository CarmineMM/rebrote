# [Interfaz] Invernadero refugio y Laboratorio de Patty

**Estado:** En curso · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-019, T-022, T-023, T-032 · **Bloquea a:** ninguna · **Origen:** conversación con Carmine del 22 nov 2026

## Contexto
Desde T-019 el Invernadero es el jardín de la portada con las plantas que el jugador ya tiene, en calma, y el menú a la derecha con "Tienda" (T-022) y "Plantas" (T-023), que se abren encima, cada una en su ventana. Carmine no quiere plantas en el jardín y quiere la tienda ya abierta, con los poderes y la mejora de la disparadora juntos, el menú a la derecha y "Volver a la portada" abajo a la izquierda.

Se le enseñaron tres propuestas en una galería de desarrollo (`/invernadero.html`, `src/dev/greenhouseLab.tsx`): laboratorio de día, refugio de noche y puesto en la azotea. **Eligió la 2, el refugio de noche**, el 22 nov 2026. También pidió que no se diga "tienda" ni "poderes": es Patty la que fabrica inventos y mejora las plantas. De cuatro juegos de textos eligió el **A, Laboratorio**.

## Objetivos
1. **Que se note que es un refugio:** el invernadero atrincherado de noche, con la corrupción fuera y luz cálida dentro.
2. **El laboratorio siempre abierto:** los tres inventos y el vivero (nivel base de la disparadora) a la vista, sin abrir nada.
3. **Un solo vocabulario:** "inventos" y "Laboratorio de Patty" en todo el juego, en español y en inglés.

## Alcance
**Incluye:** el decorado del refugio en Phaser (sustituye al jardín del Invernadero) con sus niveles gráficos; el Laboratorio de Patty en React (despensa con tarros, vivero con la lata); el menú y "Volver a la portada"; los textos nuevos en todo el juego; las pantallas pequeñas (812 × 375 y 568 × 320); la galería de propuestas, que se queda como referencia; la documentación.
**No incluye:** cambiar precios, reglas o niveles de los inventos o del nivel base; un sonido nuevo (no es una mecánica nueva; comprar y mejorar suenan como antes); un tour de ayuda; cambiar la forma de `Progress` o de la partida guardada.

## Decisiones tomadas
| # | Pregunta | Decisión (22 nov 2026) | Decide |
|---|---|---|---|
| LP-01 | ¿Qué propuesta? | La 2: refugio de noche, con la tienda como despensa de tarros | Carmine |
| LP-02 | ¿Plantas en el Invernadero? | No: fuera el jardín de las plantas del jugador | Carmine |
| LP-03 | ¿Dónde va cada cosa? | Laboratorio abierto a la izquierda, menú a la derecha (sin "Tienda" ni "Plantas"), "Volver a la portada" abajo a la izquierda | Carmine |
| LP-04 | ¿Cómo se llama? | Laboratorio de Patty; "inventos" en vez de "poderes"; "Fabricar" en vez de "Comprar"; "Vivero" en vez de "Plantas", en todo el juego (opción A) | Carmine |

## Criterios de aceptación
- [ ] El Invernadero no enseña plantas: el decorado es el refugio de noche (cristales con tablas y cinta, sacos terreros, suelo de tablas, alfombra, guirnaldas, lámpara que se mece; fuera, estrellas, colinas con circuitos, lluvia de bits, relámpagos y un gusano que pasa) y cubre todo el mundo pintado.
- [ ] El decorado respeta los niveles gráficos (menos estrellas y bits en Bajo, sin brillos ni relámpagos sin `glows`) y la escala de arte.
- [ ] El Laboratorio de Patty está abierto: los tres inventos en tarros, cada uno con su etiqueta, lo que hace, su nivel y el botón "Fabricar" o "Mejorar"; debajo, el vivero con la disparadora (la foto la manda la escena) y su nivel base. Comprar y mejorar suenan como antes.
- [ ] El menú de la derecha: semillas, reanudar (si hay partida), siguiente brote, ruta e historia. "Volver a la portada" abajo a la izquierda. Esc vuelve a la portada.
- [ ] Ningún texto que ve el jugador dice "tienda", "poder(es)" ni "comprar"; en inglés, ni "shop", "power(s)" ni "buy".
- [ ] Cabe sin desplazarse a 1600 × 900, 812 × 375 y 568 × 320.
- [ ] `/invernadero.html` sigue enseñando las tres propuestas.
- [ ] `npm test` y `npm run build` pasan.
