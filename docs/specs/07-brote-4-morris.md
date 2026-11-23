# Brote 4: Morris

Diseño del cuarto brote, acordado con Carmine el 23 nov 2026. Lo construyen T-041 a T-044. T-041 (0.15.4) trajo las tropas con la variante de color de Morris y dejó el brote en preparación; T-042 (0.16.0) trajo la sobrecarga, a Morris y las 9 rondas, y abrió el brote (abajo, "Hecho en T-042"). T-043 (0.16.1) trajo su historia: tres secuencias de viñetas y seis comentarios de una línea que no paran el juego. Lo que dice "decidido" lo decidió Carmine; los números son un punto de partida y se ajustan con `npm run sim`.

Es el último brote de la defensa del refugio. Al vencerlo, Boxer y Patty deciden pasar al ataque.

## Idea

El Morris real se copiaba sin parar hasta saturar las máquinas. En el juego es **la inundación**: muchos enemigos a la vez. Tras dos jefes en los que la respuesta era el escudo, aquí la respuesta es el daño en área: minas de fuego, fuego infundido, tres cañones y la granada. Un muro solo no aguanta a veinte gusanos mordiendo.

**No trae nada nuevo para el jugador (decidido).** Ni planta ni invento. El brote ya lleva mucha historia, y lo nuevo se guarda para el brote 5. Lo que sí trae es un problema nuevo: la sobrecarga.

## El original (1988)

Morris fue el primer gran gusano de internet. Su autor, un estudiante, quería medir el tamaño de la red, no romper nada. Pero el programa tenía un fallo: volvía a copiarse en equipos que ya estaban infectados, una y otra vez, hasta que se quedaban sin recursos y se caían. Dejó fuera de servicio miles de equipos.

**Sí es un gusano.** Viajaba solo por la red, sin que nadie llevara nada de un equipo a otro. Por eso sus tropas son gusanos, que el juego tiene desde el brote 1.

## Tropas: todas las que ya existen (decidido)

No hay tropas nuevas. Vuelven las de los tres brotes anteriores, con otro color y más nivel, y conservan su nombre. El color es un tinte de Morris, igual para todas (T-041, MT-01): propuestas en `/proposals/variantes.html`; el juego usa Sombra mientras Carmine no elija otra. La ficha dice "Reclutado por Morris" (MT-02).

| Tropas | De dónde vienen | Qué piden al jugador |
|---|---|---|
| Gusano, acorazado y escupidor | Brote 1 | Daño en área: llegan en masa |
| Copycat (los tres) | Brote 2 | Limpiar deprisa: sus copias llenan la sobrecarga |
| Minstrel | Brote 2 | Escudos delante de las plantas |
| Lurker (los tres) | Brote 3 | Minas y hielo para descubrirlos |
| Skipper | Brote 3 | Una puerta en cada carril |

El Minstrel vuelve aquí (decidido el 23 nov 2026; antes era exclusivo del brote 2).

## La sobrecarga (opción B, decidida)

- Una barra en pantalla sube con los enemigos vivos en el tablero.
- Si se llena, todos los enemigos aceleran hasta que el jugador vacía el tablero lo suficiente.
- Obliga a mantener el tablero limpio. Es lo que les pasaba a las máquinas reales.
- Es el rasgo del brote, como "oculto" lo fue del brote 3.

## Rondas

Nueve (decidido): una más que los brotes 2 y 3, para dar sitio a la historia y para que el jugador junte más moneda antes del final. Cada ronda repasa una lección de los brotes anteriores, ahora en cantidad.

| Ronda | Repaso | Historia |
|---|---|---|
| 1 | Gusanos en masa. Aparece la barra de sobrecarga | Viñetas de apertura |
| 2 | Con acorazados y escupidores | Frase de Boxer |
| 3 | Vuelven los Copycat: sus copias llenan la barra | Frase de Boxer |
| 4 | Vuelve el Minstrel | Frase de Patty: duda |
| 5 | Vuelven los Lurker | Viñetas de mitad: Boxer y Patty discuten |
| 6 | Vuelve el Skipper | Frase de Patty: empieza a ceder |
| 7 | Morris se prepara: todo mezclado y acelerado | Boxer cuenta quién fue Morris |
| 8 | Más tropas y más rápidas | Frase de Patty |
| 9 | Combate contra Morris | Frase de Boxer y viñetas del final |

