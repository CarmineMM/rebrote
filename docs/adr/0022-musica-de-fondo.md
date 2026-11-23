# ADR-0022: Música de fondo en bucle con Web Audio

- **Estado:** Aceptada
- **Fecha:** 2026-11-22

## Contexto

T-015 pide música de fondo: una pista para los menús, otra para las rondas y otra para el jefe, con fundidos entre ellas, un bucle sin salto, su propio volumen y la atribución que pidan sus licencias. El ADR-0013 ya dejó dicho que usaría el módulo de los efectos "con un canal más y su propio volumen".

Lo que condiciona:
- Los navegadores no dejan sonar nada antes del primer gesto, y el juego de Phaser se destruye y se recrea al cambiar la calidad o el idioma (ADR-0006, ADR-0009). La música no puede cortarse por eso.
- Un `<audio loop>` deja un hueco al volver a empezar en muchos navegadores, y un MP3 decodificado puede traer silencio delante (el retraso del codificador) si el archivo no lleva los datos para quitarlo. Varios de los MP3 de Incompetech no los llevan.
- La música pesa: unos 1,7 MB por pista en OGG y, decodificada para Web Audio, unos 45 MB por cada dos minutos en estéreo.
- Instalado, el juego tiene que poder jugarse sin conexión (ADR-0021), también con música. Precachearla al instalar bajaría los dos formatos (OGG y MP3): por eso V-05 la dejaba fuera.
- Las pistas las eligen de oído personas, no un agente (U-02).

## Decisión

Decisiones de la task, tomadas con su recomendación el 22 nov 2026: Incompetech u OpenGameArt con licencia CC0 o CC BY (U-01); las elige Carmine de oído, con marimba, madera o ukelele para menú y ronda y algo más tenso y digital para el jefe (U-02); en pausa la música baja, no se calla (U-03).

Cómo está hecho:
- **Un motor aparte en el mismo contexto** (`src/game/audio/music.ts`). Pide el contexto a `sfx.whenReady`: nace con el primer gesto, se suspende con la pestaña oculta y el aviso de girar, y pasa por el mismo compresor final. Tiene su propio volumen (`musicVolume`, de 0 a 100, en Opciones y en Ajustes) y una ganancia más para la pausa y el final de la partida.
- **Qué suena lo decide una regla pura con test** (`musicCues.ts`, `musicFor`), a partir de la pantalla, la ronda, si el juego espera y si la partida acabó. React se la pasa al motor (`useMusic`); Phaser no interviene.
- **Tramos de la historia.** La música de ronda y la de jefe van por tramos (`MUSIC_STAGES`): el primero son los cuatro brotes de la defensa del refugio (Creeper, Elk Cloner, Brain y Morris; `04-historia.md`). Un test avisa cuando hay un brote sin tramo, así el quinto obliga a decidir su música.
- **Bucles decodificados en memoria.** Cada pista se descarga y se decodifica entera y suena con `AudioBufferSourceNode` en bucle, que empalma justo en la muestra. Cada archivo lleva medio segundo de relleno por cada lado (el final del bucle delante y su principio detrás), y el motor suena entre `loopStart` y `loopEnd`, que distan justo lo que dura el bucle. Así empalma aunque el decodificador meta retraso.
- **Se preparan pocas.** Solo se guardan decodificadas la que suena y la siguiente (la de ronda en la portada; la del jefe una ronda antes de la suya). Lo descargado se queda; lo decodificado que ya no hace falta se suelta.
- **Fundidos.** Al cambiar, la que se va baja mientras la nueva sube (1,8 s); cualquier otra que siguiera sonando baja también. Nunca suenan dos a todo volumen.
- **Descarga después de la portada** y nunca con el volumen a 0.
- **Sin conexión (U-05).** En la versión publicada (con service worker, instalada o no), tras la portada el juego baja todas las pistas en el formato de este navegador (unos 3 MB) y las guarda él mismo en `MUSIC_CACHE`, la caché que también usa el service worker (`CacheFirst`). Lo guardado se lee antes que la red, así que suena sin conexión aunque no se haya oído. Cada dirección lleva una huella (`?v=`, `musicUrls.ts`) hecha con la obra, el bucle y `MUSIC.fileVersion`: una pista nueva con el mismo nombre de archivo se vuelve a bajar y lo guardado de otra huella se borra. No se precachea al instalar: serían los dos formatos.
- **Archivos fabricados por `npm run audio`** (`scripts/audio/music.ts`), a partir de `MUSIC_MANIFEST`: recorta el bucle del original, cierra el empalme, iguala el volumen y escribe OGG y MP3 en estéreo, con su `LICENCIAS.md`. Si el original es una vuelta con algo detrás (una cola o el relleno del codificador), lo que sobra se suma sobre el principio (`fold`). Si no es un bucle, se recorta entre dos compases que suenan parecido y se funde el empalme (`seamMs`). La duración del bucle sale del tempo: compases enteros.
- **Página de prueba** `/tests/musica.html` (solo con `npm run dev`): cada ambiente con la elegida y sus alternativas, para oírlas en bucle o justo en el empalme, y el motor de verdad con sus fundidos, la pausa y el final.
- **Créditos.** Cada pista con su título, autor y licencia (con enlace), en español y en inglés (`MUSIC_TRACKS`).

## Consecuencias

- Al llegar el quinto brote (el giro al ataque) hay que añadir su tramo en `MUSIC_STAGES`, con sus pistas, o el test falla.
- Cambiar una pista no toca el motor: se cambia `MUSIC_MANIFEST` y `MUSIC_TRACKS` y se pasa `npm run audio`, que avisa si la duración, el título o la licencia no cuadran. Su huella cambia sola; si cambia cómo se fabrican los archivos sin cambiar la obra ni el bucle, hay que subir `MUSIC.fileVersion` para que quien la tenga guardada la vuelva a bajar.
- Solo los originales elegidos van al repositorio (`audio-lab/musica/`); las alternativas se quedan en el equipo que las bajó (`.gitignore`).
- La música adaptativa por capas y una pista por brote quedan para más adelante (fuera de T-015).
- Pendiente de comprobar en un iPhone de verdad, como los efectos: que suena tras el primer toque y que el bucle empalma.
