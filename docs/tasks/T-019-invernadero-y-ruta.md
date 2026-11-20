# [Interfaz] Invernadero y ruta de brotes

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** L (orientativo) · **Depende de:** T-017, T-018 · **Bloquea a:** T-022, T-023 · **Origen:** conversación de diseño del 20 nov 2026

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

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| R-01 | ¿Cuándo aparece el Invernadero? | a) Desde el principio. b) Al vencer a Creeper | b: un jugador nuevo va directo a jugar | Carmine |
| R-02 | ¿Qué pasa con "Cargar partida" y "Jefes" en la portada? | a) Se quedan. b) "Continuar" lleva al Invernadero, y la partida a medias se reanuda desde ahí. "Jefes" desaparece: lo sustituye la ruta | b | Carmine |
| R-03 | ¿Cuántos lugares enseña la ruta? | a) Todos los previstos. b) Los vencidos, el actual, el siguiente en sombra y el destino final a lo lejos | b: no compromete un número de brotes | Carmine |
| R-04 | Nombre de la pantalla | "Invernadero" u otro | Invernadero | Carmine |

## Criterios de aceptación
### Invernadero
- [ ] Muestra: reanudar partida (si hay una a medias, con su brote y ronda), ir al siguiente brote, abrir la ruta, tienda, plantas y volver a la portada.
- [ ] Tienda y plantas aparecen bloqueadas con un candado hasta que existan sus tasks; la tienda indica que se abre al vencer a Creeper.
- [ ] Empezar un brote con una partida a medias pide confirmación, igual que hoy "Nueva partida".

### Ruta
- [ ] Cada brote es un lugar sobre un camino. Los vencidos se ven superados, el actual destaca y los bloqueados no se pueden elegir.
- [ ] Tocar un lugar vencido o el actual muestra su nombre, su jefe y un botón para jugarlo.
- [ ] Un brote vencido se puede volver a jugar.
- [ ] Con un solo brote disponible, la ruta se ve bien y no parece rota.

### Portada y victoria
- [ ] La portada sigue el flujo decidido en R-01 y R-02.
- [ ] Tras vencer a un jefe, la pantalla de victoria lleva al Invernadero.
- [ ] La partida a medias sigue guardándose y cargándose como hasta ahora.

### Calidad
- [ ] React pinta menús; si la ruta necesita arte del juego, llega como imagen desde la escena (regla 3 de `CLAUDE.md`).
- [ ] Se ve bien a 1600 × 900, 812 × 375 y 568 × 320, y se maneja con teclado.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

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
