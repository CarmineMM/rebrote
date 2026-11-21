# Mecánicas

## Vocabulario

| Término | Significa |
|---|---|
| Sembrar | Colocar una planta o un elemento en una casilla vacía |
| Infundir | Soltar un elemento sobre una disparadora ya sembrada |
| Fusionar | Arrastrar una disparadora sobre otra de la misma variante para sumar cañones |
| Nivel | Mejora individual de una disparadora (daño y cadencia) |
| Variante | Normal, de fuego o de hielo |

No se usa la palabra "combinar": se confundía con fusionar.

## Piezas del brote 1

| Pieza | Sembrada sola | Infundida en una disparadora |
|---|---|---|
| Disparadora | Dispara en su carril | No aplica |
| Fuego | Mina: al detectar un enemigo cerca cuenta 2 s, explota en área y desaparece | Las balas aplican daño progresivo |
| Hielo | Igual que la mina de fuego, pero ralentiza en área con efecto fuerte, y desaparece | Las balas ralentizan |

El elemento solo siempre tiene un efecto mayor que su versión infundida, a cambio de gastarse.

## Reglas confirmadas

### Moneda
- Hay una sola moneda. Sembrar, infundir y subir de nivel compiten por ella.
- Se gana por enemigo eliminado y por goteo pasivo. No hay planta generadora en el brote 1 (D-01, cerrada el 19 nov 2026).
- **El goteo solo corre durante el ataque (T-010, A-02):** 25 por cada 10 s de ataque. En la preparación no se gana moneda esperando: su reloj se para y en el siguiente ataque sigue donde iba.
- **Cuánto da cada enemigo (T-009, P-03):** gusano 15, escupidor 20 y acorazado 25, sea cual sea su nivel. Creeper no da moneda: al caer se gana la partida.
- Al eliminar un enemigo, el 90 % de las veces la moneda se cobra sola. El otro 10 % el enemigo la suelta en el suelo y solo se cobra si el jugador le hace clic; recogida así vale un 15 % más, redondeado hacia arriba (25 pasa a 29, 15 a 18).
- La moneda soltada que no se recoge se pierde al cabo de unos segundos.
- La moneda siempre es entera: nunca hay decimales en el saldo.

### Combate
- La disparadora dispara solo a enemigos de su carril que están por delante de ella y ya pisan el césped. A los que ya la pasaron no les dispara.
- Las balas no persiguen a nadie: dan al primer enemigo de su carril que encuentran. Si su objetivo muere antes, siguen hasta el siguiente. Desaparecen al impactar o al salir del tablero.
- El gusano avanza a velocidad constante. Al tocar una planta se para y la muerde a intervalos hasta destruirla; luego sigue.
- Cada enemigo que cruza el borde izquierdo resta una vida y desaparece. Sin vidas se pierde la partida (D-07 sigue abierta: de momento hay 3 vidas, como PROVISIONAL en `LIVES` de `balance.ts`).

### Brotes (T-018)
Decisiones B-01 a B-04 cerradas el 21 nov 2026 con la recomendación. Cómo se hace: ADR-0015.
- **Qué es un brote:** una campaña que termina en un jefe. Se llama por su número y su jefe: "Brote 1: Creeper" ("Outbreak 1: Creeper" en inglés). La palabra "mundo" no sale en el juego: queda reservada para el futuro (familias de virus, `00-vision.md`).
- Cada brote tiene su guion de rondas, sus tropas, su jefe y su saldo inicial. El brote 1 es el de Creeper (`02-brote-1-creeper.md`); los jefes candidatos para los siguientes están en `03-ruta-de-brotes.md`.
- **Una partida es de un brote** y lo conserva al guardarse y cargarse. El indicador de ronda ("Ronda 3 de 10") y el resumen de la partida guardada ("Continuar" y "Reanudar", T-019) cuentan las rondas de su brote. Al vencer a su jefe, el brote queda vencido en el progreso permanente (T-017).
- **Lo aprendido se queda (B-01):** al empezar un brote, todo lo que desbloquearon los anteriores llega desbloqueado desde la ronda 1, con el último tope de nivel que pusieron. Sus rondas solo desbloquean lo nuevo: lo ya sabido no saca "¡YA LO TIENES!" ni su tour.
- **Cada brote empieza de cero (B-02):** tablero vacío, todas las vidas y el saldo inicial del brote. No pasan plantas ni monedas de un brote a otro.
- **El jefe se nombra siempre (B-03):** "Brote 2: Elk Cloner" desde el principio, también antes de llegar a él.
- **En orden (B-04):** para entrar en un brote hay que haber vencido al jefe del anterior; el primero siempre se puede jugar. Hasta la ruta de brotes (T-019), "Nueva partida" empieza el brote 1 y "Jugar otra vez" repite el mismo brote desde su ronda 1.

