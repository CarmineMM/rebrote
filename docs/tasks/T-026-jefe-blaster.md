# [Jefe] Blaster y rondas del brote 2

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-024, T-025 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
Carmine aceptó a Blaster como segundo jefe. **El original (2003):** gusano que se propagó solo por equipos con Windows, lanzó un ataque masivo contra los servidores de actualizaciones y provocaba un aviso de apagado con cuenta atrás de 60 segundos.

En el juego es el jefe francotirador. El brote 2 introduce el escudo en la ronda 2 (T-024) y no cambia de escenario. El combate de Creeper sirve de modelo: barra de jefe (`BossBar`), jefe esperando a la derecha (`bossPreparing`), avisos, tests propios (`creeper.test.ts`) y vista propia (`creeperView.ts`).

## Objetivos
1. **Guion de rondas del brote 2,** con un concepto nuevo por ronda.
2. **Combate contra Blaster** con una mecánica que enseñe a usar el escudo.
3. **Cierre del brote** con su recompensa.

## Alcance
**Incluye:** guion de rondas del brote 2, entidad y reglas de Blaster, arte y animación, barra de jefe, sonido, spec del brote 2, textos, tests, simulación con bots como en el brote 1.
**No incluye:** escenario nuevo, brote 3, plantas nuevas aparte del escudo.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| L-01 | ¿Cuántas rondas tiene el brote 2? | 7, 10 u otro | 8: el jugador ya sabe jugar y solo hay dos conceptos nuevos (escudo y francotirador) | Carmine |
| L-02 | Mecánica principal | a) Cuenta atrás: marca una planta y, al llegar a cero, la apaga un rato. b) Disparos muy fuertes a larga distancia. c) Las dos | c: disparos a la planta de más nivel y, por fases, la cuenta atrás | Carmine |
| L-03 | ¿Cómo se salva una planta marcada? | a) Con un escudo delante. b) Infundiéndole escudo. c) Dañando a Blaster antes de que acabe la cuenta | a y c: da dos salidas y no deja vendido a quien gastó su hueco en fuego o hielo | Carmine |
| L-04 | ¿La planta apagada muere o vuelve? | Muere, o vuelve tras unos segundos | Vuelve: perder la mejor planta de golpe frustra | Carmine |
| L-05 | ¿Blaster avanza? | a) Se queda al fondo. b) Avanza despacio | b: si no avanza, no hay presión de tiempo | Carmine |
| L-06 | ¿Trae escolta? | Sí o no | Sí, francotiradores y acorazados, para que las minas sigan sirviendo | Carmine |
| L-07 | ¿Qué desbloquea cada ronda? | Libre | Ronda 2: escudo. Ronda 3: llega el francotirador. Resto: mezcla y subida de dificultad | Carmine |
| L-08 | ¿Topes de nivel del brote 2? | Libre | Tope 10 desde la ronda 1: es la progresión que quedó sin usar en el brote 1 | Carmine |

Los criterios de aceptación del combate se completan cuando L-02 a L-06 estén cerradas.

## Criterios de aceptación
### Rondas
- [ ] El brote 2 tiene su guion completo, editable como datos.
- [ ] Empieza con lo aprendido en el brote 1 según B-01.
- [ ] El escudo se desbloquea en la ronda 2.
- [ ] La dificultad sube de ronda en ronda y es mayor que la del final del brote 1.

### Combate
- [ ] Blaster se ve esperando a la derecha en las rondas previas, como Creeper.
- [ ] Tiene barra de vida de jefe.
- [ ] Ataca a distancia y sus disparos respetan la regla del escudo.
- [ ] Al derrotarlo se gana el brote, se registra como vencido y se entregan las semillas.

### Calidad
- [ ] Reglas en `core` con tests propios; valores en `balance.ts`.
- [ ] Simulado con bots: uno que no usa escudos pierde casi siempre; uno que los usa bien gana la mayoría. Resultado anotado en la spec del brote 2.
- [ ] Spec del brote 2 en `docs/specs/`.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Jugador que llega a Blaster sin ningún escudo: tiene que poder reaccionar durante el combate.
- Planta marcada que se fusiona, se recoloca (T-021) o muere: la cuenta atrás se cancela o sigue a la planta resultante.
- La cuenta atrás se congela en pausa.
- Duración: con 8 rondas debería rondar los 15 minutos, como el brote 1.
- Riesgo: que el jefe se resuelva con un muro por carril. El combate tiene que pedir algo más (L-03, L-05).

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Blaster marca la disparadora de nivel 8 y no hay escudo | Al acabar la cuenta, esa planta se apaga unos segundos |
| Lo mismo, con un muro delante | El muro recibe el golpe y la planta sigue |
| Todas las defensas sin escudos | El jugador pierde plantas una a una y lo normal es perder |
| Blaster cae | Victoria del brote 2 y semillas |

## Cómo probarlo (QA)
1. Jugar el brote 2 entero y cronometrar.
2. Llegar al jefe sin escudos y luego con ellos.
3. Pausar durante una cuenta atrás.
