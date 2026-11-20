# [Audio] Efectos de sonido y volumen

**Estado:** Pendiente · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-015 · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
El juego no tiene ningún sonido (verificado: no hay audio en `src/` y `docs/adr/0004-graficos-placeholder.md` dice "Sin sonido por ahora. Es otra decisión y se tomará aparte"). Phaser ya trae gestor de sonido: reproduce archivos, no los fabrica. Todo lo que pasa en el combate ya sale como evento (`CombatEvent` en `src/game/core/combat.ts` y `RoundEvent` en `rounds.ts`), así que hay dónde enganchar cada sonido sin tocar reglas.

## Objetivos
1. **El juego suena.** Cada acción importante tiene su efecto.
2. **No satura.** Muchas plantas disparando a la vez no se convierten en ruido.
3. **El jugador manda.** Volumen de efectos en Opciones y en Ajustes, recordado.
4. **Queda escrito.** ADR de audio (sugerido: ADR-0013) y lista de comprobación en la guía.

## Alcance
**Incluye:** módulo único de audio (sugerido `src/game/audio/`), configuración de sonidos (sugerido `src/game/config/audio.ts`), archivos en `public/audio/` con su origen y licencia anotados, ajuste `sfxVolume` (sugerido) en `Settings` de `src/ui/useSettings.ts`, sección "Sonido" en `SettingsPanel`, textos en `src/i18n/`, ADR, guía y regla en `CLAUDE.md`.
**No incluye:** música (T-015), voces, sonido distinto por nivel gráfico.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| S-01 | ¿De dónde salen los efectos? | a) Kenney (licencia libre). b) Generados con jsfxr y exportados. c) Mezcla | c: jsfxr para lo "digital" de los virus y Kenney para lo orgánico de las plantas | Carmine |
| S-02 | ¿Quién elige cada sonido? | a) Claude Code. b) Carmine de oído | b: un agente no puede oír. La task deja una página de prueba para escucharlos y cambiarlos | Carmine |
| S-03 | ¿Formato? | OGG con respaldo en MP3, o solo MP3 | OGG más MP3, comprobado en Safari de iPhone | Claude Code al implementar |

## Criterios de aceptación
### Sonidos
- [ ] Suenan, como mínimo: sembrar, disparo, impacto, mordisco, escupitajo, planta destruida, enemigo eliminado, enemigo que cruza (vida perdida), mina armada (tic del conteo), explosión de fuego, estallido de hielo, infundir, fusionar, subir de nivel, moneda recogida, inicio del ataque, ronda superada, aviso de desbloqueo, botón de menú, derrota y victoria.
- [ ] Creeper tiene los suyos: aviso de salto, despegue y aterrizaje.
- [ ] Fuego e hielo se distinguen de oído en el disparo y en el impacto.

### Sin saturar
- [ ] El mismo efecto no suena más de un número máximo de veces a la vez (valor en la configuración de audio).
- [ ] El disparo varía un poco de tono en cada repetición.
- [ ] Con 15 disparadoras de 3 cañones disparando, el sonido sigue siendo agradable y no hay cortes ni chasquidos.

### Control
- [ ] Hay un control de volumen de efectos de 0 a 100 en Opciones y en Ajustes de la pausa, y se recuerda al recargar.
- [ ] Con el volumen a 0 no se reproduce nada.
- [ ] En pausa, con la pestaña oculta o con el aviso de girar la pantalla, no suena nada.
- [ ] El primer sonido llega tras el primer toque o clic del jugador, sin errores en consola antes de eso.

### Calidad
- [ ] Un solo módulo reproduce sonidos; escenas y componentes no llaman a Phaser directamente para eso.
- [ ] Cada archivo de `public/audio/` tiene anotado su origen y licencia.
- [ ] Hay una página o panel de prueba (solo en desarrollo) que lista todos los efectos y permite oírlos uno a uno.
- [ ] Textos en español e inglés.
- [ ] ADR de audio, lista "Sonido nuevo" en `docs/guias/graficos.md` y regla en `CLAUDE.md`: mecánica nueva llega con su sonido.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Ajustes guardados antes de esta task no traen volumen: se usa el valor por defecto.
- Navegador sin audio o con el audio bloqueado: el juego sigue sin errores.
- El peso de los efectos no debe retrasar la portada: se cargan sin bloquear el menú.
- Riesgo: sonidos elegidos sin oírlos. Por eso S-02.

## Objetivo final con ejemplos
| Situación | Resultado |
|---|---|
| Sembrar una disparadora | Un sonido corto y orgánico |
| 10 plantas disparan en el mismo instante | Se oyen unas pocas voces con tonos algo distintos, no 30 iguales |
| Volumen de efectos a 0 y explota una mina | Silencio |
| Pausa con una mina en pleno conteo | El tic se calla y sigue al reanudar |

## Cómo probarlo (QA)
1. Jugar la ronda 1 con auriculares y repasar la lista de sonidos.
2. Llegar a la ronda 6 con muchas plantas fusionadas y escuchar si molesta.
3. Bajar el volumen a 0, recargar y comprobar que sigue en 0.
4. Probar en un móvil en horizontal.
