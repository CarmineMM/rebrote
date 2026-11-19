# [Jefe] Creeper

**Estado:** Pendiente · **Prioridad:** Baja · **Tamaño estimado:** M (orientativo) · **Depende de:** T-007 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Tras la ronda 7 llega el jefe. La idea está en `docs/specs/02-mundo-1-gusanos.md`: Creeper salta de carril, como el original saltaba de máquina en máquina. El resto del diseño no está cerrado, así que esta task no se puede ejecutar todavía.

## Objetivos
1. **Combate de jefe** con una mecánica propia: el salto de carril.
2. **Cierre del mundo 1** con pantalla de victoria.

## Alcance
**Incluye:** entidad Creeper, salto de carril, barra de vida del jefe, pantalla de victoria.
**No incluye:** mundo 2, recompensas, guardado.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| J-01 | ¿Avisa a qué carril va a saltar? | Sí o no | Sí, con 1 s de aviso: sin aviso se siente injusto | Carmine |
| J-02 | ¿Cada cuánto salta? | Tiempo fijo o al recibir cierto daño | Al perder cada 20 % de vida, para que el jugador lo provoque | Carmine |
| J-03 | ¿Invoca gusanos? | Sí o no | Sí, pocos, para que las minas sigan sirviendo | Carmine |
| J-04 | ¿Tiene fases? | Una o dos | Una en el prototipo | Carmine |
| J-05 | ¿Qué pasa con las plantas del carril donde aterriza? | Nada, las daña o las empuja | Daña a la primera planta del carril | Carmine |

## Criterios de aceptación
Se redactan cuando J-01 a J-05 estén cerradas. Lo ya confirmado:
- [ ] El jefe aparece al terminar la ronda 7.
- [ ] El jefe cambia de carril durante el combate.
- [ ] Al derrotarlo se muestra la pantalla de victoria del mundo 1.

## Casos límite y riesgos
- Un jugador con una sola planta de 3 cañones en un carril debe poder perder contra el jefe: esa es la lección.
- Balas en vuelo cuando el jefe salta: siguen por su carril y fallan.
- Efectos activos (quemadura, ralentización) se conservan al saltar.

## Cómo probarlo (QA)
1. Llegar al jefe con todas las defensas en un solo carril y comprobar que no alcanza.
2. Repetir con defensas repartidas.
