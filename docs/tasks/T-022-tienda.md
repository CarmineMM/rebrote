# [Tienda] Tienda de poderes y sus mejoras

**Estado:** Completada (22 nov 2026, 0.10.0) · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-019, T-020, T-021 · **Bloquea a:** T-023 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
Tras T-019 el Invernadero tiene un hueco de tienda con candado, tras T-020 el jugador acumula semillas y tras T-021 existen tres poderes que hoy solo reciben cargas por configuración. Falta el sitio donde gastar. Carmine decidió que la tienda se desbloquea al vencer al primer jefe.

**Aviso de T-019 (21 nov 2026):** con R-01 b el Invernadero solo aparece tras vencer a Creeper, así que nadie ve la tienda cerrada "por no haber vencido a Creeper": hoy su botón dice "Próximamente". El criterio de "Acceso" que pide decir cómo se abre hay que replantearlo al ejecutar esta task (por ejemplo, quitarlo o enseñar el aviso de tienda abierta en la victoria).

Al empezar la task (22 nov 2026), Carmine amplió T-01: además de comprar los poderes, se mejoran por niveles hasta el 10.

## Objetivos
1. **Gastar semillas en poderes** y en sus mejoras.
2. **Elegir qué poderes se llevan** a la partida.
3. **Que lo comprado no se pierda.**

## Alcance
**Incluye:** pantalla de tienda en el Invernadero, compra y mejora de poderes, selección de los que se llevan, precios y lo que da cada nivel en `balance.ts`, compras en el progreso permanente (sin migración: ADR-0014), textos, sonido, tests.
**No incluye:** nivel base de las plantas (T-023), plantas nuevas a la venta, pagos con dinero real, ofertas.

## Decisiones
Cerradas por Carmine el 22 nov 2026, al empezar la task: T-01 la cambió él y las demás, con la recomendación. Lo que salió de T-01 (lo que da cada nivel y su precio) se le preguntó aparte.

| # | Pregunta | Opciones | Recomendación | Decidido |
|---|---|---|---|---|
| T-01 | ¿Qué se compra exactamente? | Con O-01 cerrada (T-021, b), el poder para siempre, que trae 1 carga por partida | El poder para siempre, con una mejora cara que da una segunda carga por partida | **El poder para siempre, y mejoras por niveles hasta el 10** (todos los poderes). Ver "Niveles" |
| T-02 | Precios | Valores libres | Primer poder a 1000; los otros, 1500 y 2000. La tienda entera debe costar más de lo que dan las primeras victorias | La recomendación: 1000, 1500 y 2000 según el orden en que se compran |
| T-03 | ¿Se puede devolver una compra? | Sí o no | No | La recomendación: no |
| T-04 | ¿Dónde se eligen los poderes que se llevan? | a) En la tienda. b) Antes de empezar el brote | b | La recomendación: b |

### Niveles (T-01)
Preguntado a Carmine el 22 nov 2026. Recolocar antes se usaba una sola vez por partida (O-01, b).

| Poder | Cada nivel | En los niveles 5 y 10 | En el 10 |
|---|---|---|---|
| Granada | +15 % del daño de nivel 1 | +40 % de daño en vez del 15 %, y más alcance (1,8 → 2,1 → 2,4 casillas) | 570 de daño, 2,4 casillas |
| Muro de hielo | +20 % de la vida de nivel 1 en cada bloque | +35 % de vida en vez del 20 %, y una casilla más: 4 desde el nivel 5 | 930 por bloque, 5 casillas (la columna entera) |
| Recolocar | Cura un 5 % de la vida entera de la planta que se mueve | Una carga más por partida: 2 desde el nivel 5 | 3 usos, cura el 45 % |

Precio de cada mejora: subir al nivel N cuesta 200 × N, y los niveles 5 y 10, el doble (400, 600, 800, 2000, 1200, 1400, 1600, 1800 y 4000: 13.800 por poder). Con los tres poderes, la tienda entera cuesta 45.900 semillas: algo más de lo que dan las primeras victorias de los 26 brotes (unas 45.000).

El alcance de la granada en el 5 y el 10 es lo que proponía la recomendación: Carmine fijó el daño y no habló del alcance. Si no lo quiere, es `GRENADE.radiusPerMilestone` a 0.

