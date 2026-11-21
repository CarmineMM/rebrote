# [Enemigos] Tropas del brote 2 y juglar

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-018, T-024 · **Bloquea a:** T-026 · **Origen:** conversación de diseño del 20 y 21 nov 2026

## Contexto
El brote 1 tiene tres tropas: gusano, acorazado y escupidor (`ENEMIES` en `balance.ts`). El escupidor se para a 2,6 casillas de lo primero sembrado y le escupe; su disparo choca con lo primero que encuentra (`firstSownInPath` en `combat.ts`). Los enemigos tienen nivel, fuerza y, desde T-030, aura por tramos.

Carmine quiere que cada brote siga el mismo guion de tropas (normal, que dispara y acorazada), con las mismas unidades algo modificadas o con un efecto al morir.

**Cambio del 21 nov 2026:** Blaster pasó al brote 11 y el jefe del brote 2 es Elk Cloner. El francotirador que estaba en esta task se guarda para Blaster (anotado en `docs/specs/03-ruta-de-brotes.md`). El brote 2 necesita otra tropa que dé sentido al escudo.

## Objetivos
1. **Tropas reconocibles pero distintas** a las del brote 1.
2. **Una tropa nueva** cuyo ataque cruza el carril por encima de las plantas.
3. **Que el escudo sea la respuesta.**

## Alcance
**Incluye:** las tres tropas del brote 2 y la tropa nueva en `ENEMIES`, sus reglas en `core`, arte y animación, aura (T-030), fichas de información, sonido, lista "Enemigo nuevo" de la guía, textos, tests.
**No incluye:** el guion de rondas y el jefe (T-026), el francotirador (brote 11), unidades que saltan.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| F-01 | ¿En qué cambian las tres tropas? | a) Solo aspecto y números. b) Al morir dejan un clon pequeño y débil, una sola vez | b: es lo que hacía Elk Cloner, copiarse. Ojo: Creeper ya deja copias al saltar; aquí son más pequeñas y salen al morir | Carmine |
| F-02 | ¿Cómo ataca la tropa nueva? | a) Suelta un verso: una onda que recorre el carril y daña un poco a todas las plantas que atraviesa. b) Dispara a una sola planta lejana | a: es el mismo ataque que el jefe, en pequeño, y no pisa al francotirador de Blaster | Carmine |
| F-03 | ¿Cómo se llama? | Juglar, pregonero, trovador | Juglar | Carmine |
| F-04 | ¿Avisa antes de atacar? | Sí o no | Sí: se hincha un momento antes de soltar el verso | Carmine |
| F-05 | ¿La onda atraviesa una disparadora con escudo? | Depende de E-02 (T-024) | No, si E-02 es sí | Carmine |
| F-06 | ¿La onda daña a las minas? | Sí o no | Sí, poco: como el escupidor, obliga a protegerlas | Carmine |

## Criterios de aceptación
### Tropas
- [ ] El brote 2 tiene una tropa normal, una que dispara y una acorazada, distintas a simple vista de las del brote 1.
- [ ] El efecto de F-01 se ve y se entiende sin leer nada.
- [ ] Cada tropa tiene su ficha de información.

### Juglar
- [ ] Se para a distancia y suelta ondas a intervalos, con el aviso de F-04.
- [ ] La onda recorre el carril hacia la izquierda y daña a cada planta y mina que atraviesa.
- [ ] La onda se detiene en el primer escudo que encuentra, que recibe el daño; lo que hay detrás no sufre nada.
- [ ] Sin nada sembrado en su carril, no ataca y avanza como una tropa normal.
- [ ] Las disparadoras de su carril le pueden dar.

### Calidad
- [ ] Reglas en `core` con tests; valores en `balance.ts`; la partida guardada acepta los enemigos nuevos y las ondas en vuelo.
- [ ] Animaciones y efectos según la guía (niveles gráficos, pausa, escala de arte).
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Dos juglares en el mismo carril: sus ondas no se suman en un solo golpe mortal; cada una hace su daño.
- Juglar ralentizado por hielo: tarda más entre versos.
- Una planta que se fusiona o muere mientras la onda pasa: la onda sigue su camino.
- Con F-01 b, una mina que mata a 6 tropas deja 6 clones: poner un límite por explosión.
- Riesgo: que un muro en la primera columna de cada carril anule al juglar. Por eso el escudo recibe el daño de la onda (E-01).
- Riesgo de rendimiento: muchas ondas a la vez en pantalla. Respetar los niveles gráficos.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Carril con 3 disparadoras y un juglar | La onda pasa por las 3 y cada una pierde un poco de vida |
| Lo mismo, con un muro delante de las 3 | La onda muere en el muro; las 3 intactas |
| Lo mismo, con el muro entre la primera y las otras dos | La primera recibe daño; las otras dos, no |
| Carril vacío | El juglar avanza |

## Cómo probarlo (QA)
1. Montar un carril con tres disparadoras y soltar un juglar.
2. Añadir un muro delante y repetir.
3. Leer las fichas de las cuatro tropas.
