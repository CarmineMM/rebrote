# Ruta de brotes

Lista de virus candidatos a jefe, ordenados de menos a más peligrosos, y preguntas abiertas de la historia. Solo nombres: las mecánicas de cada jefe se diseñan cuando le toque su brote.

## Cómo está ordenada

De menos a más daño, mezclando dos cosas: lo que le hizo a los equipos y lo que supuso para la gente. El orden es una propuesta y es discutible: no hay una medida única de "peligro". No es cronológico (Stuxnet es de 2010 y va casi al final).

## Lista amplia

| # | Virus | Año | Qué fue | Nombre del jefe |
|---|---|---|---|---|
| 1 | Creeper | 1971 | Gusano experimental que saltaba de máquina en máquina | Creeper, el Escurridizo |
| 2 | Elk Cloner | 1982 | Virus de disquete que mostraba un poema | Elk Cloner, el Poeta |
| 3 | Brain | 1986 | Primer virus de PC, en el sector de arranque | Brain, el Cerebro |
| 4 | Morris | 1988 | Gusano que saturó buena parte de la internet de su época | Morris, el Imparable |
| 5 | Michelangelo | 1992 | Virus dormido que se activaba un día concreto del año | Michelangelo, el Paciente |
| 6 | Melissa | 1999 | Virus de macro que se reenviaba solo por correo | Melissa, la Mensajera |
| 7 | CIH (Chernobyl) | 1998 | Borraba el disco y podía dejar la placa inservible | Chernobyl, el Fundidor |
| 8 | Code Red | 2001 | Gusano de servidores web | Code Red, la Marea Roja |
| 9 | Nimda | 2001 | Gusano que entraba por varias vías a la vez | Nimda, el de las Mil Puertas |
| 10 | Sasser | 2004 | Gusano que reiniciaba los equipos una y otra vez | Sasser, el Apagón |
| 11 | Blaster | 2003 | Gusano con cuenta atrás de apagado y ataque a distancia | Blaster, el Francotirador |
| 12 | SQL Slammer | 2003 | Gusano diminuto y rapidísimo | Slammer, el Relámpago |
| 13 | ILOVEYOU | 2000 | Gusano de correo disfrazado de carta de amor | Loveletter, la Rompecorazones |
| 14 | Sobig | 2003 | Gusano de correo masivo | Sobig, la Plaga |
| 15 | MyDoom | 2004 | Gusano de correo de propagación muy rápida | MyDoom, el Heraldo |
| 16 | Storm | 2007 | Troyano que montó una red enorme de equipos zombi | Storm, la Tormenta |
| 17 | Zeus | 2007 | Troyano bancario | Zeus, el Ladrón de Bóvedas |
| 18 | Conficker | 2008 | Gusano con millones de equipos infectados | Conficker, el Enjambre |
| 19 | CryptoLocker | 2013 | Ransomware: cifraba archivos y pedía rescate | CryptoLocker, el Carcelero |
| 20 | Mirai | 2016 | Red de cámaras y routers secuestrados | Mirai, el Titiritero |
| 21 | WannaCry | 2017 | Ransomware con propagación de gusano; afectó a hospitales | WannaCry, el Secuestrador |
| 22 | NotPetya | 2017 | Destructor de datos disfrazado de ransomware | NotPetya, el Arrasador |
| 23 | Stuxnet | 2010 | Arma digital que saboteó maquinaria industrial | Stuxnet, el Saboteador |
| 24 | Industroyer | 2016 | Ataque a una red eléctrica | Industroyer, el Apagaluces |
| 25 | Triton | 2017 | Ataque a los sistemas de seguridad de una planta industrial | Triton, el Silenciador |
| Final | La IA | | La que recrea todos los anteriores | Por decidir (ver abajo) |

## Decisiones de la ruta (21 nov 2026)

- **Ruta larga.** Se usan los 25 jefes de la lista, 26 con el final. La ruta corta de 10 brotes queda descartada.
- **El orden de la lista es el orden de los brotes.** Blaster se queda en el puesto 11 (H-08 cerrada). El brote 2 es Elk Cloner.
- **El escudo no espera a Blaster.** Sale en el brote 2 para no dejar al jugador sin progreso, así que Elk Cloner necesita una mecánica que lo justifique (T-026: sus versos y su poema entero, que solo para un escudo).

## Primer tramo: la defensa del refugio