El escenario y la música son los de los brotes 1 a 3: sigue siendo la defensa del refugio.

## Moneda inicial (decidido)

El brote empieza con **600 monedas**, el doble que el brote 3 (300). Así el jugador nota que arranca más fuerte sin que se le explique. En la historia, es Patty quien lo deja preparado.

## Jefe: Morris, el Imparable

- **No deja de copiarse:** mientras vive, saca gusanos por los cinco carriles, cada vez más deprisa. El combate es una carrera: tumbarlo antes de que la marea pase por encima.
- **Llena la sobrecarga:** sus gusanos cuentan para la barra.
- **Imparable:** un escudo lo frena pero no lo detiene. Así no hay un tercer jefe seguido que se resuelva con muros.
- **Si cruza el jardín, se pierde la partida,** como con Elk Cloner y Brain.
- **Se prepara** en las rondas 7 y 8, a la derecha, como los otros jefes.
- **Cómo es:** el Morris real no quería hacer daño. El del juego va pidiendo perdón mientras lo inunda todo ("¡Perdón, perdón! ¡No paran de salir!").

En qué se distingue de los anteriores: Creeper cambia de carril, Elk Cloner ataca de lejos, Brain no se deja ver y Morris te entierra en número.

## Historia del brote

El guion completo está en `04-historia.md` ("El giro"). En resumen:

- Boxer ve cómo juega el jugador y propone pasar al ataque.
- Patty duda un poco (decidido: una duda leve): el refugio es lo único que tienen. Se va convenciendo con el paso de las rondas.
- Al caer Morris, deciden salir. Patty cierra con "Nos espera un largo viaje" (decidido).
- Después sale un aviso: el juego es una beta, hay más contenido en camino y se pide apoyar el proyecto (T-044).

Para no interrumpir, la mayor parte son frases de una línea durante la preparación, sin parar el juego. Solo hay tres secuencias de viñetas: al empezar, a mitad y al final. Todo sale solo la primera vez.

Hecho en T-043 (0.16.1): las viñetas salen en la preparación de las rondas 1 y 5 y al caer Morris (antes de la pantalla de victoria), y los comentarios, en la esquina de abajo a la derecha en la preparación de las rondas 2, 3, 4, 6, 8 y 9 (`REMARKS` en `src/ui/story/remarks.ts`). Lo que cuenta Boxer del Morris real sigue en la ronda 7.

## Dificultad

- **Nivel de las tropas (MR-01, decidido):** la misma banda que los brotes 2 y 3, hasta el 9; el 10, solo cuando sale el jefe, en su escolta. El tope de las disparadoras sigue en 5.
- **De dónde sale la dificultad:** de la cantidad y de la sobrecarga, no del nivel.
- **Objetivo (MR-11, decidido):** sin mejoras del Vivero, un bot que juega bien gana unas 5 de 10. La simulación lo mide con nivel base 1, 3 y 5, como en los brotes 2 y 3.

## Riesgos de diseño

- **Bola de nieve.** Más enemigos hacen que todos corran más, y eso deja menos tiempo para matarlos. Si la sobrecarga no tiene freno, una mala ronda no se remonta. Tiene que ser temporal, con tope, y los inventos (granada y muro de hielo) tienen que servir para vaciarla.
- **Rendimiento.** "En masa" son muchos bichos a la vez, y el juego se usa mucho en móvil. Hace falta un tope de enemigos en pantalla y probarlo en la calidad más baja.
- **Demasiada moneda.** Con 600 de salida y nueve rondas, el jugador puede llenar el tablero pronto. Las primeras rondas tienen que apretar desde el principio.
- **Parecerse al brote 1.** Mismas tropas y mismo escenario. Lo que lo distingue es la cantidad, la sobrecarga, el jefe y la historia: si alguna de las cuatro falla, se nota.
- **Tres mecánicas de copia.** Creeper deja copias al saltar, los Copycat al caer y Morris las saca sin parar. Hay que cuidar que se vean distintas.

## Hecho en T-042 (23 nov 2026)

Decisiones MR-02 a MR-07, MR-09 y MR-10 cerradas por Carmine al empezar la task con la recomendación; MR-11, con su número (unas 5 de 10, no 7); MR-08, el aspecto, en la galería `/proposals/jefes.html`: la A, el enjambre. Reglas en `01-mecanicas.md` ("Sobrecarga" y "Jefe: Morris"); valores, como PROVISIONAL en `OVERLOAD`, `CROWD`, `ENEMIES.morris` y `MORRIS` de `balance.ts`.

