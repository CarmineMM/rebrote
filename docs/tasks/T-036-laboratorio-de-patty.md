# [Interfaz] Invernadero refugio y Laboratorio de Patty

**Estado:** Completada (22 nov 2026, 0.12.3) · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-019, T-022, T-023, T-032 · **Bloquea a:** ninguna · **Origen:** conversación con Carmine del 22 nov 2026

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
- [x] El Invernadero no enseña plantas: el decorado es el refugio de noche (cristales con tablas y cinta, sacos terreros, suelo de tablas, alfombra, guirnaldas, lámpara que se mece; fuera, estrellas, colinas con circuitos, lluvia de bits, relámpagos y un gusano que pasa) y cubre todo el mundo pintado.
- [x] El decorado respeta los niveles gráficos (menos estrellas y bits en Bajo, sin brillos ni relámpagos sin `glows`) y la escala de arte.
- [x] El Laboratorio de Patty está abierto: los tres inventos en tarros, cada uno con su etiqueta, lo que hace, su nivel y el botón "Fabricar" o "Mejorar"; debajo, el vivero con la disparadora (la foto la manda la escena) y su nivel base. Comprar y mejorar suenan como antes.
- [x] El menú de la derecha: semillas, reanudar (si hay partida), siguiente brote, ruta e historia. "Volver a la portada" abajo a la izquierda. Esc vuelve a la portada.
- [x] Ningún texto que ve el jugador dice "tienda", "poder(es)" ni "comprar"; en inglés, ni "shop", "power(s)" ni "buy".
- [x] Cabe sin desplazarse a 1600 × 900, 812 × 375 y 568 × 320.
- [x] `/invernadero.html` sigue enseñando las tres propuestas.
- [x] `npm test` y `npm run build` pasan.

## Cómo quedó
- **Refugio (Phaser):** `src/game/view/refugeArt.ts` (medidas `REFUGE` y pintores de Canvas 2D sin Phaser) y `src/game/view/refuge.ts` (`createRefuge`: capas, tweens y niveles gráficos). Texturas en `registerRefugeTextures` (`textures.ts`), pintadas la primera vez que se entra. `TitleScene` no crea en el Invernadero ni el ambiente del jardín ni `TitleCover`, y no corre la cámara. Se borraron el jardín del Invernadero (`greenhouseGarden.ts` y su test), su terreno (`registerGardenLand`, la variante `garden` de `paintLand` y de `createAmbience`) y la tierra removida.
- **Laboratorio de Patty (React):** `src/ui/PattyLab.tsx` sustituye a `Shop.tsx` y `PlantShop.tsx` (de ahí vienen `powerStats` y `LevelLeaves`). `Greenhouse.tsx` lo pinta siempre salvo con la ruta abierta; el panel pierde "Tienda" y "Plantas", "Historia" va a lo ancho y "Volver a la portada" pasa abajo a la izquierda. El panel y la vuelta, en madera. En el Invernadero el título es más pequeño y el saludo va a su lado. El recorte del vivero (`nurseryPortraits`) va sin fondo, dentro de la lata. El icono del aviso de la victoria (`ShopIcon`) es ahora un tarro.
- **Textos (LP-04):** "Inventos", "Laboratorio de Patty", "Fabricar", "¡Listo!", "Vivero", "Inventos del brote", "¡Laboratorio abierto!" y "Invento: se derrite", y sus equivalentes en inglés (*Gadgets, Patty's Lab, Build, Done!, Nursery*). Se quitaron las claves que ya no se usan (`greenhouse.shop`, `shopDetail`, `plants`, `plantsDetail` y `plantShop.hint`). Vocabulario en `01-mecanicas.md`, `idiomas.md` y la regla 5 de `CLAUDE.md`.
- **Pantallas:** comprobado en Chrome sin ventana con la RTX 4060 que el laboratorio cabe sin desplazarse a 1920 × 1080, 1600 × 900, 1440 × 900, 1366 × 768, 1280 × 720, 1024 × 600, 812 × 375 y 568 × 320 (en Alto), y que se pinta sin errores en Bajo y en Ultra. Fabricar la granada, mejorarla y subir el nivel base cobran lo suyo (el sonido es el de siempre, `shopCue`; la prueba fue sin audio); "Siguiente brote" abre "Inventos del brote" con la granada; la ruta tapa el laboratorio.
- **Galería:** `/invernadero.html` sigue con las tres propuestas (`src/dev/greenhouseLab.tsx`, `greenhouseMockups.tsx`, `greenhouseBackdrops.tsx`); usan los textos nuevos.
- Documentado en `docs/guias/graficos.md` (sección 14, tabla de archivos y lista "Poder nuevo") y en la actualización del ADR-0016.
