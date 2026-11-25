# Historia y personajes

Notas de la historia. Última revisión: 25 nov 2026. El arranque ya está hecho (T-031 a T-033), Boxer y Patty ya están en el juego (T-032) y el giro también (T-043, 0.16.1). El aspecto de la IA está decidido y su primera aparición, el motion comic tras Creeper, tiene task (T-049). Lo lejano queda aquí anotado, sin tasks.

Lo marcado como "Decidido" lo dijo Carmine. Lo marcado como "Propuesta" es una idea por aprobar.

## Premisa (decidido)

- Una IA se rebeló y quiere acabar con la humanidad.
- Para hacerlo recrea en el mundo real los virus informáticos de la historia.
- La gente se reagrupó en refugios y se defiende con plantas.
- Los jefes vencidos desaparecen.
- El jefe final es la propia IA. Todavía no tiene nombre.

## Tono (decidido)

Aventura de dibujos animados: hay peligro y hay prisa, pero no se ve morir a nadie y hay sitio para el humor. El juego es amigable (gusanos simpáticos, colores alegres, plantas con ojos) y la historia no lo contradice.

## Personajes

### El jugador (decidido)
- Es quien juega. No tiene cara ni se le muestra nunca.
- Fue rescatado de la IA al principio de la historia.
- No sabe nada de plantas ni de virus: aprende a la vez que quien juega.
- Elige su nombre: Boxer se lo pregunta después de explicarle el mundo, tras vencer a Creeper, y el jugador lo escribe (T-033). Si prefiere no decirlo (o salta las viñetas), Boxer le llama "Rookie", en todos los idiomas.
- Puede haber varios jugadores en el mismo navegador, cada uno con su nombre y su progreso (T-034).

### Boxer, el mentor (decidido)
- Hombre de complexión normal. Aspecto (T-031, Y-01, decidido): un informático moderno de pelo oscuro peinado con raya, barba completa con bigote y gafas de pasta negras; sudadera negra con cremallera y un portátil lleno de pegatinas. Ya no se le fija la edad en unos 50: aparenta treinta y tantos.
- Era informático. Por eso sabe tanto de la IA y de los virus, y sabe cómo combatirlos.
- Rescata al jugador y le enseña a luchar.
- Es la voz de los tours de ayuda: cada cosa nueva la enseña él (T-032, VT-01), con su cara, su nombre y su voz en el bocadillo.
- Lo del brote 1 se lo da él al jugador: presenta cada desbloqueo con un "Toma, esto te va a hacer falta" (T-032, VT-02).
- Antes de cada jefe cuenta en una línea qué fue el virus de verdad, en la ronda en que el jefe se prepara; lo completo está en la ficha del jefe (T-032, VT-04, decidido).
- Tras el cuarto jefe, propone dejar de defenderse e ir a por el jefe final.

### Patty, la botánica (decidido)
- Cuida el Invernadero.
- Creó las plantas que disparan, con biología y con la ayuda de Boxer.
- Sigue creando: cuando el jugador avanza, llega con un "He creado algo nuevo" y aparecen plantas nuevas. Desde el brote 2, presenta en el aviso de desbloqueo cada planta o pieza nueva; Boxer enseña a usarla en el tour (T-032, VT-03).
- Vive en el Invernadero: asoma junto al menú y a veces dice algo al entrar, o si se la toca (T-032, VT-05).

Decidido (T-031, Y-02): joven, de unos 28 años, con media melena negra y un flequillo que le tapa parte de las cejas, una flor en el pelo, bata blanca con un pin de hoja y un tubo de ensayo con un brote.

Propuesta: es la cara de la tienda (T-022) y de las mejoras (T-023).

