# [Guardado] Perfiles de jugador en el navegador

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** T-017, T-019 · **Bloquea a:** T-033 · **Origen:** conversación de diseño del 21 nov 2026

## Contexto
Hoy el navegador guarda un solo jugador, repartido en cuatro huecos de `localStorage` (verificado en el código):

| Hueco | Qué guarda | Dónde |
|---|---|---|
| `rebrote.progreso` | Brotes vencidos (y lo que venga: semillas, compras, mejoras) | `src/game/progress.ts`, ADR-0014 |
| `rebrote.partida` | La partida en curso | `src/game/save.ts`, ADR-0010 |
| `rebrote.tours` | Tours de ayuda ya vistos | `src/ui/tour/tourProgress.ts`, ADR-0012 |
| `rebrote.ajustes` | Calidad, volumen, idioma, ayuda | `src/ui/useSettings.ts` |

Carmine quiere perfiles: varios jugadores en el mismo navegador, cada uno con su nombre y su progreso. Lo ve también como preparación para cuando haya base de datos e inicio de sesión para compartir el progreso.

**Sin migración (decidido el 21 nov 2026):** mientras el juego esté en desarrollo no se migran ni se exportan datos guardados (ADR-0014). Lo que haya en el navegador antes de esta task se descarta y el jugador empieza con un perfil vacío.

Conviene hacerla **antes** de T-020, T-022, T-023, T-031 y T-033: todas añaden datos permanentes, y es más barato que nazcan ya dentro de un perfil que mover cada una después.

## Objetivos
1. **Varios jugadores en un navegador,** sin que se pisen.
2. **Empezar limpio:** lo guardado antes se descarta, sin migración.
3. **Preparar el futuro sin construirlo:** cada perfil tiene un identificador estable y fecha de último guardado, que es lo que hará falta para enlazarlo con una cuenta.

## Alcance
**Incluye:** lista de perfiles, perfil activo, progreso, partida y tours por perfil, adaptar `progress.ts` a la política sin migraciones, pantalla para elegir, crear y borrar jugador, textos en español e inglés, tests, ADR nuevo que modifica ADR-0010 y ADR-0012 (ADR-0014 ya recoge la decisión), regla en `CLAUDE.md`.
**No incluye:** el nombre que elige el jugador (T-033), convertir los datos guardados antes, cuentas, inicio de sesión, sincronización, exportar o importar el progreso.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| PF-01 | ¿Cuántos perfiles como máximo? | 3, 5 o sin límite | 3: cabe en una pantalla de móvil sin desplazarse | Carmine |
| PF-02 | ¿Los tours vistos son por perfil? | Sí o no | Sí: un jugador nuevo en el mismo móvil tiene que ver la ayuda | Carmine |
| PF-03 | ¿Los ajustes son por perfil? | Sí o no | No: calidad, volumen e idioma son del aparato | Carmine |
| PF-04 | ¿Cuándo se ve la pantalla de elegir jugador? | a) Siempre al abrir. b) Solo con un botón en la portada | b: con un solo jugador no molesta nunca | Carmine |
| PF-05 | ¿Cómo se llama un perfil que aún no eligió nombre? | Libre | "Jugador 1", "Jugador 2" (el nombre llega tras vencer a Creeper, T-033) | Carmine |
| PF-06 | ¿Qué hace "Borrar progreso"? | a) Borra el perfil entero. b) Lo deja a cero pero conserva el nombre | a, y pasa a llamarse "Borrar jugador" | Carmine |
| PF-07 | ¿Se puede repetir un nombre? | Sí o no | Sí: se distinguen por su progreso y su fecha | Carmine |

## Criterios de aceptación
### Arranque
- [ ] Lo guardado antes de esta task (progreso, partida a medias y tours vistos) se ignora: el jugador empieza con un perfil vacío.
- [ ] Los huecos antiguos se borran del navegador para no dejar restos.
- [ ] Los ajustes (calidad, volumen, idioma, ayuda) se conservan.
- [ ] Un navegador sin datos crea su primer perfil solo, sin enseñar ninguna pantalla nueva.

### Perfiles
- [ ] La portada muestra quién está jugando y un botón para cambiar de jugador.
- [ ] La pantalla de jugadores lista cada perfil con su nombre, sus brotes vencidos y la última vez que jugó.
- [ ] Crear un jugador nuevo empieza desde cero: sin progreso, sin partida y con los tours sin ver.
- [ ] No se pueden crear más perfiles que el máximo; el botón de crear se apaga y dice por qué.
- [ ] Cambiar de jugador cambia el progreso, la partida a medias, el Invernadero y la ruta, y no toca los ajustes.
- [ ] Borrar un jugador pide confirmación diciendo qué se pierde, y no afecta a los demás.
- [ ] Si se borra el jugador activo, pasa a estar activo otro; si era el último, se crea uno vacío.
- [ ] El perfil activo se recuerda al recargar.

### Para el futuro
- [ ] Cada perfil tiene un identificador que no cambia aunque cambie su nombre.
- [ ] Cada perfil guarda cuándo se modificó por última vez.

### Calidad
- [ ] Sin Phaser, con tests: datos de otra versión (se descartan), datos rotos, almacenamiento no disponible, borrado y cambio de perfil.
- [ ] Un perfil con datos rotos no impide usar los demás.
- [ ] El progreso de cada perfil tiene su versión; con otra versión se descarta. `progress.ts` y sus tests quedan al día con ADR-0014: sin migraciones obligatorias.
- [ ] No se puede cambiar de jugador en mitad de una partida: solo desde la portada.
- [ ] Se ve bien a 812 × 375 y 568 × 320, y se maneja con teclado.
- [ ] ADR nuevo, notas en los tres ADR que modifica y regla en `CLAUDE.md`: todo dato permanente nuevo va dentro del perfil.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- **Quien ya juega la versión publicada pierde su progreso al llegar esta task.** Es lo decidido. Si se quiere suavizar, un aviso de "juego en desarrollo: el progreso puede reiniciarse" junto a la versión de la portada.
- Dos pestañas con perfiles activos distintos: cada una escribe en el suyo; el perfil activo que se recuerda es el de la última pestaña que cambió.
- El límite de espacio de `localStorage` es de varios megas y cada perfil ocupa unos pocos kilobytes: no es un problema con 3 perfiles.
- **Perfiles locales no son cuentas.** Esto no sincroniza nada ni protege nada: cualquiera con el móvil en la mano entra en cualquier perfil. Lo que sí deja listo es un identificador y una fecha por perfil.
- En iPhone, la aplicación instalada (T-029) no ve los perfiles de Safari. Se acepta durante el desarrollo.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Jugador que ya tenía a Creeper vencido abre la versión nueva | Empieza de cero como "Jugador 1"; sus ajustes siguen igual |
| Pulsa "Cambiar jugador" y crea otro | El nuevo empieza en la portada sin Invernadero y con los tours sin ver |
| Vuelve al primero | Recupera lo que tenía ese perfil |
| Intenta crear un cuarto con el máximo en 3 | Botón apagado: "Máximo de jugadores" |
| Borra el segundo | El primero no cambia |

## Cómo probarlo (QA)
1. Con datos de la versión publicada, abrir la versión nueva: empieza de cero, sin errores, y con los ajustes de antes.
2. Crear un segundo jugador, jugar la ronda 1 y volver al primero.
3. Borrar el segundo.
4. Repetir en un móvil en horizontal.