### Rondas (T-007, ampliadas en T-008 y T-009)
- El brote 1 tiene 10 rondas con guion: cada una dice qué enemigos salen, cuándo y por qué carril. El guion está en las rondas del brote `creeper` de `OUTBREAKS` en `balance.ts` (resumen en `02-brote-1-creeper.md`).
- **Preparación:** cada ronda, también la 1, empieza con una cuenta atrás de 20 s en la que se puede sembrar, infundir, fusionar y subir de nivel. El goteo se para (T-010). El botón "¡Que vengan!" la adelanta.
- **Ataque:** los enemigos salen a su hora por el agujero de su carril. La ronda termina cuando no quedan enemigos por salir ni vivos; empieza entonces la preparación de la siguiente.
- Plantas, saldo y vidas se conservan de una ronda a la siguiente.
- **Un concepto por ronda (T-009, P-01):** lo nuevo se desbloquea al empezar la preparación de su ronda y sigue desbloqueado después, también en los brotes siguientes (T-018, B-01). En el brote 1, ronda 1: disparadora. 2: subir de nivel, hasta el 5. 3: mina de fuego. 4: mina de hielo. 5: infundir (fuego y hielo, con la carta o arrastrando una mina sembrada). 6: fusionar. 7 a 10: nada nuevo (desde T-010 la 7 ya no sube el tope de nivel).
- **Aviso que hay que aceptar (T-009, P-02):** al empezar una ronda con algo nuevo sale "¡YA LO TIENES!" con lo desbloqueado. El juego espera en pausa (la cuenta atrás no corre) hasta que el jugador pulsa "¡A jugar!" (o Enter o Esc). Además, cada ronda sigue sacando su aviso de una línea.
  - **La ronda 1 no lo saca (T-010, A-01):** la disparadora se da por sabida y basta su aviso de una línea. En el guion, la ronda lleva `quiet`.
- **Creeper se prepara (rondas 8 y 9, T-008 y T-009):** los enemigos de la ronda salen acelerados (+25 % en la 8 y +35 % en la 9) y en mayor número: un 50 % más de cada tipo que en T-008. Solo cambia lo que avanzan: muerden y escupen igual. Se ve a Creeper a la derecha preparándose, también en la preparación de la 10.
- **Combate final (ronda 10, T-008):** sale Creeper con su escolta (ver "Jefe: Creeper").
- Lo bloqueado no se ve ni responde: la carta no está en la bandeja, la planta no abre su panel o no se arrastra. Una carta de fuego en las rondas 3 y 4 sobre una disparadora avisa de en qué ronda se podrá infundir.
- Tras la ronda 10, es decir, al derrotar a Creeper, la partida está ganada. Perder en cualquier ronda, también contra Creeper, obliga a empezar desde la 1: la partida guardada se borra (T-011, I-04).

### Enemigos (T-007)
- **Gusano acorazado (desde la ronda 3, T-009):** muerde como el gusano, con cuatro veces su vida y más lento.
- **Gusano escupidor (desde la ronda 4, T-009):**
  - Se para a 2,6 casillas de lo primero sembrado que tiene delante en su carril (planta o mina) y le escupe cada cierto tiempo. Nunca se para antes de pisar el césped, así que las plantas siempre le pueden dar.
  - El escupitajo vuela por el carril y quita vida a lo primero sembrado que encuentra. Si su objetivo ya no está, sigue hasta lo siguiente o sale del tablero.
  - Se para fuera del radio de detección de una mina, así que la puede reventar sin que llegue a armarse. Una mina destruida así no explota.
  - Al destruir su objetivo vuelve a avanzar hasta tener otro a tiro.
  - Ralentizado, escupe más despacio en la misma proporción en que avanza más despacio.
- Los valores están como PROVISIONAL en `ENEMIES` de `balance.ts`.

### Nivel de los enemigos (T-009)
Decidido el 20 nov 2026 (P-04 y P-05).
- Cada enemigo sale con un nivel. Cada nivel más suma un 15 % a su vida y a su daño (mordisco o escupitajo) de nivel 1: un 5 % más que lo que suma al daño cada nivel de una disparadora. La velocidad no cambia. Por el nivel, un nivel 10 tiene 2,35 veces la vida y el daño del nivel 1 (encima va la fuerza de T-010, abajo).
- El nivel sale al azar con los pesos de su ronda:
  - Rondas 1 y 2: siempre nivel 1.
  - Rondas 3 y 4: del 1 al 4, más probable cuanto más bajo (40, 30, 20 y 10 %).
  - Rondas 5 a 7: del 1 al 7, con el pico en el 4 (24 %); menos el 1 (8 %) y aún menos el 7 (6 %).
  - Rondas 8 a 10: del 3 al 10, con el pico en el 7 (22 %); menos el 3 (6 %) y aún menos el 10 (4 %).
- No cuentan para estas tablas Creeper (no tiene nivel), sus copias (nivel 10) ni su escolta (nivel 10 desde T-010).
- Lo que da cada enemigo no cambia con el nivel.
- Desde el nivel 2 llevan en la nuca la misma medallita que las disparadoras y son un poco más grandes.
- **Aura (T-030, Z-01 a Z-04, 21 nov 2026):** desde el nivel 5, donde empieza su salto de fuerza, llevan un aura muy suave del color de su medallita que sube del suelo por detrás: plata del 5 al 9, oro del 10 al 14, rubí del 15 al 19 y cristal en el 20. También las copias de Creeper; Creeper no. Sale en el tablero, la portada y la foto de la ficha. En gráficos Bajo no se ve, y en Medio va sin motas.
- Los valores están como PROVISIONAL en `ENEMY_LEVELS` de `balance.ts`; cada ronda dice su tabla en `levels` de su guion en `OUTBREAKS`.

