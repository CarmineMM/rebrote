import { describe, expect, it } from 'vitest';
import { lastOutbreak } from '../../game/core/route';
import { BETA_SLOT, betaNoticeDue, encodeBetaSeen, markBetaSeen, parseBetaSeen, readBetaSeen } from './betaNotice';

/** Un almacen de mentira, como el hueco de un perfil. */
function memoryStore() {
  const items = new Map<string, string>();
  return { items, getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) };
}

describe('cuando sale solo el aviso de beta (T-044)', () => {
  const victory = (outbreak: string) => ({ kind: 'victory', outbreak }) as const;
  const greenhouse = { kind: 'greenhouse' } as const;
  const LAST = 'gamma';

  it('sale al vencer al ultimo brote por primera vez', () => {
    expect(betaNoticeDue(victory('gamma'), ['alpha', 'beta', 'gamma'], null, LAST)).toBe(true);
  });

  it('no sale al vencer un brote que no es el ultimo', () => {
    expect(betaNoticeDue(victory('alpha'), ['alpha'], null, LAST)).toBe(false);
    expect(betaNoticeDue(victory('beta'), ['alpha', 'beta'], null, LAST)).toBe(false);
  });

  it('no sale al vencer otro brote aunque el ultimo ya estuviera vencido: eso es del Invernadero', () => {
    expect(betaNoticeDue(victory('alpha'), ['alpha', 'beta', 'gamma'], null, LAST)).toBe(false);
    expect(betaNoticeDue(greenhouse, ['alpha', 'beta', 'gamma'], null, LAST)).toBe(true);
  });

  it('una vez visto, no vuelve a salir solo: ni al rejugar el ultimo brote ni en el Invernadero (BT-04)', () => {
    expect(betaNoticeDue(victory('gamma'), ['alpha', 'beta', 'gamma'], 'gamma', LAST)).toBe(false);
    expect(betaNoticeDue(greenhouse, ['alpha', 'beta', 'gamma'], 'gamma', LAST)).toBe(false);
  });

  it('quien ya habia vencido al ultimo antes del aviso lo ve una vez al entrar al Invernadero', () => {
    expect(betaNoticeDue(greenhouse, ['gamma', 'alpha', 'beta'], null, LAST)).toBe(true);
    expect(betaNoticeDue(greenhouse, ['alpha', 'beta'], null, LAST)).toBe(false);
  });

  it('con un brote nuevo, el aviso pasa al nuevo ultimo y quien lo vio en el de antes lo vuelve a ver al vencerlo', () => {
    expect(betaNoticeDue(greenhouse, ['alpha', 'beta', 'gamma'], 'gamma', 'delta')).toBe(false);
    expect(betaNoticeDue(victory('gamma'), ['alpha', 'beta', 'gamma'], 'gamma', 'delta')).toBe(false);
    expect(betaNoticeDue(victory('delta'), ['alpha', 'beta', 'gamma', 'delta'], 'gamma', 'delta')).toBe(true);
  });

  it('sin decir cual, el ultimo es el del juego', () => {
    expect(betaNoticeDue(victory(lastOutbreak()), [lastOutbreak()], null)).toBe(true);
    expect(betaNoticeDue(victory(lastOutbreak()), [lastOutbreak()], lastOutbreak())).toBe(false);
  });
});

describe('lo visto se guarda en el hueco del perfil (T-044, ADR-0018)', () => {
  it('ida y vuelta', () => {
    expect(parseBetaSeen(encodeBetaSeen('morris'))).toBe('morris');
  });

  it('lo que no se entiende cuenta como no visto', () => {
    for (const raw of [null, '', '{', '[]', '{}', '{"seen":3}', '{"seen":""}', JSON.stringify({ seen: 'x'.repeat(65) })]) {
      expect(parseBetaSeen(raw)).toBeNull();
    }
  });

  it('cada jugador tiene el suyo: se lee y se escribe en su almacen', () => {
    const ana = memoryStore();
    const luis = memoryStore();
    markBetaSeen('morris', ana);
    expect(ana.items.has(BETA_SLOT)).toBe(true);
    expect(readBetaSeen(ana)).toBe('morris');
    expect(readBetaSeen(luis)).toBeNull();
  });

  it('un almacen que falla no rompe el juego', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
    };
    expect(readBetaSeen(broken)).toBeNull();
    expect(() => markBetaSeen('morris', broken)).not.toThrow();
  });
});
