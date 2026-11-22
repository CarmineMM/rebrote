# Guía de idiomas

Cómo se escriben los textos de Rebrote para que salgan en español y en inglés (T-011). La decisión de fondo está en el ADR-0009.

## 1. Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `src/i18n/es.ts` | Todos los textos en español. Es el idioma de referencia: de aquí sale el tipo `Dictionary` |
| `src/i18n/en.ts` | Los mismos textos en inglés, con las mismas claves (si falta o sobra una, `npm run build` falla) |
| `src/i18n/index.ts` | Idioma en curso (`getLanguage`, `setLanguage`), textos (`text()`), formatos de número, porcentaje, segundos y fecha, e idioma del navegador (`detectLanguage`) |
| `src/ui/useText.ts` | `useText()` y `useLanguage()` para React: el componente se vuelve a pintar al cambiar de idioma |
| `src/i18n/i18n.test.ts` | Mismas claves en los dos, un aviso por ronda de cada brote, ninguna función que devuelva "undefined", ningún "mundo" y los formatos |

## 2. Cómo se usa

- **En React:** `const t = useText();` y luego `t.pause.title`. Nada de textos escritos en el JSX.
- **En escenas, vistas y módulos puros:** `text().board.attack` en el momento de usarlo, no guardado en una constante al cargar el módulo (el idioma puede cambiar).
- **Textos con números:** son funciones. Los números llegan ya formateados con el idioma:
  - `formatNumber(57.5)` → "57,5" o "57.5". Sin ceros de sobra y sin separador de miles.
  - `formatPercent(0.4)` → "40 %" o "40%".
  - `formatSeconds(1240)` → "1,24 s" o "1.24 s".
  - `formatSavedAt(savedAt, now)` → "hace 5 minutos" o "5 minutes ago".
  - `formatAmount(12345)` → "12.345" o "12,345". Enteros con separador de miles (en español, desde 5 cifras: "1080"); para las semillas (T-020), que llegan a 6 cifras.
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
  | Escudo, muro (T-024) | Shield, wall |
  | Gusano, acorazado, escupidor | Worm, armored worm, spitter worm |
  | Copycat, Copycat acorazado, Copycat escupidor (T-025) | Copycat, Armored Copycat, Spitter Copycat |
  | Copia (de un Copycat) | Copy |
  | Minstrel, verso (T-025) | Minstrel, verse |
  | Elk Cloner, el Poeta; poema entero (T-026) | Elk Cloner, the Poet; whole poem |
  | Moneda | Coin |
  | Semillas (T-020) | Seeds |
  | Vidas | Lives |
  | Ronda | Round |
  | Brote ("Brote 1: Creeper") | Outbreak ("Outbreak 1: Creeper") |
  | Ficha | Info card |
  | Invento, carga (T-021, T-036: antes "poder") | Gadget, charge |
  | Recolocar, granada, muro de hielo (T-021) | Replant, grenade, ice wall |
  | Laboratorio de Patty, fabricar, mejorar, inventos del brote, vivero (T-022, T-036: antes "tienda", "comprar" y "plantas") | Patty's Lab, build, upgrade, outbreak gadgets, nursery |

- Creeper habla en mayúsculas, como en su terminal. En inglés su frase de entrada es la del original de 1971: "I'M THE CREEPER: CATCH ME IF YOU CAN!".
- Elk Cloner (T-026) habla siempre rimando, en español y en inglés: cada frase rima en su idioma (no se traduce palabra por palabra). Sus versos se inventan para el juego: no se reproduce el poema del virus de verdad.
- **Nombres que se conocen en inglés (22 nov 2026, Carmine):** si el nombre de un enemigo, un personaje o una pieza es más conocido en todo el mundo en inglés, se queda en inglés también en español, como un nombre propio y con mayúscula: Creeper, Copycat, Minstrel. Lo que lo describe sí se traduce ("Copycat acorazado" / "Armored Copycat"), y en plural no cambia ("los Copycat"). Si hay duda, se pregunta a Carmine.
- No se traducen: "Rebrote", Creeper, Elk Cloner (T-026), Copycat y Minstrel (T-025), Boxer, Patty, los nombres de tecnologías, el nombre de cada idioma en el selector y el apodo que pone Boxer, "Rookie" (T-033, NJ-03), que vive en `src/game/playerName.ts` porque se guarda en el perfil como un nombre más.
- El nombre del jugador (T-033) es un dato: nunca se traduce y siempre va como argumento dentro de la frase (`story.lines`, `greenhouse.hello`, `name.saved`).
- La IA de la historia es "ella" en español y "she" en inglés (T-031).
- **Quién habla (T-032).** Las frases de los tours las dice Boxer: de tú, con prisa y algo de gracia, pero cortas e igual de claras. Lo que presenta un desbloqueo lo dice Boxer en el brote 1 y Patty desde el brote 2 (`unlock.presenters`: Patty siempre empieza por "¡He creado algo nuevo!"). Patty en el Invernadero (`greenhouse.patty`): frases cortas que puedan salir en cualquier momento, sin contar nada del juego.
- Un texto en inglés puede ser más largo: hay que comprobar que cabe donde va (cartas de tamaño fijo, botones del menú, rótulos del tablero) en los dos idiomas.

