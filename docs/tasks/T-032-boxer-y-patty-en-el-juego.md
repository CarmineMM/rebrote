# [Historia] Boxer en los tours y Patty en lo nuevo

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-031 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 21 nov 2026

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

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| VT-01 | ¿Se reescriben las frases de los tours con la voz de Boxer? | a) Se dejan. b) Se repasan | b, sin alargarlas: siguen siendo una frase corta por paso | Carmine |
| VT-02 | ¿Quién sale en los avisos de desbloqueo del brote 1? | Boxer o nadie | Boxer ("Toma, esto te va a hacer falta") | Carmine |
| VT-03 | ¿Y desde el brote 2? | Patty o Boxer | Patty presenta lo que es una planta o una pieza nueva ("He creado algo nuevo"); Boxer enseña a usarlo en el tour | Carmine |
| VT-04 | ¿Dónde cuenta Boxer qué hizo el virus real? | a) Al empezar el brote. b) En la ronda en que el jefe se prepara. c) En su ficha | b, en una línea, y completo en la ficha del jefe | Carmine |
| VT-05 | ¿Patty dice algo al entrar al Invernadero? | Siempre, a veces o nunca | A veces, con unas pocas frases que rotan; nunca tapa los botones | Carmine |

## Criterios de aceptación
### Tours
- [ ] El bocadillo de cada tour lleva el retrato de Boxer.
- [ ] El bocadillo sigue cabiendo y sin tapar lo que señala a 812 × 375 y 568 × 320.
- [ ] La pista de la moneda no lleva retrato (es demasiado pequeña).
- [ ] Con la ayuda apagada en Opciones, no sale ningún tour, igual que hoy.

### Desbloqueos
- [ ] Los avisos del brote 1 siguen VT-02.
- [ ] Un aviso que desbloquea una planta o pieza nueva a partir del brote 2 muestra a Patty con su frase.
- [ ] Un brote puede declarar quién presenta cada desbloqueo, como dato.

### Invernadero y jefes
- [ ] Patty aparece en el Invernadero según VT-05.
- [ ] Antes del combate con Creeper, Boxer dice en una línea qué fue el Creeper real.
- [ ] Añadir la frase de un jefe nuevo es añadir un texto, sin tocar componentes.

### Calidad
- [ ] Textos en español e inglés.
- [ ] Los tests de los tours siguen pasando: no cambia qué se enseña ni cuándo.
- [ ] Guía de gráficos y de idiomas al día.
- [ ] `npm test` y `npm run build` pasan.

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