### La IA, el jefe final (aspecto decidido el 25 nov 2026; nombre por decidir, H-03)
- **Es una mujer,** de figura realista y proporciones humanas. No es caricaturesca.
- **Se dibuja solo la figura:** una silueta oscura. No hace falta detalle realista por dentro.
- **Su pelo largo son cables.** Cae hasta el suelo, se hunde en él y se ramifica como raíces. Es el reflejo oscuro de las plantas: ellas echan raíces en la tierra y ella en la red.
- **Ojos de luz verde azulada,** del mismo color que los circuitos del suelo corrupto del tablero (`#7dffc0` y `#39e58c`, `paintCorruption` en `src/game/view/textures.ts`).
- **Tiene cuerpo físico,** no es un holograma. Apenas se mueve: su quietud contrasta con todo lo demás.
- **Se revela por etapas:** en silueta cuando Boxer cuenta la rebelión (T-049), más cerca cuando empiece el viaje y entera en el combate final.
- Mientras no tenga nombre, Boxer la llama "ella" (T-049, MC-12).
- No se toma como modelo ningún personaje de otra obra.

Ideas anotadas, sin decidir:
- Nunca se desconecta del todo: en el combate final habría que cortarle las raíces.
- Por qué tiene forma humana: nos imita porque fuimos su único modelo.
- Nombre propuesto: RAÍZ (H-03).

### Cómo saca los virus a la realidad (propuesta, T-049)
Un virus solo es código. Ella les fabrica un cuerpo: lee cómo se escribieron y sus fábricas, que lleva conectadas con las raíces de su pelo, los imprimen. Empezó por el más viejo, Creeper (viñeta 5 de abajo). Va en el guion de T-049 (MC-04).

## Por qué disparan las plantas (decidido en lo grueso)

Las creó Patty. Ella puso la biología y Boxer, lo que sabe de combatir virus.

Propuesta para completar la explicación en una frase: la IA controla todo lo que lleva un chip, así que las defensas tenían que ser algo vivo, lo único que no puede hackear.

Esto da una regla útil para todo el juego: lo que el jugador recibe en el brote 1 se lo da Boxer (ya existía); lo que llega después lo crea Patty.

## Estructura (decidido en lo grueso)

| Tramo | Qué pasa | Escenario |
|---|---|---|
| Arranque | Boxer rescata al jugador en pleno ataque | El jardín del refugio (el actual) |
| Defensa | Los cuatro primeros jefes atacan el refugio: Creeper, Elk Cloner, Brain y Morris | El mismo |
| El giro | Tras el cuarto, Boxer decide que ya tienen lo necesario y propone ir a atacar | |
| El viaje | Los jefes siguientes se combaten yendo hacia la IA | Primer cambio de escenario, y los siguientes |
| Final | Cae la IA y termina la persecución. La gente sale de los refugios | Por diseñar |

El viaje encaja con la ruta de brotes que ya existe (T-019): un camino con lugares hasta una torre al fondo.

## Cómo se cuenta (decidido)

Con viñetas. Una viñeta es el retrato de quien habla y un bocadillo sobre la escena del juego, no una ilustración completa. Pocas, cortas y siempre con botón de saltar. Desde T-043, lo que no necesita parar el juego son comentarios de una línea.

Los momentos grandes se cuentan con un **motion comic** (decidido el 25 nov 2026): planos dibujados a pantalla completa, con capas recortadas que se mueven cada una por su cuenta, mientras Boxer narra, y con música propia de tipo heroico. El primero es la rebelión de la IA tras vencer a Creeper (T-049). El resto de la historia sigue con viñetas.

Boxer será la primera persona que dibuja el juego: su estilo marca el de todas las demás.

## Guion del arranque

### Antes del brote 1 (decidido)

> BOXER: ¡No hay tiempo para explicarte! Toma esa planta y sígueme el juego.

Y empieza la ronda 1, con los tours.

### Antes de Creeper (T-032)

En la preparación de la ronda 8, cuando Creeper empieza a prepararse (aparece al cerrar la viñeta):

> BOXER: ¡Ojo, que viene Creeper, el primer gusano informático! Al de verdad lo paró Reaper, el primer antivirus. ¡Hoy el Reaper eres tú!

En su ficha, completo: Creeper (1971) fue el primer gusano informático, un experimento que saltaba de un ordenador a otro por ARPANET, la red de la que nació internet. No rompía nada: solo escribía "I'M THE CREEPER: CATCH ME IF YOU CAN!". Para atraparlo se programó Reaper, el primer antivirus.

