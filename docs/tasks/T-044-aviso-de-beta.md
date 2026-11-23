# [Interfaz] Aviso de beta y "apoya el proyecto"

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** ninguna · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 23 nov 2026

## Contexto
Carmine va a enseñar el juego a familia y amigos como beta. Quiere que, al terminar lo que hay, salga un aviso: hay más contenido en camino y se pide apoyar el proyecto. Quiere el mismo texto en el punto de la ruta que corresponde al brote siguiente.

Hoy (verificado): cuando ya no quedan brotes por jugar, la ruta enseña un lugar "por llegar" con el texto "Próximamente" (`kind: 'soon'` en `src/game/core/route.ts`; `soon` en `src/i18n/`) y, al fondo, el destino final. Tras vencer al último jefe no se dice nada especial. La portada enseña la versión (ADR-0017).

Esta task no depende del brote 4: el aviso sale al vencer al último brote que exista, sea cual sea. Con el brote 4 hecho, sale después de la frase de Patty "Nos espera un largo viaje" (T-043).

## Objetivos
1. **Que quien termina sepa que es una beta** y que viene más.
2. **Darle una forma concreta de apoyar.**
3. **Que el aviso no moleste** a quien sigue jugando.

## Alcance
**Incluye:** aviso tras vencer al último brote disponible, el mismo mensaje en el lugar "por llegar" de la ruta, uno o dos botones de apoyo, marca de beta junto a la versión, textos en español e inglés, tests.
**No incluye:** pagos dentro del juego, cuentas, recogida de datos, notificaciones cuando salga contenido nuevo.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| BT-01 | ¿Qué es "apoyar"? | **Cerrada (23 nov 2026):** dos botones, "Compartir" y "Comentarios". Sin donaciones | Cerrada | Carmine |
| BT-02 | ¿A dónde lleva cada botón? | **Cerrada (23 nov 2026):** "Comentarios" abre un correo nuevo para `carminemaggiom@gmail.com`, con el asunto ya puesto (sugerido: "Rebrote: comentarios de la beta" y la versión del juego). "Compartir" comparte la dirección del juego | Cerrada | Carmine |
| BT-03 | Texto del aviso | Libre | "Has llegado al final de la beta. El viaje continúa: mantente a la espera de nuevo contenido. Si te ha gustado, apoya el proyecto." | Carmine |
| BT-04 | ¿Cuántas veces sale el aviso tras la victoria? | Una vez o siempre | Una vez por jugador. En la ruta se puede leer siempre | Carmine |
| BT-05 | ¿Se marca "Beta" junto a la versión de la portada? | Sí o no | Sí | Carmine |
| BT-06 | ¿Se avisa de que el progreso puede reiniciarse? | Sí o no | Sí, en una línea: durante el desarrollo no se migran datos (ADR-0014) y es mejor que la familia lo sepa antes | Carmine |

## Criterios de aceptación
### Aviso tras la victoria
- [ ] Al vencer al jefe del último brote disponible, después de la victoria y de sus viñetas, aparece el aviso con el texto de BT-03.
- [ ] Tiene los botones de BT-01 y uno para seguir.
- [ ] Sale según BT-04 y no vuelve a salir solo.
- [ ] No sale al vencer un brote que no es el último.
- [ ] Cuando se añada un brote nuevo, el aviso pasa solo al nuevo último, sin tocar nada.

### Ruta
- [ ] El lugar "por llegar" de la ruta muestra el mismo mensaje y los mismos botones al tocarlo, en lugar de solo "Próximamente".
- [ ] El destino final del fondo no cambia.

### Botones
- [ ] Cada botón abre su enlace fuera del juego, sin perder la partida ni salir de la pantalla completa de forma brusca.
- [ ] Sin conexión (el juego instalado funciona sin ella), el botón avisa de que hace falta conexión en vez de fallar en silencio.
- [ ] Compartir usa lo que ofrezca el aparato y, si no hay nada, copia el enlace y lo dice.
- [ ] "Comentarios" abre la aplicación de correo con el destinatario y el asunto rellenos. Si el aparato no tiene ninguna, se muestra la dirección para copiarla.
- [ ] El asunto incluye la versión del juego, para saber de qué versión habla cada comentario.

### Calidad
- [ ] "Beta" aparece junto a la versión según BT-05.
- [ ] Los enlaces están en un solo sitio de la configuración, no repartidos por los componentes.
- [ ] Qué brote es el último sale de la lista de brotes, con test.
- [ ] Se lee bien a 812 × 375 y 568 × 320 y se maneja con teclado.
- [ ] Textos en español e inglés. No se usan "tienda", "poder" ni "comprar".
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Un brote en preparación (sin jefe) no cuenta como disponible: el aviso sale al vencer el anterior.
- Jugador que ya venció el último brote antes de esta task: ve el mensaje en la ruta; decidir si además le sale el aviso al entrar al Invernadero.
- Varios jugadores en el mismo navegador: cada uno lo ve una vez.
- Rejugar el último brote: el aviso no vuelve a salir.
- La dirección de correo queda a la vista de cualquiera que abra el juego: puede recibir correo no deseado. Carmine lo acepta por sencillez.
- **Riesgo: prometer fechas.** El texto dice que viene más, no cuándo.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Vence a Morris por primera vez | Viñetas del final, Patty: "Nos espera un largo viaje", y después el aviso de beta |
| Vence a Creeper | Sin aviso |
| Abre la ruta y toca el lugar siguiente a Morris | El mensaje de beta y los botones |
| Pulsa "Dejar mi opinión" sin conexión | "Necesitas conexión para abrirlo" |
| Vuelve a vencer a Morris | Sin aviso |

## Cómo probarlo (QA)
1. Vencer al último brote y leer el aviso.
2. Abrir la ruta y tocar el lugar siguiente.
3. Probar los botones con conexión y en modo avión.
4. Repetir con un segundo jugador.
