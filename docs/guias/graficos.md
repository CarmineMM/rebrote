# Guía de gráficos y animación

Cómo se pinta y se anima Rebrote, para que todo lo nuevo (enemigos, mundos, efectos, plantas) encaje con lo que ya hay. Las decisiones de fondo están en los ADR-0004 (arte bonito y animado), ADR-0005 (cámara inclinada), ADR-0006 (ajustes gráficos), ADR-0007 (pantalla completa y pausa) y ADR-0008 (combate como simulación pura).

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
| `src/game/view/effects.ts` | Efectos de respuesta compartidos: ráfagas de partículas (tierra, chispas, hojas, píxeles, jugo), anillos, destellos y textos flotantes |
| `src/game/view/plantView.ts` | Disparadora: brota, respira, retrocede al disparar, se encoge al recibir un mordisco, se marchita y muere (`PLANT_LOOK`) |
| `src/game/view/wormView.ts` | Gusano: sale del agujero, ondula, muerde, recibe golpes, muere, se cuela y celebra |
| `src/game/view/bulletView.ts` | Semilla en vuelo, impacto y salida del tablero |
| `src/game/scenes/BoardScene.ts` | Siembra, monedas, combate (avanza la partida y anima sus eventos), resaltado, filtros de Ultra, ajuste de la vista, pausa y derrota |
| `src/ui/` | HUD flotante (cartas, vidas, saldo), menú de pausa, ajustes y pantalla de derrota (React) |

## 3. Coordenadas y perspectiva

- La lógica trabaja en **coordenadas de tablero**, en unidades de casilla (`BoardPoint`). `x` avanza por las columnas y `y` por los carriles; el carril 0 es el del fondo. El centro de la casilla del carril 2 y la columna 3 es `{ x: 3.5, y: 2.5 }`.
- Nunca se calcula una casilla dividiendo píxeles. Para pintar se usa `perspective.toScreen(point)`. Para el puntero se usa `perspective.toBoard(...)` y luego `cellAt(...)`.
- Fuera del tablero también vale: `x < 0` es el camino, `x > 9` es el suelo corrupto. Así el decorado sigue la misma perspectiva.
- **Lo que está de pie** (plantas, enemigos, monedas, flores) se dibuja derecho, apoyado en su punto del suelo:
  - El origen va en los pies (`setOrigin(0.5, pieY / alto)`).
  - El tamaño sale de `perspective.cellWidthAt(punto)`, así que lo del fondo se ve más pequeño.
  - La profundidad es `entityDepth(y en pantalla)`, para que lo de delante tape lo de atrás.
  - Lleva una sombra en el suelo (`TEX.shadow`) con profundidad algo menor.
- **Dónde apoya cada cosa en su carril:**
  - Las plantas, en `carril + 0,62` (`PLANT_LOOK.footY`).
  - Los gusanos, en `carril + 0,64`: un pelo por delante, para que tapen a la planta que muerden.
  - Las balas vuelan a la altura del cañón (`PLANT_LOOK.muzzle`) sobre la línea de las plantas, con una sombrita en el suelo.
- **Lo que mide en casillas pero se dibuja en píxeles de textura** (plantas, gusanos, semillas) usa 160 píxeles de diseño por casilla, el ancho de la textura de la disparadora.
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

## 5. Combate en pantalla (ADR-0008)

- **La escena no decide nada.** En cada `update` avanza la partida con `stepSpawner` y `stepCombat` (`src/game/core/`), anima los eventos que devuelven y recoloca las vistas. Ninguna vista mueve una entidad por su cuenta.
- **Cada entidad del estado tiene su vista:** los enemigos y las balas se buscan por id; las plantas, por casilla. `sync(...)` recoloca la vista en cada fotograma.
- **Reacciones con valores sueltos.** Las reacciones de un gusano (salir, morder, golpe, retroceso) son valores `{ v: 0 }` que se animan con tweens y que `sync` aplica. Así una reacción nueva corta la anterior sin romper las demás.
- **Las que se van, se van solas.** Una vista que muere, se cuela o sale del tablero se quita del mapa en el acto y termina su animación sola.
- **Destello blanco:** `setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)` y, para volver, `clearTint()` (o el tinte que tuviera). En Phaser 4 el color y el modo del tinte van por separado.

| Evento | Cómo se anima |
|---|---|
| `shot` | La planta retrocede y se aplasta un instante. Fogonazo en la boca del cañón y la semilla nace ahí |
| `hit` | La semilla revienta en jugo con un anillo lima pequeño. El gusano destella en blanco, retrocede y pone cara de "ay" |
| `bulletGone` | La semilla se apaga mientras sigue un poco |
| `bite` | El gusano se echa atrás con la boca abierta y se lanza. La planta se encoge, destella, suelta hojas y amarillea según la vida que le queda |
| `plantDestroyed` | La planta se aplasta contra el suelo con hojas y tierra |
| `enemyKilled` | El gusano se infla, se encoge y se deshace en píxeles verdes y morados. Sale su moneda (`rewardKill`) |
| `enemyEscaped` | El gusano se mete bajo tierra en el camino. "−1 ♥", un temblor corto y React rompe un corazón |
| Derrota | Las balas se apagan y los gusanos saltan de contentos. A los 1,1 s React muestra la pantalla de derrota |

