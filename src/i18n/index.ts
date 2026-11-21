import { en } from './en';
import { es, type Dictionary } from './es';

/**
 * Idiomas del juego (T-011, ADR-0009). El espanol es el de referencia (`es.ts`) y el ingles tiene que decir lo mismo con
 * las mismas claves (`en.ts`, comprobado por el tipo `Dictionary`). Las escenas y los modulos de la vista leen el texto
 * en el momento de usarlo con `text()`; React, con `useText()` (`src/ui/useText.ts`).
 */
export type Language = 'es' | 'en';
export type { Dictionary };

export const LANGUAGES: readonly Language[] = ['es', 'en'];

/** Nombre de cada idioma en su propio idioma: el selector se lee igual aunque no entiendas el idioma de la interfaz. */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = { es: 'Español', en: 'English' };

/** Si el navegador no prefiere ninguno de los nuestros, el que se entiende en mas sitios (I-07). */
export const FALLBACK_LANGUAGE: Language = 'en';

const DICTIONARIES: Readonly<Record<Language, Dictionary>> = { es, en };

let current: Language = 'es';
const listeners = new Set<() => void>();

/** El idioma guardado, si es uno de los nuestros. */
export function parseLanguage(value: unknown): Language | null {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value) ? (value as Language) : null;
}

/** El primero de los idiomas preferidos del navegador que tenemos ("es-AR" cuenta como espanol); si no, el de reserva. */
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const found = parseLanguage(tag.toLowerCase().split('-')[0]);
    if (found) return found;
  }
  return FALLBACK_LANGUAGE;
}

export function getLanguage(): Language {
  return current;
}

/** Cambia el idioma de todo el juego y avisa a quien escucha (React vuelve a pintar). */
export function setLanguage(language: Language): void {
  if (language === current) return;
  current = language;
  listeners.forEach((listener) => listener());
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Los textos del idioma en curso (o del pedido). */
export function text(language: Language = current): Dictionary {
  return DICTIONARIES[language];
}

/**
 * Numero con como mucho `decimals` decimales, sin ceros de sobra y con el separador decimal del idioma: coma en
 * espanol (57,5; 0,29) y punto en ingles (57.5; 0.29). Sin separador de miles: los numeros del juego son pequenos.
 */
export function formatNumber(value: number, decimals = 1, language: Language = current): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  const plain = String(Object.is(rounded, -0) ? 0 : rounded);
  return text(language).decimalComma ? plain.replace('.', ',') : plain;
}

/**
 * Cantidad entera con el separador de miles del idioma, para las semillas (T-020), que llegan a 6 cifras: "1080" y
 * "12.345" en espanol (el punto, desde 5 cifras) y "1,080" y "12,345" en ingles. Sin decimales.
 */
export function formatAmount(value: number, language: Language = current): string {
  return new Intl.NumberFormat(text(language).locale, { maximumFractionDigits: 0 }).format(Math.floor(value));
}

/**
 * Fraccion como porcentaje, con un decimal si lo tiene, al estilo del idioma: "20 %" o "4,5 %" en espanol y "20%" o
 * "4.5%" en ingles.
 */
export function formatPercent(fraction: number, language: Language = current): string {
  const value = formatNumber(fraction * 100, 1, language);
  return text(language).decimalComma ? `${value} %` : `${value}%`;
}

/** Milisegundos como segundos con hasta dos decimales: "1,24 s" o "1.24 s". */
export function formatSeconds(ms: number, language: Language = current): string {
  return `${formatNumber(ms / 1000, 2, language)} s`;
}

/**
 * Cuando se guardo algo, contado desde `now`: "ahora mismo", "hace 5 minutos", "hace 3 horas" y, pasado un dia, la fecha
 * y la hora ("18 nov 2026, 21:40").
 */
export function formatSavedAt(savedAt: number, now: number, language: Language = current): string {
  const dictionary = text(language);
  const minutes = Math.round((now - savedAt) / 60_000);
  if (minutes < 1) return dictionary.time.justNow;
  const relative = new Intl.RelativeTimeFormat(dictionary.locale, { numeric: 'auto' });
  if (minutes < 60) return relative.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, 'hour');
  return new Intl.DateTimeFormat(dictionary.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(savedAt);
}

/** Lista con la conjuncion del idioma: "Creeper y Blaster" o "Creeper and Blaster". */
export function formatList(items: readonly string[], language: Language = current): string {
  return new Intl.ListFormat(text(language).locale, { style: 'long', type: 'conjunction' }).format(items);
}
