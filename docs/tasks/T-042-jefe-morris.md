# [Jefe] Morris, la sobrecarga y las rondas del brote 4

**Estado:** Completada (23 nov 2026, 0.16.0) · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-041 · **Bloquea a:** T-043 · **Origen:** conversación de diseño del 23 nov 2026

## Contexto
El diseño está en `docs/specs/07-brote-4-morris.md`. Carmine eligió la opción B: Morris inunda el tablero y además hay sobrecarga. Son 9 rondas.

**El original (1988).** El primer gran gusano de internet. Su autor quería medir la red, pero un fallo hacía que el programa se copiara una y otra vez en equipos ya infectados, hasta dejarlos sin recursos.

Los tres jefes anteriores sirven de modelo (verificado en las specs de los brotes 2 y 3): barra de jefe, jefe que se prepara a la derecha, escolta con grito, refuerzos mientras vive, derrota si cruza el jardín, propuestas de aspecto en `/proposals/jefes.html`, catálogo en `/catalog/jefes.html`, medida de dificultad por ronda (`roundThreat`), rondas aceleradas (`haste`) y simulación con bots (`npm run sim`). Lo que cuenta Boxer del virus real sale solo en cuanto existe su texto (`story.lore.<brote>`, T-032).

Tras T-041 el brote 4 existe en preparación, con sus tropas de variante y 600 monedas. Lo que deja hecho (ADR-0024):
- El guion provisional (`MORRIS_ROUNDS` en `balance.ts`, 3 rondas) y sus avisos (`round.notices.morris`) se sustituyen por las 9 rondas de verdad. Lo que cuenta Boxer de Morris ya está en `story.lore.morris` y su nombre, en `outbreak.comingBoss.morris`, que se quita cuando Morris sea un enemigo del juego (`info.enemy.names`).
- Las tropas del guion salen solas con la variante de Morris (`spawnEnemy` la pone según el brote de la partida). Los gusanos que saque Morris, también, si se crean con `spawnEnemy` o pasando `troopVariant(tipo, 'morris')`; las copias del Creeper se crean sin variante porque Creeper solo sale en el brote 1. Morris, como jefe, no lleva variante.
- La escolta de nivel 10 (MR-01) lleva aura de oro sobre la variante: comprobarlo en `/proposals/variantes.html` ("Nivel 10").

## Objetivos
1. **La sobrecarga:** el rasgo del brote, que castiga dejar que el tablero se llene.
2. **Las 9 rondas,** cada una repasando una lección anterior en cantidad.
3. **Morris:** un jefe que no para de copiarse y al que un muro no detiene.
4. **Abrir el brote** al jugador.

## Alcance
**Incluye:** regla y barra de sobrecarga, guion definitivo, entidad y reglas de Morris, arte y animación, propuestas de aspecto, barra de jefe, frases del jefe y de Boxer sobre el virus real, sonido, tope de enemigos en pantalla, simulación, tabla de dificultad, specs, textos, tests.
**No incluye:** la historia del giro (T-043), el aviso de beta (T-044), escenario nuevo, nada nuevo para el jugador.

## Decisiones cerradas (23 nov 2026)
- Opción B: inundación y sobrecarga.
- 9 rondas, con el repaso de la spec.
- Mismo escenario y misma música que los brotes 1 a 3.
- Ninguna planta ni invento nuevo.
- MR-02 a MR-07 y MR-09 a MR-11, por Carmine al empezar la task, y MR-08 en la galería (abajo).

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| MR-01 | ¿Nivel de las tropas? (regla 14) | **Cerrada (23 nov 2026):** hasta el 9 como máximo; el 10 solo cuando sale el jefe, en su escolta y sus refuerzos | Cerrada | Carmine |
| MR-02 | ¿Desde qué ronda hay sobrecarga? | **Cerrada (23 nov 2026):** a) desde la ronda 1, con un umbral que en las primeras rondas casi no se alcanza | Cerrada | Carmine |
| MR-03 | ¿Cuánto aceleran con la barra llena? | **Cerrada (23 nov 2026):** un 25 %, como la ronda más rápida de los otros brotes. Como el acelerado de las rondas antes del jefe, solo cambia lo que avanzan | Cerrada | Carmine |
| MR-04 | ¿Cuándo se apaga? | **Cerrada (23 nov 2026):** b) se enciende al 100 % y se apaga al 60 % | Cerrada | Carmine |
| MR-05 | ¿Qué cuenta para la barra? | **Cerrada (23 nov 2026):** todo enemigo vivo en el césped, también las copias y los ocultos. Morris ni cuenta ni acelera | Cerrada | Carmine |
| MR-06 | ¿Qué hace un escudo contra Morris? | **Cerrada (23 nov 2026):** nada lo para. Muerde lo que toca (muro, disparadora o mina) y, mientras lo muerde, avanza a la mitad de su velocidad: un muro aguanta más y lo frena más tiempo | Cerrada | Carmine |
| MR-07 | ¿Cada cuánto saca gusanos? | **Cerrada (23 nov 2026):** por los agujeros de los cinco carriles; al principio uno cada pocos segundos y cada vez más seguido con el tiempo, no con su vida | Cerrada | Carmine |
| MR-08 | ¿Qué aspecto tiene? | **Cerrada (23 nov 2026):** la propuesta A de `/proposals/jefes.html`, un gusano enorme hecho de gusanos pequeños que se le van soltando (`MORRIS_DESIGN = 'swarm'`) | Cerrada | Carmine |
| MR-09 | ¿Qué dice? | **Cerrada (23 nov 2026):** "¡Perdón, perdón! ¡No paran de salir!" al salir; las demás frases, en el mismo tono, las dio por buenas Carmine el mismo día | Cerrada | Carmine |
| MR-10 | ¿Cuántos enemigos puede haber a la vez? | **Cerrada (23 nov 2026):** 60, el presupuesto de rendimiento de T-002, en todos los brotes. Lo que no cabe espera fuera y entra en cuanto hay sitio; las copias de un Copycat salen siempre | Cerrada | Carmine |
| MR-11 | ¿Qué resultado se busca sin mejoras del Vivero? | **Cerrada (23 nov 2026):** que un bot que juega bien gane unas 5 de 10 | Cerrada | Carmine |