### Decidido al implementar
- **Acceso:** con R-01 b, nadie ve la tienda cerrada (el Invernadero solo existe tras vencer a Creeper), así que no lleva candado ni dice cómo se abre. En su lugar, la primera vez que cae Creeper la victoria dice "¡Tienda abierta! Gasta tus semillas en poderes, en el Invernadero" (`opensShop`). El botón "Tienda" del Invernadero ya no dice "Próximamente": dice "Poderes" y lleva un puesto de jardín dibujado.
- **La tienda** se abre encima del Invernadero, como la ruta: tres tarjetas en fila, una por poder, con su dibujo que se mece, su nombre, qué hace, sus niveles en hojitas (las de premio, doradas), lo que hace en su nivel, lo que hará en el siguiente ("¡Premio!" en el 5 y el 10) y el botón "Comprar" o "Mejorar" con el precio en semillas. Lo que ya es suyo lleva "Tuyo" o "Tuya". Sin semillas, el botón se ve gris y el precio en rojo; en el 10, "Nivel máximo". Lo comprado salta encima de la tarjeta ("¡Comprado!", "¡Nivel 3!") con un aro dorado.
- **Un poder recién comprado** entra solo en lo que se lleva si cabe (aún no hay dos elegidos): se quiere probar.
- **Elegir los poderes del brote:** con algún poder comprado, "Siguiente brote" y los botones de la ruta pasan antes por "Poderes del brote", en el panel del Invernadero: cada poder comprado es un interruptor con su dibujo, su nombre y su nivel; con dos elegidos, el tercero se ve apagado ("Ya llevas 2: deja otro antes"). Lo elegido se guarda y la próxima vez sale igual. "¡A jugar!" empieza el brote. Sin poderes comprados, el brote empieza directamente. "Jugar otra vez" repite los de la partida que acaba.
- **En la partida:** cada poder lleva su nivel (`PowerSlot.level`). El panel enseña una hoja verde con el nivel abajo a la izquierda del botón (desde el 2) y lo dice en su ayuda. La granada apunta y explota con su alcance; el muro fantasma enseña sus 4 o 5 bloques (con 4, uno más arriba que abajo), y recolocar, al llegar, enseña lo que curó ("+60") en verde con unos destellos.
- **Sonido:** dos efectos nuevos, `purchase` (semillas que tintinean y un ta-da) y `powerUpgrade` (arpegio que sube); llegar al nivel 5 o al 10 suena como un desbloqueo, igual que en las plantas (`shopCue`). Carmine los puede cambiar de oído en `/sonidos.html`.
- **Tours:** no hay tour nuevo. La tienda no es un gesto del tablero, y cada poder sigue enseñándose la primera vez que se lleva (T-021). El paso del muro dice "bloques" en vez de "tres bloques".
- **Borrar jugador** dice también cuántos poderes compró.
- **Desarrollo:** `?poderes=granada,muro:10` elige poderes y su nivel; sin él, los elegidos antes del brote.
- **Guardado:** el progreso pasa a la versión 4 (`powers`, `carried`) y la partida guardada a la 8 (nivel de cada poder, daño y alcance de cada granada y vida entera de cada bloque de hielo). Lo guardado antes se descarta (ADR-0014, regla 11).

## Criterios de aceptación
### Acceso
- [x] ~~Sin haber vencido a Creeper, la tienda aparece bloqueada y dice cómo se abre.~~ Replanteado (aviso de T-019): sin vencer a Creeper no hay Invernadero, así que nadie ve la tienda cerrada.
- [x] Al vencer a Creeper por primera vez, un aviso dice que la tienda está abierta.

### Comprar
- [x] Cada poder muestra nombre, qué hace, precio y si ya se tiene.
- [x] Comprar descuenta las semillas y deja el poder disponible al instante.
- [x] No se puede comprar sin semillas suficientes; el botón se ve apagado y el precio en rojo.
- [x] No se puede comprar dos veces lo que solo se compra una vez.
- [x] La compra sigue ahí tras recargar la página.
- [x] Cada poder se mejora hasta el nivel 10, con lo que da cada nivel (ver "Niveles"); en el 10 dice "Nivel máximo".

### Llevar a la partida
- [x] El jugador elige qué poderes lleva, hasta el máximo de O-02.
- [x] Al empezar un brote, el panel izquierdo trae los elegidos con sus cargas.
- [x] Sin ningún poder comprado, la partida empieza sin panel de poderes.

### Calidad
- [x] Precios en `balance.ts`; reglas de compra puras y con tests.
- [x] El saldo nunca queda negativo, ni con dos clics muy rápidos.
- [x] Se ve bien a 812 × 375 y 568 × 320.
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Progreso de una versión anterior: se descarta (ADR-0014, sin migraciones durante el desarrollo).
- Cambiar los poderes elegidos con una partida a medias: afecta a la siguiente partida, no a la que está guardada.
- Bajar un precio después de que alguien compró: no se devuelve la diferencia.
- Riesgo: una tienda con 3 artículos se vacía pronto. Con las mejoras, la tienda entera cuesta 45.900 semillas; después llega T-023.
- Riesgo de balance: un muro de nivel 10 corta la columna entera y aguanta 930 por bloque. Las rondas se siguen equilibrando sin contar con los poderes (`npm run sim` no los usa).

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| 1089 semillas, compra la granada | Quedan 89; la granada aparece como "Tuya", en el nivel 1 |
| 89 semillas, intenta comprar el muro de hielo | Botón gris, precio (1500) en rojo, saldo sin cambios |
| Granada de nivel 4 y 2500 semillas, la mejora | Pasa al nivel 5 por 2000: daño 370 y alcance 2,1; suena a premio |
| Empieza el brote 2 con la granada elegida | Panel izquierdo con la granada y 1 carga |
| Recolocar de nivel 5 en la partida | 2 cargas; la planta llega con un 20 % de su vida más |
| Muro de hielo de nivel 5 en el carril 2 | 4 bloques, del carril 0 al 3, de 585 de vida |
| Primera victoria contra Creeper | La victoria dice "¡Tienda abierta!" |

## Cómo probarlo (QA)
1. Vencer a Creeper por primera vez: la victoria avisa de la tienda.
2. En el Invernadero, abrir la tienda, comprar un poder, mejorarlo y recargar: sigue igual.
3. Con poco saldo, comprobar el botón gris y el precio en rojo.
4. Comprar los tres, pulsar "Siguiente brote" y elegir dos; empezar y comprobar el panel (cargas y nivel).
5. Usar cada poder con nivel: el alcance de la granada, los bloques del muro y lo que cura recolocar.
6. Probar la tienda y la elección a 812 × 375 y 568 × 320, en español y en inglés.
