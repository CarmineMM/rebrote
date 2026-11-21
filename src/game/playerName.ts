/**
 * El nombre que elige el jugador (T-033): Boxer se lo pregunta tras vencer a Creeper y se guarda en su perfil (T-034,
 * `profiles.ts`). Sin React ni Phaser: lo usan la viñeta que lo pregunta, Opciones y la lectura de los perfiles guardados.
 *
 * Se cuenta como lo ve el jugador: una letra con tilde, una eñe, un emoji o una familia de emojis cuentan como uno. Se
 * muestra siempre como texto (React lo escapa), nunca se interpreta.
 */

/** Letras como mucho (NJ-04). Al menos una, que no sea un espacio. */
export const NAME_MAX_LENGTH = 12;

/**
 * El apodo que pone Boxer a quien prefiere no decir su nombre o salta las viñetas (NJ-02, NJ-03). Es el mismo en todos los
 * idiomas, como los nombres de Boxer y Patty: no se traduce, y se guarda en el perfil como si lo hubiera escrito.
 */
export const NICKNAME = 'Rookie';

/**
 * Lo que no se escribe en un nombre: saltos de linea y otros caracteres de control, los que dan la vuelta al texto y los
 * espacios invisibles. Las uniones de los emojis (U+200D) si se quedan: sin ellas, una familia serian cuatro caras.
 */
const UNWANTED = /[\p{Cc}\u200B\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/gu;
const SPACES = /\s+/gu;
/** Algo que se ve: una letra, un numero, un signo o un emoji. */
const VISIBLE = /[\p{L}\p{N}\p{P}\p{S}]/u;

const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

/** Las letras de un nombre como las ve el jugador. Sin `Intl.Segmenter` (navegadores viejos), por puntos de codigo. */
export function nameGlyphs(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text);
}

/** Cuantas letras tiene, como las ve el jugador. */
export function nameLength(text: string): number {
  return nameGlyphs(text).length;
}

/**
 * Lo que queda en el campo mientras se escribe: sin caracteres de control, con un solo espacio entre palabras, sin
 * espacios delante y sin pasar del maximo. El espacio del final se deja, para poder escribir la palabra siguiente.
 */
export function limitName(raw: string): string {
  const text = raw.replace(SPACES, ' ').replace(UNWANTED, '').replace(SPACES, ' ').replace(/^ /, '');
  const glyphs = nameGlyphs(text);
  return glyphs.length > NAME_MAX_LENGTH ? glyphs.slice(0, NAME_MAX_LENGTH).join('') : text;
}

/** El nombre que se guarda: el del campo sin los espacios del principio y del final. Puede quedar vacio. */
export function cleanName(raw: string): string {
  return limitName(raw).trim();
}

/** Vale como nombre: le queda algo que se ve (no solo espacios). Si no, el boton de confirmar esta apagado. */
export function isValidName(raw: string): boolean {
  return VISIBLE.test(cleanName(raw));
}
