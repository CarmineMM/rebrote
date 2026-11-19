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

## Piezas del mundo 1

| Pieza | Sembrada sola | Infundida en una disparadora |
|---|---|---|
| Disparadora | Dispara en su carril | No aplica |
| Fuego | Mina: al detectar un enemigo cerca cuenta 2 s, explota en área y desaparece | Las balas aplican daño progresivo |
| Hielo | Igual que la mina de fuego, pero ralentiza en área con efecto fuerte, y desaparece | Las balas ralentizan |

El elemento solo siempre tiene un efecto mayor que su versión infundida, a cambio de gastarse.

## Reglas confirmadas

### Moneda
- Hay una sola moneda. Sembrar, infundir y subir de nivel compiten por ella.
- Se gana por enemigo eliminado y por goteo pasivo. No hay planta generadora en el mundo 1 (D-01, cerrada el 19 nov 2026).
- Al eliminar un enemigo, el 90 % de las veces la moneda se cobra sola. El otro 10 % el enemigo la suelta en el suelo y solo se cobra si el jugador le hace clic; recogida así vale un 15 % más, redondeado hacia arriba (25 pasa a 29).
- La moneda soltada que no se recoge se pierde al cabo de unos segundos.
- La moneda siempre es entera: nunca hay decimales en el saldo.

### Combate
- La disparadora dispara solo a enemigos de su carril que están por delante de ella y ya pisan el césped. A los que ya la pasaron no les dispara.
- Las balas no persiguen a nadie: dan al primer enemigo de su carril que encuentran. Si su objetivo muere antes, siguen hasta el siguiente. Desaparecen al impactar o al salir del tablero.
- El gusano avanza a velocidad constante. Al tocar una planta se para y la muerde a intervalos hasta destruirla; luego sigue.
- Cada enemigo que cruza el borde izquierdo resta una vida y desaparece. Sin vidas se pierde la partida (D-07 sigue abierta: de momento hay 3 vidas, como PROVISIONAL en `LIVES` de `balance.ts`).

### Rondas (T-007)
- El mundo 1 tiene 7 rondas con guion: cada una dice qué enemigos salen, cuándo y por qué carril. El guion está en `ROUNDS` de `balance.ts` (resumen en `02-mundo-1-gusanos.md`).
- **Preparación:** cada ronda, también la 1, empieza con una cuenta atrás de 20 s en la que se puede sembrar, infundir, fusionar y subir de nivel. El goteo sigue. El botón "¡Que vengan!" la adelanta.
- **Ataque:** los enemigos salen a su hora por el agujero de su carril. La ronda termina cuando no quedan enemigos por salir ni vivos; empieza entonces la preparación de la siguiente.
- Plantas, saldo y vidas se conservan de una ronda a la siguiente.
- **Un concepto por ronda:** lo nuevo se desbloquea al empezar la preparación de su ronda, con un aviso de una línea, y sigue desbloqueado después. Ronda 1: disparadora. 2: subir de nivel. 3: fuego solo (mina). 4: infundir fuego. 5: hielo, solo e infundido. 6: fusionar. 7: nada nuevo.
- Lo bloqueado no se ve ni responde: la carta no está en la bandeja, la planta no abre su panel o no se arrastra. Una carta de fuego en la ronda 3 sobre una disparadora avisa de en qué ronda se podrá infundir.
- Tras la ronda 7 la partida está ganada (pantalla de victoria provisional hasta el jefe, T-008). Perder en cualquier ronda obliga a empezar desde la 1.

### Enemigos (T-007)
- **Gusano acorazado (desde la ronda 4):** muerde como el gusano, con cuatro veces su vida y más lento.
- **Gusano escupidor (desde la ronda 6):**
  - Se para a 2,6 casillas de lo primero sembrado que tiene delante en su carril (planta o mina) y le escupe cada cierto tiempo. Nunca se para antes de pisar el césped, así que las plantas siempre le pueden dar.
  - El escupitajo vuela por el carril y quita vida a lo primero sembrado que encuentra. Si su objetivo ya no está, sigue hasta lo siguiente o sale del tablero.
  - Se para fuera del radio de detección de una mina, así que la puede reventar sin que llegue a armarse. Una mina destruida así no explota.
  - Al destruir su objetivo vuelve a avanzar hasta tener otro a tiro.
  - Ralentizado, escupe más despacio en la misma proporción en que avanza más despacio.
- Los valores están como PROVISIONAL en `ENEMIES` de `balance.ts`.