### Fuerza de los enemigos (T-010)
Decidida el 20 nov 2026 (A-07) y bajada ese mismo día (de 15, 25 y 40 % a 10, 20 y 40 %). Vale para todos los enemigos, también Creeper y los que vengan en otros brotes.
- **Todos:** un 10 % más de vida y de daño (mordisco, escupitajo y el golpe de Creeper al aterrizar). La velocidad no cambia.
- **Por tramo de nivel**, encima de lo que ya suma el nivel: del 5 al 9, un 20 % más; desde el 10, un 40 % más (en vez del 20: no se acumulan). Son los niveles en los que la medallita cambia de color (plata y oro).
- Se multiplica todo: vida o daño = base de su tipo × nivel × tramo × 1,10. Un nivel 5 tiene 1,6 × 1,20 × 1,10 = 2,11 veces la base; un nivel 10, 2,35 × 1,40 × 1,10 = 3,62. Ningún nivel es más débil que el anterior.

  | Nivel | 1 | 4 | 5 | 7 | 9 | 10 |
  |---|---|---|---|---|---|---|
  | Vida de un gusano (antes de T-010) | 100 | 145 | 160 | 190 | 220 | 235 |
  | Vida de un gusano (T-010) | 110 | 160 | 211 | 251 | 290 | 362 |

- Los valores están como PROVISIONAL en `ENEMY_POWER` de `balance.ts`.

### Jefe: Creeper (T-008)
Decisiones J-01 a J-05 cerradas el 20 nov 2026.
- Muerde como el gusano, con mucha más vida. Es más grande: le dan antes y se para más lejos a morder.
- **No tiene nivel (T-009, P-07):** muerde 117,5 (lo que mordía en T-009 un gusano de nivel 10). De la fuerza de T-010 solo le toca el 10 % de todos (A-08): 4400 de vida, mordisco de 129,25 y golpe al aterrizar de 165.
- **Escolta (T-009, P-10):** al empezar el ataque de la ronda 10, Creeper grita "¡ADELANTE, MIS ACORAZADOS!" y sale un acorazado de nivel 10 (T-010, A-10) por cada carril, acelerado a su paso. Él sale 3,5 s después por el carril del centro, detrás de ellos.
- **Salto de carril:** cada vez que su vida baja de un umbral (80 % y 60 % en la fase 1; 50, 40, 30, 20 y 10 % en la fase 2) salta a un carril al azar que no es el suyo.
  - **Aviso (J-01):** primero se agacha en su carril durante 1 s (0,6 s en la fase 2) con el destino marcado. Mientras avisa no avanza ni muerde, pero le siguen dando.
  - **Vuelo:** luego vuela al carril de destino, a la misma altura del césped. En el aire no le dan las balas ni las minas y las plantas no le apuntan; no avanza ni muerde.
  - El aviso y el vuelo duran lo mismo aunque esté ralentizado. La quemadura y la ralentización se conservan al saltar.
  - Las balas que iban por su carril viejo siguen y dan a lo siguiente que encuentren.
  - Un golpe que cruza dos umbrales da un solo salto, y los umbrales que cruza mientras salta se gastan: no encadena saltos.
- **Copias (J-03):** al despegar deja en el carril que abandona, donde estaba, un gusano acelerado (+35 %); en la fase 2, dos, uno detrás del otro.
  - **T-009 (P-08):** sus copias son siempre de nivel 10. En la fase 2 cada una de las dos sale al azar: 50 % gusano, 25 % acorazado y 25 % escupidor. Todas van aceleradas igual.
- **Aterrizaje (J-05):** golpea a lo primero sembrado que tiene delante en su carril nuevo, contando lo que queda bajo su cuerpo, con la fuerza de todos (`slamDamage`, T-010). Una mina rota así no explota.
- **Fases (J-04):** la fase 2 empieza con la mitad de la vida o menos: salta más a menudo, avisa menos y deja dos copias.
- **Si cruza el borde izquierdo** se pierde la partida, queden las vidas que queden.
- **Al derrotarlo** sus copias (y cualquier otro enemigo) caen con él: la ronda 10 queda despejada y la partida, ganada.
- Los valores están como PROVISIONAL en `ENEMIES.creeper` y `CREEPER` de `balance.ts`.

### Infundir
- Desde la ronda 5 (T-009).
- Solo sobre una disparadora ya sembrada y sin elemento.
- Una planta tiene como máximo un elemento. No hay fuego y hielo a la vez.
- Infundir una planta de N cañones cuesta N elementos.
- **Interfaz (D-04, cerrada el 19 nov 2026 con la recomendación):** un solo arrastre. Al pasar la carta de elemento sobre una disparadora, su precio cambia a "×3 = 225". Si no alcanza la moneda, se pone en rojo y no deja soltar. Vale igual con clic en la carta y clic en la planta.
- Infundir no cambia la vida, el nivel ni la recarga de la planta.
- **Con una mina sembrada (T-009, P-12):** una mina que aún espera (no cuenta) se puede arrastrar sobre una disparadora sin elemento para infundirla con su elemento. La mina deja su casilla y cuenta como un elemento: en una de N cañones se pagan los N − 1 que faltan ("Infundir: mina + ×2 = 150"); en una de un cañón es gratis. Si la mina se arma mientras se arrastra, vuelve a su casilla.

### Fuego (T-004)
- **Mina (fuego sembrado solo):** ocupa su casilla y tiene vida propia; los gusanos se paran a morderla como a una planta.
  - Cuando un enemigo entra en su radio de detección, cuenta 2 s y explota. El conteo sigue aunque el enemigo salga del radio o muera.
  - Al explotar daña a todos los enemigos dentro del radio de explosión, también en los carriles de al lado, y deja la casilla libre.
  - Si la destruyen antes de terminar el conteo, no explota.
  - Cada mina lleva su propio conteo.
  - Los radios se miden en casillas, del centro de la mina al centro del enemigo.
