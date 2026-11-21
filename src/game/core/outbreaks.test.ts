import { describe, expect, it, vi } from 'vitest';
import { BOARD, LIMITS, OUTBREAKS } from '../config/balance';
import { decodeSave, encodeSave, summarizeSave } from '../save';
import { createMatch, type MatchState } from './match';
import {
  FIRST_OUTBREAK,
  isOutbreakId,
  isOutbreakOpen,
  outbreakNumber,
  outbreakOfBoss,
  outbreakScript,
  outbreaksBefore,
  roundCount,
  type OutbreakId,
} from './outbreaks';
import {
  availableCards,
  bossRoundIndex,
  createRound,
  isBossRound,
  levelCapAt,
  levelCapRaisedAfter,
  newFeaturesAt,
  roundUnlocks,
  startAttack,
  stepRound,
  unlockRound,
  unlockedAt,
  type RoundEvent,
} from './rounds';

/**
 * Brotes de prueba (T-018): en vez de los del juego, dos inventados. "alpha" tiene 3 rondas y ensena la disparadora,
 * subir de nivel (tope 5) y la mina de fuego; "beta" va detras, con 2 rondas, otro saldo y otro jefe. Asi se prueba que
 * las reglas salen de los datos de cada brote, sin tocar nada mas.
 */
vi.mock('../config/balance', async (importOriginal) => {
  const real = await importOriginal<typeof import('../config/balance')>();
  const worms = [{ atMs: 1_000, kind: 'worm', lanes: [2] }] as const;
  return {
    ...real,
    OUTBREAKS: [
      {
        id: 'alpha',
        boss: 'armored',
        startingBalance: 300,
        rounds: [
          { unlocks: ['shooter'], quiet: true, groups: worms },
          { unlocks: ['levelUp'], levelCap: 5, groups: worms },
          { unlocks: ['fireMine'], groups: [{ atMs: 1_000, kind: 'armored', lanes: [2] }] },
        ],
      },
      {
        id: 'beta',
        boss: 'spitter',
        startingBalance: 175,
        rounds: [
          // Repite la disparadora (ya desbloqueada en alpha) y trae la mina de hielo, que es lo nuevo.
          { unlocks: ['shooter', 'iceMine'], groups: worms },
          { unlocks: ['fuse'], levelCap: 10, groups: [{ atMs: 1_000, kind: 'spitter', lanes: [2] }] },
        ],
      },
    ],
  };
});

const ALPHA = 'alpha' as OutbreakId;
const BETA = 'beta' as OutbreakId;
const HOLE_X = BOARD.columns + 0.75;

/** Juega la ronda en curso hasta despejarla: adelanta el ataque, saca sus grupos y quita a los enemigos que salieron. */
function clearRound(state: MatchState): { state: MatchState; events: RoundEvent[] } {
  const events: RoundEvent[] = [];
  let current = stepRound(startAttack(state), 0, HOLE_X).state;
  current = stepRound(current, 60_000, HOLE_X).state;
  const step = stepRound({ ...current, enemies: [] }, 16, HOLE_X);
  events.push(...step.events);
  return { state: step.state, events };
}

describe('lista de brotes (T-018)', () => {
  it('cada brote tiene su numero, su jefe, su saldo inicial y sus rondas', () => {
    expect(OUTBREAKS.map((outbreak) => outbreak.id)).toEqual(['alpha', 'beta']);
    expect(FIRST_OUTBREAK).toBe(ALPHA);
    expect([outbreakNumber(ALPHA), outbreakNumber(BETA)]).toEqual([1, 2]);
    expect([roundCount(ALPHA), roundCount(BETA)]).toEqual([3, 2]);
    expect(outbreakScript(BETA).startingBalance).toBe(175);
    expect(outbreakOfBoss('spitter')).toBe(BETA);
    expect(outbreakOfBoss('worm')).toBeNull();
    expect(outbreaksBefore(BETA).map((outbreak) => outbreak.id)).toEqual(['alpha']);
    expect(isOutbreakId('beta')).toBe(true);
    expect(isOutbreakId('creeper')).toBe(false);
    expect(() => outbreakScript('gamma' as OutbreakId)).toThrow();
  });

  it('el jefe de cada brote sale en su ultima ronda', () => {
    expect(bossRoundIndex(ALPHA)).toBe(2);
    expect([0, 1, 2].map((i) => isBossRound(ALPHA, i))).toEqual([false, false, true]);
    expect(bossRoundIndex(BETA)).toBe(1);
  });

  it('para entrar en un brote hay que haber vencido al jefe del anterior; el primero siempre se puede jugar (B-04)', () => {
    expect(isOutbreakOpen(ALPHA, [])).toBe(true);
    expect(isOutbreakOpen(BETA, [])).toBe(false);
    expect(isOutbreakOpen(BETA, ['otro'])).toBe(false);
    expect(isOutbreakOpen(BETA, ['alpha'])).toBe(true);
  });
});

