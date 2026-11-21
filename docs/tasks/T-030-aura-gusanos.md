# [Enemigos] Aura en los tramos de nivel de los gusanos

**Estado:** Completada (21 nov 2026) · **Prioridad:** Media · **Tamaño estimado:** M (orientativo) · **Depende de:** T-027 · **Bloquea a:** ninguna · **Origen:** conversación con Carmine del 21 nov 2026

## Contexto
Los enemigos tienen nivel (T-009): en el brote 1, del 1 al 10. La única marca es la medallita de la nuca, que cambia de color en el 5 (plata) y el 10 (oro), justo donde salta su fuerza: +20 % de vida y daño desde el 5 y +40 % desde el 10 (`ENEMY_POWER.levelTiers` en `balance.ts`). Es la misma medallita de las disparadoras, que desde T-027 llevan además un jardincito a los pies en los niveles con premio.

Carmine pidió algo parecido para los gusanos: un adorno que valga para las tres tropas (gusano, acorazado y escupidor) sin cambiar su dibujo. Se le enseñaron cuatro propuestas pintadas por código en la galería de desarrollo (`/gusanos.html`): huella corrupta, bits en órbita, banderín de la IA y aura. **Eligió el aura** el 21 nov 2026.

Cómo es en la galería (`src/dev/wormFlair.ts`, `WormFlair` con `id: 'aura'`): una luz muy suave del color del tramo que sube del suelo por detrás del gusano en velos que se elevan y se apagan un poco por encima de su cabeza, con un halo tenue a los pies, alguna mota que sube y un velo casi invisible por delante. Cada tramo es algo más alto e intenso y lleva más velos; el de cristal cambia de color. Los velos van con transparencia normal, porque la luz aditiva sobre el césped cambiaba el color del tramo.

Datos que pesan:
- En las rondas 5 a 7 del brote 1, un 34 % de los enemigos sale de nivel 5 o más; en las rondas 8 a 10, un 84 % (`ENEMY_LEVELS.tables`). Las copias de Creeper son de nivel 10.
- `WormView` ya da lo que el aura necesita sin tocar su dibujo: `ground()`, `depth()`, `headPoint()` y, desde la galería, `bodyScale()`.
- Creeper no tiene nivel: no lleva medallita ni llevaría aura.

## Objetivos
1. **Que se vea de un vistazo** qué enemigos son más fuertes y cuánto: plata o oro (y rubí y cristal para brotes futuros).
2. **Sin tocar el dibujo** de ninguna tropa ni tapar su cara, su antena o su medallita.
3. **Que no moleste:** muy suave, también con muchos gusanos a la vez y en un móvil.

## Alcance
**Incluye:** el aura en el tablero, la portada y la foto de la ficha; sus cuatro tramos; los niveles gráficos; que se pare con la pausa; que acompañe al gusano al quemarse, congelarse, morir o escaparse; documentación en `docs/guias/graficos.md`; tests de lo que sea regla pura (el tramo de cada nivel).
**No incluye:** cambiar la fuerza ni los niveles de los enemigos, un sonido propio (no es una mecánica nueva: regla 10 de `CLAUDE.md` no aplica), un tour de ayuda, adornos para Creeper.

## Decisiones tomadas
| # | Pregunta | Decisión (21 nov 2026) | Decide |
|---|---|---|---|
| Z-01 | ¿Desde qué nivel sale el aura? | a) Desde el 5 (plata), donde empieza el +20 % de fuerza | Carmine |
| Z-02 | ¿La llevan las copias de Creeper (nivel 10)? | Sí: la misma regla para todos | Carmine |
| Z-03 | ¿Sale en la foto de la ficha y en la portada? | a) En las dos | Carmine |
| Z-04 | ¿Y por nivel gráfico? | En Bajo no se ve. En Medio, con menos: sin motas ni velo delantero. En Alto y Ultra, entera | Carmine |

