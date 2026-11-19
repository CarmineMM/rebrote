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
| `src/game/view/effects.ts` | Efectos de respuesta compartidos: ráfagas de partículas (tierra, chispas, hojas, píxeles, jugo, llamas, brasas, humo), anillos (también tumbados en el suelo), destellos y textos flotantes |
| `src/game/view/boardMarks.ts` | Marcas sobre el tablero que comparten cartas y arrastre: casilla (`drawCell`), área circular en perspectiva (`drawArea`, `areaSize`) y rótulo de lo que pasará al soltar (`BoardLabel`, `LABEL_TONES`) |
| `src/game/view/plantView.ts` | Disparadora: brota, respira, retrocede al disparar, se encoge al recibir un mordisco, se marchita y muere (`PLANT_LOOK`). Al arrastrar otra: se atenúa, se levanta o da un saltito. Al fusionarse o infundirse: cambia de textura con un rebote. La de fuego suelta brasas. Boca de cada cañón (`barrelMuzzle`) |
| `src/game/view/mineView.ts` | Mina (T-004): se entierra, duerme, se arma con cuenta atrás visible, la muerden, explota o se apaga si la destruyen |
| `src/game/view/fusionDragView.ts` | Arrastre para fusionar (T-006): planta en la mano con su sombra, casillas de destino y rótulo (`DRAG_LOOK`, `dragGround`) |
| `src/game/view/wormView.ts` | Gusano: sale del agujero, ondula, muerde, recibe golpes y explosiones, arde, muere, se cuela y celebra |
| `src/game/view/bulletView.ts` | Semilla en vuelo (normal o de fuego), impacto y salida del tablero |
| `src/game/scenes/BoardScene.ts` | Cartas (sembrar e infundir), monedas, combate (avanza la partida y anima sus eventos), fusionar por arrastre, resaltado, filtros de Ultra, ajuste de la vista, pausa y derrota |
| `src/ui/` | HUD flotante (cartas con su precio, vidas, saldo), menú de pausa, ajustes y pantalla de derrota (React) |

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
  - Las balas vuelan a la altura del cañón del que salen (`barrelMuzzle`) sobre la línea de las plantas, con una sombrita en el suelo. Una semilla que se vuelve a pintar al cambiar la calidad no sabe de qué cañón salió y vuela a la altura del central.
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
| `shot` | La planta retrocede y se aplasta un instante. Fogonazo en la boca del cañón y la semilla nace ahí. Una planta de N cañones manda N eventos a la vez, uno por cañón (`cannon`, 0 es el de arriba), con fogonazos algo más pequeños |
| `hit` | La semilla revienta en jugo con un anillo lima pequeño (la de fuego, en brasas con un anillo naranja). El gusano destella en blanco, retrocede y pone cara de "ay" |
| `bulletGone` | La semilla se apaga mientras sigue un poco |
| `bite` | El gusano se echa atrás con la boca abierta y se lanza. La planta se encoge, destella, suelta hojas y amarillea según la vida que le queda. La mina se aplasta y destella |
| `plantDestroyed` | La planta se aplasta contra el suelo con hojas y tierra. La mina se hunde y su mecha se apaga con un hilo de humo: no explota |
| `mineArmed` | La mina abre los ojos de susto, salta, sale un "!", aparece la cuenta atrás ("2", "1") y su alcance en el suelo (sección 7) |
| `mineExploded` | Bola de fuego, llamas, brasas, humo, onda en el suelo del tamaño del alcance y chamuscado que se apaga. Los gusanos alcanzados saltan (`blasted`) y la cámara tiembla un poco |
| `enemyKilled` | El gusano se infla, se encoge y se deshace en píxeles verdes y morados. Sale su moneda (`rewardKill`) |
| `enemyEscaped` | El gusano se mete bajo tierra en el camino. "−1 ♥", un temblor corto y React rompe un corazón |
| Derrota | Las balas se apagan y los gusanos saltan de contentos. A los 1,1 s React muestra la pantalla de derrota |

