# [Interfaz] Invernadero y ruta de brotes

**Estado:** Completada (21 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** L (orientativo) · **Depende de:** T-017, T-018 · **Bloquea a:** T-022, T-023 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
El menú de inicio (`src/ui/TitleScreen.tsx`) tiene "Nueva partida", "Cargar partida", "Opciones", "Jefes" (bloqueado, con la etiqueta "Próximamente") y "Créditos". Al ganar, `VictoryScreen` solo ofrece "Jugar otra vez" y volver al menú. No hay ningún sitio donde estar entre un brote y el siguiente.

Carmine quiere un menú interno con continuar, tienda y selección de brote, y que elegir brote no sea una lista sosa: un camino con lugares por los que se va pasando hasta el jefe final. Eso dará excusa para cambiar el escenario más adelante (en el brote 2 todavía no cambia).

## Objetivos
1. **Un sitio entre brotes:** el Invernadero, con todo lo que se hace fuera de la partida.
2. **La ruta:** un camino con un lugar por brote, que enseña lo recorrido y lo que viene.
3. **Un solo menú.** La portada no duplica lo que hay en el Invernadero.

## Alcance
**Incluye:** pantalla Invernadero, ruta de brotes, cambios en portada y en la pantalla de victoria, huecos reservados para tienda (T-022) y plantas (T-023), textos en español e inglés, ADR si cambia el flujo de pantallas de ADR-0010.
**No incluye:** la tienda y sus compras, escenarios distintos por brote, animación de viaje entre lugares.

## Decisiones tomadas
| # | Pregunta | Decisión (21 nov 2026, con la recomendación) | Decide |
|---|---|---|---|
| R-01 | ¿Cuándo aparece el Invernadero? | b) Al vencer a Creeper: un jugador nuevo va directo a jugar | Carmine |
| R-02 | ¿Qué pasa con "Cargar partida" y "Jefes" en la portada? | b) "Continuar" lleva al Invernadero, y la partida a medias se reanuda desde ahí. "Jefes" desaparece: lo sustituye la ruta | Carmine |
| R-03 | ¿Cuántos lugares enseña la ruta? | b) Los vencidos, el actual, el siguiente en sombra y el destino final a lo lejos: no compromete un número de brotes | Carmine |
| R-04 | Nombre de la pantalla | Invernadero | Carmine |

Cómo quedó (ADR-0016):
- El Invernadero es una vista de React (`src/ui/Greenhouse.tsx`) en el panel de la derecha, sobre la escena de portada: no hay escena nueva. `App` sabe si se está en la portada o en el Invernadero, y `TitleScreen` es el contenedor con el título; el menú de la portada es `TitleMenu`.
- Reglas puras en `src/game/core/route.ts`, con test: `isGreenhouseOpen` (R-01), `outbreakStanding`, `currentOutbreak` y `routeStops` (R-03). Si no hay más brotes en el juego, el siguiente lugar dice "Próximamente".
- La ruta (`src/ui/RouteMap.tsx`) es un mapa ancho con un camino de tierra; dónde va cada lugar lo decide `layoutRoute` (`src/ui/routeLayout.ts`, con test). Los jefes son recortes que manda la portada por `EventBus` (`routeArt`, `bossCutouts` en `view/portrait.ts`).
- **Portada (R-02):** sin Creeper vencido, "Nueva partida" y "Continuar" (la guardada, como el viejo "Cargar partida"); con él, "Continuar" lleva al Invernadero. "Jefes" ya no está.
- **Victoria:** "Al Invernadero" (con el foco) y "Jugar otra vez". La derrota y "Salir al menú" siguen yendo a la portada.
- La partida guardada y el progreso no cambian de forma: ni `SAVE_VERSION` ni `PROGRESS_VERSION` suben.
- No es una mecánica de juego: no lleva tour (regla 9) ni sonido propio (regla 10). Sus botones suenan como los de cualquier menú; los que tienen candado, no.
- **Ampliación pedida por Carmine el 21 nov 2026:** en el Invernadero la pantalla cambia. El título grande dice "INVERNADERO" en vez de "REBROTE" y la escena de portada pinta, en vez de la batalla, solo las plantas que el jugador ya tiene, sin enemigos (`ownedSoFar` en `core/route.ts` y `greenhouseCast` en `view/greenhouseGarden.ts`, los dos con test). Antes se revisaron las tasks pendientes (T-015, T-020 a T-026): ninguna tenía ese objetivo (T-020 y T-023 solo añaden datos al panel; T-018, T-019 y T-026 dejan fuera los escenarios del tablero), así que se hizo aquí.
- **Segunda ampliación, el mismo día:** el fondo del Invernadero no tiene los agujeros por donde salen los enemigos ni el tablero a cuadros. Lleva su propio terreno, un césped liso y continuo sin suelo corrupto (`TEX.gardenLand`, pintado la primera vez que se entra), y las plantas están algo corridas de su casilla y con un trozo de tierra removida a los pies, para que se vea que están sembradas a mano. Probado también en 21:9 y 4:3.

