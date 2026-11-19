# [Elementos] Fuego: mina e infusión

**Estado:** Completada (19 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** T-002 · **Bloquea a:** T-005, T-007 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Las reglas de infusión ya existen y están probadas: `canInfuse`, `infuse` e `infusionCost` en `src/game/core/plants.ts`. El conteo de la mina está en `FIRE_MINE.countdownMs` (2000 ms). Falta todo lo visible.

Desde T-006:
- **Plantas fusionadas:** ya existen plantas de 2 y 3 cañones. Disparan una semilla por cañón a la vez, y el daño del disparo se reparte entre ellas (`bulletDamage` en `combat.ts`). Hay que decidir si la quemadura va en cada semilla o una vez por disparo. Como no se acumula, da casi igual.
- **Arrastre:** con una carta elegida, pulsar una planta no la arrastra para fusionar. Queda libre para infundir.
- **Fusión entre variantes:** de fuego con fuego ya funciona en core. El rótulo "Otra variante" ya sale al intentar fusionar una de fuego con una normal.
- **Aspecto:** la disparadora de fuego necesita sus texturas de 1, 2 y 3 cañones (lista "Variante de planta nueva" en `docs/guias/graficos.md`).

## Objetivos
1. **Fuego solo.** Sembrado en casilla vacía es una mina con conteo de 2 s.
2. **Fuego infundido.** Soltado sobre una disparadora sin elemento, sus balas aplican daño progresivo.
3. **Costo por cañón.** Infundir una planta de N cañones cuesta N fuegos.

## Alcance
**Incluye:** carta de fuego, mina (detección, conteo visible, explosión en área), infusión por arrastre, efecto de quemadura en enemigos, color rojo en la planta infundida, valores en `balance.ts`, tests.
**No incluye:** hielo (T-005), quitar un elemento ya infundido.

## Decisiones
| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| D-04 | Interfaz al infundir una planta de 2 o 3 cañones | Cerrada el 19 nov 2026 con la recomendación: un solo arrastre; la carta muestra "×3 = 225" y se pone en rojo si no alcanza | Carmine |
| Contexto | ¿La quemadura va en cada semilla o una vez por disparo? | Decidido al implementar, porque la task decía que "da casi igual": en cada semilla, con la fuerza del disparo entero (ver "Añadido durante la task"). Se puede revisar | Carmine |

## Criterios de aceptación

Comprobados el 19 nov 2026 con tests de Vitest (`match.test.ts` y `combat.test.ts`) y con ratón real en Chromium sin GPU (render por software), en Bajo, Medio y Ultra. Casos probados:
- Carta de fuego sobre una disparadora de 3 cañones con saldo y sin saldo.
- Infusión, y fuego sobre una disparadora de fuego.
- Mina en casilla vacía, conteo, explosión y quemadura.
- Cambio de calidad con una mina en cuenta atrás y un gusano quemado.

### Mina
- [x] Soltar fuego en una casilla vacía siembra una mina.
- [x] Al entrar un enemigo en su radio de detección empieza un conteo visible de 2 s.
- [x] Al terminar el conteo explota, daña a todos los enemigos dentro del radio de explosión y desaparece.
- [x] Una mina destruida antes de terminar el conteo no explota.

### Infusión
- [x] Soltar fuego sobre una disparadora sin elemento la convierte en disparadora de fuego y cobra el costo.
- [x] No se puede infundir una planta que ya tiene elemento; la casilla se marca como no válida.
- [x] Las balas de fuego aplican el daño de impacto más una quemadura durante un tiempo.
- [x] La quemadura no se acumula: un nuevo impacto reinicia su duración.

### Calidad
- [x] El costo sale siempre de `infusionCost`. `cardPlay` lo usa al infundir, y el rótulo y la carta del HUD muestran lo que devuelve `cardPlay`.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Enemigo que entra y sale del radio durante el conteo: la mina explota igual al terminar. Con test: el conteo sigue aunque no quede ningún enemigo.
- Dos minas juntas: cada una lleva su propio conteo. Con test.
- El escupidor (T-007) podrá destruir minas a distancia: la mina necesita vida propia. La tiene (`MINE.hp`) y los gusanos ya la muerden.
- Un gusano que muere quemado da su moneda como cualquier otro. Con test del evento.
- Cambiar la calidad con una mina en cuenta atrás o un gusano ardiendo: la cuenta atrás y la quemadura siguen donde estaban. Con el menú de pausa abierto no avanzan.

## Objetivo final con ejemplos
Con fuego a 75:
| Acción | Resultado |
|---|---|
| Fuego sobre casilla vacía | Mina, saldo menos 75 |
| Fuego sobre disparadora de 1 cañón | Disparadora de fuego, saldo menos 75 |
| Fuego sobre disparadora de 3 cañones | Disparadora de fuego de 3 cañones, saldo menos 225 |
| Fuego sobre disparadora de fuego | No permitido, saldo sin cambios |

Los cuatro ejemplos son un test en `match.test.ts`.

## Añadido durante la task

### Reglas
- **Mina:** `Mine` en `match.ts`. Una casilla tiene una disparadora o una mina (`Sown`); `plantAt` solo devuelve disparadoras y `sownAt` devuelve cualquiera de las dos.
  - Arma, cuenta y explota en `stepCombat` (eventos `mineArmed` y `mineExploded`).
  - Al explotar alcanza a todos los enemigos en `MINE.blastRadius`, también en los carriles de al lado.
  - Los gusanos la muerden como a una planta. Si la destruyen, sale `plantDestroyed` y no explota.
  - No se arrastra ni sirve de destino para fusionar.
- **Jugar una carta:** `cardPlay` dice qué pasa al soltarla en una casilla y `playCard` lo aplica. Hay dos acciones: sembrar (disparadora o mina) e infundir.
  - Devuelve lo que cuesta, por cuánto se multiplica el precio y por qué no se puede: `off-board`, `occupied`, `has-element` o `insufficient-funds`.
  - Sustituye a `plantShooter` y `plantBlocker`.
- **Quemadura:** `Burn` en el enemigo (daño por segundo y lo que le queda). Cada bala lleva su efecto (`BulletEffect`), calculado al disparar con `bulletEffect`.
  - La quemadura quita vida de forma continua en cada paso, no a golpes. Así un nuevo impacto no puede retrasar el daño.
  - Al recibir otra se queda la más fuerte y la duración vuelve a empezar (`refreshBurn`).
- **Quemadura por semilla:** cada semilla lleva la quemadura del disparo entero (`FIRE.burnDps × damageMultiplier`). Infundir 3 cañones cuesta 3 fuegos y quema 3,5 veces más que uno. Si quemara según el daño de cada semilla, una de 3 cañones pagaría el triple por 1,17 veces la quemadura.
- `FIRE_MINE` pasó a `MINE`, lo común a las minas de fuego y de hielo. Lo propio del fuego está en `FIRE`.

### Interacción
- Con una carta de elemento, si el puntero está sobre una disparadora (también sobre su cabeza, que asoma sobre la casilla de detrás), la carta apunta a ella. Si no, a la casilla del suelo.
- **Resaltado:**
  - Sembrar una mina: casilla clara, mina fantasma y su alcance de explosión en el suelo.
  - Infundir: casilla naranja y rótulo "Infundir: 75" o "Infundir: ×3 = 225".
  - No se puede: casilla roja con "Ya tiene fuego", o "Infundir: ×3 = 225" y "No alcanza la moneda".
- **D-04 en el HUD:** la escena manda `cardPreview` por el EventBus y la carta de fuego muestra "×3 = 225", en rojo si no alcanza. Soltar ahí no cobra ni infunde y la carta sigue elegida.

### Aspecto
- **Disparadora de fuego:** cabeza de guindilla, cañones de brasa y brote naranja, en sus texturas de 1, 2 y 3 cañones. Conserva los cañones y los puntos del tallo. Suelta una brasa cada tanto.
- **Semilla de fuego:** con estela de llamas, revienta en brasas.
- **Infundir:** las llamas suben por la planta, que se aplasta, cambia de textura, rebota y dice "¡Fuego!".
- **Mina:**
  - Bulbo medio enterrado con mecha. Dormida, sonríe con los ojos cerrados.
  - Armada: cara de susto, chispas en la mecha, cuenta atrás "2", "1", alcance en el suelo y un brillo al rojo cada vez más rápido.
  - Al explotar: bola de fuego, onda en el suelo, humo y chamuscado; los gusanos alcanzados saltan.
  - Si la destruyen: se apaga con humo.
- **Gusano quemado:** llamas sobre la cabeza y el lomo y el cuerpo rojizo. Cada 0,7 s pone cara de "ay" y suelta brasas. Si muere quemado, queda tostado.
- **Carta de fuego:** una llama en CSS que titila sobre un montoncito de tierra.
- `boardMarks.ts` reúne el rótulo y el dibujo de casillas y áreas que antes estaban en `fusionDragView.ts`.
- Detalle en `docs/guias/graficos.md`, sección 7.

### Valores (en `balance.ts`, PROVISIONAL)
| Qué | Valor |
|---|---|
| Vida de la mina (`MINE.hp`) | 100: dos mordiscos de gusano |
| Conteo (`MINE.countdownMs`) | 2 s |
| Radio de detección (`MINE.detectRadius`) | 1,1 casillas |
| Radio de explosión (`MINE.blastRadius`) | 1,5 casillas: su carril y los de al lado |
| Daño de la explosión (`FIRE.blastDamage`) | 200: mata a un gusano |
| Quemadura (`FIRE.burnDps`, `FIRE.burnMs`) | 8 por segundo durante 3 s, por la fuerza del disparo (28 por segundo en una de 3 cañones) |

Con estos números, una disparadora de fuego de un cañón quita unos 31 por disparo (20 de impacto y unos 11 de quemadura) y tumba a un gusano en 4,2 s en vez de 5,6 s.

## Cómo probarlo (QA)
1. Sembrar una mina delante de un gusano y contar los 2 s.
2. Infundir una disparadora y comprobar que el gusano sigue perdiendo vida después del impacto.
3. Pasar la carta de fuego sobre una disparadora de 3 cañones: la carta dice "×3 = 225". Con menos de 225, en rojo, y al soltar no pasa nada.
4. **Con GPU:** en Medio y en Ultra, la explosión y las llamas se ven naranjas, no blancas, y el juego sigue fluido con varias plantas de fuego disparando. Sin GPU las capturas salen con trozos sin pintar.
5. Jugar unos minutos y anotar si 75 por mina y la quemadura compensan (todo es PROVISIONAL).