### La sobrecarga
- **La barra (MR-05):** cuenta los enemigos vivos que pisan el césped, también las copias y los ocultos; el jefe no. Se llena con 24.
- **Desde la ronda 1 (MR-02).** Llena, todos menos el jefe avanzan un 25 % más deprisa (MR-03), y se apaga al bajar del 60 % (MR-04).
- **Se combina multiplicando** con el acelerado de la ronda y con el hielo (decidido al hacerla: era un caso límite de la task).
- **No pasa a la preparación siguiente:** al acabar la ronda se apaga.
- **Con los muros, casi no cambia nada:** lo que muerde un muro no anda, así que no acelera. Donde se nota es en lo que aún llega, en el Skipper (descansa menos) y en el combate final, donde la barra se llena con los gusanos de Morris.
- **Riesgo de bola de nieve:** no se vio. Con los muros, una barra llena no hace que se pierda la ronda; con la simulación, en las rondas 2 a 8 un bot que juega bien no la llena nunca (su pico está entre 9 y 16), y en la 1 la llena unos 14 s de 90, al final, cuando llegan los grupos grandes.

### Tope de enemigos (MR-10)
60 a la vez en todos los brotes (el presupuesto de T-002). Lo que no cabe espera fuera, en orden, y sale en cuanto hay sitio; el jefe y las copias salen siempre. Con los bots, en los brotes 1 a 3 el pico es de 14 a 25 enemigos; en el 4, fuera del combate contra Morris, de 30, y en él, de 43, en las partidas que se pierden.

### Morris
- **Nada lo para (MR-06):** muerde lo que toca y, mientras, avanza a la mitad (0,065 casillas por segundo en vez de 0,13).
- **Suelta gusanos (MR-07):** por los agujeros de los cinco carriles, por turnos; el primero a los 4 s y luego uno cada 1,5 s, que baja en línea recta hasta uno cada 0,4 s a los 50 s. Con los niveles de su ronda (`high`, del 5 al 9), sin acelerar y con la variante de Morris.
- **Vida 15.000 de base (16.500 con la fuerza de todos)** y mordisco de 120 (132) cada 1,2 s. Con la simulación (abajo): con 14.000 el de área ganaba 9 de 10 y el de muros ninguna; con 14.500, 20 y 11 de 30; con 15.000, 16 y 2 de 30; con 16.000, 4 de 10 el de área.
- **Se gana con área:** sus gusanos se paran a morder los muros delante de él y se comen las balas que iban a Morris. La mina de fuego y la granada los tumban en grupo y las balas le llegan. Así no es un tercer jefe seguido que se resuelve con muros.
- **Escolta:** un acorazado de nivel 10 por carril y dos Minstrel de nivel 10, con su grito; después, refuerzos (Copycat, Lurker y Skipper) mientras vive.
- **Habla (MR-09):** "¡Perdón, perdón! ¡No paran de salir!" al salir. Las demás frases, en el mismo tono (`morris` en `src/i18n/`), las escribió Claude y Carmine las dio por buenas (23 nov 2026).
- **Aspecto (MR-08, en la galería `/proposals/jefes.html`):** tres propuestas que no se confunden con Creeper (sin pantalla, de pie y mucho más grande, unas 2,5 casillas): A, un gusano enorme hecho de gusanitos apretados que asoman la cara y se le desprenden al soltar uno, con un parche en la frente (la recomendada, y la que eligió Carmine el 23 nov 2026: `MORRIS_DESIGN` en `src/game/view/morrisArt.ts`); B, una fila de copias de su propia cabeza, cada vez más pequeñas y todas pidiendo perdón; C, un gusano de cable de red amarillo con tomas de las que asoman gusanitos. Las tres sudan y ponen cara de apuro. Se prepara a la derecha con una tablilla en la que cuenta máquinas y se le escapa algún gusanito. Las otras dos se quedan en la galería como referencia.
- **Sonido:** su voz de consola (`morrisTalk`), un plop al soltar cada gusano (`morrisBrood`), su derrota (`morrisDefeated`), y la sobrecarga al encenderse (`overloadOn`) y al apagarse (`overloadOff`). Sus fuentes, con dos alternativas cada uno, están en `scripts/audio/manifest.ts` y se oyen en `/tests/sonidos.html`; los elige Carmine de oído.

### Guion (T-042, PROVISIONAL)

