# Mecánicas

## Vocabulario

| Término | Significa |
|---|---|
| Sembrar | Colocar una planta o un elemento en una casilla vacía |
| Infundir | Soltar un elemento sobre una disparadora ya sembrada |
| Fusionar | Arrastrar una disparadora sobre otra de la misma variante para sumar cañones |
| Nivel | Mejora individual de una disparadora (daño y cadencia) |
| Variante | Normal, de fuego, de hielo o con escudo (T-024) |
| Muro | El escudo sembrado solo (T-024) |

No se usa la palabra "combinar": se confundía con fusionar.

## Piezas del brote 1

| Pieza | Sembrada sola | Infundida en una disparadora |
|---|---|---|
| Disparadora | Dispara en su carril | No aplica |
| Fuego | Mina: al detectar un enemigo cerca cuenta 2 s, explota en área y desaparece | Las balas aplican daño progresivo |
| Hielo | Igual que la mina de fuego, pero ralentiza en área con efecto fuerte, y desaparece | Las balas ralentizan |

El elemento solo siempre tiene un efecto mayor que su versión infundida, a cambio de gastarse.

## Pieza del brote 2 (T-024)

| Pieza | Sembrada sola | Infundida en una disparadora |
|---|---|---|
| Escudo | Muro: aguanta mucho, no dispara ni explota y para lo que va hacia lo de detrás | Disparadora con escudo: dispara igual que una normal, con el doble de vida, y también para lo que va hacia las de detrás |

El escudo no se gasta al sembrarlo solo: es la defensa pura. Ver "Escudo (T-024)".

## Reglas confirmadas

### Moneda
- Hay una sola moneda. Sembrar, infundir y subir de nivel compiten por ella.
- Se gana por enemigo eliminado y por goteo pasivo. No hay planta generadora en el brote 1 (D-01, cerrada el 19 nov 2026).
- **El goteo solo corre durante el ataque (T-010, A-02):** 25 por cada 10 s de ataque. En la preparación no se gana moneda esperando: su reloj se para y en el siguiente ataque sigue donde iba.
- **Cuánto da cada enemigo (T-009, P-03):** gusano 15, escupidor 20 y acorazado 25, sea cual sea su nivel. Creeper no da moneda: al caer se gana la partida. Las tropas del brote 2 (T-025) dan lo mismo que su pareja del brote 1 (Copycat 15, Copycat escupidor 20 y Copycat acorazado 25), el Minstrel 25 y la copia de un Copycat 5.
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
- **Lo aprendido se queda (B-01):** al empezar un brote, todo lo que desbloquearon los anteriores llega desbloqueado desde la ronda 1, con el último tope de nivel que pusieron. Sus rondas solo desbloquean lo nuevo: lo ya sabido no saca "¡YA LO TIENES!" ni su tour. Al revés no: rejugar un brote no trae lo de los siguientes (el escudo no existe en el brote 1).
- **Brote en preparación (T-024):** un brote cuyo jefe aún no está en el juego tiene sus rondas, pero no se puede jugar: la ruta lo da por "Próximamente" y el Invernadero no lo ofrece. Es el brote 2 hasta T-026, con un guion provisional de 3 rondas con sus tropas (T-025): Copycat desde la ronda 1, el escudo en la 2 y el Minstrel en la 3. En desarrollo se juega con `?brote=2` en la dirección.
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
  - **Quién lo presenta (T-032, VT-02 y VT-03):** arriba del aviso sale un personaje con su retrato y una frase, dicha letra a letra con su voz. Lo del brote 1 lo da Boxer ("Toma, esto te va a hacer falta"); lo nuevo de los brotes siguientes, plantas y piezas, lo crea Patty ("¡He creado algo nuevo!"), y luego Boxer enseña a usarlo en el tour. Un aviso que solo sube el tope de nivel lo cuenta Boxer. Es un dato del guion: cada brote puede decir quién presenta lo suyo, y cada ronda, otro. Las frases de cada uno rotan por orden: su primer aviso del brote dice la primera.
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