- **Disparadora de fuego (infundida):** cada semilla hace su daño de impacto y deja una quemadura que quita vida durante un tiempo.
  - La quemadura no se acumula: se queda la más fuerte y un nuevo impacto reinicia su duración.
  - Cada semilla lleva la quemadura con la fuerza del disparo entero (`damageMultiplier`). Así una de 3 cañones, que costó 3 fuegos, quema 3,5 veces más que una de 1. Como no se acumula, da igual que sean tres semillas: solo cuenta si la primera mata y la siguiente da a otro enemigo.
  - Un enemigo que muere quemado da su moneda como cualquier otro.
- Los valores están como PROVISIONAL en `MINE` y `FIRE` de `balance.ts`.

### Hielo (T-005)
- **Mina de hielo (hielo sembrado solo):** la misma mina que la de fuego (vida propia, radio de detección, conteo de 2 s, explosión en área y casilla libre). Al explotar no hace daño: frena a todos los enemigos del radio de explosión.
  - **Cuánto (D-06, cerrada el 19 nov 2026 con la recomendación):** un 70 % más lentos durante 4 s.
- **Disparadora de hielo (infundida):** cada semilla hace su daño de impacto y frena al enemigo que toca, menos que la mina.
  - Frena más cuantos más cañones tiene la planta (30, 40 y 50 %), porque infundir N cañones cuesta N hielos. El nivel no cambia lo que frena.
  - Dura más que la recarga de la planta, así que un enemigo al que le dispara sin parar va frenado todo el rato.
- **Un enemigo frenado** avanza y muerde más despacio, en la misma proporción.
- **No se acumula:** si llega una ralentización igual o más fuerte, se queda la nueva con la duración entera. Si llega una más débil, la que tenía sigue como estaba: una semilla no acorta ni alarga lo que frena una mina.
- Un enemigo puede ir quemado y frenado a la vez: los dos efectos conviven.
- Los valores están como PROVISIONAL en `ICE` de `balance.ts`.

### Fusionar
- Se hace arrastrando una disparadora sobre otra. La arrastrada deja su casilla y la de destino se queda con el resultado. No cuesta moneda.
- Solo entre la misma variante: normal con normal, fuego con fuego, hielo con hielo.
- Máximo 3 cañones. Combinaciones válidas: 1+1 y 2+1.
- La planta resultante queda con el nivel más bajo de las dos. Si los niveles son distintos, se avisa antes de soltar ("Quedará en nivel 7").
- Qué gana el jugador: ahorra casillas y obtiene más ataque que la suma de las partes.
- **Cuánto (D-02, cerrada el 19 nov 2026):** cada disparo de una fusionada hace 2,2 veces el daño de una de un cañón si tiene 2 cañones y 3,5 veces si tiene 3. Dispara una bala por cañón, a la vez, y ese daño se reparte entre ellas. Su vida máxima es la suma de las partes (2 y 3 veces la de una disparadora). Los valores se ajustan jugando.
- **Plantas dañadas:** la vida al fusionar es la suma de la vida actual de las dos.
- La fusionada conserva el ritmo de disparo de la planta de destino, que no se mueve de su casilla.
- No se puede deshacer una fusión ni mover una planta a una casilla vacía.

### Nivel (T-003)
- **Tope por ronda (T-009, P-01; T-010, A-05):** 5 desde la ronda 2 hasta el final del brote 1 (hasta T-010 subía a 10 en la 7). En el tope, el panel dice "Máximo" y, si el tope fuera a subir en otra ronda, en cuál ("Tope 5: sube en la ronda 7"). El tope absoluto del juego es 20 (`LIMITS.maxLevel`), por encima del de cualquier ronda del brote 1. El brote siguiente empieza con el último tope del anterior hasta que una de sus rondas ponga otro (T-018, B-01).
- **Por partida (D-03, cerrada el 19 nov 2026 con la recomendación):** los niveles se pierden al acabar la partida. Lo que sí se guarda es la partida en curso, para seguirla otro día (T-011, ver "Menú de inicio y partida guardada"). De una partida a otra solo pasa el progreso permanente (T-017): hoy, los jefes vencidos.
- Se sube seleccionando la disparadora con un clic (sin arrastrarla) y pulsando "Subir" en su panel. Se cobra en el acto.
- **Cuánto mejora:** cada nivel suma un 10 % de daño y un 3 % de cadencia sobre los de nivel 1 (decidido el 19 nov 2026). El daño es el del disparo entero: en una fusionada se multiplica con el de los cañones, y la quemadura de una de fuego crece igual.
- **Premio en los niveles 5, 10, 15 y 20 (T-027, decidido el 21 nov 2026):** llegar a ellos suma más que un nivel normal, y lo ganado se queda. Al 5 y al 15, un 50 % más que un nivel normal (+15 % de daño y +4,5 % de cadencia); al 10 y al 20, el doble (+20 % y +6 %). Son los niveles en los que la medallita cambia de color, y a sus pies le brota un jardincito que crece con cada premio.

  | Nivel | 2 | 4 | 5 | 6 | 9 | 10 | 15 | 20 |
  |---|---|---|---|---|---|---|---|---|
  | Daño sobre el nivel 1 (antes) | +10 % | +30 % | +40 % | +50 % | +80 % | +90 % | +140 % | +190 % |
  | Daño sobre el nivel 1 (con premio) | +10 % | +30 % | +45 % | +55 % | +85 % | +105 % | +160 % | +220 % |
  | Cadencia sobre el nivel 1 (con premio) | +3 % | +9 % | +13,5 % | +16,5 % | +25,5 % | +31,5 % | +48 % | +66 % |

  El panel de nivel avisa en dorado cuando el siguiente nivel da premio ("¡Premio en el nivel 5!") y subir a él suena distinto. En el brote 1 el tope es 5, así que solo se llega al primer premio.
  - Lo que frena una de hielo no cambia con el nivel: depende de sus cañones.
  - Subir no cura ni recarga: la planta conserva su vida y su recarga.
