# ADR-0013: Efectos de sonido con un módulo propio de Web Audio

- **Estado:** Aceptada
- **Fecha:** 2026-11-20

## Contexto

El juego no sonaba. El ADR-0004 lo dejó para "otra decisión, aparte", y T-014 la pide: un efecto por cada acción importante, sin saturar cuando disparan muchas plantas a la vez, con un volumen que el jugador controla y recuerda, y que no suene nada en pausa, con la pestaña oculta ni con el aviso de girar la pantalla (ADR-0011).

Condiciones previas:
- El juego de Phaser se destruye y se recrea al cambiar la calidad gráfica o el idioma (ADR-0006, ADR-0009). La partida sigue y el sonido tendría que seguir igual.
- Los menús de React (botones, ajustes, aviso de desbloqueo) también suenan.
- Los navegadores no dejan sonar nada hasta el primer toque, clic o tecla del jugador. Si se crea un contexto de audio antes, Chrome avisa en la consola.
- Todo lo que pasa en el combate ya sale como evento puro (`CombatEvent`, `RoundEvent`, ADR-0008), así que hay dónde enganchar cada sonido sin tocar reglas.
- Un agente no puede oír: los sonidos los elige Carmine de oído (S-02).

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| Gestor de sonido de Phaser (`this.sound`) | Ya viene; reproduce archivos y sabe variar el tono | Muere con cada juego recreado (se vuelve a cargar y se corta lo que suena). Los menús de React no tienen escena. Crea su contexto de audio al arrancar, antes del primer gesto. No limita voces ni escalona ráfagas |
| Howler.js | Probado, con respaldo de formatos | Otra dependencia para lo poco que hace falta; el límite de voces y las ráfagas habría que escribirlos igual |
| Módulo propio con Web Audio | Vive fuera de Phaser y sobrevive a recrear el juego; un solo sitio decide si algo suena; buses, compresor y paneo a medida | Hay que escribir la carga, el primer gesto y la pausa |
| Sonidos sintetizados al vuelo (sin archivos) | Nada que descargar ni licencias, como el arte pintado | Lo orgánico suena peor; Carmine eligió archivos (S-01) |

## Decisión

Un módulo propio en `src/game/audio/`, con Web Audio, y Phaser sin audio (`audio: { noAudio: true }` en `createGame`).

- **Un solo módulo reproduce** (`sfx.ts`, `sfx.play(id, pan)`). Escenas, vistas y componentes le piden sonidos; ninguno usa Phaser ni Web Audio para eso. Como `src/i18n/` o `save.ts`, lo usan los dos lados sin pasar por `EventBus`: no es Phaser hablando con React.
- **Qué suena con cada evento** lo deciden funciones puras con test (`cues.ts`): un disparo por planta aunque tenga 3 cañones, el sonido de cada elemento al disparar y al impactar, sin "enemigo eliminado" para los que caen en una explosión o con el Creeper, el tic de la cuenta atrás de la mina (sale del estado, como su número), lo que hace el jugador. La escena les pasa los eventos de cada paso.
- **Cuánto suena** lo deciden reglas puras con test (`voices.ts`): un máximo de voces por efecto y otro para todo el jardín, una separación mínima entre dos iguales y, si llegan varios a la vez, una ráfaga corta escalonada de unos pocos (`burst`). Lo que no cabe no suena: nunca se corta uno que suena. Tono y volumen varían un poco en cada repetición, y un compresor al final de la mezcla evita la saturación.
- **Dos canales.** El jardín (`world`) se calla con un fundido corto al pausar y no suena nada nuevo hasta reanudar. Los menús (`ui`) siguen sonando en pausa. La pestaña oculta y el aviso de girar suspenden el contexto entero.
- **Primer gesto.** El contexto se crea con el primer toque, clic o tecla. Los archivos se descargan antes, cuando la portada ya se ve, y se decodifican al crear el contexto. Lo que se pide mientras se decodifica espera hasta `lateMs`; si no llega, no suena.
- **Números en `src/game/config/audio.ts`** (volumen, voces, separación, ráfaga, variación de tono, variantes de cada efecto y la mezcla general), no en `balance.ts`: no cambian el juego.
- **Archivos en `public/audio/`**, OGG Vorbis con respaldo en MP3, en mono, con el volumen igualado y sin silencio al principio ni al final (S-03). Los fabrica `npm run audio` (`scripts/audio/`) a partir de un manifiesto: capas de los paquetes CC0 de Kenney o recetas de jsfxr, mezcladas con ffmpeg. `public/audio/LICENCIAS.md` dice de dónde sale cada archivo y su licencia.
- **Página de prueba** (`/tests/sonidos.html`, solo con `npm run dev`): cada efecto con el elegido y sus alternativas, pruebas de carga con el combate de verdad y "Copiar elecciones" para pasárselas a Claude Code. Sus textos van en español sin `src/i18n/`: no la ve el jugador.
- **Volumen** de 0 a 100 en Opciones y en Ajustes (`sfxVolume` en `rebrote.ajustes`), con su curva. Con 0 no se reproduce nada.

## Consecuencias

- Una mecánica nueva llega con su sonido (regla de `CLAUDE.md`): su efecto en `SfxId` y `SFX`, su fuente en `scripts/audio/manifest.ts`, su regla en `cues.ts` (con test) y su archivo con `npm run audio`. La guía de gráficos tiene la lista "Sonido nuevo".
- Cambiar un sonido no toca código del juego: se cambia el manifiesto y se vuelve a pasar `npm run audio`. Los paquetes de Kenney (`audio-lab/kenney/`, unos 10 MB) y las alternativas de la página de prueba (`audio-lab/candidatos/`) van en el repositorio: tras clonar funcionan `npm run build`, `npm run audio` y `/tests/sonidos.html` sin bajar nada.
- La música (T-015) usará el mismo módulo con un canal más y su propio volumen.
- Pendiente de comprobar en un iPhone de verdad: que Safari decodifica el OGG (si no, el módulo usa el MP3) y que el primer toque desbloquea el audio.
