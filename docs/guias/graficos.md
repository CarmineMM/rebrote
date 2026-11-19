# Guía de gráficos y animación

Cómo se pinta y se anima Rebrote, para que todo lo nuevo (enemigos, mundos, efectos, plantas) encaje con lo que ya hay. Las decisiones de fondo están en los ADR-0004 (arte bonito y animado), ADR-0005 (cámara inclinada), ADR-0006 (ajustes gráficos) y ADR-0007 (pantalla completa y pausa).

## 1. Principios

- **Bonito y amigable.** Personajes simpáticos, colores alegres, formas redondeadas y reacciones exageradas. Hay libertad creativa para enemigos, escenarios y efectos mientras no cambien reglas ni balance.
- **Todo se anima.** Nada aparece ni desaparece de golpe y nada se queda quieto del todo. Si algo está en pantalla, respira, se mece, brilla o parpadea.
- **Estilo propio.** No se copia el arte de otro juego (ver el riesgo de parecido en `docs/specs/00-vision.md`).
- **La animación nunca decide reglas.** La lógica de `src/game/core/` no espera a que termine una animación: se cobra, se siembra o se daña en el acto, y la animación acompaña.
- **Bajo también tiene que verse bien.** Los niveles quitan cantidad, no cuidado.

## 2. Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `src/game/view/layout.ts` | Diseño (`VIEW`), mundo con decorado extra (`WORLD`, `BLEED`), vista según la pantalla (`viewFor`), césped (`LAWN`), franjas del decorado (`SCENERY`), capas (`DEPTH`) |
| `src/game/view/perspective.ts` | Cámara inclinada: `toScreen`, `toBoard`, `cellWidthAt` |
| `src/game/view/textures.ts` | Todo el arte pintado con Canvas 2D, una vez al arrancar (`TEX`, `registerTextures`, `artInv`) |
| `src/game/view/ambience.ts` | Lo que se mueve en el escenario: sol, nubes, pájaros, viento, partículas, flores |
| `src/game/view/quality.ts` | Niveles gráficos y modo automático |
| `src/game/scenes/BoardScene.ts` | Plantas, monedas, resaltado, efectos de respuesta, filtros de Ultra, ajuste de la vista y pausa |
| `src/ui/` | HUD flotante, menú de pausa y ajustes (React) |

## 3. Coordenadas y perspectiva

- La lógica trabaja en **coordenadas de tablero**, en unidades de casilla (`BoardPoint`). `x` avanza por las columnas y `y` por los carriles; el carril 0 es el del fondo. El centro de la casilla del carril 2 y la columna 3 es `{ x: 3.5, y: 2.5 }`.
- Nunca se calcula una casilla dividiendo píxeles. Para pintar se usa `perspective.toScreen(point)`. Para el puntero se usa `perspective.toBoard(...)` y luego `cellAt(...)`.
- Fuera del tablero también vale: `x < 0` es el camino, `x > 9` es el suelo corrupto. Así el decorado sigue la misma perspectiva.
- **Lo que está de pie** (plantas, enemigos, monedas, flores) se dibuja derecho, apoyado en su punto del suelo:
  - El origen va en los pies (`setOrigin(0.5, pieY / alto)`).
  - El tamaño sale de `perspective.cellWidthAt(punto)`, así que lo del fondo se ve más pequeño.
  - La profundidad es `entityDepth(y en pantalla)`, para que lo de delante tape lo de atrás.
  - Lleva una sombra en el suelo (`TEX.shadow`) con profundidad algo menor.
- Velocidades y distancias de juego van en casillas por segundo y en casillas, en `balance.ts`.

## 4. Pantalla completa y decorado extra (ADR-0007)

- **Lo que siempre se ve:** el diseño de 1600 × 900. Todo lo jugable (césped, agujeros de los gusanos, lo que se pueda clicar) va dentro.
- **Lo que se ve según la pantalla:** alrededor hay mundo extra (`WORLD`): 360 por los lados, 360 arriba y 200 abajo.
  - En pantallas anchas se ve más jardín a la izquierda y más suelo corrupto a la derecha.
  - En pantallas altas se ve más cielo y un corte de tierra más hondo.