- **Cuánto cuesta (D-05, cerrada el 19 nov 2026):** creciente. De nivel 1 a 2 cuesta 75 y cada nivel siguiente 25 más (75, 100, 125… hasta 525 de 19 a 20). Se paga por cañón, como al infundir: una de 3 cañones paga el triple, y el panel lo muestra como "×3 = 225".
- No se puede subir sin saldo suficiente ni pasar del tope de la ronda; en el tope el botón dice "Máximo".
- **Medallita:** sin cambio visual grande en la planta, solo una medallita con el número en la nuca. Cambia de color cada 5 niveles: bronce, plata (desde el 5), oro (10), rubí (15) y cristal irisado en el 20. Las de nivel 1 no llevan. Se ve también en las fusionadas y no tapa los puntos del tallo.
- Al fusionar, la planta se queda con el nivel más bajo de las dos (ver "Fusionar").
- Los valores están como PROVISIONAL en `LEVELING` de `balance.ts` (el premio, en `LEVELING.milestones`).

### Ficha de información (T-010)
- Doble clic (o doble toque) sobre una disparadora, una mina o un enemigo, sin carta elegida: el juego queda en pausa y sale su ficha. Se cierra con su botón, con Esc o haciendo clic fuera, y el juego sigue.
- A la izquierda, su foto (la misma figura del tablero). A la derecha:
  - **Disparadora:** variante y cañones, nivel con el tope de la ronda (si ya se puede subir de nivel), vida, daño por disparo (y por semilla si es fusionada), cadencia, daño por segundo, quemadura o lo que frena, y alcance.
  - **Mina:** elemento, vida, a qué distancia detecta, cuándo explota y hasta dónde, daño o lo que frena, y si espera o cuánto le falta para explotar.
  - **Enemigo:** tipo, nivel con su tramo de fuerza, vida, mordisco o escupitajo (y cada cuánto), velocidad (y cuánto tarda en cruzar el jardín), lo que da al caer y cómo está: quemado, frenado, acelerado, mordiendo o escupiendo. Creeper, además, su golpe, su próximo salto y su fase.
- El primer clic hace lo de siempre: sobre una disparadora la selecciona, así que al cerrar la ficha su panel de nivel sigue ahí. Con una carta elegida, el clic la juega y no abre fichas.
- La ficha enseña los números de las reglas: no hay números propios.

### Menú de inicio y partida guardada (T-011)
Decisiones I-01 a I-12 cerradas el 20 nov 2026.
- **Al abrir el juego sale el menú de inicio:** el título "Rebrote" con su lema arriba a la izquierda, debajo una portada en movimiento (Creeper, gusanos y plantas en plena batalla, sin desplazarse) y a la derecha el menú. Sin haber vencido a Creeper: nueva partida, continuar, opciones y créditos. Con Creeper vencido: continuar (lleva al Invernadero, T-019), opciones y créditos. "Jefes" ya no está: lo sustituye la ruta de brotes. Encima de todo, quién juega y el botón para cambiar de jugador (T-034).
- **Portada:** la batalla responde al clic (la planta dispara, el gusano se queja, Creeper habla y la mina explota y vuelve a brotar). Es solo aspecto: no cuenta para nada.
- **Nueva partida** empieza en la preparación de la ronda 1. Si hay una partida guardada, antes pide confirmar que se borrará, y dice que el progreso permanente se conserva (T-017).
- **Partida guardada:** una por jugador (T-034). Se guarda sola, sin botón:
  - al empezar la partida y al empezar cada ronda (con su aviso de lo desbloqueado, si aún no se aceptó);
  - en el momento exacto al salir al menú ("Salir al menú" en la pausa) y al ocultar o cerrar la pestaña.
- **Continuar** (antes "Cargar partida"; desde T-019, "Reanudar" en el Invernadero) la sigue donde estaba: ronda y fase, saldo, vidas, plantas, minas, enemigos, balas y escupitajos, y el aviso sin aceptar. El botón dice la ronda, las vidas, las monedas y cuándo se guardó; sin partida guardada está desactivado. Las monedas soltadas en el suelo no se guardan.
- **Al perder o al ganar la partida guardada se borra** (I-04): perder sigue obligando a empezar desde la ronda 1, también si se cierra la pestaña antes de perder (se guardó el momento exacto). La derrota ofrece "Jugar otra vez" y "Menú principal"; la victoria, "Al Invernadero" y "Jugar otra vez" (T-019).
- **Opciones:** idioma, pantalla completa, calidad gráfica, tours de ayuda (T-013) y FPS, las mismas en el menú de inicio ("Opciones") y en la pausa ("Ajustes"). Son del aparato, no del jugador (T-034, PF-03): cambiar de jugador no las toca. "Borrar progreso" (T-017) ya no está en Opciones: lo sustituye "Borrar jugador" (T-034).
- **Idiomas:** español e inglés en todo el juego. Por defecto, el del navegador si es uno de los dos; si no, inglés. Cambiarlo recarga el escenario y la partida sigue. "Rebrote" no se traduce.
- **Créditos:** autor (Carmine Maggio), desarrollo (Claude, con su logo), estética inspirada en Plants vs. Zombies, arte hecho con código, enemigos basados en virus reales y tecnología, con el aviso de marca de Plants vs. Zombies.
- Una partida guardada con otra versión del juego, o en una ronda que ya no existe en su brote, no se carga (tampoco las de antes de los brotes, T-018).

