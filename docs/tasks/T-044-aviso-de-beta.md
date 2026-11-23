# [Interfaz] Aviso de beta y "apoya el proyecto"

**Estado:** Completada (23 nov 2026, 0.16.2) · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** ninguna · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 23 nov 2026

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
| BT-03 | Texto del aviso | **Cerrada (23 nov 2026, con la recomendación):** "Has llegado al final de la beta. El viaje continúa: mantente a la espera de nuevo contenido. Si te ha gustado, apoya el proyecto." Quien aún no llegó al final y lo lee en la ruta o en la portada ve "Rebrote está en beta" de título, con la misma frase | Cerrada | Carmine |
| BT-04 | ¿Cuántas veces sale el aviso tras la victoria? | **Cerrada (23 nov 2026, con la recomendación):** una vez por jugador. En la ruta se puede leer siempre | Cerrada | Carmine |
| BT-05 | ¿Se marca "Beta" junto a la versión de la portada? | **Cerrada (23 nov 2026, con la recomendación):** sí. La marca es un botón que abre el mismo mensaje en el panel | Cerrada | Carmine |
| BT-06 | ¿Se avisa de que el progreso puede reiniciarse? | **Cerrada (23 nov 2026, con la recomendación):** sí, en una línea, en el aviso, en la ruta y en el panel de la portada | Cerrada | Carmine |
| BT-07 | Quien ya venció al último brote antes de esta task, ¿ve el aviso al entrar al Invernadero? (caso límite) | **Decidido al implementar (23 nov 2026), sin recomendación previa:** sí, una vez, tras las viñetas que tenga pendientes; sigue BT-04 (una vez por jugador). Se puede cambiar | Cerrada | Carmine |

## Criterios de aceptación
### Aviso tras la victoria
- [x] Al vencer al jefe del último brote disponible, después de la victoria y de sus viñetas, aparece el aviso con el texto de BT-03.
- [x] Tiene los botones de BT-01 y uno para seguir.
- [x] Sale según BT-04 y no vuelve a salir solo.
- [x] No sale al vencer un brote que no es el último.
- [x] Cuando se añada un brote nuevo, el aviso pasa solo al nuevo último, sin tocar nada.

### Ruta
- [x] El lugar "por llegar" de la ruta muestra el mismo mensaje y los mismos botones al tocarlo, en lugar de solo "Próximamente".
- [x] El destino final del fondo no cambia.

### Botones
- [x] Cada botón abre su enlace fuera del juego, sin perder la partida ni salir de la pantalla completa de forma brusca.
- [x] Sin conexión (el juego instalado funciona sin ella), el botón avisa de que hace falta conexión en vez de fallar en silencio.
- [x] Compartir usa lo que ofrezca el aparato y, si no hay nada, copia el enlace y lo dice.
- [x] "Comentarios" abre la aplicación de correo con el destinatario y el asunto rellenos. Si el aparato no tiene ninguna, se muestra la dirección para copiarla.
- [x] El asunto incluye la versión del juego, para saber de qué versión habla cada comentario.

### Calidad
- [x] "Beta" aparece junto a la versión según BT-05.
- [x] Los enlaces están en un solo sitio de la configuración, no repartidos por los componentes.
- [x] Qué brote es el último sale de la lista de brotes, con test.
- [x] Se lee bien a 812 × 375 y 568 × 320 y se maneja con teclado.
- [x] Textos en español e inglés. No se usan "tienda", "poder" ni "comprar".
- [x] `npm test` y `npm run build` pasan.

## Cómo quedó (23 nov 2026, 0.16.2)
- **Qué brote es el último:** `lastOutbreak()` en `src/game/core/route.ts`, el último de `OUTBREAKS` antes del primero en preparación, con test (un brote nuevo lo mueve solo; uno en preparación no cuenta).
- **Cuándo sale:** `betaNoticeDue` en `src/ui/beta/betaNotice.ts`, con test. Lo visto va en el hueco `beta` del perfil (regla 13, ADR-0018), con el brote que era el último: con un brote nuevo, quien lo venza lo vuelve a ver una vez. No va en `Progress`, que al cambiar de forma se descartaría entero. Cuenta como visto en cuanto se ve.
- **Orden en la victoria:** viñetas del jefe → aviso → tarjeta de la victoria (con las semillas). Lo pone `useBetaNotice` en `App.tsx`.
- **Botones:** `src/ui/beta/support.ts` (reglas con test: sin conexión avisa; compartir usa la hoja del aparato y, si no hay o falla, copia el enlace y, si tampoco, lo deja a la vista; comentarios abre un `mailto:` sin navegar y deja la dirección a la vista con "Copiar" por si no hay aplicación de correo). Los enlaces, en `src/game/config/support.ts`: `shareUrl` es null y comparte la dirección donde está abierto el juego; cuando el juego tenga su dirección pública, se puede poner ahí.
- **Etiquetas:** son las de BT-01, "Compartir" y "Comentarios" (en la tabla de ejemplos ponía "Dejar mi opinión").
- **Ruta:** el lugar "por llegar" es un botón (también con las flechas) y su ficha es el aviso. De paso, el velo de la ruta tiene ahora una fila de alto fijo: la tarjeta ya se salía 2 px a 812 × 375 y el mapa no encogía.
- **Probado** en Chromium sin GPU a 1600 × 900, 812 × 375 y 568 × 320, en español y en inglés: vencer a Morris (viñetas, aviso, victoria), vencer a Brain (sin aviso), volver a vencer a Morris (sin aviso), entrar al Invernadero con Morris vencido de antes (aviso una vez), la ruta, la marca de la portada, Esc y las flechas, y los botones sin conexión. Queda para Carmine, en un móvil de verdad: la hoja de compartir y la aplicación de correo.

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