- **Todo decorado nuevo** (texturas fijas, partículas ambientales, nubes, bichos) cubre `WORLD`, no solo el diseño. Hay que comprobar que no se ve ningún borde recto ni ninguna zona vacía.
- **Lo que tapa el HUD:** la franja de arriba de la pantalla (bandeja de cartas a la izquierda, saldo y pausa a la derecha). Ahí solo va decorado.
- **Lo que depende de la pantalla** se calcula con la cámara (`cameras.main.worldView`), nunca con 1600 × 900. Por ejemplo, las monedas vuelan a la esquina donde está el saldo.
- **Pausa:** congela la escena entera. Todo lo que pasa con el tiempo usa `this.time`, tweens y partículas de la escena; así la pausa lo congela sin código extra.

## 5. Capas

Orden de dibujo, de atrás hacia delante (`DEPTH` en `layout.ts`):

| Capa | Qué va |
|---|---|
| `sky`, `sun`, `clouds`, `birds` | Cielo y todo lo que pasa por él |
| `land` | Textura fija: colinas, ciudad, seto, laterales, césped, corte de tierra |
| `canopy` | Copa del árbol |
| `groundFx` | Efectos pegados al suelo: viento, sombras de nubes, brillos del suelo corrupto, rocío, haces de luz |
| `highlight` | Resaltado de casilla |
| `entities + y` | Plantas, enemigos, monedas y flores, ordenados por su `y` en pantalla |
| `pollen`, `butterflies` | Partículas y bichos que flotan por encima |
| `foreground` | Matas del primer plano |
| `floatText` | Textos flotantes (+25) y monedas volando al marcador |

## 6. Cómo se pinta el arte

- Cada pieza es una función pintora en `textures.ts` que recibe un contexto de Canvas 2D y su **tamaño de diseño**. Se registra con una clave en `TEX`.
- **Estilo:**
  - Degradado radial con la luz arriba a la izquierda.
  - Contorno oscuro del mismo tono.
  - Un reflejo blanco suave.
  - Detalles tiernos: ojos con brillo, mejillas sonrosadas.
- **Paleta de referencia:**

  | Elemento | Colores |
  |---|---|
  | Planta | `#80d153`, contorno `#2a6b22` |
  | Moneda | `#ffd23f` a `#dc9d16`, borde `#b07a0e` |
  | Corrupción | verde neón `#39ff88`, morado `#b48cff` sobre `#2b2034` |
  | Fuego (T-004) | rojos y naranjas |
  | Hielo (T-005) | azules claros |

- Se ve un cañón por cada cañón de la planta, y el nivel se muestra con una medallita con número.
- **Escala de arte (obligatorio):** las texturas se pintan a la resolución del nivel gráfico.
  - Al crear una imagen, su escala se multiplica por `artInv()`.
  - Las partículas también: `scale: { start: 1 * artInv(), ... }`.
  - `setDisplaySize(...)` no lo necesita, porque fija el tamaño en pantalla.
  - Si una escala sale de `textura.width`, tampoco: ya incluye la resolución.
  - Los textos usan el estilo de la escena (`textStyle()`), que fija `resolution` para que no se vean borrosos en Alto y Ultra.
- `shadowBlur` de Canvas no lo escala el contexto: se multiplica por la escala de arte, como en `paintCorruptionGlow`.
- Lo que no se mueve va a una textura grande pintada una vez (cielo y terreno), no a cientos de objetos.
- Las texturas muy grandes se limitan a 4096 px (límite seguro de WebGL). Si el nivel pide más, bajan algo de resolución: sus imágenes se escalan con `artInvOf(clave)` en vez de `artInv()`.

## 7. Cómo se anima

- **Reposo:** `breathe(...)` hace un ida y vuelta infinito con `Sine.InOut`. Las plantas se aplastan y estiran un poco, y se mecen. Flores, matas y la copa del árbol se balancean con fases distintas (`delay` aleatorio) para que no vayan al unísono.
- **Entradas:** con rebote (`Back.Out`, `Elastic.Out`). Ejemplos: la planta brota de la tierra con un estirón y un puñado de tierra; la moneda sale despedida, cae con `Bounce.Out` y se queda flotando y girando.
- **Salidas:** encogerse o desvanecerse en 200–300 ms, nunca un `destroy()` en seco a la vista del jugador.
- **Respuesta a acciones:** cada acción del jugador tiene una respuesta visible: partículas, texto flotante (+29) o un vuelo al marcador. La regla se aplica en el acto y la animación es solo decorado.
- **Avisos:** lo que va a desaparecer avisa antes. La moneda soltada parpadea durante el último 30 % de su vida.
- **HUD y menús (React):** transiciones y animaciones CSS.
  - La bandeja y el saldo caen al empezar.
  - La carta elegida flota.
  - El saldo da un salto dorado al subir y rojo al bajar.
  - El menú de pausa entra con un pequeño rebote.
  - La pantalla de carga muestra un brote que crece.
  - Con `prefers-reduced-motion` las animaciones CSS se apagan.
