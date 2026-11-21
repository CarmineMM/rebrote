import { afterEach, describe, expect, it } from 'vitest';
import { ROUND_COUNT } from '../game/core/rounds';
import { en } from './en';
import { es } from './es';
import {
  LANGUAGES,
  detectLanguage,
  formatNumber,
  formatPercent,
  formatSavedAt,
  formatSeconds,
  getLanguage,
  parseLanguage,
  setLanguage,
  subscribeLanguage,
  text,
} from './index';

/** Rutas de todas las hojas del diccionario ("round.notices.3", "title.saveSummary"), con su tipo. */
function leaves(value: unknown, path = ''): Array<[string, string]> {
  if (Array.isArray(value)) return value.flatMap((item, i) => leaves(item, `${path}.${i}`));
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
  }
  return [[path, typeof value]];
}

function functions(value: unknown, path = ''): Array<[string, (...args: unknown[]) => unknown]> {
  if (typeof value === 'function') return [[path, value as (...args: unknown[]) => unknown]];
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => functions(item, path ? `${path}.${key}` : key));
  }
  return [];
}

afterEach(() => setLanguage('es'));

describe('idiomas (T-011)', () => {
  it('el ingles tiene los mismos textos que el espanol, con el mismo tipo', () => {
    expect(leaves(en)).toEqual(leaves(es));
  });

  it('cada ronda del guion tiene su aviso en los dos idiomas', () => {
    for (const language of LANGUAGES) expect(text(language).round.notices).toHaveLength(ROUND_COUNT);
  });

  it('ningun texto queda vacio ni con "undefined" al rellenarlo', () => {
    for (const language of LANGUAGES) {
      for (const [path, value] of leaves(text(language))) {
        if (value === 'string') expect(path).not.toBe('');
      }
      for (const [path, fn] of functions(text(language))) {
        const out = fn(3, 10, 2, 120);
        expect(typeof out, path).toBe('string');
        expect(out, path).not.toMatch(/undefined|NaN|\[object/);
        expect((out as string).length, path).toBeGreaterThan(0);
      }
    }
  });

  it('elige el idioma del navegador si es uno de los nuestros; si no, ingles (I-07)', () => {
    expect(detectLanguage(['es-AR', 'en'])).toBe('es');
    expect(detectLanguage(['fr-FR', 'en-US'])).toBe('en');
    expect(detectLanguage(['EN-gb'])).toBe('en');
    expect(detectLanguage(['de', 'it'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
    expect(parseLanguage('es')).toBe('es');
    expect(parseLanguage('fr')).toBeNull();
    expect(parseLanguage(3)).toBeNull();
  });

  it('cambia el idioma en curso y avisa a quien escucha', () => {
    let calls = 0;
    const stop = subscribeLanguage(() => calls++);
    setLanguage('en');
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(text().pause.title).toBe('Paused');
    expect(calls).toBe(1);
    stop();
    setLanguage('es');
    expect(calls).toBe(1);
  });

  it('numeros, porcentajes y segundos al estilo de cada idioma', () => {
    expect(formatNumber(57.5, 1, 'es')).toBe('57,5');
    expect(formatNumber(57.5, 1, 'en')).toBe('57.5');
    expect(formatNumber(0.2875, 2, 'en')).toBe('0.29');
    expect(formatNumber(-0.01, 1, 'en')).toBe('0');
    expect(formatPercent(0.3, 'es')).toBe('30 %');
    expect(formatPercent(0.3, 'en')).toBe('30%');
    // Cadencia de un nivel con premio (+4,5 %) y acumulada en el nivel 5 (+13,5 %).
    expect(formatPercent(0.045, 'es')).toBe('4,5 %');
    expect(formatPercent(0.135, 'en')).toBe('13.5%');
    expect(formatSeconds(1240, 'es')).toBe('1,24 s');
    expect(formatSeconds(1240, 'en')).toBe('1.24 s');
  });

  it('cuando se guardo la partida: ahora mismo, hace minutos u horas, o la fecha', () => {
    const now = Date.UTC(2026, 10, 20, 12, 0);
    expect(formatSavedAt(now - 20_000, now, 'es')).toBe('ahora mismo');
    expect(formatSavedAt(now - 20_000, now, 'en')).toBe('just now');
    expect(formatSavedAt(now - 5 * 60_000, now, 'es')).toBe('hace 5 minutos');
    expect(formatSavedAt(now - 5 * 60_000, now, 'en')).toBe('5 minutes ago');
    expect(formatSavedAt(now - 3 * 3_600_000, now, 'en')).toBe('3 hours ago');
    expect(formatSavedAt(now - 3 * 86_400_000, now, 'en')).toMatch(/2026/);
  });
});