### Tropas del brote 2 (T-025)
Decisiones F-01 a F-06 cerradas el 22 nov 2026 con la recomendación. Los valores están como PROVISIONAL en `ENEMIES`, `CLONE` y `VERSE` de `balance.ts`.
- **Copycat (F-01):** el brote 2 tiene su tropa normal, la que dispara y la acorazada: el Copycat, el Copycat escupidor y el Copycat acorazado. Hacen lo mismo y con los mismos números que su pareja del brote 1, pero se ven distintos (aguamarina, o amarillo el escupidor, con un disquete a la espalda; el acorazado, con casco y placas de disquete) y **al caer dejan una copia**, como Elk Cloner se copiaba a cada disquete.
  - **La copia** sale donde cayó el Copycat, de su mismo tipo, nivel y paso, y ataca igual (muerde o escupe). Es más pequeña (62 %): su hocico va más atrás, así que le dan un poco más tarde, y muerde desde más cerca, con la boca donde la pondría su tipo. Tiene el 30 % de la vida y el 50 % del daño de su tipo y nivel, da 5 monedas y no deja otra copia. No hereda la quemadura ni el frío. Si se cuela, resta una vida como cualquier otro.
  - Una explosión de mina que tumba a varios Copycat solo deja dos copias, las de los primeros que alcanza.
  - Si cae el jefe, caen todos y no sale ninguna copia.
- **Minstrel (F-02 a F-06):** la tropa nueva. Se para a 3,5 casillas de lo primero sembrado que tiene delante en su carril (nunca antes de pisar el césped, así que las disparadoras de su carril siempre le pueden dar) y recita.
  - **Aviso (F-04):** antes de cada verso se hincha tomando aire durante 0,9 s. El primero llega 1,8 s después de pararse y luego uno cada 3,6 s.
  - **El verso (F-02)** es una onda que nace en él y recorre el carril hacia la izquierda por encima de las plantas, a 2,5 casillas por segundo. Quita 15 (con su nivel y la fuerza de todos) a cada cosa sembrada que cruza, de delante atrás, una vez a cada una: disparadoras, minas (F-06; una mina destruida así no explota) y muros. Una planta que muere o se fusiona a su paso no la para.
  - **El escudo la para (F-05):** el primer muro o disparadora con escudo que encuentra recibe el daño y la onda se acaba ahí; lo de detrás no sufre nada (`waveReach`, T-024).
  - Sin nada sembrado delante en su carril no ataca: avanza y, si cruza el borde, resta una vida. No muerde nunca.
  - Dos Minstrel en el mismo carril sueltan cada uno su onda: cada una hace su daño por separado. Ralentizado, tarda más entre versos y en tomar aire, en la misma proporción en que avanza más despacio.

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
- Desde la ronda 5 (T-009). El escudo, desde la ronda 2 del brote 2 (T-024).
- Solo sobre una disparadora ya sembrada y sin elemento.
- Una planta tiene como máximo un elemento. No hay fuego y hielo a la vez, ni mezclas con el escudo (T-024).
- Infundir una planta de N cañones cuesta N elementos.
- **Interfaz (D-04, cerrada el 19 nov 2026 con la recomendación):** un solo arrastre. Al pasar la carta de elemento sobre una disparadora, su precio cambia a "×3 = 225". Si no alcanza la moneda, se pone en rojo y no deja soltar. Vale igual con clic en la carta y clic en la planta.
- Infundir no cambia el nivel ni la recarga de la planta. El fuego y el hielo tampoco cambian la vida; el escudo la dobla y conserva la proporción que tenía: una a media vida queda a media vida (T-024).
- **Con una mina sembrada (T-009, P-12):** una mina que aún espera (no cuenta) se puede arrastrar sobre una disparadora sin elemento para infundirla con su elemento. La mina deja su casilla y cuenta como un elemento: en una de N cañones se pagan los N − 1 que faltan ("Infundir: mina + ×2 = 150"); en una de un cañón es gratis. Si la mina se arma mientras se arrastra, vuelve a su casilla.
- **Con un muro (T-024):** igual que con una mina: el muro deja su casilla y cuenta como un escudo ("Infundir: muro + ×2 = 300"). Se puede arrastrar aunque esté mordido; la vida que le faltaba no pasa a la planta, que se infunde como con la carta.

