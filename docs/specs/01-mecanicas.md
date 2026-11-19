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

### Infundir
- Solo sobre una disparadora ya sembrada y sin elemento.
- Una planta tiene como máximo un elemento. No hay fuego y hielo a la vez.
- Infundir una planta de N cañones cuesta N elementos.

### Fusionar
- Se hace arrastrando una disparadora sobre otra.
- Solo entre la misma variante: normal con normal, fuego con fuego, hielo con hielo.
- Máximo 3 cañones. Combinaciones válidas: 1+1 y 2+1.
- La planta resultante queda con el nivel más bajo de las dos.
- Qué gana el jugador: ahorra casillas y obtiene más ataque que la suma de las partes.

### Nivel
- Tope de 20. No se espera alcanzarlo en las 7 rondas.
- Cada nivel sube un poco el daño y la cadencia.
- Sin cambio visual grande: una medallita que cambia cada tanto y, como mucho, el color. Tiene que verse bien también en plantas fusionadas.

## Decisiones pendientes

| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| D-02 | ¿Cuánto más pega una planta fusionada? | Valores libres | Daño x2,2 con 2 cañones y x3,5 con 3; vida igual a la suma. Ajustar jugando | Carmine |
| D-03 | ¿Los niveles se reinician en cada partida o son permanentes? | a) Por partida. b) Permanentes | a para el prototipo. b es mejor gancho de retención pero pide guardado y economía aparte | Carmine |
| D-04 | ¿Cómo se ve en la interfaz infundir una planta de 2 o 3 cañones? | a) Arrastrar N veces. b) Un solo arrastre con precio xN | b: al pasar la carta sobre la planta, el precio de la carta cambia a "x3 = 225"; si no alcanza la moneda, se pone en rojo y no deja soltar | Carmine |
| D-05 | ¿Cuánto cuesta cada nivel? | Fijo o creciente | Creciente suave, para que subir una sola planta al máximo no sea siempre lo óptimo | Carmine |
| D-06 | ¿Cuánto dura y cuánto frena el hielo solo? | Valores libres | Probar 70 % de ralentización durante 4 s | Carmine |
| D-07 | ¿Cómo se pierde? | a) Un enemigo cruza y pierdes. b) Vidas | b con 3 vidas: perdona un error mientras se aprende | Carmine |
| D-08 | Nombre del juego | "Rebrote" es de trabajo | Decidir antes de publicarlo | Carmine |

Los valores recomendados ya están como PROVISIONAL en `src/game/config/balance.ts`.

## Reglas ya implementadas

Fusionar, infundir y multiplicador de daño están en `src/game/core/plants.ts` con tests en `plants.test.ts`.

Saldo, siembra y ocupación de casillas están en `src/game/core/match.ts`; la recompensa por enemigo y la moneda soltada, en `src/game/core/economy.ts`. Los valores están en `ECONOMY` de `balance.ts`.

El combate (disparo, balas, mordisco, vidas y derrota) está en `src/game/core/combat.ts`, y el generador de gusanos de prueba hasta T-007, en `src/game/core/spawner.ts`. Los valores están en `LIVES`, `SHOOTER`, `ENEMIES` y `TEST_SPAWNER` de `balance.ts`. Cómo funciona la simulación: ADR-0008.
