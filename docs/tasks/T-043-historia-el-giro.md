# [Historia] El giro: la historia del brote 4

**Estado:** Completada (23 nov 2026, 0.16.1) · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-041, T-042 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 23 nov 2026

## Contexto
El brote 4 es el último de la defensa del refugio. Carmine quiere que la decisión de pasar al ataque se vaya cociendo durante el brote: Boxer lo propone al ver cómo juega el jugador, Patty duda un poco y se va convenciendo, y al caer Morris lo deciden. Patty cierra con "Nos espera un largo viaje". El guion está en `docs/specs/04-historia.md` ("El giro").

Lo que ya existe (verificado):
- **Viñetas** que paran el juego (`StoryOverlay`, ADR-0019). Qué secuencias hay y cuándo salen es una tabla pura, `src/ui/story/stories.ts`: hoy salen al empezar el brote 1, cuando se ve por primera vez a un jefe (lo que cuenta Boxer del virus real), al vencer a un jefe y al entrar al Invernadero. Sus textos están en `story.lines` de `src/i18n/`. Lo visto se guarda por jugador y no vuelve a salir solo.
- **Avisos de ronda:** una línea por ronda (`round.notices.<brote>`), que sale siempre.
- **Retratos y expresiones** de Boxer y Patty (normal, apurado y contento).
- No existe una frase corta de un personaje que salga durante la partida **sin pararla**.

## Objetivos
1. **Contar el giro sin frenar el juego:** frases de una línea en la preparación y solo tres secuencias de viñetas.
2. **Que Patty tenga un arco:** duda leve, y se convence con el paso de las rondas.
3. **Cerrar el primer acto** con la decisión de salir.

## Alcance
**Incluye:** comentarios de una línea de un personaje durante la preparación, que no paran el juego; tres secuencias de viñetas (apertura, mitad y final del brote 4); momentos nuevos en la tabla de historias; textos en español e inglés; lo visto, por jugador; volver a verlas desde el Invernadero; tests; spec y guías.
**No incluye:** el aviso de beta (T-044), personajes nuevos, voces grabadas, lo que Patty enseñará en el brote 5, cambio de escenario.

## Decisiones cerradas (23 nov 2026)
- La confianza crece durante el brote y la decisión se toma al vencer al jefe.
- Patty duda, pero poco, y se convence con el tiempo.
- Patty cierra con "Nos espera un largo viaje".
- El guion de la spec vale como punto de partida.

## Decisiones pendientes
Cerradas el 23 nov 2026: Carmine aceptó todas las recomendaciones.

| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| HG-01 | ¿Cómo se ve un comentario de una línea? | a) Retrato pequeño con un bocadillo en una esquina, que se va solo. b) Viñeta normal, que para el juego | a: ocho pausas en un brote cansan | **Cerrada: a.** Esquina de abajo a la derecha |
| HG-02 | ¿Los comentarios salen al rejugar el brote? | Sí o no | No: solo la primera vez, como las viñetas | **Cerrada: no.** Cuenta como visto en cuanto se ve |
| HG-03 | ¿Cuánto dura un comentario en pantalla? | Libre | Unos 5 s, y un toque lo cierra antes | **Cerrada: unos 5 s** (`REMARK`), y un toque lo cierra |
| HG-04 | Si el jugador adelanta la preparación, ¿qué pasa con el comentario? | a) Se corta. b) Sigue durante el ataque | a: no debe tapar el combate | **Cerrada: a** |
| HG-05 | ¿Hace falta una cuarta expresión para Patty (dudosa)? | Sí o no | Sí si es barata; si no, usar "apurada" | **Cerrada: sí.** Era barata: la cara sale de `kit.ts`, y la tienen todos |
| HG-06 | ¿Los comentarios se pueden volver a leer? | Sí o no | No: solo las tres secuencias de viñetas, desde el Invernadero | **Cerrada: no** |
| HG-07 | Con la ayuda apagada en Ajustes, ¿salen los comentarios? | Sí o no | Sí: son historia, no ayuda | **Cerrada: sí** |

## Criterios de aceptación
### Comentarios
- [x] En la preparación de las rondas que marca el guion aparece una frase de Boxer o de Patty, con su retrato y su nombre.
- [x] El comentario no para el juego ni la cuenta atrás, y no impide sembrar, infundir, fusionar ni usar inventos.
- [x] No tapa las cartas, el panel de inventos ni la barra de sobrecarga, a 812 × 375 ni a 568 × 320.
- [x] Se va solo y se puede cerrar con un toque (HG-03).
- [x] No coincide en pantalla con un tour, un aviso de desbloqueo ni una viñeta.
- [x] Sale solo la primera vez que el jugador llega a esa ronda (HG-02).