### Escudo (T-024)
Decisiones E-01 a E-06 cerradas el 21 nov 2026 (E-01 a E-04 y E-06 con la recomendación; E-05, con los valores de Carmine). Los valores están como PROVISIONAL en `SHIELD` y `COSTS.shield` de `balance.ts`.
- **Cuándo:** se gana en la ronda 2 del brote 2 (el de Elk Cloner). El muro y la infusión llegan juntos, con un solo aviso y un tour. Lo presenta Patty ("¡He creado algo nuevo!") y lo enseña Boxer. En el brote 1 la carta no existe.
- **Precio:** 150 por escudo, al sembrar el muro o por cada cañón al infundir (E-04, como fuego y hielo).
- **Muro (escudo sembrado solo):** 1200 de vida, cuatro veces la de una disparadora (E-05). No dispara ni explota; los enemigos lo muerden hasta romperlo. Se ve su desgaste: pierde placas de corteza con dos tercios de su vida y con un tercio, y tira a gastado.
- **Disparadora con escudo (infundida):** dispara igual que una normal (mismo daño, cadencia y semilla) y tiene el doble de su vida normal, con sus cañones: 600, 1200 o 1800 (E-05). Dos con escudo se fusionan como cualquier variante igual y suman su vida (E-03).
- **Bloqueo:** el muro y la disparadora con escudo (E-02) paran lo que va por su carril hacia lo de detrás: ningún disparo enemigo ni salto pasa por encima. El disparo que paran les quita vida (E-01).
  - Hoy el escupitajo ya da a lo primero que encuentra: con el escudo no cambia, solo tarda más en romperlo.
  - Los ataques que cruzan el carril por encima de las plantas (los versos de Elk Cloner y del Minstrel, T-025 y T-026) alcanzan todo lo que no es escudo, de delante atrás, hasta el primer escudo, que lo recibe; lo de detrás no recibe nada (`waveReach`).
  - Una unidad que salta por su carril (ninguna todavía) cae delante del primer escudo que encuentre, a su alcance para morderlo (`hopLanding`).
  - **Creeper al rejugar el brote 1 (E-06, a):** si cayera sobre un escudo, lo golpearía como a cualquier planta. Hoy no puede pasar: el escudo no existe en el brote 1.
- **No hay mezclas:** una disparadora con fuego o hielo no admite escudo, y una con escudo no admite fuego ni hielo ("Ya tiene escudo").
- **Ficha:** la del muro dice que no ataca, que para lo de detrás, que se puede llevar a una disparadora y si está agrietado o a punto de romperse; la de la disparadora con escudo, que para lo de detrás.

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
- Solo entre la misma variante: normal con normal, fuego con fuego, hielo con hielo, escudo con escudo (T-024, E-03).
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
  - **Enemigo:** tipo, nivel con su tramo de fuerza, vida, mordisco o escupitajo (y cada cuánto), velocidad (y cuánto tarda en cruzar el jardín), lo que da al caer y cómo está: quemado, frenado, acelerado, mordiendo o escupiendo. Creeper, además, su golpe, su próximo salto y su fase. Desde T-025, los Copycat dicen que dejan una copia al caer; la copia, de dónde sale y lo que tiene de su Copycat; el Minstrel, su verso (cuánto, cada cuánto y desde dónde) y si está recitando o tomando aire.
  - **Jefe (T-032, VT-04):** al pie, con el retrato de Boxer, lo que fue el virus de verdad, completo.
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
- **Continuar** (antes "Cargar partida"; desde T-019, "Reanudar" en el Invernadero) la sigue donde estaba: ronda y fase, saldo, vidas, plantas, minas, enemigos (también las copias de los Copycat, T-025), balas, escupitajos y versos, y el aviso sin aceptar. El botón dice la ronda, las vidas, las monedas y cuándo se guardó; sin partida guardada está desactivado. Las monedas soltadas en el suelo no se guardan.
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
- **Patty vive en el Invernadero (T-032, VT-05):** asoma por abajo, a la izquierda del panel, sin taparlo. La mitad de las veces que se entra dice una frase corta (cinco que rotan sin repetir la anterior) y tocarla le hace decir otra. Si al entrar sale una viñeta, no saluda. Con la ruta abierta no se ve.

### Progreso permanente (T-017)
Decisiones K-01 y K-02 cerradas el 21 nov 2026 con la recomendación. Cómo se hace: ADR-0014.
- **Qué es:** lo que el jugador no pierde al acabar una partida. Es de cada jugador (T-034). Hoy, los jefes vencidos, la historia vista (T-031) y las semillas (T-020); después, las compras (T-022) y las mejoras (T-023).
- **Jefe vencido:** al vencer al jefe de un brote queda apuntado para siempre. Volver a vencerlo no cambia nada.
- **No se pierde** al ganar, al perder ni al empezar una partida nueva. Mientras el juego esté en desarrollo, un progreso guardado con otra versión de su forma se descarta, sin convertirlo (ADR-0014).
- **Se borra con el jugador:** "Borrar jugador" en la pantalla de jugadores (T-034). Hasta T-034 era "Borrar progreso", en Opciones.
- **Si algo falla:** un progreso que no se entiende cuenta como vacío, sin error, y no toca la partida guardada. En una ventana privada o con el almacenamiento lleno, el progreso dura lo que dure la sesión. Con dos pestañas abiertas, cada una escribe en su jugador.
- **Antes de T-017 (K-01):** quien venció a Creeper antes no lo tiene vencido, porque no quedó constancia: tiene que vencerlo otra vez.
- **Exportar e importar (K-02):** no por ahora; se apunta como mejora si el juego crece.

