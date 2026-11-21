# [Tienda] Tienda de poderes

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-019, T-020, T-021 · **Bloquea a:** T-023 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
Tras T-019 el Invernadero tiene un hueco de tienda con candado, tras T-020 el jugador acumula semillas y tras T-021 existen tres poderes que hoy solo reciben cargas por configuración. Falta el sitio donde gastar. Carmine decidió que la tienda se desbloquea al vencer al primer jefe.

**Aviso de T-019 (21 nov 2026):** con R-01 b el Invernadero solo aparece tras vencer a Creeper, así que nadie ve la tienda cerrada "por no haber vencido a Creeper": hoy su botón dice "Próximamente". El criterio de "Acceso" que pide decir cómo se abre hay que replantearlo al ejecutar esta task (por ejemplo, quitarlo o enseñar el aviso de tienda abierta en la victoria).

## Objetivos
1. **Gastar semillas en poderes.**
2. **Elegir qué poderes se llevan** a la partida.
3. **Que lo comprado no se pierda.**

## Alcance
**Incluye:** pantalla de tienda en el Invernadero, compra de poderes, selección de los que se llevan, precios en `balance.ts`, compras en el progreso permanente (con su migración), textos, tests.
**No incluye:** nivel base de las plantas (T-023), plantas nuevas a la venta, pagos con dinero real, ofertas.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| T-01 | ¿Qué se compra exactamente? | Depende de O-01 (T-021): unidades de un uso, o el poder para siempre | El poder para siempre, con una mejora cara que da una segunda carga por partida | Carmine |
| T-02 | Precios | Valores libres | Primer poder al alcance tras vencer a Creeper una vez (unas 100 semillas); los otros, más caros | Carmine |
| T-03 | ¿Se puede devolver una compra? | Sí o no | No | Carmine |
| T-04 | ¿Dónde se eligen los poderes que se llevan? | a) En la tienda. b) Antes de empezar el brote | b: es el mismo sitio donde más adelante se ordenarán las cartas de plantas | Carmine |

Esta task no se puede ejecutar hasta cerrar O-01.

## Criterios de aceptación
### Acceso
- [ ] Sin haber vencido a Creeper, la tienda aparece bloqueada y dice cómo se abre.
- [ ] Al vencer a Creeper por primera vez, un aviso dice que la tienda está abierta.

### Comprar
- [ ] Cada poder muestra nombre, qué hace, precio y si ya se tiene.
- [ ] Comprar descuenta las semillas y deja el poder disponible al instante.
- [ ] No se puede comprar sin semillas suficientes; el botón se ve apagado y el precio en rojo.
- [ ] No se puede comprar dos veces lo que solo se compra una vez.
- [ ] La compra sigue ahí tras recargar la página.

### Llevar a la partida
- [ ] El jugador elige qué poderes lleva, hasta el máximo de O-02.
- [ ] Al empezar un brote, el panel izquierdo trae los elegidos con sus cargas.
- [ ] Sin ningún poder comprado, la partida empieza como hoy.

### Calidad
- [ ] Precios en `balance.ts`; reglas de compra puras y con tests.
- [ ] El saldo nunca queda negativo, ni con dos clics muy rápidos.
- [ ] Se ve bien a 812 × 375 y 568 × 320.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Progreso de una versión anterior sin compras: se migra con la lista vacía.
- Cambiar los poderes elegidos con una partida a medias: afecta a la siguiente partida, no a la que está guardada.
- Bajar un precio después de que alguien compró: no se devuelve la diferencia.
- Riesgo: una tienda con 3 artículos se vacía pronto. Es suficiente para probar si el bucle engancha; después llegan T-023 y más poderes.

## Objetivo final con ejemplos
Con el primer poder a 100 semillas:
| Situación | Resultado |
|---|---|
| 150 semillas, compra el meteorito | Quedan 50; el meteorito aparece como "Tuyo" |
| 50 semillas, intenta comprar el muro de hielo | Botón apagado, saldo sin cambios |
| Empieza el brote 2 con el meteorito elegido | Panel izquierdo con el meteorito y 1 carga |
| No venció a Creeper | Tienda con candado |

## Cómo probarlo (QA)
1. Con progreso vacío, comprobar el candado.
2. Vencer a Creeper, comprar un poder y recargar.
3. Empezar una partida y usarlo.