describe('un brote de prueba con 3 rondas (T-018)', () => {
  it('su partida va de la ronda 1 a la 3 y la victoria llega tras la tercera', () => {
    let state = createMatch(undefined, 0, ALPHA);
    expect(state.round.index).toBe(0);
    const cleared: number[] = [];
    let won = false;
    for (let guard = 0; guard < 5 && !won; guard++) {
      const step = clearRound(state);
      state = step.state;
      for (const event of step.events) {
        if (event.type === 'roundCleared') cleared.push(event.index);
        if (event.type === 'won') won = true;
      }
    }
    expect(cleared).toEqual([0, 1, 2]);
    expect(won).toBe(true);
    expect(state.round).toMatchObject({ index: 2, phase: 'won' });
  });

  it('no tiene ronda 4', () => {
    expect(() => createRound(ALPHA, 3)).toThrow();
    expect(() => createMatch(undefined, 3, ALPHA)).toThrow();
    expect(createRound(BETA, 1).index).toBe(1);
  });

  it('el resumen de "Cargar partida" cuenta sus 3 rondas, y una guardada en una ronda que su brote no tiene no se carga', () => {
    const match = createMatch(undefined, 1, ALPHA);
    const save = decodeSave(encodeSave(match, null, 5));
    expect(save && summarizeSave(save)).toMatchObject({ outbreak: ALPHA, round: 2, total: 3 });
    // La ronda 3 existe en alpha pero no en beta (que tiene 2).
    const raw = JSON.parse(encodeSave(createMatch(undefined, 2, ALPHA), null, 5));
    expect(decodeSave(JSON.stringify(raw))?.match.round.index).toBe(2);
    expect(decodeSave(JSON.stringify({ ...raw, match: { ...raw.match, outbreak: 'beta' } }))).toBeNull();
    // El aviso sin aceptar tambien tiene que ser de una ronda del brote.
    const pending = { round: 3, items: [{ id: 'fireMine' }] };
    expect(decodeSave(JSON.stringify({ ...raw, pendingUnlock: pending }))?.pendingUnlock).toEqual(pending);
    expect(decodeSave(JSON.stringify({ ...raw, match: { ...raw.match, outbreak: 'beta', round: { ...raw.match.round, index: 1 } }, pendingUnlock: pending }))?.pendingUnlock).toBeNull();
  });
});

describe('desbloqueos por brote (T-018)', () => {
  it('cada ronda desbloquea lo suyo y lo suma a lo de las anteriores del brote', () => {
    expect([...unlockedAt(ALPHA, 0)]).toEqual(['shooter']);
    expect([...unlockedAt(ALPHA, 2)]).toEqual(['shooter', 'levelUp', 'fireMine']);
    expect(unlockRound(ALPHA, 'fireMine')).toBe(2);
    expect(unlockRound(ALPHA, 'fuse')).toBeNull();
  });

  it('el brote 2 trae desbloqueado todo lo del 1 desde su ronda 1 (B-01)', () => {
    expect([...unlockedAt(BETA, 0)]).toEqual(['shooter', 'levelUp', 'fireMine', 'iceMine']);
    expect(availableCards(createMatch(undefined, 0, BETA))).toEqual(['shooter', 'fire', 'ice']);
    expect(unlockedAt(BETA, 1).has('fuse')).toBe(true);
    // Lo que se desbloquea en un brote no llega a los anteriores.
    expect(unlockedAt(ALPHA, 2).has('iceMine')).toBe(false);
  });

  it('solo cuenta como nuevo lo que no llego ya desbloqueado: ni avisa ni trae su tour (B-01)', () => {
    expect(newFeaturesAt(BETA, 0)).toEqual(['iceMine']);
    expect(roundUnlocks(BETA, 0)).toEqual([{ kind: 'feature', feature: 'iceMine' }]);
    expect(roundUnlocks(BETA, 1)).toEqual([
      { kind: 'feature', feature: 'fuse' },
      { kind: 'levelCap', level: 10 },
    ]);
    expect(roundUnlocks(ALPHA, 0)).toEqual([]);
  });

  it('el tope de nivel sigue el del brote anterior hasta que una ronda del nuevo lo cambia (B-01)', () => {
    expect([0, 1, 2].map((i) => levelCapAt(ALPHA, i))).toEqual([LIMITS.maxLevel, 5, 5]);
    expect(levelCapAt(BETA, 0)).toBe(5);
    expect(levelCapAt(BETA, 1)).toBe(10);
    expect(levelCapRaisedAfter(BETA, 0, 5)).toBe(1);
    // Un brote siguiente que sube el tope no cuenta como "sube en la ronda N" del anterior.
    expect(levelCapRaisedAfter(ALPHA, 1, 5)).toBeNull();
  });
});

describe('cada brote empieza de cero (B-02)', () => {
  it('tablero vacio, todas las vidas y el saldo inicial de su brote', () => {
    const beta = createMatch(undefined, 0, BETA);
    expect(beta.outbreak).toBe(BETA);
    expect(beta.balance).toBe(175);
    expect(beta.plants.every((lane) => lane.every((cell) => cell === null))).toBe(true);
    expect(beta.enemies).toEqual([]);
    expect(createMatch().balance).toBe(300);
  });
});
