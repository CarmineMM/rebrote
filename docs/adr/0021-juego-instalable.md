# ADR-0021: El juego se instala como aplicación (PWA)

- **Estado:** Aceptada
- **Fecha:** 2026-11-22

## Contexto

Rebrote era una página web sin más (ADR-0001) y no se podía instalar. Carmine pidió un botón "Instalar" en el menú principal que solo salga si el juego no está instalado (T-029). El juego corre entero en el navegador, así que instalado puede jugarse sin conexión.

Lo que pone la plataforma:
- Chrome y Edge (escritorio y Android) avisan de que se puede instalar (`beforeinstallprompt`) y dejan abrir su diálogo desde un botón propio, una vez por aviso.
- Safari de iPhone y iPad no tiene ese diálogo: se instala desde Compartir, "Añadir a pantalla de inicio". Allí la aplicación instalada no comparte lo guardado con Safari.
- Firefox de escritorio no instala.
- Una página no siempre sabe si ya está instalada cuando se abre desde el navegador.
- Un service worker mal configurado sirve el juego viejo para siempre.

## Decisión

Decisiones de la task, tomadas con su recomendación el 22 nov 2026:

| # | Decisión |
|---|---|
| V-01 | `vite-plugin-pwa` 2 (modo `generateSW`, Workbox): genera el manifiesto y el service worker, y guarda los archivos con su hash de cada build sin listarlos a mano |
| V-02 | En iPhone y iPad el botón abre una ayuda con los dos pasos (Compartir y "Añadir a pantalla de inicio") y avisa de que instalado empieza de cero |
| V-03 | La versión nueva llega sola, sin aviso, y solo se aplica en la portada: nunca en mitad de una partida |
| V-04 | Instalado se abre a pantalla completa y en horizontal |
| V-05 | Los efectos de sonido se guardan al instalar; la música (T-015), no. Desde T-015 (U-05, ADR-0022) la baja el juego después de la portada, en un solo formato, para jugar sin conexión |

Cómo está hecho:

- **Manifiesto y caché** (`src/pwa/manifest.ts`, que lee `vite.config.ts`). Nombre "Rebrote", `display: fullscreen` (con `standalone` de reserva, iPhone), `orientation: landscape`, el color de tema del icono (`THEME_COLOR`, T-028), el verde oscuro de la carga de fondo y los iconos de `npm run icons`, con los maskable para Android. Se guarda todo lo publicado: el código, los iconos y los efectos de `public/audio/` (unos 3,3 MB). Las subcarpetas de `audio/` no: la música va en `audio/musica/` y la guarda el propio juego tras la portada en `rebrote-musica` (T-015, ADR-0022), que el service worker sirve primero (`CacheFirst`).
- **Solo en la versión publicada.** El service worker se registra en `src/pwa/update.ts` solo con `import.meta.env.PROD`; en `npm run dev` no hay ni service worker ni manifiesto. Para probarlo en local: `npm run build` y `npm run preview`. Las páginas de desarrollo (`pruebas/sonidos.html`, `propuestas/disparadoras.html`...) no entran en el build, así que ni se publican ni se guardan.
- **Botón "Instalar"** (`src/pwa/install.ts`, regla pura `installOffer` en `src/pwa/policy.ts`). Escucha `beforeinstallprompt` desde que arranca la página (antes de React) y le quita la barrita de Chrome en Android. El botón va al final del menú de la portada, debajo de Opciones y Créditos:
  - Chrome o Edge: abre su diálogo. Si el jugador acepta, el botón desaparece. Si cancela, el botón sigue; el aviso ya no vale, así que hasta que el navegador avise otra vez el botón abre la ayuda con los pasos de su menú.
  - iPhone y iPad (`isIos`, también el iPad que dice ser un Mac): la ayuda con los dos pasos de Safari.
  - Instalado (`isInstalled`: `display-mode` standalone o fullscreen, o `navigator.standalone`) o un navegador que no instala: no sale. La pantalla completa que pide el juego en el navegador (ADR-0007) también da `display-mode: fullscreen`; esa no cuenta.
  - Instalado, se pide almacenamiento persistente para que el navegador no borre el progreso si se queda sin espacio.
- **Versiones** (`src/pwa/update.ts`, regla pura `shouldApplyUpdate`). El service worker nuevo no entra solo (`registerType: 'prompt'`): se baja y espera. `useUpdateWhenIdle` (`src/ui/usePwa.ts`) lo deja entrar y recarga la página cuando el jugador está en la portada o el Invernadero, sin viñeta encima y sin estar escribiendo su nombre. Si otra pestaña lo dejó entrar, esta tampoco recarga en mitad de una partida: espera igual. Se mira si hay versión nueva al abrir, al volver al juego y cada hora. `cleanupOutdatedCaches` borra lo de la versión anterior.
- **Lo guardado no se toca.** Perfiles, progreso, partida y ajustes están en `localStorage`; la caché de archivos está aparte. "Borrar progreso" no toca la caché y actualizar la caché no toca el progreso. Si una versión cambia `SAVE_VERSION` o `PROGRESS_VERSION`, lo anterior se descarta como siempre (ADR-0014).

## Opciones que no se tomaron

| Opción | Por qué no |
|---|---|
| Manifiesto y service worker a mano | Habría que mantener la lista de archivos con hash de cada build; es justo lo que resuelve el plugin |
| `registerType: 'autoUpdate'` (la versión nueva entra y recarga en cuanto llega) | Recargaría en mitad de una partida |
| Aviso "Hay una versión nueva" con botón | Más pantallas para algo que puede pasar solo en la portada |
| Guardar también la música al instalar | Pesa mucho más que los efectos y se bajarían sus dos formatos. Desde T-015 la baja el juego después, en uno solo |

## Consecuencias

- Instalado, el juego se abre desde su icono, a pantalla completa, en horizontal y sin conexión.
- Quien abre el juego tras una publicación ve la portada unos segundos y se recarga sola con la versión nueva; la versión del pie lo confirma (ADR-0017).
- En iPhone, quien jugó en Safari y luego instala empieza de cero. Se acepta mientras el juego esté en desarrollo (ADR-0014: sin exportación de datos), y la ayuda lo avisa.
- Una carpeta nueva en `public/` que el juego necesite sin conexión tiene que entrar en `PRECACHE_GLOBS`.
- Desinstalar no depende del juego: el navegador puede tardar en volver a ofrecer la instalación.
- `vite-plugin-pwa` arrastra `workbox-build`, con avisos de `npm audit` de gravedad moderada en `glob` y `minimatch`. Solo corren al hacer el build, nunca en el juego publicado.
