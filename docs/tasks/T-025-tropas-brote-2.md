# [Enemigos] Tropas del brote 2 y francotirador

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-018, T-024 · **Bloquea a:** T-026 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
El brote 1 tiene tres tropas: gusano, acorazado y escupidor (`ENEMIES` en `balance.ts`). El escupidor se para a 2,6 casillas de lo primero sembrado y le escupe; su disparo choca con lo primero que encuentra. Los enemigos tienen nivel y fuerza (T-009 y T-010).

Carmine quiere que cada brote siga el mismo guion de tropas (normal, que dispara y acorazada), con las mismas unidades algo modificadas o con un efecto al morir, y añadir en el brote 2 un francotirador. Blaster también es un gusano, así que las tropas siguen siendo gusanos.

## Objetivos
1. **Tropas reconocibles pero distintas** a las del brote 1.
2. **Francotirador:** el primer enemigo que dispara por encima de las plantas.
3. **Que el escudo sea la respuesta.**

## Alcance
**Incluye:** tres tropas del brote 2 y el francotirador en `ENEMIES`, sus reglas en `core`, arte y animación, fichas de información, sonido, lista "Enemigo nuevo" de la guía, textos, tests.
**No incluye:** el guion de rondas y el jefe (T-026), unidades que saltan.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| F-01 | ¿En qué cambian las tres tropas? | a) Solo aspecto y números. b) Un efecto común al morir | b: al morir sueltan una descarga que deja sin disparar un momento a la planta más cercana. Encaja con Blaster, que apagaba equipos | Carmine |
| F-02 | ¿A quién apunta el francotirador? | a) A la planta de más nivel del carril. b) A la del fondo. c) A una al azar | a: obliga a proteger la planta cara | Carmine |
| F-03 | ¿Desde dónde dispara? | a) Desde el borde derecho, sin avanzar. b) Avanza y se para lejos | a: es su identidad. Hay que matarlo o cubrirse | Carmine |
| F-04 | ¿Avisa antes de disparar? | Sí o no | Sí: una mira sobre la planta durante un momento. Sin aviso se siente injusto | Carmine |
| F-05 | ¿Dispara por encima de una disparadora con escudo? | Depende de E-02 | No, si E-02 es sí | Carmine |
| F-06 | ¿El escupidor del brote 2 sigue chocando con lo primero que encuentra? | Sí o no | Sí: solo el francotirador pasa por encima | Carmine |

## Criterios de aceptación
### Tropas
- [ ] El brote 2 tiene una tropa normal, una que dispara y una acorazada, distintas a simple vista de las del brote 1.
- [ ] El efecto de F-01 se ve y se entiende sin leer nada.
- [ ] Cada tropa tiene su ficha de información.

### Francotirador
- [ ] Dispara a la planta que indica F-02, pasando por encima de plantas y minas.
- [ ] Si hay un escudo entre él y su objetivo, el disparo lo recibe el escudo.
- [ ] La mira avisa sobre el objetivo antes de cada disparo.
- [ ] Si su objetivo muere o se mueve durante el aviso, el disparo falla o cambia de objetivo (decidir al implementar y dejarlo escrito).
- [ ] Sin plantas en su carril, no dispara y avanza como una tropa normal.
- [ ] Las disparadoras de su carril le pueden dar.

### Calidad
- [ ] Reglas en `core` con tests; valores en `balance.ts`; la partida guardada acepta los enemigos nuevos.
- [ ] Animaciones y efectos según la guía (niveles gráficos, pausa, escala de arte).
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Dos francotiradores en el mismo carril apuntando a la misma planta: sus miras no se confunden.
- Francotirador ralentizado por hielo: tarda más entre disparos.
- Planta con mira que se fusiona con otra: el disparo va a la casilla resultante o falla.
- Con el efecto de F-01, muchas muertes juntas pueden dejar una fila entera sin disparar: poner un límite.
- Riesgo: si el francotirador solo "tiene más alcance", no cambia nada, porque las disparadoras ya cubren todo el carril. Lo que lo define es a quién apunta.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Carril con disparadora de nivel 2 delante y una de nivel 5 detrás | La mira sale sobre la de nivel 5 |
| Lo mismo, con un muro entre el francotirador y las dos | El disparo da en el muro |
| Carril vacío | El francotirador avanza |
| Mueren 3 tropas junto a una planta | La planta deja de disparar un momento, no tres veces seguidas |

## Cómo probarlo (QA)
1. Montar un carril con una planta barata delante y una cara detrás, y soltar un francotirador.
2. Añadir un muro y repetir.
3. Leer las fichas de las cuatro tropas.