- **Varios efectos en el mismo sitio.** Varias plantas pueden dar a la vez al mismo gusano. Los efectos que se repiten mucho (impactos) van pequeños y translúcidos para no tapar la cara del enemigo.

## 6. Capas

Orden de dibujo, de atrás hacia delante (`DEPTH` en `layout.ts`):

| Capa | Qué va |
|---|---|
| `sky`, `sun`, `clouds`, `birds` | Cielo y todo lo que pasa por él |
| `land` | Textura fija: colinas, ciudad, seto, laterales, césped, corte de tierra |
| `canopy` | Copa del árbol |
| `groundFx` | Efectos pegados al suelo: viento, sombras de nubes, brillos del suelo corrupto, rocío, haces de luz |
| `highlight` | Resaltado de casilla |
| `entities + y` | Plantas, enemigos, balas (`+0,5`, delante de su planta), monedas y flores, ordenados por su `y` en pantalla |
| `pollen`, `butterflies` | Partículas y bichos que flotan por encima |
| `foreground` | Matas del primer plano |
| `floatText` | Textos flotantes (+25) y monedas volando al marcador |

## 7. Cómo se pinta el arte

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

## 8. Cómo se anima

- **Reposo:** `breathe(...)` hace un ida y vuelta infinito con `Sine.InOut`. Las plantas se aplastan y estiran un poco, y se mecen. Flores, matas y la copa del árbol se balancean con fases distintas (`delay` aleatorio) para que no vayan al unísono.
- **Entradas:** con rebote (`Back.Out`, `Elastic.Out`). Ejemplos: la planta brota de la tierra con un estirón y un puñado de tierra; la moneda sale despedida, cae con `Bounce.Out` y se queda flotando y girando.
- **Salidas:** encogerse o desvanecerse en 200–300 ms, nunca un `destroy()` en seco a la vista del jugador.
- **Respuesta a acciones:** cada acción del jugador tiene una respuesta visible: partículas, texto flotante (+29) o un vuelo al marcador. La regla se aplica en el acto y la animación es solo decorado.
- **Avisos:** lo que va a desaparecer avisa antes. La moneda soltada parpadea durante el último 30 % de su vida.
- **HUD y menús (React):** transiciones y animaciones CSS.
  - La bandeja y el saldo caen al empezar.
  - La carta elegida flota.
  - El saldo da un salto dorado al subir y rojo al bajar.
  - Los corazones de las vidas laten por turnos. El que se pierde se rompe y se apaga.
  - La pantalla de derrota entra como el menú de pausa, con un corazón que se parte en dos.
  - El menú de pausa entra con un pequeño rebote.
  - La pantalla de carga muestra un brote que crece.
  - Con `prefers-reduced-motion` las animaciones CSS se apagan.
- **Duraciones orientativas:** reacciones de 150 a 450 ms, reposo de 0,9 a 3,5 s por ciclo y cielo de 15 a 120 s.

## 9. Niveles gráficos (ADR-0006)

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

## 10. Rendimiento

- **Presupuesto (T-002):** con 60 enemigos y 20 plantas, el juego sigue fluido en Medio.
- **Prueba de rendimiento:** en `npm run dev`, la tecla `H` siembra gratis las cuatro primeras columnas (20 disparadoras) y suelta 60 gusanos con mucha vida. Se mide con "Mostrar FPS".
- Medido el 19 nov 2026 en un equipo sin GPU (Chromium con render por software): el JavaScript ocupa un 5 % del tiempo, igual con la prueba que sin ella. Lo que cuesta es rellenar píxeles.
- El coste está en rellenar píxeles, no en JavaScript. Hay que evitar capas grandes transparentes: el cielo y el terreno ya se recortaron a lo que se ve.
- Un `Graphics` redibujado en cada frame solo para pocos polígonos (el viento dibuja 8).
- Los enemigos y las balas, si son muchos, conviene que sean imágenes de una textura compartida, no `Graphics`.
- Nada de `setInterval` ni `setTimeout` en escenas: usar `this.time` y los tweens, que se pausan y se limpian con la escena. La excepción es la medición de fps, que necesita tiempo real.

## 11. Listas de comprobación

### Enemigo nuevo
- [ ] Forma y color propios que se lean de un vistazo, con cara simpática aunque sea un virus.
- [ ] Textura en `textures.ts`, con origen en los pies y sombra.
- [ ] Animaciones de entrada (sale del agujero de su carril, `SCENERY.holeX`), avance, mordisco, golpe recibido (destello o retroceso) y muerte (encoge y suelta partículas).
- [ ] Sus reglas están en `stepCombat` con su evento y su test; la vista, en un módulo como `wormView.ts`, sigue al estado en `sync` y anima cada evento (sección 5).
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