- **Lo que dura, sale del estado, no de un evento.** La quemadura (`enemy.burn`) y la cuenta atrás de la mina (`mine.fuseMs`) se leen en `sync`. Así una partida que se continúa (cambio de calidad) se pinta igual sin repetir eventos.

- **Varios efectos en el mismo sitio.** Varias plantas pueden dar a la vez al mismo gusano. Los efectos que se repiten mucho (impactos) van pequeños y translúcidos para no tapar la cara del enemigo.

## 6. Arrastrar y fusionar (T-006)

- **Las reglas son de core.** Qué plantas sirven de destino (`fusionTargets`), por qué no se puede (`fusionBlocker`), cómo queda la planta (`fusedPlant`) y la fusión (`fusePlants`) están en `src/game/core/match.ts`. La escena solo lleva el puntero, pinta y anima.
- **Mientras se arrastra, el combate sigue.** La planta arrastrada sigue en su casilla: dispara y la muerden. Se ve medio transparente (`PLANT_LOOK.liftedAlpha`).
- **La planta en la mano:**
  - Flota `DRAG_LOOK.lift` sobre el suelo, lo bastante para no tapar a la planta de destino.
  - Sigue al puntero con un poco de retraso y se inclina hacia donde va.
  - Se agarra por donde se pulsó (`dragGround`).
  - Su sombra marca la casilla donde caerá y solo se pinta sobre el césped.
- **Destinos:**
  - Las casillas de las plantas con las que se puede fusionar se marcan en verde (laten) y esas plantas dan un saltito al empezar.
  - Las demás plantas se oscurecen (`PLANT_LOOK.dimTint`). Se oscurecen y no se transparentan, para que se sigan leyendo sobre el césped claro.
- **Casilla bajo la sombra:** verde si se puede soltar, roja si no. Encima, un rótulo que sube y baja: "Fusionar: N cañones", "Quedará en nivel N" en ámbar si cambia el nivel, y "Otra variante" o "Máximo 3 cañones" en rojo. Sobre una casilla vacía no se marca nada.
- **Soltar:**
  - **En un destino válido:** la regla se aplica en el acto. La de la mano se mete en la de destino. La de origen se estira hacia arriba y deja tierra. La de destino se aplasta, destella, cambia de textura y rebota (`PlantView.fuse`) con anillo, chispas, hojas, destello del punto nuevo y "¡Fusión!". Esta animación va sobre el cuerpo y no sobre el contenedor: así un disparo o un mordisco a la vez no la cortan.
  - **En cualquier otro sitio:** la de la mano vuelve volando a su casilla y la de origen recupera su aspecto con un saltito.
- **Cancelar:** pausa, clic derecho, tomar una carta o perder la partida devuelven la planta. Si la de origen muere, la de la mano se deshace en hojas.
- **Capa:** la planta en la mano va casi arriba del todo (`DEPTH.floatText - 10`). Su sombra y las marcas de casilla van en la capa `highlight`.

## 7. Cartas, minas e infundir (T-004)

- **Las reglas son de core.** Qué pasa al soltar una carta en una casilla lo dice `cardPlay` (`match.ts`): sembrar o infundir, cuánto cuesta, por cuánto se multiplica el precio y por qué no se puede. `playCard` lo aplica. La escena no tiene reglas propias.
- **A qué apunta la carta.** La disparadora y las minas se siembran en la casilla del suelo bajo el puntero. Con una carta de elemento, si el puntero está sobre una disparadora (su cabeza asoma sobre la casilla de detrás), apunta a esa planta para infundirla.
- **Resaltado con una carta elegida:**
  - Sembrar: casilla clara con la planta o la mina fantasma. La mina, además, con su alcance de explosión pintado en el suelo (`drawArea`, naranja).
  - Infundir: casilla naranja y rótulo "Infundir: 75" o "Infundir: ×3 = 225".
  - No se puede: casilla roja. Sobre una disparadora, el rótulo dice por qué: "Ya tiene fuego", o "Infundir: ×3 = 225" y "No alcanza la moneda".