### Semillas (T-020)
Decisiones C-01 a C-05 cerradas el 21 nov 2026. Los valores están en `SEEDS` de `balance.ts` y son PROVISIONAL hasta que existan los precios de la tienda.
- **Qué son:** la segunda moneda. Se ganan en la partida y se gastan fuera de ella (la tienda, T-022, y el nivel base, T-023). Van en el progreso permanente del jugador, nunca en el saldo de la partida. Icono propio (una semilla parda con un brote verde) y color verde: la moneda de la partida es un disco dorado.
- **Ronda superada:** cada ronda superada, menos la última (la del jefe), suma a la partida entre el 75 y el 100 % de su tope, al azar: nunca dan lo mismo (C-02). El tope en el brote 1 es 50. Sale "+N semillas" bajo "¡Ronda N superada!".
- **Jefe vencido:** entre el 75 y el 100 % de su tope, 500 en el brote 1.
- **Brote ya vencido (C-03):** las rondas y el jefe dan entre el 15 y el 25 % de su tope. Vale lo que diga el progreso al empezar la partida.
- **Se cobran al acabar la partida.** Al ganar, todo, y cada vida que queda suma un 10 % de lo ganado en las rondas y el jefe (C-05): con 3 vidas, un 30 % más. Al perder solo se cobra el 25 % de lo que dieron las rondas (C-04): perder da algo, pero poco. Salir al menú no cobra nada: lo sumado va en la partida guardada y se cobra cuando acabe.
- **Cada brote da algo más:** los topes suben un 5 % de los del brote 1 por cada brote anterior (el brote 2, al 105 %; el 26, al 225 %).
- **Siempre en enteros,** redondeando hacia abajo. El saldo no pasa de 999.999.
- **Dónde se ve:** la victoria y la derrota enseñan lo cobrado en grande, de dónde sale (rondas, jefe y vidas; al perder, el 25 % de las rondas), si el brote ya estaba vencido y el saldo nuevo. El menú de pausa dice lo que lleva la partida y que al perder solo se cobra el 25 %. El Invernadero enseña el saldo arriba del panel, y la pantalla de jugadores lo cuenta entre lo que se pierde al borrar a uno.
- **Una sola vez:** lo cobrado pasa al progreso antes de borrar la partida guardada, en una sola escritura con el jefe vencido. Una partida acabada que se recrea (al cambiar la calidad o el idioma) no cobra otra vez, y recargar la página en la victoria tampoco.
- **Para qué tienda está pensado:** artículos normales de 1000 a 2000 semillas y el más caro de unos 10.000. Así queda con el azar:

| Partida (brote 1) | Semillas |
|---|---|
| Vencerlo por primera vez sin perder vidas | De 920 a 1235 (unas 1080) |
| Vencerlo por primera vez con 1 vida | De 778 a 1045 |
| Perder en la ronda 7 sin haberlo vencido | De 55 a 75 |
| Perder en el combate final sin haberlo vencido | De 83 a 112 |
| Volver a vencerlo sin perder vidas | De 179 a 302 |
| Perder en la ronda 7 de un brote ya vencido | De 10 a 18 |

  Contando la subida por brote y suponiendo brotes de 10 rondas, las primeras victorias sin perder vidas suman, de media, unas 1080 semillas tras el brote 1, 4600 tras el 4, 13.000 tras el 10 y 45.000 tras los 26 de la ruta (unas 260 rondas); el brote 26 da unas 2400. La tienda debería costar más que eso en total, para que haya que repetir algún brote para comprarlo todo. Perder a propósito nunca da más que volver a ganar un brote ya vencido (hay un test que lo comprueba).