## Criterios de aceptación
### Invernadero
- [x] Muestra: reanudar partida (si hay una a medias, con su brote y ronda), ir al siguiente brote, abrir la ruta, tienda, plantas y volver a la portada.
- [x] Tienda y plantas aparecen bloqueadas con un candado hasta que existan sus tasks; la tienda indica que se abre al vencer a Creeper. Con R-01 b el Invernadero solo se ve con Creeper vencido, así que las dos dicen "Próximamente" (aviso añadido a T-022).
- [x] Empezar un brote con una partida a medias pide confirmación, igual que hoy "Nueva partida". También desde la ruta; si la partida es de ese brote, su lugar ofrece "Reanudar" y "Empezar de cero".

### Ruta
- [x] Cada brote es un lugar sobre un camino. Los vencidos se ven superados, el actual destaca y los bloqueados no se pueden elegir.
- [x] Tocar un lugar vencido o el actual muestra su nombre, su jefe y un botón para jugarlo.
- [x] Un brote vencido se puede volver a jugar.
- [x] Con un solo brote disponible, la ruta se ve bien y no parece rota: Creeper, "Brote 2 · Próximamente" y el destino final.

### Portada y victoria
- [x] La portada sigue el flujo decidido en R-01 y R-02.
- [x] Tras vencer a un jefe, la pantalla de victoria lleva al Invernadero.
- [x] La partida a medias sigue guardándose y cargándose como hasta ahora.

### Calidad
- [x] React pinta menús; si la ruta necesita arte del juego, llega como imagen desde la escena (regla 3 de `CLAUDE.md`).
- [x] Se ve bien a 1600 × 900, 812 × 375 y 568 × 320, y se maneja con teclado (probado en Ultra, en español e inglés, también con brotes de prueba para ver el que toca, la sombra y el mapa que se desplaza).
- [x] Textos en español e inglés.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Jugador sin progreso: nunca ve un Invernadero vacío.
- Partida a medias de un brote y el jugador elige otro: confirmación antes de pisarla.
- Progreso borrado desde Opciones estando en el Invernadero: vuelve a la portada.
- Riesgo de alcance: la ruta puede crecer sin fin. Aquí es un camino estático con lugares; el viaje animado es otra task.

## Objetivo final con ejemplos
| Situación | Lo que ve el jugador |
|---|---|
| Primera vez | Portada con "Nueva partida", sin Invernadero |
| Acaba de vencer a Creeper | Victoria y botón al Invernadero; en la ruta, Creeper superado y el brote 2 como siguiente |
| Tiene una partida en la ronda 4 del brote 2 | Invernadero con "Reanudar: Brote 2, ronda 4 de N" |
| Toca un lugar bloqueado | No pasa nada; se ve el candado |

## Cómo probarlo (QA)
1. Con progreso vacío, comprobar que la portada lleva directo al brote 1.
2. Vencer a Creeper y recorrer Invernadero y ruta.
3. Rejugar el brote 1 desde la ruta.
4. Repetir en un móvil en horizontal.
