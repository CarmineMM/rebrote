# [Audio] Efectos de sonido y volumen

**Estado:** Completada (21 nov 2026) · **Prioridad:** Alta · **Tamaño estimado:** M (orientativo) · **Depende de:** ninguna · **Bloquea a:** T-015 · **Origen:** conversación de diseño del 20 nov 2026

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

## Decisiones
| # | Pregunta | Decisión (20 nov 2026) | Decide |
|---|---|---|---|
| S-01 | ¿De dónde salen los efectos? | Mezcla: paquetes CC0 de Kenney para lo orgánico (plantas, monedas, menús, jingles) y jsfxr para lo digital de los virus y Creeper. Los paquetes de Kenney (Interface Sounds, Impact Sounds, RPG Audio, Music Jingles, Sci-Fi Sounds y Digital Audio) se bajaron el 20 nov 2026; jsfxr 1.4.1 (dominio público) va como dependencia de desarrollo y solo lo usa el script que genera los archivos | Carmine |
| S-02 | ¿Quién elige cada sonido? | Claude Code propone uno por efecto (midiendo duración, volumen, brillo y melodía, porque no puede oír) y la página de prueba deja oírlo con dos o tres alternativas. Carmine dice cuáles cambiar y la task se cierra con su visto bueno | Carmine |
| S-03 | ¿Formato? | OGG Vorbis con respaldo en MP3, en mono: el módulo de audio elige según lo que el navegador sabe reproducir y, si falla al decodificar, prueba el otro | Claude Code |
| S-04 | ¿Suena la batalla de la portada? | Solo lo que se pulsa: los clics sobre plantas, minas, gusanos y Creeper, y los botones del menú. La batalla de fondo va en silencio | Carmine |
| S-05 | ¿Suenan las monedas que se cobran solas? | No: solo suena la moneda que el jugador recoge del suelo | Carmine |
| S-06 | ¿Suena cada enemigo eliminado? | Sí, con un "pop" corto y suave, más bajo que el disparo, con un máximo de voces a la vez y una separación mínima. Los que caen en una explosión de mina o con el Creeper no suenan aparte | Carmine |

## Criterios de aceptación

Comprobados el 20 nov 2026 con tests de Vitest (los nuevos `voices.test.ts` y `cues.test.ts`; 329 en total) y en Chrome sin ventana sobre la RTX 4060 (silenciado), con clics y teclas de verdad: sin contexto de audio ni avisos en consola antes del primer clic, los 42 archivos descargados con la portada ya en pantalla y decodificados en menos de un segundo tras el clic; el aviso "¡YA LO TIENES!" de la ronda 2 suena; 15 disparadoras de 3 cañones contra gusanos y acorazados durante 6 s; una mina en plena cuenta atrás que se calla en pausa (el número no baja) y sigue con su tic y su explosión al reanudar; botones que suenan en pausa; volumen a 0 sin ningún sonido y recordado al recargar; pestaña oculta y aviso de girar (375 × 812) que suspenden el audio, y vuelve al girar a 812 × 375; el control cabe a 568 × 320. El 20 y el 21 nov 2026 Carmine los oyó en `/sonidos.html`: pidió el disparo normal más grave (al 65 % de velocidad y sin agudos por encima de 2800 Hz), un eco corto en el de fuego, y cambió `infuseFire` (receta `firePower`), `plantDestroyed` (`impactPunch_medium_000`) y `creeperRage` (receta `rage`); el resto, tal cual. Queda sin probar en un iPhone de verdad (S-03): si Safari no decodifica el OGG, el módulo usa el MP3.
### Sonidos
- [x] Suenan, como mínimo: sembrar, disparo, impacto, mordisco, escupitajo, planta destruida, enemigo eliminado, enemigo que cruza (vida perdida), mina armada (tic del conteo), explosión de fuego, estallido de hielo, infundir, fusionar, subir de nivel, moneda recogida, inicio del ataque, ronda superada, aviso de desbloqueo, botón de menú, derrota y victoria.
- [x] Creeper tiene los suyos: aviso de salto, despegue y aterrizaje (y además su voz de terminal, la fase 2 y su derrota).
- [x] Fuego e hielo se distinguen de oído en el disparo y en el impacto (`shotFire` con su eco corto, `shotIce`, `hitFire`, `hitIce`). Visto bueno de Carmine, de oído, el 21 nov 2026.

### Sin saturar
- [x] El mismo efecto no suena más de un número máximo de veces a la vez (valor en la configuración de audio).
- [x] El disparo varía un poco de tono en cada repetición.
- [x] Con 15 disparadoras de 3 cañones disparando, el sonido sigue siendo agradable y no hay cortes ni chasquidos. Medido: un sonido por planta, unas 9 voces por segundo y pico de 0,18 tras el compresor; visto bueno de Carmine el 21 nov 2026.

### Control
- [x] Hay un control de volumen de efectos de 0 a 100 en Opciones y en Ajustes de la pausa, y se recuerda al recargar.
- [x] Con el volumen a 0 no se reproduce nada.
- [x] En pausa, con la pestaña oculta o con el aviso de girar la pantalla, no suena nada.
- [x] El primer sonido llega tras el primer toque o clic del jugador, sin errores en consola antes de eso.

### Calidad
- [x] Un solo módulo reproduce sonidos; escenas y componentes no llaman a Phaser directamente para eso.
- [x] Cada archivo de `public/audio/` tiene anotado su origen y licencia (`public/audio/LICENCIAS.md`).
- [x] Hay una página o panel de prueba (solo en desarrollo) que lista todos los efectos y permite oírlos uno a uno (`/sonidos.html`).
- [x] Textos en español e inglés.
- [x] ADR de audio (ADR-0013), lista "Sonido nuevo" en `docs/guias/graficos.md` y regla 10 en `CLAUDE.md`: mecánica nueva llega con su sonido.
- [x] `npm test` y `npm run build` pasan.

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
