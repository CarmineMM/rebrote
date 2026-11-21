# [Historia] Boxer en los tours y Patty en lo nuevo

**Estado:** Completada (21 nov 2026, 0.4.1) · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-031 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 21 nov 2026

## Contexto
Los tours de ayuda ya existen (T-013, ADR-0012): un bocadillo con un dibujo y una frase corta, pintado por `TourOverlay` con textos en `tour.steps` de `src/i18n/`. El aviso de desbloqueo "¡YA LO TIENES!" es `UnlockModal`. El Invernadero (`Greenhouse.tsx`) tiene tienda y plantas con candado.

Decidido por Carmine: Boxer es la voz de los tours, y Patty crea las plantas nuevas y llega con un "He creado algo nuevo". Regla de la historia (`docs/specs/04-historia.md`): lo del brote 1 lo da Boxer; lo que llega después lo crea Patty.

## Objetivos
1. **Que enseñar sea parte de la historia:** los tours los da Boxer.
2. **Que lo nuevo tenga dueña:** las plantas nuevas las presenta Patty.
3. **Que el Invernadero tenga a alguien dentro.**

## Alcance
**Incluye:** retrato de Boxer en el bocadillo de los tours, repaso del tono de las frases de los tours, avisos de desbloqueo con el personaje que toca, Patty en el Invernadero, una frase de Boxer sobre el virus real antes de cada jefe, textos en español e inglés.
**No incluye:** tours nuevos, cambios en lo que enseña cada tour, la tienda (T-022), viñetas nuevas.

## Decisiones (cerradas el 21 nov 2026 con la recomendación)
| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| VT-01 | ¿Se reescriben las frases de los tours con la voz de Boxer? | Se repasan, sin alargarlas: siguen siendo una frase corta por paso | Carmine |
| VT-02 | ¿Quién sale en los avisos de desbloqueo del brote 1? | Boxer ("Toma, esto te va a hacer falta") | Carmine |
| VT-03 | ¿Y desde el brote 2? | Patty presenta lo que es una planta o una pieza nueva ("He creado algo nuevo"); Boxer enseña a usarlo en el tour | Carmine |
| VT-04 | ¿Dónde cuenta Boxer qué hizo el virus real? | En la ronda en que el jefe se prepara, en una línea, y completo en la ficha del jefe | Carmine |
| VT-05 | ¿Patty dice algo al entrar al Invernadero? | A veces, con unas pocas frases que rotan; nunca tapa los botones | Carmine |

## Criterios de aceptación
### Tours
- [x] El bocadillo de cada tour lleva el retrato de Boxer.
- [x] El bocadillo sigue cabiendo y sin tapar lo que señala a 812 × 375 y 568 × 320.
- [x] La pista de la moneda no lleva retrato (es demasiado pequeña).
- [x] Con la ayuda apagada en Opciones, no sale ningún tour, igual que hoy.

### Desbloqueos
- [x] Los avisos del brote 1 siguen VT-02.
- [x] Un aviso que desbloquea una planta o pieza nueva a partir del brote 2 muestra a Patty con su frase.
- [x] Un brote puede declarar quién presenta cada desbloqueo, como dato.

### Invernadero y jefes
- [x] Patty aparece en el Invernadero según VT-05.
- [x] Antes del combate con Creeper, Boxer dice en una línea qué fue el Creeper real.
- [x] Añadir la frase de un jefe nuevo es añadir un texto, sin tocar componentes.

### Calidad
- [x] Textos en español e inglés.
- [x] Los tests de los tours siguen pasando: no cambia qué se enseña ni cuándo.
- [x] Guía de gráficos y de idiomas al día.
- [x] `npm test` y `npm run build` pasan.