### Invernadero y ruta de brotes (T-019)
Decisiones R-01 a R-04 cerradas el 21 nov 2026 con la recomendación. Cómo se hace: ADR-0016.
- **El Invernadero** es el sitio entre un brote y el siguiente. Aparece al vencer a Creeper (R-01): un jugador nuevo va directo a jugar y nunca ve un Invernadero vacío. Se llega desde "Continuar" en la portada (R-02) y desde la victoria.
- **Se ve distinto de la portada:** el título grande dice "INVERNADERO" y, en vez de la batalla, el jardín tiene solo las plantas que el jugador ya tiene, sin enemigos, sembradas a mano sobre un césped liso: sin casillas y sin el suelo corrupto con los agujeros por donde salen los enemigos. "Ya tiene" es lo desbloqueado hasta el último brote vencido (con los de antes); lo de una partida a medias no cuenta.
- **Tiene:** reanudar la partida a medias (con su brote, su ronda y cuándo se guardó), el siguiente brote (el primero abierto sin vencer; si no hay más brotes en el juego, con candado y "Próximamente"), la ruta de brotes, la tienda (T-022) y las plantas (T-023) con candado y "Próximamente", y volver a la portada.
- **Empezar un brote con una partida a medias** pide confirmación y dice cuál se pierde. El progreso se conserva.
- **La ruta** es un camino con un lugar por brote (R-03): los vencidos, superados, con un sello; el que toca, destacado con una flecha; el siguiente en sombra, con su jefe en silueta y un candado; y el destino final, pequeño y a lo lejos. Si el siguiente brote aún no existe, su lugar dice "Próximamente". El suelo está sano hasta donde llegó el jugador y corrupto después.
- **Tocar un lugar** vencido o el que toca enseña abajo su nombre, su jefe, sus rondas y el botón para jugarlo ("Jugar" o "Volver a jugar"); si la partida a medias es de ese brote, "Reanudar" y "Empezar de cero". Los lugares en sombra no se pueden elegir.
- **Teclado:** Tab o las flechas recorren los lugares, Enter elige y Esc vuelve (de la confirmación a la ficha, de la ruta al Invernadero y del Invernadero a la portada).

### Progreso permanente (T-017)
Decisiones K-01 y K-02 cerradas el 21 nov 2026 con la recomendación. Cómo se hace: ADR-0014.
- **Qué es:** lo que el jugador no pierde al acabar una partida. Es de cada jugador (T-034). Hoy, los jefes vencidos; después, las semillas (T-020), las compras (T-022) y las mejoras (T-023).
- **Jefe vencido:** al vencer al jefe de un brote queda apuntado para siempre. Volver a vencerlo no cambia nada.
- **No se pierde** al ganar, al perder ni al empezar una partida nueva. Mientras el juego esté en desarrollo, un progreso guardado con otra versión de su forma se descarta, sin convertirlo (ADR-0014).
- **Se borra con el jugador:** "Borrar jugador" en la pantalla de jugadores (T-034). Hasta T-034 era "Borrar progreso", en Opciones.
- **Si algo falla:** un progreso que no se entiende cuenta como vacío, sin error, y no toca la partida guardada. En una ventana privada o con el almacenamiento lleno, el progreso dura lo que dure la sesión. Con dos pestañas abiertas, cada una escribe en su jugador.
- **Antes de T-017 (K-01):** quien venció a Creeper antes no lo tiene vencido, porque no quedó constancia: tiene que vencerlo otra vez.
- **Exportar e importar (K-02):** no por ahora; se apunta como mejora si el juego crece.

### Jugadores (T-034)
Decisiones PF-01 a PF-07 cerradas el 21 nov 2026 con la recomendación. Cómo se hace: ADR-0018.
- **Varios jugadores en el mismo aparato**, como mucho 3 (PF-01). Cada uno tiene su progreso permanente, su partida a medias y sus tours vistos (PF-02). Los ajustes (calidad, volumen, idioma y ayuda) son del aparato y no cambian al cambiar de jugador (PF-03).
- **Al abrir el juego** no sale ninguna pantalla nueva: con un solo jugador no molesta nunca (PF-04). Un navegador sin datos crea el primero solo. El jugador activo se recuerda al recargar.
- **La portada dice quién juega**, arriba del menú, con su avatar (un brote en un círculo de su color) y el botón "Cambiar". Solo se cambia de jugador desde la portada, nunca en mitad de una partida.
- **La pantalla de jugadores**, en el panel de la portada, lista a cada uno con su avatar, su nombre, sus jefes vencidos y la última vez que jugó ("Aún sin estrenar" si nunca guardó nada); el activo, con borde dorado y "Jugando". Elegir uno lo deja activo y vuelve al menú: cambian la partida, el progreso, el Invernadero, la ruta y los tours vistos.
- **Nuevo jugador** empieza desde cero (sin progreso, sin partida y con los tours sin ver) y queda activo. Con 3 jugadores el botón se apaga y dice "Máximo de jugadores".
- **Nombre (PF-05):** mientras no elija uno (T-033), "Jugador 1", "Jugador 2"... (el menor número libre), en el idioma del juego. Los nombres se pueden repetir (PF-07).
- **Borrar jugador (PF-06):** la papelera de cada fila pide confirmar y dice qué se pierde para siempre (jefes vencidos, partida guardada y tours vistos) o que no tiene nada guardado; los demás jugadores y los ajustes no cambian. Si era el activo, pasa a serlo el que jugó por última vez; si era el último, queda uno nuevo y vacío. El único jugador, sin nada guardado, no se puede borrar: no cambiaría nada.
- **Lo guardado antes de T-034** (progreso, partida a medias y tours vistos) se descarta y se borra del navegador, sin convertirlo: se empieza como "Jugador 1". Los ajustes se conservan.
- **Para el futuro:** cada jugador tiene un identificador que no cambia aunque cambie su nombre y la fecha de su último guardado. No son cuentas: no se sincronizan ni se protegen.
- **Teclado:** Tab recorre la lista, Enter elige y Esc vuelve (de la confirmación a la lista y de la lista al menú, con el foco en "Cambiar").