### Jugadores (T-034)
Decisiones PF-01 a PF-07 cerradas el 21 nov 2026 con la recomendación. Cómo se hace: ADR-0018.
- **Varios jugadores en el mismo aparato**, como mucho 3 (PF-01). Cada uno tiene su progreso permanente, su partida a medias y sus tours vistos (PF-02). Los ajustes (calidad, volumen, idioma y ayuda) son del aparato y no cambian al cambiar de jugador (PF-03).
- **Al abrir el juego** no sale ninguna pantalla nueva: con un solo jugador no molesta nunca (PF-04). Un navegador sin datos crea el primero solo. El jugador activo se recuerda al recargar.
- **La portada dice quién juega**, arriba del menú, con su avatar (un brote en un círculo de su color) y el botón "Cambiar". Solo se cambia de jugador desde la portada, nunca en mitad de una partida.
- **La pantalla de jugadores**, en el panel de la portada, lista a cada uno con su avatar, su nombre, sus jefes vencidos y la última vez que jugó ("Aún sin estrenar" si nunca guardó nada); el activo, con borde dorado y "Jugando". Elegir uno lo deja activo y vuelve al menú: cambian la partida, el progreso, el Invernadero, la ruta y los tours vistos.
- **Nuevo jugador** empieza desde cero (sin progreso, sin partida y con los tours sin ver) y queda activo. Con 3 jugadores el botón se apaga y dice "Máximo de jugadores".
- **Nombre (PF-05):** mientras no elija uno (T-033), "Jugador 1", "Jugador 2"... (el menor número libre), en el idioma del juego. Los nombres se pueden repetir (PF-07). Cómo se elige: "Nombre del jugador (T-033)".
- **Borrar jugador (PF-06):** la papelera de cada fila pide confirmar y dice qué se pierde para siempre (jefes vencidos, semillas desde T-020, partida guardada y tours vistos) o que no tiene nada guardado; los demás jugadores y los ajustes no cambian. Si era el activo, pasa a serlo el que jugó por última vez; si era el último, queda uno nuevo y vacío. El único jugador, sin nada guardado, no se puede borrar: no cambiaría nada.
- **Lo guardado antes de T-034** (progreso, partida a medias y tours vistos) se descarta y se borra del navegador, sin convertirlo: se empieza como "Jugador 1". Los ajustes se conservan.
- **Para el futuro:** cada jugador tiene un identificador que no cambia aunque cambie su nombre y la fecha de su último guardado. No son cuentas: no se sincronizan ni se protegen.
- **Teclado:** Tab recorre la lista, Enter elige y Esc vuelve (de la confirmación a la lista y de la lista al menú, con el foco en "Cambiar").

### Tours de ayuda (T-013)
Decisiones G-01 a G-10 cerradas el 20 nov 2026. Cómo se hace: ADR-0012.
- **Cada cosa nueva se enseña la primera vez:** al empezar la preparación de la ronda que la desbloquea, tras aceptar "¡YA LO TIENES!", sale su tour. En la ronda 1, lo básico: sembrar, el carril, monedas, vidas, la ficha y "¡Que vengan!". En la 2, subir de nivel; en la 3 y la 4, las minas; en la 5, infundir (con la carta o con una mina); en la 6, fusionar. En la ronda 2 del brote 2, el escudo: sembrar el muro, lo que para y la infusión (T-024).
- **Mira y prueba:** se oscurece todo menos lo importante y una mano hace el gesto sobre el tablero de verdad. Si el jugador lo hace, el paso se celebra ("¡Bien!") y pasa al siguiente; si no, "Siguiente". "Saltar" cierra el tour. Si no hay lo que señalar (sin planta, sin dos iguales para fusionar...), el paso sale solo con su dibujo.
- **La cuenta atrás de la preparación no corre mientras dura el tour.** "¡Que vengan!" sigue funcionando y lo cierra.
- **Un tour visto no vuelve a salir** en este navegador, tampoco en una partida nueva. Cuenta como visto al acabarlo, al saltarlo o si empieza el ataque a medias.
- **Pista de la moneda:** la primera moneda que cae al suelo lleva una mano que la toca y "¡Tócala! Vale más", sin parar el juego. Deja de salir al recoger una así, o tras salir tres veces.
- **Ayuda:** opción en Opciones y en Ajustes, encendida por defecto. Apagada, no sale ningún tour ni la pista. Apagarla a mitad de un tour lo cierra sin darlo por visto.
- **Una mecánica nueva llega con su tour** (regla 9 de `CLAUDE.md`).
- **Los da Boxer (T-032, VT-01):** su retrato y su nombre asoman por la esquina del bocadillo y dice la frase de cada paso con su voz, letra a letra; al hacer el gesto, sonríe. Las frases van con su voz y nunca son más largas que las de T-013. La pista de la moneda no lleva retrato.