En las rondas del brote `morris` de `OUTBREAKS` (`balance.ts`). Cada ronda empieza con 20 s de preparación; el brote empieza con 600 monedas y el tablero vacío.

| Ronda | Gusanos, acorazados y escupidores | Copycat | Minstrel | Lurker | Skipper | Último grupo | Niveles | Acelera | Dificultad medida |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 108 (solo gusanos) | 0 | 0 | 0 | 0 | 78 s | 1 a 4 | | 183 |
| 2 | 90 | 0 | 0 | 0 | 0 | 80 s | 1 a 4 | | 258 |
| 3 | 13 | 72 | 0 | 0 | 0 | 84 s | 1 a 7 | | 362 |
| 4 | 50 | 40 | 11 | 0 | 0 | 85 s | 1 a 7 | | 383 |
| 5 | 20 | 11 | 2 | 59 | 0 | 87 s | 1 a 7 | | 476 |
| 6 | 35 | 23 | 1 | 25 | 20 | 90 s | 3 a 9 | | 535 |
| 7 | 44 | 31 | 3 | 23 | 12 | 94 s | 3 a 9 | +15 % | 766 |
| 8 | 46 | 39 | 5 | 28 | 12 | 96 s | 5 a 9 | +25 % | 1132 |
| 9 | 5 | 5 | 2 | 5 | 8 | 110 s | 5 a 9 | | Escolta: un acorazado de nivel 10 por carril y dos Minstrel de nivel 10; Morris por el centro, sus gusanos y refuerzos mientras vive |

- **La ronda 1 es más dura que la 1 del brote 3 aun contando las 600 monedas:** su dificultad por moneda inicial (183 / 600 = 0,31) pasa a la del brote 3 (86 / 300 = 0,29). Son muchos gusanos de nivel bajo y cada vez más seguidos: con menos gusanos de más nivel (de 1 a 7) el bot perdía en la ronda 1 diecisiete partidas de veinte, porque tardan más en caer y se amontonan.
- **La 1 aprieta la moneda:** el bot la acaba con 35 monedas de media.
- **Dificultad medida (`roundThreat`):** sube de ronda en ronda. Las de los Copycat cuentan sus copias y las de los Lurker, su sigilo.

### Simulación con bots (T-042)

Con `npm run sim`, 10 partidas por bot, con el azar fijo. El bot aprendió el daño en área (`area` en `bot.ts`): siembra una mina de fuego delante de sus muros donde pilla a 5 enemigos o más (en su carril y en los de al lado, contando lo que avanzan en la cuenta de la mina), también antes de montar sus columnas, y guarda para reponer un muro. Sin esa guarda y con minas en cualquier casilla, tapaba la columna de los muros y perdía más que sin minas. Ninguno usa inventos. Las tablas de los brotes 1 a 3 salen idénticas a las de antes: lo nuevo solo actúa en el brote 4.

| Bot | Sin mejoras | Nivel base 3 | Nivel base 5 |
|---|---|---|---|
| Solo muros, 2 cañones | 0 de 10 (pierde contra Morris) | | |
| Solo muros, 3 cañones | 0 de 10 (pierde contra Morris) | 10 de 10 (jefe en 69 s) | 10 de 10 (69 s) |
| Área, 3 cañones (MR-11) | 5 de 10 (jefe en 104 s) | 10 de 10 (81 s) | 10 de 10 (61 s) |
| Área, 2 cañones | | 0 de 10 | 10 de 10 (92 s) |

- **El brote dura unos 17 minutos** con las preparaciones (rondas de 85 a 104 s de ataque y el combate final, ganado, de 83 a 120 s).
- **Hasta el jefe, ningún bot que juega bien pierde una vida:** todo se decide contra Morris. Con 30 partidas por bot, el de área gana 16 de 30 y el de muros, 2.
- **Con el vivero, los muros vuelven a bastar:** con el nivel base 3, las disparadoras que se reponen en el combate final nacen más fuertes y las balas abren paso entre los gusanos; el de muros gana entonces 10 de 10, y más deprisa que el de área, que gasta en minas lo que ya no le hace falta.

## Después del brote 4

- El tope de nivel de las disparadoras sube a 10 en el brote 5 (decidido en T-035).
- Patty enseñará cosas nuevas en el Invernadero para empezar el ataque. Qué cosas, está por decidir.
- El brote 5 es el primero con cambio de escenario.
