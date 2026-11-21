# [Plantas] Premio en los niveles 5, 10, 15 y 20 y jardincito

**Estado:** Completada (21 nov 2026) · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-003 · **Bloquea a:** ninguna · **Origen:** conversación con Carmine del 21 nov 2026

## Contexto
Cada nivel de una disparadora suma lo mismo: un 10 % de daño y un 3 % de cadencia sobre el nivel 1 (`LEVELING` en `balance.ts`, `levelBonus` en `src/game/core/plants.ts`). La única marca del nivel es la medallita de la nuca, que cambia de color en el 5 (plata), el 10 (oro), el 15 (rubí) y el 20 (cristal).

Carmine pidió premiar esos niveles con más estadística, y algo más vistoso que la medallita para verlos sin tocar el dibujo de la planta. Para elegir el adorno se le enseñaron cuatro propuestas pintadas por código en la galería de desarrollo (`/disparadoras.html`, vista "Niveles"): aura, jardincito, luciérnagas y corro de gemas.

## Objetivos
1. **Premiar** los niveles 5, 10, 15 y 20 con una subida mayor que la de un nivel normal.
2. **Que se vea:** el jardincito a los pies marca cada premio alcanzado.
3. **Que se sepa antes:** el panel de nivel avisa cuando el siguiente nivel da premio.

## Alcance
**Incluye:** la regla y sus valores, el panel de nivel, el sonido al llegar a un premio, el jardincito en tablero, portada y foto de la ficha, y la documentación.
**No incluye:** cambiar el costo de subir, el tope por ronda ni los niveles de los enemigos. Un sonido propio para el premio (por ahora reutiliza uno).

## Decisiones tomadas
| # | Pregunta | Decisión (21 nov 2026) | Decide |
|---|---|---|---|
| Q-01 | ¿Cuánto premian? | Llegar al 5 y al 15 suma un 50 % más que un nivel normal (x1,5); al 10 y al 20, el doble (x2). Vale para el daño y la cadencia, y lo ganado se queda | Carmine |
| Q-02 | ¿Cómo se ve? | El jardincito: matas y flores a los pies que crecen con cada premio | Carmine |
| Q-03 | ¿Cómo suena llegar a un premio? | Con el "¡ya lo tienes!" del aviso de desbloqueo (`unlock`) en vez del de subir de nivel. Se puede cambiar por uno propio en `/sonidos.html` | Claude Code |

Q-01 se aplicó así: el bonus de un nivel es la suma de lo que dio cada subida (`levelBonus`). Por ejemplo, el daño de una de nivel 5 es +45 % (antes +40 %) y el de una de nivel 20, +220 % (antes +190 %). Tabla completa en `docs/specs/01-mecanicas.md` ("Nivel").

## Criterios de aceptación

Comprobados el 21 nov 2026 con Vitest (354 tests) y en Chrome sin ventana sobre la RTX 4060: en una partida, una disparadora subida a nivel 4 enseña en su panel "¡Premio en el nivel 5!" con +15 % de daño y +4,5 % de cadencia; al subir al 5 brota su jardincito, el panel dice "Daño +45 % · Cadencia +13,5 %", suena `unlock` y la ficha da 29 de daño por disparo (20 x 1,45) con las margaritas en la foto. La portada enseña el jardincito en sus plantas de nivel 5 y 10. A 568 x 320 el panel no crece hasta la bandeja.

### Reglas
- [x] Llegar a los niveles 5 y 15 suma 1,5 veces lo de un nivel normal y al 10 y al 20 el doble, en daño y en cadencia (`LEVELING.milestones`, `levelStepBonus`, `plants.test.ts`).
- [x] Lo ganado se queda: el bonus de cualquier nivel es la suma de sus subidas (`levelBonus`).
- [x] La ficha y todo lo que usa `damageMultiplier` y `fireRateMultiplier` (combate, quemadura) toman los valores nuevos sin números propios.
- [x] El costo de subir, el tope por ronda y los niveles de los enemigos no cambian.

### Interfaz y sonido
- [x] El panel de nivel avisa en dorado si el siguiente nivel da premio, con lo que suma (en pantallas bajas, solo el aviso). Textos en `es.ts` y `en.ts`.
- [x] Los porcentajes con decimales se leen bien ("4,5 %", "13,5 %"): `formatPercent` enseña un decimal si lo hay.
- [x] Subir a un nivel con premio suena distinto (`actionCue`, `cues.test.ts`).

### Jardincito
- [x] Brota a los pies al llegar al 5 y crece en el 10, el 15 y el 20, con los colores de la medallita (`gardenArt.ts`, con test).
- [x] Se queda en el suelo, se mece, se oscurece y se transparenta con su planta, cambia al fusionarse si cambia el nivel y se encoge cuando la planta muere o se va a fusionarse (`levelGarden.ts`).
- [x] Sale en la portada y en la foto de la ficha.
- [x] Respeta los niveles gráficos (destellos solo con `extras`) y la escala de arte. Probado en Bajo y en Alto.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- En el mundo 1 el tope de nivel es 5: solo se llega al primer premio. El resto se notará cuando suba el tope o con el nivel base permanente (T-023, que tendrá que decidir si sus pasos llevan premio).
- Fusionar deja el nivel más bajo de las dos: si baja de un premio, el jardincito encoge con él.
- Con muchas plantas de nivel alto, los arbustos del 15 y el 20 llenan el césped. Se vio aceptable en el tablero de la galería; revisar jugando.

## Cómo probarlo (QA)
1. Empezar una partida, pasar a la ronda 2 (en desarrollo, tecla N) y conseguir moneda (tecla M).
2. Sembrar una disparadora y subirla a nivel 4: el panel anuncia el premio del 5.
3. Subirla al 5: brota el jardincito, suena el premio y el panel y la ficha enseñan los números nuevos.
4. En `/disparadoras.html`, vista "Niveles", ver el jardincito en los cuatro tramos.
