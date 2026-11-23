import { describe, expect, it } from 'vitest';
import { OUTBREAKS } from '../../game/config/balance';
import { BOSS_KINDS } from '../../game/core/combat';
import { allRosters, bossesInOrder, outbreakRoster, spanText, TROOP_KINDS } from './roster';

describe('catalogo de unidades (T-040)', () => {
  it('cada tropa sale en algun brote: si no, el catalogo no la ensena', () => {
    const shown = new Set(allRosters().flatMap((roster) => roster.troops.map((troop) => troop.kind)));
    expect(TROOP_KINDS.filter((kind) => !shown.has(kind))).toEqual([]);
  });

  it('cada jefe sale una vez, en el orden de sus brotes', () => {
    expect([...bossesInOrder()].sort()).toEqual([...BOSS_KINDS].sort());
    expect(bossesInOrder().slice(0, OUTBREAKS.length)).toEqual(OUTBREAKS.map((o) => o.boss).filter(Boolean));
  });

  it('brote 3: los niveles por tramo de rondas y la escolta de nivel 10 aparte', () => {
    const brain = outbreakRoster('brain');
    expect(brain.number).toBe(3);
    expect(brain.bossRound).toBe(8);
    const armored = brain.troops.find((troop) => troop.kind === 'lurkerArmored')!;
    expect(armored.appearances).toEqual([
      { rounds: [2], levels: [1, 2, 3, 4], fixed: false, escort: false },
      { rounds: [3, 4], levels: [1, 2, 3, 4, 5, 6, 7], fixed: false, escort: false },
      { rounds: [5, 6], levels: [3, 4, 5, 6, 7, 8, 9], fixed: false, escort: false },
      { rounds: [7, 8], levels: [5, 6, 7, 8, 9], fixed: false, escort: false },
      { rounds: [8], levels: [10], fixed: true, escort: true },
    ]);
    expect(armored.levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // Ninguna tropa al azar pasa del 9 (T-035).
    for (const troop of brain.troops) for (const a of troop.appearances) if (!a.fixed) expect(Math.max(...a.levels)).toBeLessThanOrEqual(9);
  });

  it('cuenta los tramos como se leen', () => {
    expect(spanText([3])).toBe('3');
    expect(spanText([7, 8])).toBe('7 y 8');
    expect(spanText([1, 2, 3, 4])).toBe('1 a 4');
    expect(spanText([2, 5, 8])).toBe('2, 5 y 8');
  });
});
