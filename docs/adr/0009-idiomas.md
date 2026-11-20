# ADR-0009: Idiomas con diccionarios tipados, sin librería

- **Estado:** Aceptada
- **Fecha:** 2026-11-20

## Contexto

T-011 pide que el juego sea multiidioma, de momento en español e inglés. Hasta ahora todos los textos estaban escritos en español dentro del código: en los componentes de React, en la escena (rótulos del tablero, "¡Ahí vienen!"), en las vistas (frases de Creeper, "CARGANDO" pintado en una textura), en la ficha de información (T-010) y en las reglas (`notice` y `shout` del guion de rondas en `balance.ts`).

Condiciones:
- Los textos los usan tres mundos: React (HUD y menús), Phaser (escenas y vistas) y módulos puros con test (`entityInfo.ts`).
- Muchos textos llevan números de las reglas ("×3 = 225", "Un 40 %", "cada 1,24 s") y el formato cambia con el idioma (coma o punto decimal, "40 %" o "40%").
- Algunos textos se pintan en el lienzo una sola vez (texturas, como la pantalla de Creeper preparándose).

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| Librería (i18next, FormatJS) | Plurales, ICU y herramientas de traducción | Dependencia y configuración para dos idiomas; las claves en texto no avisan de un olvido al compilar |
| Archivos JSON por idioma | Fáciles de pasar a un traductor | Sin tipos: una clave que falta solo se ve jugando; los textos con números necesitan un formato propio |
| Diccionarios en TypeScript, uno por idioma, con el mismo tipo | Si falta o sobra un texto, `npm run build` falla. Los textos con números son funciones. Cero dependencias | Un traductor tiene que tocar un `.ts`. Sin herramienta de plurales: cada función los resuelve |

## Decisión

Diccionarios en TypeScript en `src/i18n/`:

- **`es.ts` es el de referencia.** El tipo `Dictionary` sale de él; `en.ts` se declara como `Dictionary`, así que el compilador exige las mismas claves. Un test (`i18n.test.ts`) comprueba además la forma de los dos y que ninguna función devuelve "undefined".
- **Textos con números:** son funciones que reciben los números ya formateados (`formatNumber`, `formatPercent`, `formatSeconds`) o enteros. Los números siguen saliendo de las reglas: el diccionario no tiene números de balance (regla 2 de `CLAUDE.md`).
- **Idioma en curso:** `getLanguage()` y `setLanguage()` en `src/i18n/index.ts`. Las escenas, las vistas y los módulos puros leen el texto en el momento de usarlo con `text()`. React usa `useText()` (`src/ui/useText.ts`), que vuelve a pintar al cambiar el idioma.
- **Cambiar de idioma recrea el juego**, como la calidad (ADR-0006): la partida se continúa con `snapshotMatch` y todo lo pintado en el lienzo (rótulos, bocadillos y texturas con texto) sale ya en el idioma nuevo. Se cambia en Opciones (menú de inicio) y en Ajustes (pausa), y con el selector corto del menú de inicio.
- **Idioma por defecto:** el primero de los preferidos del navegador que tengamos; si ninguno, inglés. Se guarda con los ajustes (`rebrote.ajustes`, campo `language`). La página dice su idioma (`<html lang>`).
- **Las reglas no llevan texto.** El aviso de cada ronda está en `round.notices` (uno por ronda, en orden) y el grito de Creeper es una clave (`shout: 'escort'`) que la vista traduce con `creeper.shouts`.
- **Lo que no se traduce:** el nombre del juego, "Rebrote" (D-08 sigue abierta), los nombres propios (Creeper, Phaser, Claude) y el nombre de cada idioma en el selector, que va en su propio idioma ("Español", "English").

## Consecuencias

- Todo texto nuevo que vea el jugador va a los dos diccionarios en el mismo cambio. Guía y lista de comprobación en `docs/guias/idiomas.md`.
- Los tests de textos (`entityInfo.test.ts`) se escriben en español, que es el idioma por defecto de los módulos, y comprueban el inglés aparte cambiando el idioma.
- Un tercer idioma es un archivo más (`xx.ts` como `Dictionary`), su entrada en `LANGUAGES` y `LANGUAGE_NAMES`, y su `locale` y `decimalComma`.
- Si algún día hace falta un traductor externo o muchos idiomas, se revisa este ADR y se pasa a una librería con extracción de claves.