### Infundir
- Solo sobre una disparadora ya sembrada y sin elemento.
- Una planta tiene como máximo un elemento. No hay fuego y hielo a la vez.
- Infundir una planta de N cañones cuesta N elementos.
- **Interfaz (D-04, cerrada el 19 nov 2026 con la recomendación):** un solo arrastre. Al pasar la carta de elemento sobre una disparadora, su precio cambia a "×3 = 225". Si no alcanza la moneda, se pone en rojo y no deja soltar. Vale igual con clic en la carta y clic en la planta.
- Infundir no cambia la vida, el nivel ni la recarga de la planta.

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
- Tope de 20. No se espera alcanzarlo en las 7 rondas.
- **Por partida (D-03, cerrada el 19 nov 2026 con la recomendación):** los niveles se pierden al acabar la partida. No hay guardado.
- Se sube seleccionando la disparadora con un clic (sin arrastrarla) y pulsando "Subir" en su panel. Se cobra en el acto.
- **Cuánto mejora:** cada nivel suma un 10 % de daño y un 3 % de cadencia sobre los de nivel 1 (decidido el 19 nov 2026). El daño es el del disparo entero: en una fusionada se multiplica con el de los cañones, y la quemadura de una de fuego crece igual.
  - Lo que frena una de hielo no cambia con el nivel: depende de sus cañones.
  - Subir no cura ni recarga: la planta conserva su vida y su recarga.
- **Cuánto cuesta (D-05, cerrada el 19 nov 2026):** creciente. De nivel 1 a 2 cuesta 75 y cada nivel siguiente 25 más (75, 100, 125… hasta 525 de 19 a 20). Se paga por cañón, como al infundir: una de 3 cañones paga el triple, y el panel lo muestra como "×3 = 225".
- No se puede subir sin saldo suficiente ni pasar del 20; en el 20 el botón dice "Máximo".
- **Medallita:** sin cambio visual grande en la planta, solo una medallita con el número en la nuca. Cambia de color cada 5 niveles: bronce, plata (desde el 5), oro (10), rubí (15) y cristal irisado en el 20. Las de nivel 1 no llevan. Se ve también en las fusionadas y no tapa los puntos del tallo.
- Al fusionar, la planta se queda con el nivel más bajo de las dos (ver "Fusionar").
- Los valores están como PROVISIONAL en `LEVELING` de `balance.ts`.

## Decisiones pendientes

| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| D-07 | ¿Cómo se pierde? | a) Un enemigo cruza y pierdes. b) Vidas | b con 3 vidas: perdona un error mientras se aprende | Carmine |
| D-08 | Nombre del juego | "Rebrote" es de trabajo | Decidir antes de publicarlo | Carmine |

Los valores recomendados ya están como PROVISIONAL en `src/game/config/balance.ts`.

## Reglas ya implementadas

Las reglas de fusionar e infundir y el multiplicador de daño están en `src/game/core/plants.ts`, con tests en `plants.test.ts`. Fusionar dos plantas del tablero (destinos válidos, vida resultante, quién deja la casilla) está en `src/game/core/match.ts` (`fusionBlocker`, `fusionTargets`, `fusePlants`). El reparto del daño entre las balas de una fusionada, en `combat.ts` (`bulletDamage`). Los valores de D-02 están en `FUSION` de `balance.ts`.

Subir de nivel (T-003): el costo, la subida y lo que suma cada nivel están en `plants.ts` (`levelUpCost`, `levelUp`, `levelBonus`), y lo que ofrece el panel de una planta del tablero y la subida con su cobro, en `match.ts` (`levelUpOffer`, `levelUpPlant`). Los valores de D-05 están en `LEVELING` de `balance.ts`.

Saldo, siembra, infusión y ocupación de casillas están en `src/game/core/match.ts`: qué pasa al soltar una carta en una casilla lo dice `cardPlay` y lo aplica `playCard`. Una casilla puede tener una disparadora o una mina (`Sown`); la recompensa por enemigo y la moneda soltada, en `src/game/core/economy.ts`. Los valores están en `ECONOMY` de `balance.ts`.

El combate (disparo, balas, mordisco, escupitajos, minas, quemadura, ralentización, vidas y derrota) está en `src/game/core/combat.ts`. Los valores están en `LIVES`, `SHOOTER`, `ENEMIES`, `MINE`, `FIRE` e `ICE` de `balance.ts`. Cómo funciona la simulación: ADR-0008.

Las rondas (T-007), en `src/game/core/rounds.ts`: preparación y ataque (`stepRound`, `startAttack`), fin de ronda y victoria, y qué desbloquea cada una (`unlockedAt`, `isUnlocked`, `availableCards`). `cardPlay`, `fusionBlocker` y `levelUpOffer` responden `locked` a lo que aún no toca. El guion y la preparación están en `ROUNDS` y `ROUND_PREP` de `balance.ts`.