| Brote | Jefe | Estado | Qué aporta |
|---|---|---|---|
| 1 | Creeper, el Escurridizo | Hecho | Disparadora, fuego, hielo, infundir, fusionar y subir de nivel |
| 2 | Elk Cloner, el Poeta | Hecho (T-024 a T-026; `05-brote-2-elk-cloner.md`) | Escudo. Sus versos son ondas que cruzan el carril y solo un escudo las para; cada pocos versos, el poema entero por los cinco carriles |
| 3 | Brain, el Cerebro | Planificado (T-037 a T-039; `06-brote-3-brain.md`) | Infundir el escudo, que en el brote 2 solo se siembra como muro. Tropas ocultas, el Skipper que salta y un jefe que avanza oculto y a saltos: solo lo para un escudo |
| 4 | Morris, el Imparable | Sin diseñar | Idea suelta: el Morris real se copiaba tantas veces que tumbaba las máquinas. Enemigos en masa |

Después de estos cuatro brotes, la historia pasa de la defensa al ataque y cambia el escenario (decidido el 21 nov 2026, ver `04-historia.md`). Por eso los cuatro tienen que dejar al jugador con todas las piezas básicas en la mano.

Los cuatro comparten la música de ronda y la del jefe (T-015, `MUSIC_STAGES`). El tramo del ataque traerá la suya.

**Nivel de las plantas (T-035, decidido por Carmine el 22 nov 2026).** Durante los cuatro brotes de la defensa el tope de nivel de las disparadoras se queda en 5. En el brote 5, el primero del ataque, Patty le cuenta al jugador que sus plantas ya pueden llegar al nivel 10: su ronda 1 pone `levelCap: 10` y el aviso de desbloqueo lo presenta ella (`presenter: 'patty'`). El nivel de los enemigos de los brotes 3 en adelante se pregunta a Carmine antes de escribir sus tablas (en los brotes 1 y 2, como mucho el 9, y el 10 solo los aliados de los jefes).

Las ideas de los brotes 3 y 4 no están decididas: son un punto de partida para cuando les toque.

## Lo desbloqueado vale hacia atrás (norma, decidida el 22 nov 2026)

Lo que el jugador desbloqueó en un brote vencido lo puede usar al rejugar los brotes anteriores, desde su ronda 1 (ES-03, T-037). Así, al rejugar el brote 1 con el brote 2 vencido hay escudo, y al rejugar el brote 2 con el brote 3 vencido se puede infundir el escudo. Cada brote nuevo se diseña sabiendo que sus piezas llegarán también a los de antes: sus jefes y sus tropas tienen que portarse bien con ellas. Detalle en "Brotes (T-018)" de `01-mecanicas.md`.

## Reutilizar tropas (decidido el 22 nov 2026)

- **Brotes 1 a 4:** cada brote trae tropas propias, para que el jugador siempre note algo nuevo. Siguen el mismo guion: una base, una de distancia, un tanque y una especial.
- **Desde el brote 5:** se reutilizan tropas de brotes anteriores, con más nivel y un cambio de color. Conservan su nombre, para que la ficha no confunda.
- **Hacia el brote 10:** vuelven a entrar tropas nuevas.
- **El Minstrel** queda exclusivo del brote 2 por ahora y se guarda para otro jefe.
- **Si el virus no es un gusano, sus tropas tampoco lo son.** Brain y Elk Cloner son virus de sector de arranque: bichos propios.

Recomendación para los brotes que reutilicen: que cada uno junte tropas que nunca coincidieron (por ejemplo, Copycat con Skipper). Así el problema es nuevo aunque las piezas no lo sean.

## Lo que se guarda para Blaster (brote 11)

Blaster iba a ser el brote 2 y ya tenía diseño. Se conserva para cuando llegue:
- Es el jefe francotirador: ataca a larga distancia a la planta más valiosa.
- Cuenta atrás: marca una planta y, al llegar a cero, la apaga un rato. El Blaster real forzaba un apagado con cuenta atrás de 60 segundos.
- Sus tropas incluyen francotiradores que apuntan a la planta de más nivel del carril.

## Avisos

- **Son 26 brotes.** A unos 15 minutos por brote son más de 6 horas de juego, y cada jefe necesita una mecánica propia para que no se sienta relleno. Conviene planificarlos por tramos de 4 o 5 y aceptar que algunos brotes sean más cortos que otros.
- **Familias.** Virus de arranque: 2, 3, 5, 7. Gusanos: 1, 4, 8 a 15, 18. Troyanos: 16, 17. Ransomware: 19, 21, 22. Armas industriales: 23 a 25. Cada familia puede traer su mecánica de tropas y su escenario.
- **El orden por peligro es discutible** en los puestos intermedios. Si al diseñar un brote conviene intercambiar dos vecinos, se intercambian.
- Son nombres de sucesos históricos. Antes de monetizar, revisar el uso de nombres y no usar logotipos ni material de nadie.

## Historia

La historia, los personajes y sus preguntas están en `04-historia.md`.

**Por qué el orden va de menos a más.** La IA está aprendiendo. Empieza recreando los virus más antiguos e inofensivos, que son los más fáciles de fabricar, y con cada brote se atreve con uno peor.
