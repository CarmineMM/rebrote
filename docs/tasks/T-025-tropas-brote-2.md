# [Enemigos] Tropas del brote 2 y Minstrel

**Estado:** Completada (22 nov 2026, 0.7.0) · **Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-018, T-024 · **Bloquea a:** T-026 · **Origen:** conversación de diseño del 20 y 21 nov 2026

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

## Decisiones
Cerradas por Carmine el 22 nov 2026, al empezar la task: todas con la recomendación.

| # | Pregunta | Opciones | Recomendación | Decidido |
|---|---|---|---|---|
| F-01 | ¿En qué cambian las tres tropas? | a) Solo aspecto y números. b) Al morir dejan un clon pequeño y débil, una sola vez | b: es lo que hacía Elk Cloner, copiarse. Ojo: Creeper ya deja copias al saltar; aquí son más pequeñas y salen al morir | b (la recomendación) |
| F-02 | ¿Cómo ataca la tropa nueva? | a) Suelta un verso: una onda que recorre el carril y daña un poco a todas las plantas que atraviesa. b) Dispara a una sola planta lejana | a: es el mismo ataque que el jefe, en pequeño, y no pisa al francotirador de Blaster | a (la recomendación) |
| F-03 | ¿Cómo se llama? | Juglar, pregonero, trovador | Juglar | Juglar (la recomendación); el 22 nov 2026 Carmine lo cambió a Minstrel, su nombre en inglés, también en español (regla de nombres en `docs/guias/idiomas.md`) |
| F-04 | ¿Avisa antes de atacar? | Sí o no | Sí: se hincha un momento antes de soltar el verso | Sí (la recomendación) |
| F-05 | ¿La onda atraviesa una disparadora con escudo? | Depende de E-02 (T-024; cerrada el 21 nov 2026: sí, la disparadora con escudo también bloquea) | No: la regla ya está en `waveReach` (`combat.ts`) | No (la recomendación) |
| F-06 | ¿La onda daña a las minas? | Sí o no | Sí, poco: como el escupidor, obliga a protegerlas | Sí, poco (la recomendación) |

### Decidido al implementar
- **Nombres (cambiados por Carmine el 22 nov 2026):** Copycat, Copycat acorazado y Copycat escupidor ("Copycat", "Armored Copycat", "Spitter Copycat"); su copia, "Copia de Copycat", "Copia acorazada" y "Copia escupidora" ("Copycat copy", "Armored copy", "Spitter copy"); y Minstrel en los dos idiomas. Se quedan en inglés porque así se conocen en todo el mundo (regla de nombres de `docs/guias/idiomas.md`); lo que los describe sí se traduce. Al empezar eran "gusano copión" y "Juglar".
- **Aspecto:** los Copycat, en aguamarina (el escupidor, amarillo limón) con las luces moradas, como una copia en negativo del gusano, y un disquete de 5¼ a la espalda; el Copycat acorazado, con casco y placas de disquete. El Minstrel, rojo amapola con un gorro de fieltro morado y pluma. Nada recuerda a ningún logotipo: el disquete es genérico.
- **Cómo se entiende la copia sin leer:** al caer el Copycat le sale volando el disquete y la copia nace donde estaba, del tamaño del Copycat y en blanco, y encoge a la suya con un destello verde de "copiarse" (el mismo de las copias de Creeper). Luego va más pequeña, sin disquete, algo transparente y con un parpadeo de interferencia.
- **Números de los Copycat:** los mismos que su pareja del brote 1 (vida, daño, velocidad y moneda); lo nuevo es la copia. La copia: 62 % de tamaño (su hocico y su alcance encogen con ella, para que muerda con la boca donde la pondría su tipo), 30 % de vida, 50 % de daño, 5 monedas, hereda nivel y paso y no la quemadura ni el frío. Una explosión deja como mucho 2 copias. Si cae el jefe, ninguna.
- **Números del Minstrel:** 150 de vida, 0,25 casillas/s, se para a 3,5 casillas, toma aire 0,9 s, primer verso a los 1,8 s y luego cada 3,6 s; el verso quita 15 a cada cosa (una mina de 100 aguanta 6 de nivel 1) y vuela a 2,5 casillas/s. Da 25 monedas. Todo PROVISIONAL: lo ajusta T-026 con su simulación.
- **Una onda no da dos veces a lo mismo:** `waveReach` cuenta lo que cruza en (`to`, `from`], así un centro justo en el borde de dos pasos no se cuenta dos veces.
- **Guion provisional del brote 2:** cambia las tropas del brote 1 por las del brote 2 y trae el Minstrel en la ronda 3 (como recomienda L-07), para poder jugarlas con `?brote=2`. El guion de verdad sigue siendo de T-026.
- **Sin tour:** el Minstrel y los Copycat son enemigos, no un gesto ni una pieza del jugador (regla 9: cada `Feature` lleva su tour). Los presentan los avisos de una línea de las rondas 1 y 3 del guion provisional.
- **Sonido:** el Minstrel toma aire (receta nueva de jsfxr, `inhale`), recita (un punteo de cuerda, como un laúd), su verso suena bajito en cada cosa que cruza y a madera en el escudo que lo para; la copia, un blip de copiarse. Cada uno con dos alternativas en `/sonidos.html` para que Carmine elija de oído.
- **En desarrollo:** la tecla J suelta un Minstrel y la K un Copycat (por turnos) en el carril del puntero.

