# ADR-0004: Arte hecho por código, bonito y animado

- **Estado:** Aceptada. Modificada el 2026-11-19 (ver "Historial").
- **Fecha:** 2026-11-19

## Contexto

La primera versión de este ADR limitaba el mundo 1 a formas planas y sin animación para no gastar tiempo en arte antes de saber si el juego divierte.

Carmine cambió la prioridad: la idea es que sea un juego bonito. Cuanta más animación y mejores gráficos, mejor. Ninguna decisión técnica debe frenar eso.

## Decisión

### Cómo se hace el arte
- El arte se genera por código: Canvas 2D y Phaser (degradados, sombras, brillos, partículas, tweens, filtros). No hace falta esperar archivos de imagen para avanzar.
- Se pueden usar sprites o arte externo si son propios o tienen una licencia que permita un uso comercial futuro. La fuente se anota junto al archivo.
- El sonido se decidió aparte: efectos de sonido en el ADR-0013 (T-014).

### Todo se anima
- **Plantas:** respiran en reposo, aparecen con un salto al sembrarlas y reaccionan al disparar y al recibir daño.
- **Enemigos:** se mueven con gracia al avanzar, al morder y al morir.
- **Monedas:** saltan al caer, brillan y vuelan al marcador cuando se recogen.
- **Escenario:** el cielo, las nubes, el viento sobre el césped, las partículas y la vegetación se mueven.
- **HUD:** las cartas, el saldo y los menús tienen transiciones en CSS.

### Libertad creativa
Al construir enemigos, escenarios y efectos hay libertad creativa para que el juego sea amigable y divertido. Se valoran personajes simpáticos, colores alegres, reacciones exageradas y pequeños detalles que den gusto descubrir. No hace falta pedir permiso para añadir animaciones o adornos mientras no cambien reglas ni balance.

### Lo que se mantiene
- **Colores que se leen de un vistazo:** disparadora verde, fuego rojo o naranja, hielo azul claro.
- **Cañones:** se ve un cañón por cada cañón de la planta.
- **Nivel:** se muestra con una medallita con número.
- **Animación separada de las reglas:** la animación nunca decide reglas. La lógica de `src/game/core/` no espera a que termine una animación. Por ejemplo, la moneda se cobra al hacer clic, no cuando acaba su vuelo.
- **Rendimiento:** lo que no se mueve se pinta una sola vez en una textura. Lo animado no puede romper el criterio de T-002: con 60 enemigos y 20 plantas en pantalla, el juego sigue fluido.
- **Estilo propio:** el arte no copia el de otro juego (ver el riesgo de parecido en `docs/specs/00-vision.md`).

## Consecuencias

- Cada task visual tarda algo más. Se acepta: el aspecto es parte del objetivo.
- La perspectiva y la composición de la escena se deciden en el ADR-0005.

## Historial

- **2026-11-19, versión original:** "Formas simples hasta validar que el juego divierte": círculos y rectángulos de colores, sin sprites, sin animaciones de arte, sin sonido, hasta poder jugar el mundo 1 completo.
- **2026-11-19, modificación:** Carmine pidió un juego bonito y lo más animado posible, con libertad creativa en enemigos, escenarios y efectos. Se levantan las prohibiciones de sprites y de animación, y se mantiene la de sonido.
- **2026-11-20, modificación:** el juego ya suena (T-014). El porqué está en el ADR-0013.
