# [Guardado] Progreso permanente separado de la partida en curso

**Estado:** Completada (21 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-018, T-019, T-020 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
Hoy solo se guarda la partida en curso: un hueco en `localStorage` con la clave `rebrote.partida`, que contiene el `MatchState` entero y se borra al ganar o perder (verificado en `src/game/save.ts` y ADR-0010). Una guardada de otra versión se ignora (`SAVE_VERSION`), lo cual está bien para una partida pero sería un desastre para monedas y desbloqueos. No queda constancia de que el jugador venció a Creeper.

Además, "Nueva partida" pide confirmación para pisar la guardada. Con progreso permanente, esa acción no puede borrarlo.

## Objetivos
1. **Un segundo guardado** para lo que no se pierde: brotes vencidos, moneda secundaria, compras y mejoras.
2. **Migraciones.** Un progreso de una versión anterior se actualiza, nunca se descarta.
3. **Borrado explícito.** Solo se pierde si el jugador lo pide.

## Alcance
**Incluye:** módulo de progreso (sugerido `src/game/progress.ts`) con clave propia (sugerida `rebrote.progreso`), versión y migraciones, validación de forma, registro de brote vencido al ganar, opción "Borrar progreso" con confirmación, tests, ADR (sugerido ADR-0014), regla en `CLAUDE.md`.
**No incluye:** moneda secundaria (T-020), tienda (T-022), cuentas o guardado en la nube.

## Decisiones tomadas
| # | Pregunta | Decisión (21 nov 2026, con la recomendación) | Decide |
|---|---|---|---|
| K-01 | Quien ya venció a Creeper antes de esta task, ¿lo tiene vencido? | a) No hay forma de saberlo: lo vence otra vez. Es honesto y son pocos jugadores | Carmine |
| K-02 | ¿Exportar e importar el progreso con un código? | No por ahora; queda anotado como mejora si el juego crece | Carmine |

Cómo quedó (ADR-0014): `src/game/progress.ts`, clave `rebrote.progreso`, versión 1 con `{ version: 1, defeated: ['creeper'] }`. El brote se apunta por el nombre de su jefe (`OUTBREAK_ID` en `rounds.ts`), no por su posición. Además de lo pedido:
- Un progreso de una versión **más nueva** que el juego (alguien vuelve a una versión anterior) se ignora pero no se pisa.
- "Borrar progreso" está solo en Opciones del menú de inicio, no en los ajustes de la pausa: ahí borraría la partida que se está jugando. Debajo del botón se ve lo que hay guardado ("Jefes vencidos: Creeper", "Partida guardada en la ronda 6"); sin nada, está desactivado.

## Criterios de aceptación

Comprobados el 21 nov 2026 con Vitest (`progress.test.ts`) y en Chrome sin ventana sobre la RTX 4060, en Ultra: la última ronda despejada da la victoria por el camino de verdad (`stepRound`) y deja `{"version":1,"defeated":["creeper"]}`; tras recargar sigue ahí; salir al menú, "Nueva partida", perder y la partida nueva no lo tocan; "Borrar progreso" se lleva el progreso y la partida y deja `rebrote.ajustes` y `rebrote.tours` igual; un progreso corrupto deja la portada sin errores en consola y "Cargar partida" sigue activo. Confirmaciones en inglés a 812 × 375 y 568 × 320 sin salirse de la pantalla.

### Progreso
- [x] Al vencer al jefe de un brote, queda registrado y sigue ahí tras recargar la página.
- [x] Ganar, perder o empezar una partida nueva no borra el progreso.
- [x] "Nueva partida" sigue avisando de que pisa la partida en curso, y su texto deja claro que el progreso se conserva.
- [x] Un progreso de una versión anterior se migra a la actual sin perder datos. Aún no hay versión anterior: se prueba la cadena de migraciones con una historia de mentira (v1 → v3), un test exige una migración por versión y otro lee a mano un progreso de la versión 1, que no se cambia nunca.
- [x] Un progreso ilegible no rompe el juego: se parte de cero y la partida en curso no se toca.

### Borrado
- [x] Opciones tiene "Borrar progreso", con una confirmación que dice qué se pierde.
- [x] Tras confirmarlo, se borran el progreso y la partida en curso. Los ajustes y los tours vistos no.

### Calidad
- [x] Sin Phaser, con tests de migración, de datos rotos y de almacenamiento no disponible.
- [x] Textos en español e inglés.
- [x] ADR nuevo y regla en `CLAUDE.md`: si cambia la forma del progreso, se sube su versión y se escribe su migración.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Ventana privada o almacenamiento lleno: el juego funciona y el progreso dura lo que dure la sesión.
- Dos pestañas abiertas: gana la última que escribe. Se acepta.
- El progreso vive en el navegador: quien borre los datos del sitio lo pierde. Es el límite conocido de ADR-0001 y el primer motivo real para revisar ese ADR.
- Cualquiera puede editar `localStorage`. No importa mientras no haya ranking ni pagos.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Vence a Creeper y recarga | Creeper sigue vencido |
| Pierde en la ronda 4 del brote siguiente | Creeper sigue vencido |
| Progreso guardado con la versión 1, juego en la versión 2 | Se migra y conserva todo |
| Progreso con texto corrupto | Empieza de cero, sin error en pantalla |

## Cómo probarlo (QA)
1. Vencer a Creeper (o usar la ayuda de desarrollo para saltar rondas), recargar y comprobarlo.
2. Pulsar "Nueva partida" y comprobar que el progreso sigue.
3. Usar "Borrar progreso" y comprobar que ajustes e idioma se mantienen.