## Criterios de aceptación
### Sobrecarga
- [x] Una barra en pantalla sube y baja con los enemigos vivos.
- [x] Al llenarse, todos los enemigos aceleran y se nota de un vistazo y de oído: la barra dice "¡Sobrecarga!" y late en rojo, sale el rótulo en el césped, las tropas llevan las rayas del acelerado y suena una alarma.
- [x] Se apaga según MR-04, y los enemigos vuelven a su velocidad.
- [x] La granada y el muro de hielo ayudan a vaciarla (la granada, con test; el muro de hielo para la marea mientras las plantas la tumban).
- [x] En pausa y durante la preparación no cambia.
- [x] La primera vez que aparece, el jugador sabe qué es sin leer más de una línea: el aviso de la ronda 1 y la línea bajo la barra.

### Rondas
- [x] El brote 4 tiene sus 9 rondas, editables como datos, con el repaso de la spec: gusanos en la 1, acorazados y escupidores en la 2, Copycat en la 3, Minstrel en la 4, Lurker en la 5, Skipper en la 6, jefe preparándose en la 7 y la 8, y combate en la 9.
- [x] Ninguna ronda desbloquea nada nuevo.
- [x] La dificultad medida sube de ronda en ronda, y la ronda 1 es más dura que la 1 del brote 3 aun contando las 600 monedas.
- [x] Los niveles de las tropas siguen MR-01.

### Combate
- [x] Morris se ve preparándose en las rondas 7 y 8, y en la 7 Boxer cuenta qué fue el virus de verdad.
- [x] Mientras vive, saca gusanos por los cinco carriles, cada vez más seguido.
- [x] Un escudo se comporta frente a él según MR-06.
- [x] Tiene barra de vida de jefe.
- [x] Si cruza el jardín, se pierde la partida.
- [x] Al caer, caen todos sus gusanos, se gana el brote, queda vencido para ese jugador, se entregan las semillas y la ruta lo muestra superado.

### Calidad
- [x] Reglas en `core` con tests propios (`morris.test.ts`); valores en `balance.ts`.
- [x] Con el tope de MR-10 lleno, el juego va fluido en un móvil con la calidad más baja. Medido aquí solo en JavaScript (sin GPU); Carmine lo prueba en su móvil después de cerrar (lo pidió así).
- [x] Simulación anotada en la spec con nivel base 1, 3 y 5: un bot que solo pone muros pierde; uno que usa área gana según MR-11.
- [x] Propuestas de aspecto antes de pintar el definitivo, y Morris en el catálogo (regla 16). Carmine eligió la A, el enjambre (MR-08).
- [x] La partida guardada conserva la sobrecarga; sin migración (ADR-0014): `SAVE_VERSION` 13.
- [x] `docs/specs/07-brote-4-morris.md`, `03-ruta-de-brotes.md` y `01-mecanicas.md`, al día, con la ADR-0025.
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Al cerrarla (23 nov 2026, 0.16.0)
- Carmine dio por buenos el aspecto (MR-08, la A), las frases de Morris y sus sonidos y los de la sobrecarga (los elegidos de `scripts/audio/manifest.ts`).
- Queda por su parte probar el combate final en un móvil con la calidad más baja.
- Versión menor (ADR-0017): un jefe nuevo y una mecánica nueva.

## Casos límite y riesgos
- La barra se llena justo al acabar una ronda: no se arrastra a la preparación siguiente.
- Un Copycat que cae con la barra casi llena: su copia cuenta.
- Enemigos frenados por hielo con la sobrecarga encendida: los dos efectos se combinan; decidir cómo y dejarlo escrito.
- Morris frenado por hielo: sigue sacando gusanos.
- Tope de enemigos alcanzado en el combate: los gusanos de Morris esperan fuera y entran cuando hay sitio; la carrera no se detiene.
- Duración: con 9 rondas, unos 17 minutos.
- **Riesgo de bola de nieve:** más enemigos, más velocidad, menos tiempo para matarlos. Si una mala ronda no se puede remontar, hay que bajar el efecto o subir el margen de MR-04.
- **Riesgo de demasiada moneda:** con 600 de salida, las primeras rondas tienen que apretar.
- **Riesgo de parecerse al brote 1.**

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Ronda 3, cae un grupo de Copycat sin daño en área | Sus copias llenan la barra y todo acelera |
| El jugador lanza la granada sobre el grupo | La barra baja del 60 % y la velocidad vuelve a la normal |
| Morris llega a un muro | Lo rompe mientras sigue avanzando a media velocidad |
| Tablero solo con muros y disparadoras de un cañón | Los gusanos se acumulan, la barra no baja y se pierde |
| Morris cae | Sus gusanos caen con él: victoria del brote 4 |

## Cómo probarlo (QA)
1. Jugar el brote 4 entero y cronometrar.
2. Dejar que la barra se llene a propósito y luego vaciarla con la granada.
3. Probar el combate final en un móvil con la calidad más baja.
4. Pausar con la sobrecarga encendida.