## 5. Lista de comprobación

### Texto nuevo
- [ ] Está en `es.ts` y en `en.ts`, con la misma clave. Ninguno escrito a mano en un componente, una escena o una vista.
- [ ] Si lleva números, es una función y los recibe formateados (`formatNumber`, `formatPercent`, `formatSeconds`). Ningún número de balance escrito dentro.
- [ ] En escenas y vistas se lee con `text()` al usarlo; en React, con `useText()`.
- [ ] Cabe en su sitio en los dos idiomas, también en el HUD compacto (860 y 568 px de ancho).
- [ ] Si se pinta en una textura, se lee en el pintor de `textures.ts` (el juego se recrea al cambiar de idioma y la vuelve a pintar).

### Ronda nueva
- [ ] Su aviso de una línea está en `round.notices.<brote>` (el `id` de su brote), en su posición, en los dos idiomas (el test comprueba que hay uno por ronda de cada brote).

### Brote nuevo (T-018)
- [ ] Sus avisos de ronda están en `round.notices.<brote>`, uno por ronda, en los dos idiomas.
- [ ] Lo que cuenta Boxer de su jefe (T-032) está en `story.lore.<brote>` en los dos idiomas: `line`, una línea que avisa de que llega y dice qué fue el virus de verdad; `card`, lo completo para su ficha (el test comprueba que cada brote los tiene).
- [ ] Su jefe tiene nombre en `info.enemy.names`: de ahí sale "Brote N: jefe" (`outbreak.title`, compuesto en `src/ui/outbreakName.ts` con `bossName`). No se escribe a mano. Si el brote está en preparación y su jefe aún no es un enemigo del juego (T-024), el nombre va en `outbreak.comingBoss.<brote>` hasta que lo sea.
- [ ] Los textos que van con cada jefe (T-026) tienen el suyo, con su clave: `victory.title` y `victory.hint`, `defeat.bossTitle`, `bossText` y `bossHint`, `board.bossDown`, `boss.caught`, y lo que dice en su bocadillo (`creeper`, `elkCloner`), con su grito al mandar a la escolta en `shouts`.
- [ ] Ningún texto dice "mundo": esa palabra queda para el futuro (el test lo comprueba).

### Paso de un tour de ayuda (T-013)
- [ ] Su frase está en `tour.steps.<tour>.<paso>` en los dos idiomas, con la misma clave que el paso de `TOURS` (el test lo comprueba), y el tour tiene su nombre en `tour.names`.
- [ ] Es corta (unas seis u ocho palabras): lo importante lo enseñan la mano y el dibujo. Cabe en el bocadillo a 568 × 320.
- [ ] La dice Boxer (T-032): con su voz. Repasar una frase nunca la alarga: el test compara con lo que medía antes (`LENGTH_BEFORE_T032` en `tours.test.ts`; un paso nuevo se añade ahí con lo que mide).

### Viñeta nueva (T-031)
- [ ] Su texto está en `story.lines.<secuencia>.<viñeta>` en los dos idiomas, con la misma clave que el paso de `STORIES` (el test lo comprueba), y la secuencia tiene su título en `story.titles`.
- [ ] Es corta: dos o tres frases como mucho. Cabe en el bocadillo a 568 × 320 sin desplazarse.
- [ ] Si nombra al jugador, es una función que recibe su nombre o null, y sin nombre se lee bien (trato neutro).
- [ ] Los nombres de los personajes (Boxer, Patty) no se traducen.

### Idioma nuevo
- [ ] `src/i18n/xx.ts` declarado como `Dictionary`, con su `locale` y `decimalComma`.
- [ ] Añadido a `LANGUAGES`, `LANGUAGE_NAMES` y al tipo `Language`.
- [ ] Probado entero: menú de inicio, HUD, pausa, fichas, avisos, derrota, victoria y créditos.