## Cómo quedó (21 nov 2026)
- **Boxer en los tours:** su retrato redondo (`Cameo`, cabeza y hombros en un círculo de su color) asoma por la esquina de arriba a la izquierda del bocadillo, donde estaba Brotito, que se retira; al lado, una placa con su nombre (para quien saltó las viñetas). Dice la frase de cada paso letra a letra con su voz (la de las viñetas) moviendo la boca, y sonríe al celebrar "¡Bien!". Lo que aún no dijo ocupa su sitio, así el bocadillo no cambia de tamaño. Lo que asoma cuenta para colocar el bocadillo (`TourOverlay`): no tapa lo que se señala. La pista de la moneda sigue sin retrato. Quién da los tours: `TOUR_GUIDE` en `tours.ts`.
- **Frases de los tours (VT-01):** repasadas con su voz, de tú y con prisa ("¡Rápido, arrástrala al césped!", "¿Un gusano cerca? Cuenta 2 s y… ¡pum!"). Ninguna pasa de la longitud de T-013 en ninguno de los dos idiomas: lo comprueba un test con las longitudes de antes. "¿Listo? ¡Que vengan!" y "Toca una disparadora" se quedan como estaban.
- **Quién presenta cada desbloqueo:** es un dato del guion. `OutbreakScript.presenter` dice quién presenta lo nuevo de un brote (el brote 1 declara a Boxer) y `RoundScript.presenter` lo cambia en una ronda. Sin declararlo, `unlockPresenter` (`rounds.ts`, con test) aplica la regla de la historia: Boxer en el primer brote y Patty, que lo crea, en los siguientes; un aviso que solo sube el tope de nivel, sin nada nuevo que sembrar, lo cuenta Boxer.
- **El aviso "¡YA LO TIENES!"** lleva arriba a quien presenta: su retrato y su frase en un bocadillo crema con su nombre, dicha letra a letra con su voz tras el sonido del aviso. Las frases rotan por orden (`unlockSpeech` en `src/ui/story/speech.ts`): el primer aviso de Boxer dice "Toma, esto te va a hacer falta" y el de Patty, "¡He creado algo nuevo!". En pantallas bajas la tarjeta se aprieta: a 568 × 320 cabe sin desplazarse también la de la ronda 5, la más larga, en los dos idiomas.
- **Boxer antes del jefe (VT-04):** una viñeta propia por brote (`lore:<brote>`), que sale en la preparación de la primera ronda en que se ve al jefe (`bossFirstSeenRound`: la 8 del brote 1, cuando Creeper empieza a prepararse) y, si quedó sin ver, en las siguientes hasta la del combate. Se vuelve a ver desde "Historia", con el título "El Creeper de verdad". Con la viñeta encima la escena está en pausa y Creeper aún no ha entrado, así que Boxer avisa de que llega ("¡Ojo, que viene Creeper, el primer gusano informático! Al de verdad lo paró Reaper, el primer antivirus. ¡Hoy el Reaper eres tú!") y Creeper aparece al cerrarla. Lo completo va al pie de la ficha del jefe, con el retrato de Boxer. Un jefe nuevo solo necesita sus dos textos en `story.lore.<brote>` (si falta, no compila).
- **Patty en el Invernadero (VT-05):** su busto asoma por abajo, a la izquierda del panel, sin tocarlo (el panel y ella comparten `--panel-right` y `--panel-w`). Respira y parpadea. La mitad de las veces que se entra dice una frase corta en un bocadillo crema, letra a letra con su voz, que se va a los pocos segundos; tocarla le hace decir otra. Cinco frases que no repiten la anterior (una usa el nombre del jugador). Si al entrar sale una viñeta (la suya la primera vez), se esconde y no saluda. Con la ruta abierta y en una ventana en vertical no se ve.
- **Probado** en Chrome headless (GPU, Ultra) a 1600 × 900, 812 × 375 y 568 × 320, en español y en inglés: el tour de la ronda 1 y el de subir de nivel, los avisos de las rondas 2 y 5, la viñeta de la ronda 8 llegando desde el ataque de la 7, la ficha de Creeper, el Invernadero (la primera vez con la viñeta de Patty y después), tocar a Patty, la ruta, y el aviso de un brote 2 de prueba metido en memoria, con Patty.
- No es una mecánica ni un gesto nuevo: no lleva tour (regla 9) ni sonido nuevo (regla 10); las voces son las de las viñetas.

## Casos límite y riesgos
- El retrato quita sitio al dibujo animado del gesto, que es lo que de verdad enseña. Si no caben los dos en pantalla pequeña, manda el dibujo.
- Jugador que saltó las viñetas y no sabe quién es Boxer: su nombre aparece en el bocadillo.
- Frases de Patty repetidas cansan: pocas y cortas.
- Riesgo: reescribir las frases de los tours y alargarlas sin querer. Se mide: ninguna pasa de la longitud actual.

## Objetivo final con ejemplos
| Momento | Lo que ve el jugador |
|---|---|
| Ronda 2 del brote 1 | Aviso con Boxer y, al aceptar, el tour de subir de nivel con su cara |
| Ronda 2 del brote 2 | Aviso con Patty: "He creado algo nuevo", y el escudo. Después, Boxer enseña a usarlo |
| Ronda 9 del brote 1 | Boxer: una línea sobre el Creeper de 1971 |
| Entra al Invernadero | A veces, una frase de Patty |

## Cómo probarlo (QA)
1. Jugar las rondas 1 a 3 del brote 1 con la ayuda encendida.
2. Repetir a 568 × 320.
3. Entrar y salir del Invernadero varias veces.