- **Precio en el HUD (D-04).** Mientras la carta apunta a una disparadora que se puede infundir, la escena manda `cardPreview` y la carta muestra "×3 = 225" con un salto, en rojo y con un temblor si no alcanza. Soltar ahí no hace nada y la carta sigue elegida.
- **Infundir.** La regla se aplica en el acto. La planta se aplasta, destella, cambia a la textura de su variante y rebota (`PlantView.infuse`), con llamas que suben, brasas, anillo y "¡Fuego!". Desde entonces suelta una brasa cada tanto, aunque no dispare.
- **La mina:**
  - Se siembra con un saltito, tierra y unas brasas. Dormida, respira despacio con los ojos cerrados.
  - Armada: cara de susto, mecha que chisporrotea, número de cuenta atrás que salta en cada segundo, alcance en el suelo que late y un brillo al rojo cada vez más rápido. El brillo es un tinte aditivo (`TintModes.ADD`), no un destello blanco, para que la cara se siga leyendo.
  - Explota o se apaga según el evento (sección 5).
- **Gusano quemado.** Mientras `enemy.burn` existe: dos llamas titilan sobre la cabeza y el lomo, el cuerpo tira a rojo (tinte aditivo `WORM_LOOK.burnTint`) y cada 0,7 s pone cara de "ay" y suelta brasas, para que se vea que sigue perdiendo vida. Si muere quemado, queda tostado y humea.
- **Colores de efecto por variante.** El fogonazo del cañón y los destellos de fusionar o infundir salen de `VARIANT_FX` (`plantView.ts`): lima la normal, naranja la de fuego.
- **Llamas con mezcla normal.** Las llamas de partículas no son aditivas: sobre el césped claro se quedarían blancas. Las brasas sí, solo con `quality.glows`.

## 8. Capas

Orden de dibujo, de atrás hacia delante (`DEPTH` en `layout.ts`):

| Capa | Qué va |
|---|---|
| `sky`, `sun`, `clouds`, `birds` | Cielo y todo lo que pasa por él |
| `land` | Textura fija: colinas, ciudad, seto, laterales, césped, corte de tierra |
| `canopy` | Copa del árbol |
| `groundFx` | Efectos pegados al suelo: viento, sombras de nubes, brillos del suelo corrupto, rocío, haces de luz, chamuscado de una explosión |
| `highlight - 1` | Alcance de una mina armada |
| `highlight` | Resaltado de casilla (y alcance de la mina que se va a sembrar). Justo encima, la onda de una explosión |
| `entities + y` | Plantas, enemigos, balas (`+0,5`, delante de su planta), monedas y flores, ordenados por su `y` en pantalla |
| `pollen`, `butterflies` | Partículas y bichos que flotan por encima |
| `foreground` | Matas del primer plano |
| `floatText - 10` | La planta que se arrastra para fusionar |
| `floatText - 5` | Cuenta atrás de las minas: no la tapa una planta del carril de delante |
| `floatText` | Textos flotantes (+25), rótulos del arrastre y de las cartas, y monedas volando al marcador |

## 9. Cómo se pinta el arte

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
  | Fuego (T-004) | cabeza `#fff0b0` a `#ff8f3a` a `#e0401c`, contorno `#8a2410`, cañones `#ffd27a` a `#e2581f` con una brasa `#ffcf4a` dentro, brote `#ffb22e` |
  | Hielo (T-005) | azules claros |