### Historia y viñetas (T-031)
Decisiones Y-01 a Y-07 cerradas el 21 nov 2026: Boxer, un informático moderno (mezcla de dos propuestas de la galería); Patty, la de la bata con una flor en el pelo; lo demás, con la recomendación. Cómo se hace: ADR-0019. La historia está en `04-historia.md`.
- **Viñeta:** el busto de quien habla (Y-03), su nombre y un bocadillo sobre la escena oscurecida. Cada personaje tiene tres caras: normal, apurado y contento (Y-04).
- **Cuándo salen:** la frase de Boxer al empezar el brote 1 (en la preparación de la ronda 1, antes del tour); lo que cuenta Boxer la primera vez que cae Creeper (antes de la pantalla de victoria); y Patty la primera vez que se llega al Invernadero. Quien venció a Creeper sin ver lo de Boxer lo ve al entrar al Invernadero, antes de Patty (Y-06).
- **Boxer antes de cada jefe (T-032, VT-04):** en la preparación de la primera ronda en que se ve al jefe (la 8 del brote 1, cuando Creeper empieza a prepararse), una viñeta en la que Boxer avisa de que llega y cuenta en una línea qué fue el virus de verdad. Si no se vio entonces, sale en la preparación de las siguientes hasta la del combate. Lo completo está en la ficha del jefe.
- **El texto sale letra a letra** con la voz de quien habla; un toque, un clic, Espacio o Intro lo completa, y el siguiente pasa de viñeta (Y-07). "Saltar" o Esc cierran la secuencia entera y cuenta como vista.
- **El juego espera:** mientras hay una viñeta no avanza nada ni corre la cuenta atrás. La pausa, el aviso de girar la pantalla y el cambio de idioma no la rompen: sigue donde iba.
- **Una secuencia vista no vuelve a salir sola,** tampoco tras recargar ni en otra partida: va en el progreso permanente del jugador y se borra con él. Se vuelven a ver desde "Historia" en el Invernadero (Y-05).
- **El nombre (T-033):** Boxer lo pregunta en la viñeta 4 de la caída de Creeper (ver "Nombre del jugador"). Al volver a ver esa secuencia no lo pregunta.
- **La historia no explica controles:** eso es de los tours. Quien la salte entiende el juego igual.

### Nombre del jugador (T-033)
Decisiones NJ-01 a NJ-06 cerradas el 21 nov 2026 (NJ-03 y NJ-06 cambiadas por Carmine al empezar la task). Reglas en `src/game/playerName.ts`.
- **Cuándo se pregunta (NJ-01):** tras vencer a Creeper, en la viñeta 4 de Boxer ("¿Cómo te llamas?"), después de explicar el mundo. Al acabar el texto sale el campo, con el nombre que ya tuviera (de Opciones) o vacío.
- **Cómo se contesta:** se escribe y se confirma con "¡Listo!" o con Intro; vacío o solo con espacios, el botón está apagado. "Prefiero no decirlo" pone el apodo (NJ-02). Saltar la secuencia (con "Saltar" o Esc) sin haber dado un nombre también pone el apodo: nunca queda un jugador sin nombre.
- **El apodo (NJ-03):** "Rookie", el mismo en todos los idiomas. Se guarda como un nombre más.
- **Cómo es un nombre (NJ-04):** de 1 a 12 letras, contadas como las ve el jugador (una eñe o un emoji cuentan como una). Se quitan los espacios de los lados y se deja uno solo entre palabras; no entran saltos de línea ni caracteres invisibles. Se aceptan tildes, eñes, otros alfabetos y emojis. Se muestra siempre como texto.
- **Dónde va (NJ-05):** en el perfil del jugador activo (T-034): se conserva al recargar y en partidas nuevas, y se borra al borrar el jugador.
- **Dónde se ve:** en las viñetas siguientes (Boxer y Patty le llaman por su nombre), en la portada ("Continuar · Carmine", cortado con puntos si no cabe), bajo el título del Invernadero ("¡Hola, Carmine!"), y en la fila del jugador y la lista de jugadores. Sin nombre, "Jugador N".
- **Cambiarlo:** en Opciones de la portada, sección "Jugador". No en los Ajustes de la pausa.
- **Quien vio la historia antes (NJ-06):** sin caso especial. Sigue como "Jugador N" hasta que se ponga un nombre en Opciones.
- **Teclado en pantalla:** en un móvil en horizontal, mientras se escribe, la viñeta y el panel del menú se meten en lo que deja ver el teclado: se ve lo que se escribe y el botón de confirmar.

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