### Viñetas
- [x] Al empezar el brote 4 por primera vez sale la secuencia de apertura.
- [x] En la preparación de la ronda 5 sale la de mitad, con Boxer y Patty.
- [x] Al vencer a Morris por primera vez sale la del final, que termina con Patty diciendo "Nos espera un largo viaje".
- [x] Las tres se pueden saltar y, una vez vistas, volver a ver desde el Invernadero.
- [x] Usan el nombre del jugador donde el guion lo pide.
- [x] Lo que cuenta Boxer del Morris real sigue saliendo cuando el jefe se prepara, sin pisarse con las demás.

### Calidad
- [x] Qué sale y cuándo es una tabla pura con tests, sin React ni Phaser.
- [x] Lo visto se guarda en el perfil del jugador (regla 13); sin migración (ADR-0014).
- [x] Los textos son los de `docs/specs/04-historia.md`, en español e inglés.
- [x] Añadir comentarios a otro brote es añadir datos y textos, sin tocar componentes.
- [x] Guías al día.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Partida guardada en la ronda 6 del brote 4 y cargada después: los comentarios de rondas ya pasadas no salen de golpe.
- Jugador que salta todas las viñetas: el juego se entiende igual; la historia nunca explica controles.
- Otro jugador del mismo navegador (perfiles): ve la historia desde el principio.
- Cambio de idioma a mitad de un comentario: se cierra o cambia, sin romperse.
- Inglés: las frases cortas en español pueden alargarse; el bocadillo se adapta.
- **Riesgo: demasiada historia en un brote que ya es largo** (9 rondas). Por eso solo tres secuencias paran el juego.
- **Riesgo de tono:** la duda de Patty es leve; no es un drama.

## Objetivo final con ejemplos
| Momento | Lo que ve el jugador |
|---|---|
| Ronda 1, primera vez | Viñetas de apertura y, después, a jugar |
| Preparación de la ronda 3 | En una esquina, Boxer: "Oye, esto se te da bien. Demasiado bien para seguir escondidos." El juego sigue |
| Preparación de la ronda 5 | Viñetas: Boxer y Patty discuten si salir |
| Cae Morris | Viñetas del final; la última, Patty: "Nos espera un largo viaje." |
| Segunda vez que juega el brote 4 | Nada de historia |

## Cómo probarlo (QA)
1. Con un jugador nuevo en desarrollo, jugar el brote 4 leyendo todo.
2. Adelantar una preparación con un comentario en pantalla.
3. Rejugar el brote y comprobar que no sale nada.
4. Repetir en inglés y a 568 × 320.

## Hecho (23 nov 2026, 0.16.1)
- **Viñetas:** `morrisOpening` (ronda 1), `morrisDebate` (ronda 5) y `morrisDown` (al vencer a Morris), en `STORIES` de `src/ui/story/stories.ts`. Las de una ronda concreta pasan a ser un dato, `STORY_AT_ROUND` (también la apertura del brote 1), y `STORY_ORDER` las ordena por ronda junto a lo que cuenta Boxer de cada jefe. Si se vence a Morris sin ver el final, sale al entrar al Invernadero, como lo de Creeper.
- **Comentarios:** `REMARKS`, `remarkAt` y `remarkFate` en `src/ui/story/remarks.ts` (puros, con test); `useRemark` los pone en marcha y `RemarkBubble` los pinta. Lo visto va en `Progress.story` como `remark:<brote>:<frase>`, sin cambiar la forma de `Progress`.
- **Patty dudosa:** cuarta expresión (`doubtful`) en `design.ts` y `kit.ts`; sale en las galerías y en el catálogo de personajes, que enseña también los comentarios de cada uno.
- **Textos:** `story.lines`, `story.titles` y `story.remarks` en español e inglés.
- **Probado** en el navegador a 1600 × 900, 812 × 375 y 568 × 320, en español y en inglés: la apertura, la de mitad, el final (desde el Invernadero, que la deja volver a ver), los comentarios sin tapar la bandeja, los inventos, la barra de sobrecarga ni el aviso de ronda, la pausa encima (se tapa y se congela) y "¡Que vengan!" a mitad (se corta y queda visto). Vencer a Morris de verdad para ver el final tras la victoria queda para el QA de Carmine: usa el mismo camino que la caída de Creeper.
- Sin sonido nuevo: el comentario suena con la voz de quien habla, como las viñetas. Sin tour: no es una mecánica ni un gesto.