- Se ve un cañón por cada cañón de la planta, y el nivel se muestra con una medallita con número.
  - **Cañones:** la disparadora tiene una textura por número de cañones (`shooterTexture(1 | 2 | 3)`). Los tubos van apilados y sus medidas están en `SHOOTER_BARRELS`, de donde sale también la boca de cada uno. Al fusionarse crece un poco: cabeza algo mayor y una hoja más en la base y en el brote. La de 3 cañones lleva además una flor en la coronilla.
  - **Puntos:** una semillita dorada en el tallo por cañón (`SHOOTER_DOTS`), también en la de 1 cañón.
  - **Medallita de nivel (T-003):** no puede tapar los puntos. Tiene sitio libre en la nuca, arriba a la izquierda de la cabeza.
  - Las variantes de fuego y hielo (T-004, T-005) deben conservar los cañones y los puntos de cada textura.
  - **Variantes:** `paintShooter` recibe una paleta (`SHOOTER_PALETTES`). Tallo y hojas de la base son siempre verdes; cambian cabeza, cañones, boca, brote, flor y mejilla. `shooterTexture(cañones, elemento)` da la textura. Mientras el hielo no tenga paleta (T-005), `shooterVariant` lo pinta como la normal.
  - **Mina:** bulbo de guindilla medio enterrado con una mecha (`MINE_SIZE` guarda pies, bulbo y punta de la mecha). Una textura dormida y otra armada (`mineTexture`).
- **Escala de arte (obligatorio):** las texturas se pintan a la resolución del nivel gráfico.
  - Al crear una imagen, su escala se multiplica por `artInv()`.
  - Las partículas también: `scale: { start: 1 * artInv(), ... }`.
  - `setDisplaySize(...)` no lo necesita, porque fija el tamaño en pantalla.
  - Si una escala sale de `textura.width`, tampoco: ya incluye la resolución.
  - Los textos usan el estilo de la escena (`textStyle()`), que fija `resolution` para que no se vean borrosos en Alto y Ultra.
- `shadowBlur` de Canvas no lo escala el contexto: se multiplica por la escala de arte, como en `paintCorruptionGlow`.
- Lo que no se mueve va a una textura grande pintada una vez (cielo y terreno), no a cientos de objetos.
- Las texturas muy grandes se limitan a 4096 px (límite seguro de WebGL). Si el nivel pide más, bajan algo de resolución: sus imágenes se escalan con `artInvOf(clave)` en vez de `artInv()`.

## 10. Cómo se anima

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

## 11. Niveles gráficos (ADR-0006)

Todo efecto nuevo se engancha a un ajuste del perfil (`QualityProfile`):

| Si el efecto es... | Usa |
|---|---|
| Partículas ambientales | `frequency: base / quality.particles`; con un temporizador propio, `fx.ambientDelay(base)` (brasas de la planta de fuego, chispas de la mecha) |
| Partículas de respuesta a una acción | `effectCount(base)` en la escena: menos en Bajo, nunca cero |
| Más o menos bichos, nubes, flores... | `amount(base, quality.life, mínimo)` |
| Un brillo aditivo (`BlendModes.ADD`) | Solo si `quality.glows` |
| Un adorno extra sin función (destellos, haces) | Solo si `quality.extras` |
| Un filtro de cámara o de objeto | Solo si `quality.postFx`, y solo filtros de una lectura por píxel |

- Prohibidos los filtros de muchas lecturas por píxel (bokeh, tilt-shift, blur grande) a pantalla completa.
- Hay que probar en **Bajo** (¿se sigue leyendo bien?) y en **Ultra** (¿aguanta y se ve mejor, no más oscuro?).
- Para medir: menú de pausa (Esc o P) > Ajustes > "Mostrar FPS".

## 12. Rendimiento

- **Presupuesto (T-002):** con 60 enemigos y 20 plantas, el juego sigue fluido en Medio.
- **Prueba de rendimiento:** en `npm run dev`, la tecla `H` siembra gratis las cuatro primeras columnas (20 disparadoras) y suelta 60 gusanos con mucha vida. Se mide con "Mostrar FPS".
- Medido el 19 nov 2026 en un equipo sin GPU (Chromium con render por software): el JavaScript ocupa un 5 % del tiempo, igual con la prueba que sin ella. Lo que cuesta es rellenar píxeles.
- El coste está en rellenar píxeles, no en JavaScript. Hay que evitar capas grandes transparentes: el cielo y el terreno ya se recortaron a lo que se ve.
- Un `Graphics` redibujado en cada frame solo para pocos polígonos (el viento dibuja 8).
- Los enemigos y las balas, si son muchos, conviene que sean imágenes de una textura compartida, no `Graphics`.
- Nada de `setInterval` ni `setTimeout` en escenas: usar `this.time` y los tweens, que se pausan y se limpian con la escena. La excepción es la medición de fps, que necesita tiempo real.

