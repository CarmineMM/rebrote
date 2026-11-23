# [Jefe] Morris, la sobrecarga y las rondas del brote 4

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-041 · **Bloquea a:** T-043 · **Origen:** conversación de diseño del 23 nov 2026

## Contexto
El diseño está en `docs/specs/07-brote-4-morris.md`. Carmine eligió la opción B: Morris inunda el tablero y además hay sobrecarga. Son 9 rondas.

**El original (1988).** El primer gran gusano de internet. Su autor quería medir la red, pero un fallo hacía que el programa se copiara una y otra vez en equipos ya infectados, hasta dejarlos sin recursos.

Los tres jefes anteriores sirven de modelo (verificado en las specs de los brotes 2 y 3): barra de jefe, jefe que se prepara a la derecha, escolta con grito, refuerzos mientras vive, derrota si cruza el jardín, propuestas de aspecto en `/propuestas/jefes.html`, catálogo en `/catalogo/jefes.html`, medida de dificultad por ronda (`roundThreat`), rondas aceleradas (`haste`) y simulación con bots (`npm run sim`). Lo que cuenta Boxer del virus real sale solo en cuanto existe su texto (`story.lore.<brote>`, T-032).

Tras T-041 el brote 4 existe en preparación, con sus tropas de variante y 600 monedas.

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

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| MR-01 | ¿Nivel de las tropas? (regla 14) | **Cerrada (23 nov 2026):** hasta el 9 como máximo; el 10 solo cuando sale el jefe, en su escolta y sus refuerzos | Cerrada | Carmine |
| MR-02 | ¿Desde qué ronda hay sobrecarga? | a) Desde la 1. b) Solo en el combate final | a, con un umbral que en las primeras rondas casi no se alcanza: llega aprendida al jefe | Carmine |
| MR-03 | ¿Cuánto aceleran con la barra llena? | Libre | Un 25 %, como la ronda más rápida de los otros brotes | Carmine |
| MR-04 | ¿Cuándo se apaga? | a) Al bajar de lleno. b) Al bajar bastante más | b: se enciende al 100 % y se apaga al 60 %. Sin ese margen parpadea | Carmine |
| MR-05 | ¿Qué cuenta para la barra? | Libre | Todo enemigo vivo en el césped, también las copias y los ocultos. El jefe no | Carmine |
| MR-06 | ¿Qué hace un escudo contra Morris? | a) Lo para. b) Lo frena a la mitad mientras lo rompe. c) Nada | b: es "el Imparable", pero el escudo sigue sirviendo de algo | Carmine |
| MR-07 | ¿Cada cuánto saca gusanos? | Libre | Empieza despacio y se acelera con el tiempo, no con su vida: es una carrera | Carmine |
| MR-08 | ¿Qué aspecto tiene? | Propuestas | Que no se confunda con Creeper, que también es un gusano. Idea: un gusano enorme hecho de gusanos pequeños que se le van soltando | Carmine |
| MR-09 | ¿Qué dice? | Libre | Pide perdón mientras lo inunda todo: "¡Perdón, perdón! ¡No paran de salir!" | Carmine |
| MR-10 | ¿Cuántos enemigos puede haber a la vez? | Libre | Un tope medido en un móvil con la calidad más baja; lo que no cabe espera fuera | Carmine |
| MR-11 | ¿Qué resultado se busca sin mejoras del Vivero? | Libre | Que un bot que juega bien gane la mayoría (7 de 10 o más) | Carmine |

## Criterios de aceptación
### Sobrecarga
- [ ] Una barra en pantalla sube y baja con los enemigos vivos.
- [ ] Al llenarse, todos los enemigos aceleran y se nota de un vistazo y de oído.
- [ ] Se apaga según MR-04, y los enemigos vuelven a su velocidad.
- [ ] La granada y el muro de hielo ayudan a vaciarla.
- [ ] En pausa y durante la preparación no cambia.
- [ ] La primera vez que aparece, el jugador sabe qué es sin leer más de una línea.

### Rondas
- [ ] El brote 4 tiene sus 9 rondas, editables como datos, con el repaso de la spec: gusanos en la 1, acorazados y escupidores en la 2, Copycat en la 3, Minstrel en la 4, Lurker en la 5, Skipper en la 6, jefe preparándose en la 7 y la 8, y combate en la 9.
- [ ] Ninguna ronda desbloquea nada nuevo.
- [ ] La dificultad medida sube de ronda en ronda, y la ronda 1 es más dura que la 1 del brote 3 aun contando las 600 monedas.
- [ ] Los niveles de las tropas siguen MR-01.

### Combate
- [ ] Morris se ve preparándose en las rondas 7 y 8, y en la 7 Boxer cuenta qué fue el virus de verdad.
- [ ] Mientras vive, saca gusanos por los cinco carriles, cada vez más seguido.
- [ ] Un escudo se comporta frente a él según MR-06.
- [ ] Tiene barra de vida de jefe.
- [ ] Si cruza el jardín, se pierde la partida.
- [ ] Al caer, caen todos sus gusanos, se gana el brote, queda vencido para ese jugador, se entregan las semillas y la ruta lo muestra superado.

### Calidad
- [ ] Reglas en `core` con tests propios; valores en `balance.ts`.
- [ ] Con el tope de MR-10 lleno, el juego va fluido en un móvil con la calidad más baja.
- [ ] Simulación anotada en la spec con nivel base 1, 3 y 5: un bot que solo pone muros pierde; uno que usa área gana según MR-11.
- [ ] Propuestas de aspecto antes de pintar el definitivo, y Morris en el catálogo (regla 16).
- [ ] La partida guardada conserva la sobrecarga; sin migración (ADR-0014).
- [ ] `docs/specs/07-brote-4-morris.md`, `03-ruta-de-brotes.md` y `01-mecanicas.md`, al día.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

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