Cómo quedó:
- Reglas y medidas sin Phaser en `src/game/view/wormAuraArt.ts` (`auraTier`, `veilSize`, `veilStrength`, `veilPhase`, `paintAuraVeil`), con test en `wormAuraArt.test.ts`. La animación, en `src/game/view/wormAura.ts` (`WormAura`), que crea y mueve cada `WormView`: así sale igual en el tablero, la portada y la galería. Las texturas de los velos (`TEX.auraVeils`), en `registerTextures`.
- Z-04 en el perfil de cada nivel gráfico: `QualityProfile.auras` (0 en Bajo, 1 en Medio, 2 en Alto y Ultra), con test.
- La foto de la ficha lleva un velo quieto detrás del gusano (`portrait.ts`).
- Comprobado el 21 nov 2026 con Vitest y en Chrome sin ventana sobre la RTX 4060, en la ronda 8 de una partida: en Alto, 8 enemigos de nivel 5 a 10 con 3 velos cada uno y motas; en Medio, 2 velos y sin motas; en Bajo (a 812 × 375), ninguno. Con la pausa el tablero se queda idéntico entre dos fotos. Foto de la ficha: nada en un nivel 3, oro en un acorazado de nivel 10 y cristal en un escupidor de nivel 20.
- En la galería `/gusanos.html` el aura sale ya de la vista del juego y las otras tres propuestas se ven combinadas con ella.

## Criterios de aceptación
### Aspecto
- [x] Los gusanos, acorazados y escupidores del nivel decidido en Z-01 en adelante llevan el aura de su tramo: plata (5 a 9), oro (10 a 14), rubí (15 a 19) y cristal (20), con los colores de la medallita (`MEDAL_TIERS`). Por debajo, nada.
- [x] Es como la propuesta elegida de `/gusanos.html`: velos que suben por detrás y se apagan un poco por encima de la cabeza, halo a los pies, motas, y un velo muy tenue por delante. El de cristal cambia de color.
- [x] No cambia el dibujo de ninguna tropa ni tapa su cara, su antena ni su medallita.
- [x] Creeper no la lleva.

### Comportamiento
- [x] Acompaña al gusano al andar, morder, escupir, retroceder al recibir un golpe y al salir del suelo.
- [x] Se sigue viendo con el gusano quemado o congelado (las llamas y la escarcha van por encima).
- [x] Se apaga con él al morir o al escaparse, sin quedarse flotando.
- [x] Con la pausa (menú, aviso de desbloqueo, ficha abierta) se congela: usa el reloj y los tweens de la escena.
- [x] Sale en la portada y en la foto de la ficha según Z-03.

### Calidad
- [x] Respeta los niveles gráficos según Z-04 (Bajo sin aura, Medio sin motas ni velo delantero) y la escala de arte (`artInv()`); brillos aditivos solo con `glows`.
- [x] Con 20 gusanos de nivel alto en pantalla no baja el ritmo en Medio ni en Bajo: con 30 de nivel 10 (gusanos, acorazados y escupidores) se mantienen 60 fps en Bajo, Medio y Alto (60 velos en Medio y 90 en Alto), medido en el PC de desarrollo con la RTX 4060. Falta verlo en un móvil de verdad.
- [x] Se ve bien a 1600 × 900, 812 × 375 y 568 × 320.
- [x] El tramo de cada nivel es una función pura con test.
- [x] `docs/guias/graficos.md` lo documenta, y la galería `/gusanos.html` deja de marcarlo como propuesta.
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- Al final del brote 1 la llevarán casi todos (84 % en las rondas 8 a 10): si con la decisión de Z-01 se ve demasiado, se baja la intensidad de la plata antes que quitarla.
- Gusanos solapados en el mismo carril: los velos de uno pasan por detrás del siguiente; revisar que no se ensucie.
- Escupidor cargando (se echa atrás y se yergue): el aura tiene que seguir su postura.
- Rubí y cristal no salen en el brote 1: se prueban en la galería y con un enemigo de nivel alto puesto a mano.

## Objetivo final con ejemplos
| Situación | Lo que ve el jugador |
|---|---|
| Gusano de nivel 3 | Como hoy: su medallita de bronce y nada más |
| Acorazado de nivel 7 | Medallita de plata y un aura blanquecina muy suave detrás |
| Copia de Creeper (nivel 10) | Medallita de oro y un aura dorada algo más alta |
| Escupidor de nivel 10 con fuego | Su aura dorada y, encima, las llamas del quemado |

## Cómo probarlo (QA)
1. En `/gusanos.html`, vista "Niveles", elegir "Las tres mezcladas" y comparar con la partida.
2. Empezar una partida, saltar a la ronda 8 (en desarrollo, tecla N) y mirar el aura en los gusanos de nivel 5 a 10.
3. Doble clic sobre un gusano de nivel 7: la foto de la ficha la enseña (si Z-03 es a).
4. Pausar con el aura en pantalla: se queda quieta.
5. Repetir en Bajo y en un móvil en horizontal.