T-020: las semillas están en `src/game/core/seeds.ts` (`seedCaps`, `rollSeedPercent`, `rollSeeds`, `creditRound`, `seedPayout`, `settleSeeds`, `heartBonusPercent`, `addSeeds`), con tests en `seeds.test.ts` (y en `outbreaks.test.ts`, que cada brote da algo más). La partida lleva lo suyo en `MatchState.seeds` (`MatchSeeds`: si es una repetición, rondas, lo sumado y lo cobrado); `stepRound` suma cada ronda superada (evento `roundCleared` con `seeds`) y la escena cobra al ganar o perder (`settle` en `BoardScene`, que llama a `settleSeeds` y a `ProgressKeeper.recordMatchEnd`) antes de borrar la partida guardada. El saldo va en `Progress.seeds` (`PROGRESS_VERSION` 3) y la partida guardada pasa a la versión 3. El resumen de la victoria y la derrota y el saldo del Invernadero están en `src/ui/SeedsEarned.tsx`; el icono, en `SeedIcon.tsx`.

T-018: los brotes están en `src/game/core/outbreaks.ts` (`OutbreakId`, `OutbreakScript`, `FIRST_OUTBREAK`, `outbreakScript`, `outbreakNumber`, `roundCount`, `outbreaksBefore`, `outbreakOfBoss` e `isOutbreakOpen`, B-04), con tests en `outbreaks.test.ts` sobre dos brotes de prueba. La partida sabe su brote (`MatchState.outbreak`) y todas las reglas de `rounds.ts` lo reciben: lo desbloqueado y el tope de nivel suman los brotes anteriores (`unlockedAt`, `levelCapAt`; B-01) y lo nuevo de cada ronda es solo lo que no llegó ya desbloqueado (`newFeaturesAt`, que usan `roundUnlocks` y los tours). `createMatch` empieza con el saldo inicial del brote (B-02). La partida guardada va por la versión 2; las anteriores se ignoran. El nombre "Brote N: jefe" lo compone `src/ui/outbreakName.ts` con `outbreak.title` de `src/i18n/`; los avisos de ronda están por brote en `round.notices`.

T-013: los tours de ayuda no son reglas. Qué señalar en el tablero lo elige `src/game/view/tourSpots.ts` (`tourCells`, con test) con las reglas de core; los tours, sus pasos y los vistos están en `src/ui/tour/` (`tours.ts`, `tourProgress.ts`, con test). La escena para la preparación con `tourHold` (en `advance`) y avisa de lo que hace el jugador con `playerAction`.

T-009: el nivel de los enemigos está en `combat.ts` (`Enemy.level`, `enemyLevelFactor`, `enemyMaxHp`, `enemyDamage`, `rollEnemyLevel`) y las copias del Creeper, en `rollCopyKind`; `enemyKilled` lleva el tipo para pagar lo suyo (`ENEMIES[kind].reward`). En `rounds.ts`, el tope de nivel (`levelCapAt`, `levelCap`, `levelCapRaisedAfter`), lo nuevo de cada ronda para el aviso (`roundUnlocks`), los grupos con nivel y paso propios (`RoundGroup.level`, `haste`) y el grito (`shout`, evento `shout`). Infundir con una mina, en `match.ts` (`mineDragBlocker`, `mineInfusion`, `mineInfusionTargets`, `infuseWithMine`), y el tope en `levelUpOffer` (`cap`, `capRaisedAt`). Los valores están en `ENEMY_LEVELS`, `CREEPER`, `ENEMIES` y `OUTBREAKS` de `balance.ts`.

T-024: el escudo es un elemento más (`ElementType` en `plants.ts`, con `MineElement` para los de mina) y el muro, lo sembrado de `kind: 'wall'` (`Wall`, `createWall`, `wallAt` en `match.ts`); la vida de la variante, en `plantMaxHp`, y la infusión que conserva la proporción, en `infusedPlant`. Arrastrar una mina o un muro para infundir es `elementDragBlocker`, `elementInfusion`, `elementInfusionTargets` e `infuseWithElement` (antes, solo minas). El bloqueo está en `combat.ts` (`isShield`, `waveReach`, `hopLanding`), con tests en `shield.test.ts` (y el golpe de Creeper sobre un muro, E-06, en `creeper.test.ts`). La `Feature` es `shield`. Un brote en preparación tiene `boss: null` (`isOutbreakReady` en `outbreaks.ts`; `isOutbreakOpen` y `routeStops` lo dejan fuera) y el nombre de su jefe en `outbreak.comingBoss` de `src/i18n/` (`bossName` en `src/ui/outbreakName.ts`). La partida guardada va por la versión 4. Los valores, en `SHIELD` y `COSTS.shield` de `balance.ts`.

