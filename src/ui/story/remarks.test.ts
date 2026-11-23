import { describe, expect, it } from 'vitest';
import { OUTBREAKS } from '../../game/config/balance';
import { bossFirstSeenRound } from '../../game/core/rounds';
import type { OutbreakId } from '../../game/core/outbreaks';
import { LANGUAGES, text } from '../../i18n';
import { REMARK, REMARKS, remarkAt, remarkFate, remarkHoldMs, remarkKey, remarkText, type Remark } from './remarks';
import { STORY_AT_ROUND, STORY_ORDER, replayableStories } from './stories';
import { typingDuration } from './typewriter';

const at = (round: number, phase: 'prep' | 'attack' = 'prep', outbreak: OutbreakId = 'morris') => ({ outbreak, round, phase });
const all = Object.entries(REMARKS).flatMap(([outbreak, list]) => (list ?? []).map((remark) => ({ outbreak: outbreak as OutbreakId, remark })));

describe('comentarios de la historia (T-043)', () => {
  it('el brote 4 tiene los del guion: en la preparacion de las rondas 2, 3, 4, 6, 8 y 9', () => {
    expect((REMARKS.morris ?? []).map((remark) => remark.round + 1)).toEqual([2, 3, 4, 6, 8, 9]);
    expect((REMARKS.morris ?? []).map((remark) => remark.speaker)).toEqual(['boxer', 'boxer', 'patty', 'patty', 'patty', 'boxer']);
  });

  it('sale en la preparacion de su ronda, no en el ataque ni en otra ronda', () => {
    expect(remarkAt(at(2), [])?.id).toBe('tooGood');
    expect(remarkAt(at(2, 'attack'), [])).toBeNull();
    expect(remarkAt(at(0), [])).toBeNull();
    expect(remarkAt(at(4), [])).toBeNull();
    expect(remarkAt(at(2, 'prep', 'creeper'), [])).toBeNull();
  });

  it('solo la primera vez (HG-02): visto, no vuelve; una partida cargada en otra ronda no saca los de antes', () => {
    const first = remarkAt(at(1), []);
    if (!first) throw new Error('falta el comentario de la ronda 2');
    expect(remarkAt(at(1), [remarkKey('morris', first)])).toBeNull();
    // Cargada en la ronda 6: solo el suyo, aunque no viera ninguno.
    expect(remarkAt(at(5), [])?.id).toBe('maybe');
  });

  it('se apunta con las viñetas vistas, pero no se puede volver a ver desde el Invernadero (HG-06)', () => {
    const keys = all.map(({ outbreak, remark }) => remarkKey(outbreak, remark));
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((key) => key.startsWith('remark:'))).toBe(true);
    expect(keys.some((key) => (STORY_ORDER as readonly string[]).includes(key))).toBe(false);
    expect(replayableStories([...keys, 'morrisOpening'])).toEqual(['morrisOpening']);
  });

  it('cada uno en una ronda de su brote, uno por ronda y nunca en la de una viñeta', () => {
    for (const { id, rounds } of OUTBREAKS) {
      const list = REMARKS[id] ?? [];
      expect(new Set(list.map((remark) => remark.round)).size, id).toBe(list.length);
      expect(new Set(list.map((remark) => remark.id)).size, id).toBe(list.length);
      const stories = [...Object.keys(STORY_AT_ROUND[id] ?? {}).map(Number), bossFirstSeenRound(id)];
      for (const remark of list) {
        expect(remark.round, `${id}.${remark.id}`).toBeGreaterThanOrEqual(0);
        expect(remark.round, `${id}.${remark.id}`).toBeLessThan(rounds.length);
        expect(stories, `${id}.${remark.id}`).not.toContain(remark.round);
      }
    }
  });

  it('Patty duda poco y se va convenciendo: primero dudosa y, al final, contenta', () => {
    const patty = (REMARKS.morris ?? []).filter((remark) => remark.speaker === 'patty').map((remark) => remark.expression);
    expect(patty[0]).toBe('doubtful');
    expect(patty.at(-1)).toBe('happy');
  });
});

describe('los textos de los comentarios (T-043)', () => {
  it.each(LANGUAGES)('%s: cada uno tiene su texto, corto', (language) => {
    const t = text(language);
    for (const { outbreak, remark } of all) {
      const line = remarkText(t, outbreak, remark, null);
      expect(line.length, `${outbreak}.${remark.id}`).toBeGreaterThan(10);
      expect(line.length, `${outbreak}.${remark.id}`).toBeLessThanOrEqual(80);
    }
  });

  it('los del guion, en español', () => {
    const t = text('es');
    const say = (id: string) => remarkText(t, 'morris', (REMARKS.morris ?? []).find((remark) => remark.id === id) as Remark, 'Ana');
    expect(say('tooGood')).toBe('Oye, esto se te da bien. Demasiado bien para seguir escondidos.');
    expect(say('noIdeas')).toBe('No le des ideas, Boxer. El refugio es todo lo que tenemos.');
  });

  it.each(LANGUAGES)('%s: cada uno dura en pantalla unos 5 s (HG-03)', (language) => {
    const t = text(language);
    for (const { outbreak, remark } of all) {
      const line = remarkText(t, outbreak, remark, null);
      const onScreen = typingDuration(line) + remarkHoldMs(line);
      expect(onScreen, `${outbreak}.${remark.id}`).toBeGreaterThanOrEqual(REMARK.onScreenMs);
      expect(onScreen, `${outbreak}.${remark.id}`).toBeLessThanOrEqual(6500);
    }
  });
});

describe('lo que se queda en pantalla (T-043, HG-03)', () => {
  it('una frase corta se queda hasta los 5 s; una larga, al menos lo justo para leerla', () => {
    expect(typingDuration('Hola.') + remarkHoldMs('Hola.')).toBe(REMARK.onScreenMs);
    const long = 'Una frase muy larga, '.repeat(10);
    expect(remarkHoldMs(long)).toBe(REMARK.minHoldMs);
  });
});

describe('que hace un comentario segun el momento (T-043)', () => {
  it('sale en la preparacion sin nada encima', () => {
    expect(remarkFate({ phase: 'prep', over: false, covered: false })).toBe('show');
  });

  it('espera debajo de una viñeta, un tour, un aviso, una ficha o la pausa: nunca coinciden en pantalla', () => {
    expect(remarkFate({ phase: 'prep', over: false, covered: true })).toBe('wait');
  });

  it('se corta al empezar el ataque (HG-04) o al acabar la partida', () => {
    expect(remarkFate({ phase: 'attack', over: false, covered: false })).toBe('cut');
    expect(remarkFate({ phase: 'attack', over: false, covered: true })).toBe('cut');
    expect(remarkFate({ phase: 'prep', over: true, covered: false })).toBe('cut');
    expect(remarkFate({ phase: null, over: false, covered: false })).toBe('cut');
  });
});