### Tours de ayuda (T-013)
Decisiones G-01 a G-10 cerradas el 20 nov 2026. Cómo se hace: ADR-0012.
- **Cada cosa nueva se enseña la primera vez:** al empezar la preparación de la ronda que la desbloquea, tras aceptar "¡YA LO TIENES!", sale su tour. En la ronda 1, lo básico: sembrar, el carril, monedas, vidas, la ficha y "¡Que vengan!". En la 2, subir de nivel; en la 3 y la 4, las minas; en la 5, infundir (con la carta o con una mina); en la 6, fusionar.
- **Mira y prueba:** se oscurece todo menos lo importante y una mano hace el gesto sobre el tablero de verdad. Si el jugador lo hace, el paso se celebra ("¡Bien!") y pasa al siguiente; si no, "Siguiente". "Saltar" cierra el tour. Si no hay lo que señalar (sin planta, sin dos iguales para fusionar...), el paso sale solo con su dibujo.
- **La cuenta atrás de la preparación no corre mientras dura el tour.** "¡Que vengan!" sigue funcionando y lo cierra.
- **Un tour visto no vuelve a salir** en este navegador, tampoco en una partida nueva. Cuenta como visto al acabarlo, al saltarlo o si empieza el ataque a medias.
- **Pista de la moneda:** la primera moneda que cae al suelo lleva una mano que la toca y "¡Tócala! Vale más", sin parar el juego. Deja de salir al recoger una así, o tras salir tres veces.
- **Ayuda:** opción en Opciones y en Ajustes, encendida por defecto. Apagada, no sale ningún tour ni la pista. Apagarla a mitad de un tour lo cierra sin darlo por visto.
- **Una mecánica nueva llega con su tour** (regla 9 de `CLAUDE.md`).

## Decisiones pendientes

| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| D-07 | ¿Cómo se pierde? | a) Un enemigo cruza y pierdes. b) Vidas | b con 3 vidas: perdona un error mientras se aprende | Carmine |
| D-08 | Nombre del juego | "Rebrote" es de trabajo | Decidir antes de publicarlo | Carmine |

Los valores recomendados ya están como PROVISIONAL en `src/game/config/balance.ts`.

## Reglas ya implementadas

Las reglas de fusionar e infundir y el multiplicador de daño están en `src/game/core/plants.ts`, con tests en `plants.test.ts`. Fusionar dos plantas del tablero (destinos válidos, vida resultante, quién deja la casilla) está en `src/game/core/match.ts` (`fusionBlocker`, `fusionTargets`, `fusePlants`). El reparto del daño entre las balas de una fusionada, en `combat.ts` (`bulletDamage`). Los valores de D-02 están en `FUSION` de `balance.ts`.

Subir de nivel (T-003): el costo, la subida y lo que suma cada nivel están en `plants.ts` (`levelUpCost`, `levelUp`, `levelBonus`; desde T-027, con el premio de los niveles 5, 10, 15 y 20: `isMilestoneLevel`, `levelStepBonus`, `milestonesReached`), y lo que ofrece el panel de una planta del tablero y la subida con su cobro, en `match.ts` (`levelUpOffer`, `levelUpPlant`). Los valores de D-05 están en `LEVELING` de `balance.ts`.

Saldo, siembra, infusión y ocupación de casillas están en `src/game/core/match.ts`: qué pasa al soltar una carta en una casilla lo dice `cardPlay` y lo aplica `playCard`. Una casilla puede tener una disparadora o una mina (`Sown`); la recompensa por enemigo y la moneda soltada, en `src/game/core/economy.ts`. Los valores están en `ECONOMY` de `balance.ts`.

El combate (disparo, balas, mordisco, escupitajos, minas, quemadura, ralentización, vidas y derrota) está en `src/game/core/combat.ts`. Los valores están en `LIVES`, `SHOOTER`, `ENEMIES`, `MINE`, `FIRE` e `ICE` de `balance.ts`. Cómo funciona la simulación: ADR-0008.

El Creeper (T-008) también está en `combat.ts`: el salto (`Enemy.jump`, `startJump`, `stepJump`), las copias, el golpe al aterrizar, las fases (`isEnraged`, `jumpsCrossed`), quién está en el aire (`isAirborne`) y la victoria al derrotarlo, con tests en `creeper.test.ts`. Los enemigos acelerados llevan `Enemy.haste`. Sus valores están en `ENEMIES.creeper` y `CREEPER` de `balance.ts`.