T-025: las tropas del brote 2 son enemigos más de `ENEMIES` (`copycat`, `copycatArmored`, `copycatSpitter` y `minstrel`; los Copycat repiten los números del gusano, el acorazado y el escupidor del brote 1). Todo en `combat.ts`, con tests en `troops.test.ts`: la copia es `Enemy.clone` (`leavesClone`, `cloneOf`, evento `cloned`; su vida, su daño, su cuerpo, su alcance y su moneda en `enemyMaxHp`, `enemyDamage`, `enemyHalfLength`, `enemyReach` y `enemyReward`), con el límite por explosión en `explode`. El Minstrel ataca con `attack: 'verse'`: se para como el escupidor (`rangedColumn`, antes `spitColumn`), avisa (`verseWarned`), recita (`sang`) y sus versos (`Verse`, en `MatchState.verses`) cruzan el carril con `waveReach`, que desde T-025 cuenta lo que cruza en (`to`, `from`] para no dar dos veces a lo mismo (`verseHit`, con `blocked` en el escudo que lo para, y `verseGone`). La partida guardada pasa a la versión 5. Los valores, en `ENEMIES.minstrel`, `CLONE` y `VERSE` de `balance.ts`.

T-034: los jugadores están en `src/game/profiles.ts` (reglas `addProfile`, `selectProfile`, `removeProfile`, `touchProfile`, `freeNumber` y `decodeProfiles`; `ProfileKeeper` y su instancia `profiles`, con el almacén de cada jugador en `store()` y `storeOf()`), con tests en `profiles.test.ts`; el almacén que nunca falla (`SessionStore`), en `src/game/storage.ts`. `save.ts`, `progress.ts` y `tourProgress.ts` escriben por defecto en el almacén del jugador activo. Lo que la pantalla de jugadores cuenta de cada uno (nombre, lo que se pierde al borrarlo) está en `src/ui/playerCards.ts`, con tests en `playerCards.test.ts`.

T-033: las reglas del nombre (`NAME_MAX_LENGTH`, `NICKNAME`, `limitName`, `cleanName`, `isValidName`, `nameLength`) están en `src/game/playerName.ts`, con tests en `playerName.test.ts`; ponerlo en el perfil, en `renameProfile` y `ProfileKeeper.rename` (`profiles.ts`). Qué secuencia lo pregunta y el apodo al acabarla sin nombre, en `asksName` y `nameAfterStory` de `src/ui/story/stories.ts`. Lo que se ve con el teclado en pantalla abierto, en `keyboardArea` (`src/ui/keyboardArea.ts`, con test).

T-032: quién presenta lo nuevo es un dato del guion (`OutbreakScript.presenter` y `RoundScript.presenter`, tipo `Presenter`) y lo decide `unlockPresenter` en `rounds.ts`; la primera ronda en que se ve al jefe, `bossFirstSeenRound`. Las dos con test (`presenter.test.ts`, `outbreaks.test.ts` y `rounds.test.ts`). Lo demás no son reglas: qué frase dice quien presenta y lo que dice Patty en el Invernadero está en `src/ui/story/speech.ts` (`unlockSpeech`, `pattyGreets`, `nextPattyLine`, con test); la viñeta de Boxer antes de cada jefe (`lore:<brote>`), en `stories.ts` (`loreStory`, `storyScript`, `storyTitle`); el retrato que habla fuera de las viñetas, en `src/ui/story/Portrait.tsx` (`Cameo`, `useSpeech`).

T-031: la historia vista va en el progreso permanente (`Progress.story`, con `hasSeenStory` y `recordStory` en `src/game/progress.ts`; `PROGRESS_VERSION` 2). Las viñetas no son reglas: qué secuencias hay, quién habla y cuándo salen está en `src/ui/story/stories.ts` (`STORIES`, `storiesAt`, `storySteps`, `replayableStories`), el texto letra a letra en `typewriter.ts`, los dos con test en `stories.test.ts`; la voz al hablar, en `voiceCue` de `src/game/audio/cues.ts`. Los personajes (Boxer y Patty) se pintan en `src/game/view/characters/`.
