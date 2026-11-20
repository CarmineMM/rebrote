# Guía de idiomas

Cómo se escriben los textos de Rebrote para que salgan en español y en inglés (T-011). La decisión de fondo está en el ADR-0009.

## 1. Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `src/i18n/es.ts` | Todos los textos en español. Es el idioma de referencia: de aquí sale el tipo `Dictionary` |
| `src/i18n/en.ts` | Los mismos textos en inglés, con las mismas claves (si falta o sobra una, `npm run build` falla) |
| `src/i18n/index.ts` | Idioma en curso (`getLanguage`, `setLanguage`), textos (`text()`), formatos de número, porcentaje, segundos y fecha, e idioma del navegador (`detectLanguage`) |
| `src/ui/useText.ts` | `useText()` y `useLanguage()` para React: el componente se vuelve a pintar al cambiar de idioma |
| `src/i18n/i18n.test.ts` | Mismas claves en los dos, un aviso por ronda, ninguna función que devuelva "undefined" y los formatos |

## 2. Cómo se usa

- **En React:** `const t = useText();` y luego `t.pause.title`. Nada de textos escritos en el JSX.
- **En escenas, vistas y módulos puros:** `text().board.attack` en el momento de usarlo, no guardado en una constante al cargar el módulo (el idioma puede cambiar).
- **Textos con números:** son funciones. Los números llegan ya formateados con el idioma:
  - `formatNumber(57.5)` → "57,5" o "57.5". Sin ceros de sobra y sin separador de miles.
  - `formatPercent(0.4)` → "40 %" o "40%".
  - `formatSeconds(1240)` → "1,24 s" o "1.24 s".
  - `formatSavedAt(savedAt, now)` → "hace 5 minutos" o "5 minutes ago".
  - Los enteros (rondas, niveles, monedas) se pasan tal cual.
- **Los números salen de las reglas.** El diccionario nunca lleva un número de balance: "cuenta 2 s" es `text(formatSeconds(MINE.countdownMs))`, no "2 s" escrito.
- **Plurales:** los resuelve la función ("1 vida" / "3 vidas"; "1 life" / "3 lives").
- **Las reglas no llevan texto.** Si una regla necesita algo que se dice (un grito de Creeper), lleva una clave (`shout: 'escort'`) y la vista busca su texto.

## 3. Cambiar de idioma

- Se cambia en Opciones (menú de inicio), en Ajustes (pausa) y con el selector ES/EN del pie del menú de inicio.
- `setLanguage` avisa a React en el acto. El juego de Phaser se recrea, como al cambiar la calidad, y la partida sigue: así lo pintado en el lienzo (rótulos, bocadillos, texturas con texto como la pantalla "CARGANDO" de Creeper) sale ya en el idioma nuevo.
- Por defecto, el idioma del navegador si es español o inglés; si no, inglés. Se guarda en `rebrote.ajustes`.

## 4. Estilo

- **Español:** el de siempre (vocabulario fijo de `CLAUDE.md`: infundir, fusionar, nivel). Coma decimal y espacio antes de "%".
- **Inglés:** frases cortas y naturales, ortografía de Estados Unidos ("color", "armored"), punto decimal y "%" pegado. Vocabulario fijo:

  | Español | Inglés |
  |---|---|
  | Disparadora | Shooter |
  | Cañón | Barrel |
  | Infundir | Infuse |
  | Fusionar | Fuse |
  | Nivel | Level |
  | Mina | Mine |
  | Gusano, acorazado, escupidor | Worm, armored worm, spitter worm |
  | Moneda | Coin |
  | Ronda | Round |
  | Ficha | Info card |

- Creeper habla en mayúsculas, como en su terminal. En inglés su frase de entrada es la del original de 1971: "I'M THE CREEPER: CATCH ME IF YOU CAN!".
- No se traducen: "Rebrote", Creeper, los nombres de tecnologías y el nombre de cada idioma en el selector.
- Un texto en inglés puede ser más largo: hay que comprobar que cabe donde va (cartas de tamaño fijo, botones del menú, rótulos del tablero) en los dos idiomas.

## 5. Lista de comprobación

### Texto nuevo
- [ ] Está en `es.ts` y en `en.ts`, con la misma clave. Ninguno escrito a mano en un componente, una escena o una vista.
- [ ] Si lleva números, es una función y los recibe formateados (`formatNumber`, `formatPercent`, `formatSeconds`). Ningún número de balance escrito dentro.
- [ ] En escenas y vistas se lee con `text()` al usarlo; en React, con `useText()`.
- [ ] Cabe en su sitio en los dos idiomas, también en el HUD compacto (860 y 568 px de ancho).
- [ ] Si se pinta en una textura, se lee en el pintor de `textures.ts` (el juego se recrea al cambiar de idioma y la vuelve a pintar).

### Ronda nueva
- [ ] Su aviso de una línea está en `round.notices`, en su posición, en los dos idiomas (el test comprueba que hay uno por ronda).

### Idioma nuevo
- [ ] `src/i18n/xx.ts` declarado como `Dictionary`, con su `locale` y `decimalComma`.
- [ ] Añadido a `LANGUAGES`, `LANGUAGE_NAMES` y al tipo `Language`.
- [ ] Probado entero: menú de inicio, HUD, pausa, fichas, avisos, derrota, victoria y créditos.
