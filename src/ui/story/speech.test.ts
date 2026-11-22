import { describe, expect, it } from 'vitest';
import { FIRST_OUTBREAK, roundCount } from '../../game/core/outbreaks';
import { roundUnlocks } from '../../game/core/rounds';
import { LANGUAGES, text } from '../../i18n';
import { PATTY_TALK, nextPattyLine, pattyGreets, pattyLine, unlockSpeech } from './speech';

/** Generador de numeros fijo, para probar lo que sale al azar. */
const fixed = (value: number) => () => value;

describe('quien presenta lo nuevo y que dice (T-032)', () => {
  it('en el brote 1, Boxer: el primer aviso dice "Toma, esto te va a hacer falta" (VT-02) y las frases rotan', () => {
    const t = text('es');
    const noticed = Array.from({ length: roundCount(FIRST_OUTBREAK) }, (_, i) => i).filter((i) => roundUnlocks(FIRST_OUTBREAK, i).length > 0);
    expect(noticed).toEqual([1, 2, 3, 4, 5]);
    const speeches = noticed.map((i) => unlockSpeech(t, FIRST_OUTBREAK, i));
    expect(speeches.every((speech) => speech.speaker === 'boxer')).toBe(true);
    expect(speeches[0].text).toBe('Toma, esto te va a hacer falta.');
    const lines = t.unlock.presenters.boxer;
    expect(speeches.map((speech) => speech.text)).toEqual([lines[0], lines[1], lines[2], lines[0], lines[1]]);
  });

  it('en el brote 3, Patty no dice que ha creado algo: ha reforzado el escudo (T-037, ES-01)', () => {
    expect(unlockSpeech(text('es'), 'brain', 1)).toEqual({
      speaker: 'patty',
      expression: 'happy',
      text: 'He reforzado el escudo: ahora aguanta sobre una disparadora.',
    });
    expect(unlockSpeech(text('en'), 'brain', 1).text).toBe('I reinforced the shield: now it holds on a shooter.');
    // El muro del brote 2 sigue siendo algo nuevo.
    expect(unlockSpeech(text('es'), 'elkCloner', 1).text).toBe('¡He creado algo nuevo!');
  });

  it.each(LANGUAGES)('%s: Boxer y Patty tienen sus frases, y la primera de Patty es "He creado algo nuevo" (VT-03)', (language) => {
    const { presenters } = text(language).unlock;
    for (const lines of Object.values(presenters)) {
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) expect(line.length).toBeGreaterThan(5);
    }
    expect(presenters.patty[0]).toBe(language === 'es' ? '¡He creado algo nuevo!' : 'I made something new!');
  });
});

describe('Patty en el Invernadero (T-032, VT-05)', () => {
  it('a veces dice algo al entrar', () => {
    expect(pattyGreets(fixed(0))).toBe(true);
    expect(pattyGreets(fixed(PATTY_TALK.greetChance - 0.01))).toBe(true);
    expect(pattyGreets(fixed(PATTY_TALK.greetChance))).toBe(false);
    expect(pattyGreets(fixed(0.999))).toBe(false);
  });

  it('nunca repite la frase anterior, y puede decir cualquier otra', () => {
    for (let last = 0; last < 5; last++) {
      const said = new Set<number>();
      for (let r = 0; r < 1; r += 0.01) said.add(nextPattyLine(5, last, fixed(r)));
      expect(said.has(last), `tras la ${last}`).toBe(false);
      expect(said.size).toBe(4);
    }
    const first = new Set<number>();
    for (let r = 0; r < 1; r += 0.01) first.add(nextPattyLine(5, null, fixed(r)));
    expect([...first].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(nextPattyLine(1, 0, fixed(0.5))).toBe(0);
  });

  it.each(LANGUAGES)('%s: pocas frases y cortas; la que usa el nombre se lee bien sin el', (language) => {
    const t = text(language);
    const lines = t.greenhouse.patty;
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines.length).toBeLessThanOrEqual(6);
    for (let i = 0; i < lines.length; i++) {
      expect(pattyLine(t, i, null).length, `${i}`).toBeLessThanOrEqual(70);
      expect(pattyLine(t, i, 'Carmine')).not.toContain('null');
    }
    expect(lines.some((_, i) => pattyLine(t, i, 'Carmine').includes('Carmine'))).toBe(true);
  });
});