- **Duraciones orientativas:** reacciones de 150 a 450 ms, reposo de 0,9 a 3,5 s por ciclo y cielo de 15 a 120 s.

## 8. Niveles gráficos (ADR-0006)

Todo efecto nuevo se engancha a un ajuste del perfil (`QualityProfile`):

| Si el efecto es... | Usa |
|---|---|
| Partículas ambientales | `frequency: base / quality.particles` |
| Partículas de respuesta a una acción | `effectCount(base)` en la escena: menos en Bajo, nunca cero |
| Más o menos bichos, nubes, flores... | `amount(base, quality.life, mínimo)` |
| Un brillo aditivo (`BlendModes.ADD`) | Solo si `quality.glows` |
| Un adorno extra sin función (destellos, haces) | Solo si `quality.extras` |
| Un filtro de cámara o de objeto | Solo si `quality.postFx`, y solo filtros de una lectura por píxel |

- Prohibidos los filtros de muchas lecturas por píxel (bokeh, tilt-shift, blur grande) a pantalla completa.
- Hay que probar en **Bajo** (¿se sigue leyendo bien?) y en **Ultra** (¿aguanta y se ve mejor, no más oscuro?).
- Para medir: menú de pausa (Esc o P) > Ajustes > "Mostrar FPS".

## 9. Rendimiento

- **Presupuesto (T-002):** con 60 enemigos y 20 plantas, el juego sigue fluido en Medio.
- El coste está en rellenar píxeles, no en JavaScript. Hay que evitar capas grandes transparentes: el cielo y el terreno ya se recortaron a lo que se ve.
- Un `Graphics` redibujado en cada frame solo para pocos polígonos (el viento dibuja 8).
- Los enemigos y las balas, si son muchos, conviene que sean imágenes de una textura compartida, no `Graphics`.
- Nada de `setInterval` ni `setTimeout` en escenas: usar `this.time` y los tweens, que se pausan y se limpian con la escena. La excepción es la medición de fps, que necesita tiempo real.

## 10. Listas de comprobación

### Enemigo nuevo
- [ ] Forma y color propios que se lean de un vistazo, con cara simpática aunque sea un virus.
- [ ] Textura en `textures.ts`, con origen en los pies y sombra.
- [ ] Animaciones de entrada (sale del agujero de su carril, `SCENERY.holeX`), avance, mordisco, golpe recibido (destello o retroceso) y muerte (encoge y suelta partículas).
- [ ] Se mueve en coordenadas de tablero y se pinta con `toScreen`, `cellWidthAt` y `entityDepth`.
- [ ] Al morir llama a `rewardKill(punto)`.
- [ ] Partículas según el nivel gráfico; probado en Bajo y en Ultra.
- [ ] Se mueve con el reloj y los tweens de la escena: con el menú de pausa abierto se queda quieto.

### Mundo o escenario nuevo
- [ ] Pintores propios de cielo y terreno (o variantes), respetando `SKY_HEIGHT` y `LAND_TOP`, y cubriendo `WORLD` entero.
- [ ] Probado en 16:9, en una pantalla ancha (21:9) y en una alta (4:3): sin bordes rectos ni zonas vacías.
- [ ] Animación ambiental propia en un módulo como `ambience.ts`, con todos sus efectos enganchados al perfil de calidad.
- [ ] Si cambia la forma del césped, se cambia `LAWN` y los tests de `perspective.test.ts` siguen pasando.

### Efecto nuevo
- [ ] Aparece y desaparece con animación.
- [ ] Respeta `artInv()` y su ajuste de calidad.
- [ ] No bloquea ni retrasa la regla que acompaña.
