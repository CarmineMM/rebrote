# [Jefe] Elk Cloner y rondas del brote 2

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-024, T-025 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 20 y 21 nov 2026

## Contexto
Sustituye a la task del jefe Blaster, que pasó al brote 11 (21 nov 2026). Carmine pidió que el escudo salga igualmente en el brote 2 y que su jefe sea una buena excusa para usarlo.

**El original (1982).** Elk Cloner fue uno de los primeros virus que se extendió fuera de un laboratorio. Viajaba en disquetes de Apple II: se copiaba a cada disquete que pasaba por un equipo infectado y, cada 50 arranques, mostraba un poema en pantalla. No destruía nada; era una broma.

**Desde T-024** el brote 2 ya existe en `OUTBREAKS` con un guion provisional de 3 rondas (tropas del brote 1 y el escudo en la ronda 2) y sin jefe (`boss: null`): está en preparación, cerrado al jugador, y en desarrollo se juega con `?brote=2` (ADR-0015, "Brotes en preparación"). Esta task sustituye ese guion por el de verdad, pone a Elk Cloner como `boss` (y quita su nombre de `outbreak.comingBoss`) y lo abre. Lo que cuenta Boxer de él ya está en `story.lore.elkCloner`; repasarlo si hace falta. Los ataques que cruzan el carril tienen su regla de bloqueo en `waveReach` (`combat.ts`).

En el juego es **Elk Cloner, el Poeta**. El combate de Creeper sirve de modelo: barra de jefe (`BossBar`), jefe esperando a la derecha (`bossPreparing`), tests propios (`creeper.test.ts`) y vista propia (`creeperView.ts`). El brote 2 no cambia de escenario.

## Objetivos
1. **Guion de rondas del brote 2,** con un concepto nuevo por ronda.
2. **Un jefe que enseñe a usar el escudo.**
3. **Cierre del brote** con su recompensa y su trozo de historia.

## Alcance
**Incluye:** guion de rondas del brote 2, entidad y reglas de Elk Cloner, arte y animación, barra de jefe, sonido, spec del brote 2, textos, tests, simulación con bots como en el brote 1.
**No incluye:** escenario nuevo, brote 3, plantas nuevas aparte del escudo, viñetas del brote 2 (se escriben cuando exista T-031).

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| L-01 | ¿Cuántas rondas tiene el brote 2? | 7, 10 u otro | 8: el jugador ya sabe jugar y hay dos conceptos nuevos (escudo y juglar) | Carmine |
| L-02 | Mecánica principal | **Cerrada (21 nov 2026): a.** Recita versos: cada verso es una onda por un carril que atraviesa todas las plantas y solo se para en un escudo | Cerrada | Carmine |
| L-03 | ¿Y el guiño a los 50 arranques? | a) Nada. b) Cada cierto número de versos recita el poema entero: una onda por los cinco carriles a la vez, con aviso largo | b: es el momento grande del combate y premia tener escudos repartidos | Carmine |
| L-04 | ¿Cómo se sobrevive al poema entero sin escudos? | a) No se sobrevive bien. b) El daño es alto pero no mata plantas con la vida completa | b: castiga sin borrar el tablero de golpe | Carmine |
| L-05 | ¿Elk Cloner avanza? | a) Se queda al fondo. b) Avanza despacio | b: si no avanza, no hay presión de tiempo | Carmine |
| L-06 | ¿Trae escolta? | Sí o no | Sí, juglares y acorazados, para que las minas sigan sirviendo | Carmine |
| L-07 | ¿Qué desbloquea cada ronda? | Libre | Ronda 2: escudo. Ronda 3: llega el juglar. Resto: mezcla y subida de dificultad | Carmine |
| L-08 | ¿Topes de nivel del brote 2? | Libre | Tope 10 desde la ronda 1: es la progresión que quedó sin usar en el brote 1 y lo que da margen al nivel base de T-023 | Carmine |
| L-09 | ¿Qué aspecto tiene? | Libre | Un bicho con un disquete por cabeza, como Creeper lleva un monitor | Carmine |

No se reproduce el poema original del virus: los versos del jefe se inventan para el juego, en español e inglés.

Carmine aprobó a Elk Cloner como jefe del brote 2 el 21 nov 2026. Los criterios de aceptación del combate se completan cuando L-03 a L-06 estén cerradas.

## Criterios de aceptación
### Rondas
- [ ] El brote 2 tiene su guion completo, editable como datos.
- [ ] Empieza con lo aprendido en el brote 1 (B-01).
- [ ] El escudo se desbloquea en la ronda 2.
- [ ] La dificultad sube de ronda en ronda y es mayor que la del final del brote 1.

### Combate
- [ ] Elk Cloner se ve esperando a la derecha en las rondas previas, como Creeper.
- [ ] Tiene barra de vida de jefe.
- [ ] Sus ataques respetan la regla del escudo.
- [ ] Al derrotarlo se gana el brote, se registra como vencido y se entregan las semillas (si T-020 está hecha).
- [ ] La ruta del Invernadero lo muestra como jefe del brote 2 y, al vencerlo, como superado.

### Calidad
- [ ] Reglas en `core` con tests propios; valores en `balance.ts`.
- [ ] Simulado con bots: uno que no usa escudos pierde casi siempre; uno que los usa bien gana la mayoría. Resultado anotado en la spec del brote 2.
- [ ] Spec del brote 2 en `docs/specs/`.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Jugador que llega al jefe sin ningún escudo sembrado: tiene que poder reaccionar durante el combate (el aviso del poema entero da tiempo a sembrar).
- El aviso y las ondas se congelan en pausa.
- Ondas en vuelo al morir el jefe: desaparecen.
- Duración: con 8 rondas debería rondar los 15 minutos, como el brote 1.
- Riesgo: que el jefe se resuelva con un muro por carril y nada más. El combate tiene que pedir algo más (L-05, L-06).
- Riesgo de parecido con Creeper: los dos son bichos con un aparato por cabeza. Que la silueta y el color sean claramente otros.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Elk Cloner recita un verso por el carril 3, sin escudos | Todas las plantas del carril 3 pierden vida |
| Lo mismo, con un muro al frente del carril 3 | El muro recibe el golpe; las plantas, nada |
| Anuncia el poema entero y hay escudo en 3 de 5 carriles | Tres carriles a salvo y dos dañados |
| Elk Cloner cae | Victoria del brote 2 |

## Cómo probarlo (QA)
1. Jugar el brote 2 entero y cronometrar.
2. Llegar al jefe sin escudos y luego con ellos.
3. Pausar durante el aviso del poema entero.
