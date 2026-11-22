# [Audio] Música de fondo

**Estado:** Completada (22 nov 2026, 0.12.1) · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** T-014 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
La música no se genera con Phaser: es un archivo de audio que alguien compuso y que el juego reproduce en bucle (con su propio motor de Web Audio, no con Phaser: ADR-0022). Esta task reutiliza el módulo de audio de T-014. Los créditos ya tienen pantalla (`src/ui/Credits.tsx` y `credits` en `src/i18n/`), que es donde va la atribución si la licencia la pide.

## Objetivos
1. **Tres ambientes:** menú, ronda y jefe.
2. **Cambios suaves** entre pistas, sin cortes.
3. **Licencias en regla** y atribución visible.

## Alcance
**Incluye:** tres pistas en bucle, fundido entre ellas, ajuste `musicVolume` (sugerido) junto al de efectos, carga diferida, atribución en Créditos, origen y licencia anotados junto a cada archivo.
**No incluye:** música adaptativa por capas (idea para más adelante: instrumentos orgánicos con una capa digital que entra cuando aprieta la oleada), una pista por brote.

## Decisiones (cerradas el 22 nov 2026)
Carmine aceptó todas las recomendaciones. Además pidió que la música de jefe valga para los cuatro primeros jefes: según el plan (`04-historia.md`, H-13), son los de la defensa del refugio, y tras el cuarto la historia pasa al ataque.

| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| U-01 | ¿De dónde sale la música? | Incompetech u OpenGameArt, solo con licencia CC0 o CC BY | Carmine |
| U-02 | ¿Qué pistas? | Las elige Carmine de oído en `/musica.html`, entre 15 candidatas (cuatro por ambiente y tres más para la ronda, que pidió para comparar). Menú: «Cozy Puzzle In-Game 3», de mintodog (CC0). Ronda: «Krakatoa», de Kistol (CC0). Jefe: «Chipped urgency (combat)», de centurionofwar (CC0). Ronda y jefe, elegidas de oído en vez de las propuestas de partida («Cozy Puzzle In-Game 1» y «Nano Hoedown») | Carmine |
| U-03 | ¿Qué hace la música en pausa? | Baja de volumen (al 40 %): se nota que el juego sigue ahí | Carmine |
| U-04 | ¿Para qué jefes vale la del jefe? | Para los cuatro de la defensa del refugio (Creeper, Elk Cloner, Brain y Morris): un tramo de `MUSIC_STAGES`. El quinto brote traerá su tramo (un test lo exige) | Carmine |
| U-05 | ¿Se guarda la música para jugar sin conexión? | Sí (lo pidió Carmine al elegir las pistas): con la versión publicada, instalada o no, el juego la baja entera después de la portada, solo en el formato que usa el navegador (unos 3 MB), y la guarda en `MUSIC_CACHE`. No se guarda al instalar (serían los dos formatos) ni con la música a 0. Cada archivo lleva su huella (`?v=`): si cambia una pista, se baja la nueva y la vieja se borra | Carmine |

Las pistas van en `public/audio/musica/`, fuera de lo que se guarda al instalar (`PRECACHE_GLOBS`, ADR-0021); las guarda el juego (U-05).

Cómo quedó (ADR-0022): un motor propio (`src/game/audio/music.ts`) en el mismo contexto de audio que los efectos, una regla pura con test (`musicCues.ts`), las pistas y sus créditos en `src/game/config/music.ts` y su fabricación en `npm run audio` (`scripts/audio/music.ts`, a partir de `MUSIC_MANIFEST`).

## Criterios de aceptación
- [x] En la portada y los menús suena la pista de menú en bucle.
- [x] Al empezar una partida suena la pista de ronda; en la ronda del jefe, la del jefe (desde su preparación; se prepara una ronda antes).
- [x] El cambio entre pistas es un fundido, sin silencio brusco ni dos pistas a todo volumen a la vez (1,8 s; comprobado en Chrome: a los 0,6 s, 0,61 y 0,13; a los 3 s, solo la nueva).
- [x] El bucle no tiene salto audible al repetirse: cada archivo repite justo en su muestra, en OGG y en MP3 (relleno de medio segundo por lado), y los tres empalmes miden como un comienzo de compás cualquiera. Medido con ffmpeg; la última palabra es de Carmine, de oído, en `/musica.html` («Empalme»).
- [x] Hay un control de volumen de música separado del de efectos, y se recuerda (`musicVolume` en `rebrote.ajustes`, en Opciones y en Ajustes).
- [x] Con la música a 0 no se descarga ni se reproduce ninguna pista (comprobado en la pestaña de red).
- [x] La portada aparece igual de rápido que antes: la música se descarga después (a los 2,7 s, con la portada ya en pantalla).
- [x] Con la pestaña oculta o el aviso de girar la pantalla, la música se calla (se suspende el contexto entero).
- [x] Créditos muestra autor, título y licencia de cada pista, en español e inglés (con enlace a la obra y a la licencia).
- [x] Con la versión publicada, la música se guarda sola después de la portada y suena sin conexión (U-05; comprobado con el build: con el servidor apagado suenan la del menú y la de ronda).
- [x] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- La música no puede empezar antes del primer toque del jugador: en la portada arranca con el primer clic.
- Volver del tablero al menú a mitad de un fundido no deja dos pistas sonando.
- Peso: cada pista debería rondar 1 a 2 MB. Si pesa más, se recorta o se baja la calidad.
- Derrota y victoria: la música baja para dejar oír su efecto (T-014).

## Objetivo final con ejemplos
| Momento | Se oye |
|---|---|
| Portada tras el primer clic | Pista de menú |
| Ronda 3 | Pista de ronda |
| Ronda 10, llega Creeper | Fundido a la pista de jefe |
| Música a 0, efectos a 80 | Solo efectos |

## Cómo probarlo (QA)
1. Dejar sonar cada pista dos vueltas completas y escuchar el empalme.
2. Pasar de menú a partida y de la ronda 9 a la 10.
3. Recargar con la música a 0 y mirar en la pestaña de red que no se descarga.
