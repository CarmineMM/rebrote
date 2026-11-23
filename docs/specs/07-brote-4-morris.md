# Brote 4: Morris

Diseño del cuarto brote, acordado con Carmine el 23 nov 2026. Todavía no está hecho: lo construyen T-041 a T-044. Lo que dice "decidido" lo decidió Carmine; los números son un punto de partida y se ajustan con `npm run sim`.

Es el último brote de la defensa del refugio. Al vencerlo, Boxer y Patty deciden pasar al ataque.

## Idea

El Morris real se copiaba sin parar hasta saturar las máquinas. En el juego es **la inundación**: muchos enemigos a la vez. Tras dos jefes en los que la respuesta era el escudo, aquí la respuesta es el daño en área: minas de fuego, fuego infundido, tres cañones y la granada. Un muro solo no aguanta a veinte gusanos mordiendo.

**No trae nada nuevo para el jugador (decidido).** Ni planta ni invento. El brote ya lleva mucha historia, y lo nuevo se guarda para el brote 5. Lo que sí trae es un problema nuevo: la sobrecarga.

## El original (1988)

Morris fue el primer gran gusano de internet. Su autor, un estudiante, quería medir el tamaño de la red, no romper nada. Pero el programa tenía un fallo: volvía a copiarse en equipos que ya estaban infectados, una y otra vez, hasta que se quedaban sin recursos y se caían. Dejó fuera de servicio miles de equipos.

**Sí es un gusano.** Viajaba solo por la red, sin que nadie llevara nada de un equipo a otro. Por eso sus tropas son gusanos, que el juego tiene desde el brote 1.

## Tropas: todas las que ya existen (decidido)

No hay tropas nuevas. Vuelven las de los tres brotes anteriores, con otro color y más nivel, y conservan su nombre.

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

## Dificultad

- **Nivel de las tropas:** por confirmar (regla 14 de `CLAUDE.md`). Recomendación: la misma banda que los brotes 2 y 3, hasta el 9, y la escolta en el 10. El tope de las disparadoras sigue en 5.
- **De dónde sale la dificultad:** de la cantidad y de la sobrecarga, no del nivel.
- **Objetivo:** que un jugador sin mejoras del Vivero pueda ganar jugando bien. La simulación lo tiene que medir con nivel base 1, 3 y 5, como en los brotes 2 y 3.

## Riesgos de diseño

- **Bola de nieve.** Más enemigos hacen que todos corran más, y eso deja menos tiempo para matarlos. Si la sobrecarga no tiene freno, una mala ronda no se remonta. Tiene que ser temporal, con tope, y los inventos (granada y muro de hielo) tienen que servir para vaciarla.
- **Rendimiento.** "En masa" son muchos bichos a la vez, y el juego se usa mucho en móvil. Hace falta un tope de enemigos en pantalla y probarlo en la calidad más baja.
- **Demasiada moneda.** Con 600 de salida y nueve rondas, el jugador puede llenar el tablero pronto. Las primeras rondas tienen que apretar desde el principio.
- **Parecerse al brote 1.** Mismas tropas y mismo escenario. Lo que lo distingue es la cantidad, la sobrecarga, el jefe y la historia: si alguna de las cuatro falla, se nota.
- **Tres mecánicas de copia.** Creeper deja copias al saltar, los Copycat al caer y Morris las saca sin parar. Hay que cuidar que se vean distintas.

## Después del brote 4

- El tope de nivel de las disparadoras sube a 10 en el brote 5 (decidido en T-035).
- Patty enseñará cosas nuevas en el Invernadero para empezar el ataque. Qué cosas, está por decidir.
- El brote 5 es el primero con cambio de escenario.