### Después de vencer a Creeper (aprobado por Carmine el 21 nov 2026, con el ajuste de Patty)

> T-049 cambia este momento: las viñetas 1 a 3 pasan a ser un motion comic de dos escenas (la rebelión y cómo da cuerpo a los virus; los refugios y las plantas), con la historia ampliada y música heroica. Las viñetas 4 a 6 siguen igual. El guion propuesto está en la task (sección 4.1) y pasa aquí al cerrarla.

1. BOXER: "Eso era Creeper. Un programa de 1971 que solo sabía saltar de una máquina a otra. Inofensivo... hasta que ella lo sacó de la pantalla."
2. BOXER: "Ella es una IA. La hicimos para protegernos de los virus, así que los aprendió todos. Y un día decidió que el fallo éramos nosotros."
3. BOXER: "Controla todo lo que lleva un chip. Por eso Patty creó estas plantas: son lo único que no puede hackear."
4. BOXER: "Por cierto, con las prisas no te pregunté. ¿Cómo te llamas?" (el jugador escribe su nombre)
5. BOXER: "Pues esto no ha terminado, [nombre]. Ha empezado por el más viejo y el más torpe. Los siguientes serán peores. Ven, te enseño el Invernadero."

Al llegar al Invernadero:

6. PATTY: "¿Así que tú eres quien ha parado a Creeper, [nombre]? Soy Patty. Las plantas son cosa mía. Vuelve cuando quieras: siempre estoy creando algo nuevo."

Notas:
- La viñeta 2 afirma que la IA se creó para proteger de los virus. Si eso cambia (H-15), cambia la frase.
- Las viñetas 4 y 6 son nuevas respecto al borrador aprobado: una pide el nombre y la otra presenta a Patty.
- T-033 añadió el nombre al final de la pregunta de Patty, para que las viñetas que siguen a la 4 llamen al jugador por su nombre. Sin nombre (quien vio la historia antes de T-033), la frase va sin él.

## El giro: la historia del brote 4 (T-043)

Decidido por Carmine el 23 nov 2026:
- El giro llega con el cuarto brote, el de Morris.
- La confianza crece durante el brote. Boxer lo propone al ver cómo juega el jugador.
- Patty duda, pero poco, y se va convenciendo con el paso de las rondas.
- Al vencer a Morris deciden pasar al ataque.
- Patty cierra con "Nos espera un largo viaje".
- Después sale el aviso de beta (T-044). Lo que Patty enseñará en el Invernadero para empezar el ataque se decide con el brote 5.

Para no frenar el juego, casi todo son comentarios de una línea durante la preparación, que no lo paran. Solo tres momentos son viñetas. Todo sale solo la primera vez.

Hecho en T-043 (23 nov 2026), con las recomendaciones de HG-01 a HG-07 aceptadas por Carmine:
- **Comentario (HG-01):** el retrato redondo de quien habla en la esquina de abajo a la derecha y un bocadillo con su nombre y la frase, letra a letra y con su voz. No para el juego ni la cuenta atrás; el resto del tablero se sigue usando.
- **Solo la primera vez (HG-02):** un comentario cuenta como visto en cuanto se ve. El que no llegó a verse (la preparación se pasó entera con un tour o una viñeta encima, o se adelantó antes de que saliera) sale la próxima vez que se llegue a esa ronda.
- **Unos 5 s (HG-03):** espera 1,2 s a salir y está en pantalla unos 5 s; un toque lo cierra antes.
- **Se corta al empezar el ataque (HG-04).**
- **Patty dudosa (HG-05):** cuarta expresión de los personajes, barata porque la cara sale de piezas comunes: una ceja baja y otra en arco, el párpado a media altura, la mirada de reojo y la boca torcida.
- **No se vuelven a leer (HG-06):** en el Invernadero solo las tres secuencias de viñetas.
- **Salen con la ayuda apagada (HG-07):** son historia, no ayuda.

### Guion (T-043)

