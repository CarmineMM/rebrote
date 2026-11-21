# [Historia] El jugador elige su nombre

**Estado:** Pendiente · **Prioridad:** Baja · **Tamaño estimado:** S (orientativo) · **Depende de:** T-031, T-034 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 21 nov 2026

## Contexto
El protagonista es el propio jugador: no tiene cara ni se le muestra. Carmine quiere que elija su nombre: Boxer se lo pregunta, el jugador lo escribe y la partida guardada se identifica con ese nombre.

El nombre pertenece al perfil del jugador (T-034). El progreso permanente vive en `src/game/progress.ts` (`Progress`, `PROGRESS_VERSION`, `MIGRATIONS`; ADR-0014) y hoy solo guarda los brotes vencidos. Los textos admiten datos dentro de la frase (por ejemplo, `t.title.waiting` recibe el brote y la ronda). El juego se usa mucho en móvil en horizontal (ADR-0011), donde el teclado en pantalla tapa media pantalla o más.

## Objetivos
1. **Que el jugador se ponga nombre** sin que sea un trámite.
2. **Que el nombre se use:** en las viñetas y para identificar su partida.
3. **Que no moleste** a quien no quiera escribir nada.

## Alcance
**Incluye:** la viñeta en la que Boxer pregunta, campo de texto, nombre por defecto, guardado en el perfil (sin migración: ADR-0014), nombre en la portada y en el Invernadero, uso en las viñetas, cambio de nombre desde Opciones, textos en español e inglés, tests.
**No incluye:** la gestión de perfiles (crear, elegir y borrar jugador), que es T-034; cuentas; nombres visibles para otros jugadores.

## Decisiones (cerradas el 21 nov 2026)
| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| NJ-01 | ¿Cuándo pregunta Boxer? | Tras vencer a Creeper, después de explicar el mundo y el porqué, dentro de las viñetas | Carmine |
| NJ-02 | ¿Es obligatorio escribir? | No: con "Prefiero no decirlo" Boxer le pone un apodo | Carmine |
| NJ-03 | ¿Qué apodo pone Boxer? | "Recluta" en español y "Rookie" en inglés | Carmine |
| NJ-04 | ¿Cuántos caracteres? | De 1 a 12 | Carmine |
| NJ-05 | ¿Varios perfiles con nombres distintos? | Sí. Los perfiles son T-034; el nombre se guarda en el perfil activo | Carmine |
| NJ-06 | Quien ya venció a Creeper antes de esta task, ¿cuándo se lo preguntan? | La primera vez que entre al Invernadero | Carmine |

## Criterios de aceptación
### Preguntar
- [ ] En el momento de NJ-01, Boxer pregunta el nombre y aparece un campo de texto.
- [ ] El jugador confirma con un botón o con Intro.
- [ ] No se acepta un nombre vacío o solo de espacios: el botón de confirmar está apagado.
- [ ] Los espacios del principio y del final se quitan, y no se pueden escribir más caracteres que el máximo.
- [ ] "Prefiero no decirlo" usa el apodo de NJ-03.
- [ ] Saltar las viñetas también usa el apodo; nunca queda un jugador sin nombre.

### Usar
- [ ] Las viñetas siguientes llaman al jugador por su nombre.
- [ ] La portada y el Invernadero muestran el nombre junto a "Continuar" o en el título.
- [ ] El nombre se conserva al recargar y al empezar partidas nuevas.
- [ ] En Opciones se puede cambiar.
- [ ] Borrar el jugador (T-034) borra también su nombre.
- [ ] Un perfil que aún no eligió nombre se muestra con el nombre provisional de T-034.

### Calidad
- [ ] El nombre se guarda en el perfil activo (T-034). Sin migración: lo guardado con otra versión se descarta (ADR-0014).
- [ ] El nombre se muestra siempre como texto, nunca se interpreta.
- [ ] A 812 × 375 y 568 × 320, con el teclado en pantalla abierto, se ve lo que se escribe y se puede confirmar.
- [ ] Tests de las reglas del nombre: vacío, espacios, longitud y apodo.
- [ ] Textos en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- **El teclado en móvil horizontal** es el riesgo real: puede tapar el campo y sacar al juego de la pantalla completa. Hay que probarlo en un Android y en un iPhone de verdad.
- Nombres con emojis, tildes, eñes o letras de otros alfabetos: se aceptan y se cuentan bien.
- Un nombre muy ancho (doce letras M) no rompe el botón de la portada.
- Frases que usan el nombre: en inglés y en español el orden cambia; el nombre va como dato dentro de la frase.
- Cambiar el idioma no cambia el nombre, pero sí el apodo si el jugador no eligió uno.

## Objetivo final con ejemplos
| Lo que escribe | Resultado |
|---|---|
| "Carmine" | Boxer: "Pues esto no ha terminado, Carmine." La portada: "Continuar · Carmine" |
| "   Ana  " | Se guarda "Ana" |
| Nada, y pulsa "Prefiero no decirlo" | Boxer le llama "Recluta" |
| Solo espacios | El botón de confirmar no se activa |
| 13 letras | La decimotercera no entra |

## Cómo probarlo (QA)
1. Vencer a Creeper, escribir un nombre y comprobarlo en las viñetas, la portada y el Invernadero.
2. Repetir en un móvil en horizontal con el teclado en pantalla.
3. Cambiar el nombre en Opciones y borrar el progreso.
