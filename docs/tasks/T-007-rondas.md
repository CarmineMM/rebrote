# [Rondas] Las 7 rondas del mundo 1

**Prioridad:** Media · **Tamaño estimado:** L (orientativo) · **Depende de:** T-003, T-004, T-005, T-006 · **Bloquea a:** T-008 · **Origen:** conversación de diseño del 18 y 19 nov 2026

## Contexto
Con las mecánicas listas falta la progresión. El diseño está en `docs/specs/02-mundo-1-gusanos.md`: 7 rondas, un concepto nuevo por ronda, dos enemigos nuevos.

## Objetivos
1. **Rondas con guion.** Cada ronda define qué enemigos salen, cuándo y por qué carril.
2. **Un concepto por ronda.** Las cartas y acciones se desbloquean en el orden de la spec.
3. **Enemigos nuevos.** Acorazado en la ronda 4 y escupidor en la ronda 6.

## Alcance
**Incluye:** definición de rondas como datos en `src/game/config/`, desbloqueo progresivo, aviso corto del concepto nuevo, gusano acorazado, gusano escupidor, pausa entre rondas, indicador de ronda en el HUD.
**No incluye:** jefe (T-008), guardado de progreso, selector de niveles.

## Criterios de aceptación
### Rondas
- [ ] El HUD muestra "Ronda N de 7".
- [ ] Una ronda termina cuando no quedan enemigos por salir ni vivos.
- [ ] Entre rondas hay una pausa en la que se puede sembrar, infundir, fusionar y subir de nivel.
- [ ] Plantas y saldo se conservan de una ronda a la siguiente.
- [ ] Al empezar cada ronda aparece un aviso de una línea con el concepto nuevo.

### Desbloqueo
- [ ] Ronda 1: solo disparadora. Ronda 2: subir de nivel. Ronda 3: fuego solo. Ronda 4: infundir fuego. Ronda 5: hielo. Ronda 6: fusionar.
- [ ] Una carta o acción bloqueada no aparece en el HUD.

### Enemigos
- [ ] El acorazado tiene varias veces la vida del gusano y avanza más lento.
- [ ] El escupidor se detiene a distancia de la primera planta de su carril y le dispara.
- [ ] El escupidor puede destruir una mina antes de que explote.

### Calidad
- [ ] Añadir o cambiar una ronda es editar datos, sin tocar escenas.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Perder en mitad de una ronda reinicia desde la ronda 1 en el prototipo.
- Las 7 rondas completas deberían durar entre 10 y 15 minutos. Si se alargan, recortar duración por ronda antes que quitar rondas.
- El orden de desbloqueo choca con el orden de construcción de las tasks (fusionar se construye antes pero se desbloquea en la ronda 6): es intencionado.

## Objetivo final con ejemplos
| Momento | Lo que ve el jugador |
|---|---|
| Inicio de la ronda 3 | Aviso "Nuevo: fuego. Siémbralo solo y explota", aparece la carta de fuego |
| Ronda 4 | Primer acorazado; la carta de fuego ya se puede soltar sobre disparadoras |
| Fin de la ronda 7 | Mensaje de victoria provisional hasta que exista el jefe |

## Cómo probarlo (QA)
1. Jugar de la ronda 1 a la 7 y cronometrar.
2. Anotar en qué ronda se pierde por primera vez y por qué.