## 13. Listas de comprobación

### Enemigo nuevo
- [ ] Forma y color propios que se lean de un vistazo, con cara simpática aunque sea un virus.
- [ ] Textura en `textures.ts`, con origen en los pies y sombra.
- [ ] Animaciones de entrada (sale del agujero de su carril, `SCENERY.holeX`), avance, mordisco, golpe recibido (destello o retroceso) y muerte (encoge y suelta partículas).
- [ ] Sus reglas están en `stepCombat` con su evento y su test; la vista, en un módulo como `wormView.ts`, sigue al estado en `sync` y anima cada evento (sección 5).
- [ ] Se mueve en coordenadas de tablero y se pinta con `toScreen`, `cellWidthAt` y `entityDepth`.
- [ ] Al morir llama a `rewardKill(punto)`.
- [ ] Partículas según el nivel gráfico; probado en Bajo y en Ultra.
- [ ] Se mueve con el reloj y los tweens de la escena: con el menú de pausa abierto se queda quieto.

### Variante de planta nueva (fuego, hielo...)
- [ ] Una textura por número de cañones (1, 2 y 3), con los tubos de `SHOOTER_BARRELS` y los puntos del tallo de `SHOOTER_DOTS`. Se distingue de la normal por el color (paleta de la sección 9), no por la forma.
- [ ] Sus semillas salen de la boca de su cañón (`barrelMuzzle`) y se distinguen de las normales.
- [ ] Al fusionarse, `PlantView.fuse` pasa a la textura de su variante con los cañones nuevos.
- [ ] Se sigue leyendo marchita, oscurecida (mientras se arrastra otra planta) y medio transparente (mientras se arrastra ella).
- [ ] La medallita de nivel (T-003) no tapa los puntos del tallo.

### Elemento nuevo (mina e infusión, como el fuego de T-004)
- [ ] Paleta en `SHOOTER_PALETTES` y colores de efecto en `VARIANT_FX`; `shooterVariant` y `mineTexture` dejan de caer en la normal.
- [ ] Texturas de su mina dormida y armada, con la mecha en `MINE_SIZE.tipX/tipY`.
- [ ] Semilla propia (`seedTexture`) e impacto propio en `BulletView`.
- [ ] Su efecto en el enemigo se ve a simple vista y sale del estado en `sync` (como `burn` en `WormView`).
- [ ] Su explosión en `MineView` y su infusión en `PlantView.infuse` (partículas y `INFUSED_TEXT`).
- [ ] Carta en el HUD con su icono en CSS.
- [ ] Probado en Bajo y en Ultra: sus partículas no se quedan blancas sobre el césped.

### Mundo o escenario nuevo
- [ ] Pintores propios de cielo y terreno (o variantes), respetando `SKY_HEIGHT` y `LAND_TOP`, y cubriendo `WORLD` entero.
- [ ] Probado en 16:9, en una pantalla ancha (21:9) y en una alta (4:3): sin bordes rectos ni zonas vacías.
- [ ] Animación ambiental propia en un módulo como `ambience.ts`, con todos sus efectos enganchados al perfil de calidad.
- [ ] Si cambia la forma del césped, se cambia `LAWN` y los tests de `perspective.test.ts` siguen pasando.

### Efecto nuevo
- [ ] Aparece y desaparece con animación.
- [ ] Respeta `artInv()` y su ajuste de calidad.
- [ ] No bloquea ni retrasa la regla que acompaña.