Las rondas (T-007), en `src/game/core/rounds.ts`: preparación y ataque (`stepRound`, `startAttack`), fin de ronda y victoria, y qué desbloquea cada una (`unlockedAt`, `isUnlocked`, `availableCards`). Desde T-008, lo que acelera cada ronda (`roundHaste`), cuál es la del jefe (`isBossRound`, `bossRoundIndex`) y cuándo se ve a Creeper prepararse (`isBossPreparing`). `cardPlay`, `fusionBlocker` y `levelUpOffer` responden `locked` a lo que aún no toca. El guion y la preparación están en `OUTBREAKS` y `ROUND_PREP` de `balance.ts`.

T-010: la fuerza de los enemigos está en `combat.ts` (`enemyTierBonus`, `enemyPower`, y la usan `enemyMaxHp`, `enemyDamage` y `slamDamage`), con sus valores en `ENEMY_POWER` de `balance.ts`. El goteo, en `economy.ts` (`stepIncome`, con su reloj en `MatchState.incomeMs`). La ronda que no avisa lleva `quiet` en su guion y `roundUnlocks` la respeta. La ficha de información no es una regla: sus textos y números salen de las reglas en `src/game/view/entityInfo.ts`.

T-011: la partida guardada (formato con versión, comprobación al cargar, guardar, leer y borrar) está en `src/game/save.ts`, con tests en `save.test.ts`; la escena guarda (`saveGame`) y borra al perder o ganar. Los textos de las reglas que se enseñan al jugador ya no están en `balance.ts`: el aviso de cada ronda está en `round.notices` y el grito de Creeper es una clave (`RoundGroup.shout`, `CreeperShout`) con su texto en `creeper.shouts`, en `src/i18n/` (ADR-0009).

T-017: el progreso permanente (forma con versión, comprobación al leer y jefe vencido) está en `src/game/progress.ts` (`recordDefeat`, `isOutbreakDefeated`, `hasProgress`, `decodeProgress`, `ProgressKeeper`), con tests en `progress.test.ts` (desde T-034, sin migraciones y por jugador); el nombre del brote, en el `id` de cada brote de `OUTBREAKS` (desde T-018; antes, `OUTBREAK_ID` de `rounds.ts`). La escena lo apunta al ganar (`enterVictory`), antes de borrar la partida guardada.

T-018: los brotes están en `src/game/core/outbreaks.ts` (`OutbreakId`, `OutbreakScript`, `FIRST_OUTBREAK`, `outbreakScript`, `outbreakNumber`, `roundCount`, `outbreaksBefore`, `outbreakOfBoss` e `isOutbreakOpen`, B-04), con tests en `outbreaks.test.ts` sobre dos brotes de prueba. La partida sabe su brote (`MatchState.outbreak`) y todas las reglas de `rounds.ts` lo reciben: lo desbloqueado y el tope de nivel suman los brotes anteriores (`unlockedAt`, `levelCapAt`; B-01) y lo nuevo de cada ronda es solo lo que no llegó ya desbloqueado (`newFeaturesAt`, que usan `roundUnlocks` y los tours). `createMatch` empieza con el saldo inicial del brote (B-02). La partida guardada va por la versión 2; las anteriores se ignoran. El nombre "Brote N: jefe" lo compone `src/ui/outbreakName.ts` con `outbreak.title` de `src/i18n/`; los avisos de ronda están por brote en `round.notices`.

T-013: los tours de ayuda no son reglas. Qué señalar en el tablero lo elige `src/game/view/tourSpots.ts` (`tourCells`, con test) con las reglas de core; los tours, sus pasos y los vistos están en `src/ui/tour/` (`tours.ts`, `tourProgress.ts`, con test). La escena para la preparación con `tourHold` (en `advance`) y avisa de lo que hace el jugador con `playerAction`.

T-009: el nivel de los enemigos está en `combat.ts` (`Enemy.level`, `enemyLevelFactor`, `enemyMaxHp`, `enemyDamage`, `rollEnemyLevel`) y las copias del Creeper, en `rollCopyKind`; `enemyKilled` lleva el tipo para pagar lo suyo (`ENEMIES[kind].reward`). En `rounds.ts`, el tope de nivel (`levelCapAt`, `levelCap`, `levelCapRaisedAfter`), lo nuevo de cada ronda para el aviso (`roundUnlocks`), los grupos con nivel y paso propios (`RoundGroup.level`, `haste`) y el grito (`shout`, evento `shout`). Infundir con una mina, en `match.ts` (`mineDragBlocker`, `mineInfusion`, `mineInfusionTargets`, `infuseWithMine`), y el tope en `levelUpOffer` (`cap`, `capRaisedAt`). Los valores están en `ENEMY_LEVELS`, `CREEPER`, `ENEMIES` y `OUTBREAKS` de `balance.ts`.

T-034: los jugadores están en `src/game/profiles.ts` (reglas `addProfile`, `selectProfile`, `removeProfile`, `touchProfile`, `freeNumber` y `decodeProfiles`; `ProfileKeeper` y su instancia `profiles`, con el almacén de cada jugador en `store()` y `storeOf()`), con tests en `profiles.test.ts`; el almacén que nunca falla (`SessionStore`), en `src/game/storage.ts`. `save.ts`, `progress.ts` y `tourProgress.ts` escriben por defecto en el almacén del jugador activo. Lo que la pantalla de jugadores cuenta de cada uno (nombre, lo que se pierde al borrarlo) está en `src/ui/playerCards.ts`, con tests en `playerCards.test.ts`.