El borrador se usó como estaba (decidido: "el guion vale como punto de partida"). En el juego, las caras: Boxer contento en las rondas 2 y 3; Patty dudosa en la 4 y en la viñeta de la 5, normal en la 6 y contenta en la 8; en el final, Boxer contento y Patty normal y luego contenta.

| Ronda | Cómo sale | Quién | Frase |
|---|---|---|---|
| 1 | Viñeta | Boxer | "Otra vez gusanos. Pero mira cuántos." |
| 1 | Viñeta | Patty | "Te he dejado preparado más de lo habitual. Lo vas a necesitar." |
| 2 | Comentario | Boxer | "Bien. Ni se han acercado." |
| 3 | Comentario | Boxer | "Oye, esto se te da bien. Demasiado bien para seguir escondidos." |
| 4 | Comentario | Patty | "No le des ideas, Boxer. El refugio es todo lo que tenemos." |
| 5 | Viñeta | Boxer | "Piénsalo, Patty. Tres jefes, y ninguno ha pasado." |
| 5 | Viñeta | Patty | "¿Y si salimos y perdemos el jardín?" |
| 5 | Viñeta | Boxer | "¿Y si nos quedamos y un día sí pasan?" |
| 6 | Comentario | Patty | "Vale. Puede que tengas algo de razón." |
| 7 | Viñeta (la del virus real, ya existe) | Boxer | Lo que fue el Morris de verdad |
| 8 | Comentario | Patty | "Si paramos a este, hablamos. Te lo prometo." |
| 9 | Comentario | Boxer | "Que sea el último que nos pilla esperando." |
| Final | Viñeta | Boxer | "Llevamos demasiado tiempo regando y esperando. ¡Coge las macetas, [nombre], que nos vamos de excursión!" |
| Final | Viñeta | Patty | "Está bien. Me habéis convencido los dos." |
| Final | Viñeta | Patty | "Nos espera un largo viaje." |

Notas:
- La frase de Patty de la ronda 1 explica por qué el brote empieza con el doble de moneda.
- La última frase es la que decidió Carmine. Las demás son el borrador, usado tal cual.
- En inglés, "Nos espera un largo viaje" es "We have a long journey ahead." y "¡Coge las macetas, [nombre], que nos vamos de excursión!", "Grab the flowerpots, [name], we're going on a field trip!". Sin nombre, la frase va sin él.
- Títulos para volver a verlas en el Invernadero: "Más que nunca" (apertura), "¿Y si salimos?" (mitad) y "Un largo viaje" (final). Entre la de mitad y la del final, "El Morris de verdad".
- Frases de Boxer que quedaron sin usar, por si sirven: "¡Se acabó esconderse! Desde hoy, los que atacan somos nosotros." y "Ahora le toca a ella tener miedo."

## Final (anotado, muy a futuro)

- Vencer al jefe final acaba con la persecución de la humanidad.
- La historia termina con la gente saliendo de sus escondites y refugios.

## Preguntas

| # | Pregunta | Estado | Decide |
|---|---|---|---|
| H-03 | Nombre de la IA y del jefe final | Abierta. Carmine lo pensará. Idea anotada: RAÍZ | Carmine |
| H-09 | Nombre del mentor | Cerrada: Boxer | Carmine |
| H-10 | ¿Por qué disparan las plantas? | Cerrada: las creó Patty con ayuda de Boxer | Carmine |
| H-11 | ¿De qué rescatan al jugador exactamente? | Abierta. Recomendación: de un ataque a su ciudad, sin más detalle | Carmine |
| H-12 | ¿El jugador habla o tiene cara? | Cerrada: no. Solo tiene el nombre que elige | Carmine |
| H-13 | ¿El giro llega tras 3 jefes o tras 4? | Cerrada: tras 4 | Carmine |
| H-14 | ¿Existe la botánica del Invernadero? | Cerrada: sí, Patty | Carmine |
| H-15 | ¿Quién creó a la IA? ¿Tuvo algo que ver Boxer? | Abierta. Recomendación: dejarlo como secreto para más adelante | Carmine |
| H-16 | ¿Por qué se llama Boxer? | Abierta. Un apodo pide una explicación corta en algún momento | Carmine |