## Criterios de aceptación
### Tropas
- [x] El brote 2 tiene una tropa normal, una que dispara y una acorazada, distintas a simple vista de las del brote 1.
- [x] El efecto de F-01 se ve y se entiende sin leer nada.
- [x] Cada tropa tiene su ficha de información.

### Minstrel
- [x] Se para a distancia y suelta ondas a intervalos, con el aviso de F-04.
- [x] La onda recorre el carril hacia la izquierda y daña a cada planta y mina que atraviesa.
- [x] La onda se detiene en el primer escudo que encuentra, que recibe el daño; lo que hay detrás no sufre nada.
- [x] Sin nada sembrado en su carril, no ataca y avanza como una tropa normal.
- [x] Las disparadoras de su carril le pueden dar.

### Calidad
- [x] Reglas en `core` con tests; valores en `balance.ts`; la partida guardada acepta los enemigos nuevos y las ondas en vuelo.
- [x] Animaciones y efectos según la guía (niveles gráficos, pausa, escala de arte).
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Dos Minstrel en el mismo carril: sus ondas no se suman en un solo golpe mortal; cada una hace su daño.
- Minstrel ralentizado por hielo: tarda más entre versos.
- Una planta que se fusiona o muere mientras la onda pasa: la onda sigue su camino.
- Con F-01 b, una mina que mata a 6 tropas deja 6 clones: poner un límite por explosión.
- Riesgo: que un muro en la primera columna de cada carril anule al Minstrel. Por eso el escudo recibe el daño de la onda (E-01).
- Riesgo de rendimiento: muchas ondas a la vez en pantalla. Respetar los niveles gráficos.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Carril con 3 disparadoras y un Minstrel | La onda pasa por las 3 y cada una pierde un poco de vida |
| Lo mismo, con un muro delante de las 3 | La onda muere en el muro; las 3 intactas |
| Lo mismo, con el muro entre la primera y las otras dos | La primera recibe daño; las otras dos, no |
| Carril vacío | El Minstrel avanza |

## Cómo probarlo (QA)
Con `npm run dev` y `?brote=2`, "Nueva partida"; la N salta de ronda (el escudo llega en la 2), la M da moneda, la J suelta un Minstrel y la K un Copycat en el carril del puntero.
1. Montar un carril con tres disparadoras y soltar un Minstrel.
2. Añadir un muro delante y repetir.
3. Leer las fichas de las cuatro tropas.
