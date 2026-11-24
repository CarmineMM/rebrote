import { describe, expect, it } from 'vitest';
import { BOARD, LIVES, OUTBREAKS, SEEDS } from '../config/balance';
import { createMatch, type MatchState } from './match';
import { FIRST_OUTBREAK, roundCount } from './outbreaks';
import { roundScript, stepRound } from './rounds';
import {
  addSeeds,
  creditRound,
  heartBonusPercent,
  newMatchSeeds,
  openingBonusCap,
  rollSeedPercent,
  rollSeeds,
  seedCaps,
  seedPayout,
  settleSeeds,
} from './seeds';

const HOLE_X = BOARD.columns + 0.75;
/** El azar mas bajo y el mas alto que da Math.random. */
const LOW = () => 0;
const HIGH = () => 0.999_999;

/** La ronda en curso, ya despejada: todos sus grupos fuera y ningun enemigo vivo. El siguiente paso la da por superada. */
function cleared(state: MatchState): MatchState {
  const { groups } = roundScript(state.outbreak, state.round.index);
  return { ...state, enemies: [], round: { ...state.round, phase: 'attack', elapsedMs: 999_999, released: groups.length } };
}

/** Juega el brote 1 entero, ronda a ronda, con el azar `random` y las vidas `lives`; perdiendo en `loseAt` (desde 0) si se dice. */
function play(random: () => number, { replay = false, lives = LIVES.start, loseAt }: { replay?: boolean; lives?: number; loseAt?: number } = {}): MatchState {
  let state: MatchState = { ...createMatch(undefined, 0, FIRST_OUTBREAK, replay), lives };
  while (state.round.phase !== 'won') {
    if (state.round.index === loseAt) return settleSeeds({ ...state, lives: 0 }, random);
    state = stepRound(cleared(state), 16, HOLE_X, random).state;
  }
  return settleSeeds(state, random);
}

describe('semillas: cada recompensa, al azar entre un porcentaje y otro de su tope (T-020, C-02 y C-03)', () => {
  it('la primera vez, entre el 75 y el 100 % del tope, los dos incluidos', () => {
    expect(rollSeedPercent(false, LOW)).toBe(SEEDS.firstPercent.min);
    expect(rollSeedPercent(false, HIGH)).toBe(SEEDS.firstPercent.max);
    expect(SEEDS.firstPercent).toEqual({ min: 75, max: 100 });
  });

  it('en un brote ya vencido, entre el 15 y el 25 %', () => {
    expect(rollSeedPercent(true, LOW)).toBe(SEEDS.replayPercent.min);
    expect(rollSeedPercent(true, HIGH)).toBe(SEEDS.replayPercent.max);
    expect(SEEDS.replayPercent).toEqual({ min: 15, max: 25 });
  });

  it('nunca sale del margen ni da decimales, con cualquier azar', () => {
    for (let i = 0; i < 1000; i++) {
      const random = () => i / 1000;
      for (const replay of [false, true]) {
        const { min, max } = replay ? SEEDS.replayPercent : SEEDS.firstPercent;
        const percent = rollSeedPercent(replay, random);
        expect(Number.isInteger(percent) && percent >= min && percent <= max).toBe(true);
        expect(Number.isInteger(rollSeeds(SEEDS.round, replay, random))).toBe(true);
      }
    }
  });

  it('no da siempre lo mismo: con azares distintos salen cantidades distintas', () => {
    const amounts = new Set(Array.from({ length: 26 }, (_, i) => rollSeeds(SEEDS.round, false, () => i / 26)));
    expect(amounts.size).toBeGreaterThan(10);
  });

  it('redondea hacia abajo: 75 % de 50 son 37', () => {
    expect(rollSeeds(50, false, LOW)).toBe(37);
    expect(rollSeeds(50, true, LOW)).toBe(7);
  });

  it('los topes del brote 1 son los de SEEDS', () => {
    expect(seedCaps(FIRST_OUTBREAK)).toEqual({ round: SEEDS.round, boss: SEEDS.boss });
  });
});

describe('semillas: lo que llevan las rondas de la partida (T-020)', () => {
  it('una partida empieza sin nada sumado ni cobrado, y sabe si su brote ya estaba vencido', () => {
    expect(createMatch().seeds).toEqual(newMatchSeeds(false));
    expect(createMatch(undefined, 0, FIRST_OUTBREAK, true).seeds).toEqual({ replay: true, rounds: 0, earned: 0, payout: null });
  });

  it('cada ronda superada suma lo suyo y cuenta una ronda mas; la 1 del brote 1, tambien el premio de estreno (T-047)', () => {
    const first = creditRound(createMatch(), HIGH);
    expect(first.seeds).toBe(SEEDS.round);
    expect(first.bonus).toBe(SEEDS.round);
    const second = creditRound({ ...first.state, round: createMatch(undefined, 1).round }, LOW);
    expect(second.bonus).toBe(0);
    expect(second.state.seeds).toEqual({ replay: false, rounds: 2, earned: 2 * SEEDS.round + 37, payout: null });
  });

  it('no modifica el estado recibido', () => {
    const state = createMatch();
    creditRound(state, HIGH);
    expect(state.seeds).toEqual(newMatchSeeds());
  });

  it('una partida ya cobrada no suma mas', () => {
    const paid = play(HIGH);
    expect(creditRound(paid, HIGH)).toEqual({ state: paid, seeds: 0, bonus: 0 });
  });
});

describe('semillas: lo que se cobra al acabar (T-020, C-04 y C-05)', () => {
  it('al ganar: las rondas, el jefe y un 10 % de eso por cada vida que queda', () => {
    const won = play(HIGH);
    const rounds = roundCount(FIRST_OUTBREAK) - 1;
    // T-047: con el premio de estreno de la ronda 1, una tirada mas.
    const roundSeeds = rounds * SEEDS.round + openingBonusCap(FIRST_OUTBREAK);
    const subtotal = roundSeeds + SEEDS.boss;
    expect(won.seeds.payout).toEqual({
      won: true,
      replay: false,
      rounds,
      roundSeeds,
      bossSeeds: SEEDS.boss,
      hearts: LIVES.start,
      heartSeeds: Math.floor((subtotal * LIVES.start * SEEDS.heartPercent) / 100),
      keptPercent: 100,
      total: subtotal + Math.floor((subtotal * LIVES.start * SEEDS.heartPercent) / 100),
    });
  });

  it('cuantas mas vidas quedan, mas se cobra', () => {
    const totals = [1, 2, 3].map((lives) => play(HIGH, { lives }).seeds.payout?.total ?? 0);
    expect(totals[0]).toBeLessThan(totals[1]);
    expect(totals[1]).toBeLessThan(totals[2]);
    expect(heartBonusPercent(3)).toBe(30);
    expect(heartBonusPercent(0)).toBe(0);
  });

  it('al perder: solo el 25 % de lo de las rondas superadas, sin jefe ni vidas', () => {
    const lost = play(HIGH, { loseAt: 6 });
    expect(lost.seeds.payout).toEqual({
      won: false,
      replay: false,
      rounds: 6,
      roundSeeds: 7 * SEEDS.round,
      bossSeeds: 0,
      hearts: 0,
      heartSeeds: 0,
      keptPercent: SEEDS.defeatPercent,
      total: Math.floor((7 * SEEDS.round * SEEDS.defeatPercent) / 100),
    });
  });

  it('perder en la ronda 1 no da nada', () => {
    expect(play(HIGH, { loseAt: 0 }).seeds.payout?.total).toBe(0);
  });

  it('una partida a medias no se cobra; una acabada, una sola vez', () => {
    const playing = createMatch();
    expect(settleSeeds(playing)).toBe(playing);
    const paid = play(HIGH);
    expect(settleSeeds(paid, LOW)).toBe(paid);
  });

  it('siempre en enteros', () => {
    for (let i = 0; i < 50; i++) {
      const random = () => (i * 0.37) % 1;
      for (const options of [{}, { replay: true }, { lives: 1 }, { loseAt: 4 }, { replay: true, loseAt: 8 }]) {
        const payout = play(random, options).seeds.payout;
        expect(payout && Object.values(payout).every((value) => typeof value === 'boolean' || Number.isInteger(value))).toBe(true);
      }
    }
  });
});

describe('semillas: los ejemplos de la task (T-020)', () => {
  /** Lo menos y lo mas que puede dar cada partida, con el azar en un extremo y en el otro. */
  const range = (options: Parameters<typeof play>[1]) => [play(LOW, options), play(HIGH, options)].map((state) => state.seeds.payout?.total);

  it('vencer el brote 1 por primera vez sin perder vidas da unas 1000 (de 920 a 1235)', () => {
    expect(range({})).toEqual([920, 1235]);
  });

  it('vencerlo con una sola vida da menos (de 778 a 1045)', () => {
    expect(range({ lives: 1 })).toEqual([778, 1045]);
  });

  it('volver a vencerlo da mucho menos (de 179 a 302)', () => {
    expect(range({ replay: true })).toEqual([179, 302]);
  });

  it('perder en la ronda 7 sin haberlo vencido da poco (de 64 a 87; de 55 a 75 hasta el premio de estreno, T-047)', () => {
    expect(range({ loseAt: 6 })).toEqual([64, 87]);
  });

  it('perder en el combate final sin haberlo vencido (de 83 a 112)', () => {
    expect(range({ loseAt: roundCount(FIRST_OUTBREAK) - 1 })).toEqual([83, 112]);
  });

  it('perder en la ronda 7 de un brote ya vencido', () => {
    expect(range({ replay: true, loseAt: 6 })).toEqual([12, 21]);
  });

  it('perder a proposito en el combate final nunca da mas que volver a ganar el brote', () => {
    const bestLoss = play(HIGH, { loseAt: roundCount(FIRST_OUTBREAK) - 1 }).seeds.payout?.total ?? 0;
    const worstReplay = play(LOW, { replay: true, lives: 1 }).seeds.payout?.total ?? 0;
    expect(bestLoss).toBeLessThan(worstReplay);
  });
});

describe('semillas: el saldo (T-020)', () => {
  it('suma sin pasar de 6 cifras y nunca baja de 0', () => {
    expect(addSeeds(100, 50)).toBe(150);
    expect(addSeeds(SEEDS.maxBalance - 10, 500)).toBe(SEEDS.maxBalance);
    expect(SEEDS.maxBalance).toBe(999_999);
    expect(addSeeds(-5, -3)).toBe(0);
  });

  it('lo de una partida perdida tambien suma, por poco que sea', () => {
    const payout = seedPayout(play(HIGH, { loseAt: 3 }));
    expect(addSeeds(1000, payout.total)).toBe(1000 + payout.total);
  });
});

describe('semillas: el premio de estreno (T-047, R9-05)', () => {
  /** La ronda 1 del brote `outbreak`, recien superada, con el brote ya vencido o no. */
  const firstRound = (outbreak: (typeof OUTBREAKS)[number]['id'], replay = false) => createMatch(undefined, 0, outbreak, replay);

  it('solo lo tiene el brote 1, que perdio su ronda de repaso: el 100 % del tope de una ronda', () => {
    expect(OUTBREAKS.filter((outbreak) => outbreak.openingBonus !== undefined).map((outbreak) => [outbreak.id, outbreak.openingBonus])).toEqual([['creeper', 100]]);
    expect(openingBonusCap(FIRST_OUTBREAK)).toBe(SEEDS.round);
    for (const outbreak of OUTBREAKS.slice(1)) expect(openingBonusCap(outbreak.id), outbreak.id).toBe(0);
  });

  it('sale al superar la ronda 1, con el azar de una ronda: entre el 75 y el 100 % la primera vez', () => {
    expect(creditRound(firstRound(FIRST_OUTBREAK), LOW).bonus).toBe(37);
    expect(creditRound(firstRound(FIRST_OUTBREAK), HIGH).bonus).toBe(SEEDS.round);
  });

  it('en un brote ya vencido da lo de repetir, entre el 15 y el 25 %', () => {
    expect(creditRound(firstRound(FIRST_OUTBREAK, true), LOW).bonus).toBe(7);
    expect(creditRound(firstRound(FIRST_OUTBREAK, true), HIGH).bonus).toBe(12);
  });

  it('tiene su propio azar: no tiene por que dar lo mismo que la ronda', () => {
    const rolls = [0, 0.999];
    const credit = creditRound(firstRound(FIRST_OUTBREAK), () => rolls.shift() ?? 0);
    expect([credit.seeds, credit.bonus]).toEqual([37, SEEDS.round]);
    expect(credit.state.seeds.earned).toBe(37 + SEEDS.round);
  });

  it('ninguna otra ronda lo da, ni la ronda 1 de los demas brotes', () => {
    for (let index = 1; index < roundCount(FIRST_OUTBREAK) - 1; index++) {
      expect(creditRound(createMatch(undefined, index), HIGH).bonus, `ronda ${index + 1}`).toBe(0);
    }
    for (const outbreak of OUTBREAKS.slice(1)) expect(creditRound(firstRound(outbreak.id), HIGH).bonus, outbreak.id).toBe(0);
  });

  it('compensa la ronda quitada: ganar el brote 1 da lo mismo que con las 10 rondas de antes', () => {
    // Con 10 rondas: 9 superadas dando semillas y el jefe. Con 9: 8 superadas, el premio y el jefe.
    expect(play(LOW).seeds.payout?.roundSeeds).toBe(9 * 37);
    expect(play(HIGH).seeds.payout?.roundSeeds).toBe(9 * SEEDS.round);
  });

  it('al perder se cobra su 25 %, como lo de las rondas; perder en la ronda 1 sigue sin dar nada', () => {
    const lostIn2 = play(HIGH, { loseAt: 1 }).seeds.payout;
    expect(lostIn2).toMatchObject({ rounds: 1, roundSeeds: 2 * SEEDS.round, total: Math.floor((2 * SEEDS.round * SEEDS.defeatPercent) / 100) });
    expect(play(HIGH, { loseAt: 0 }).seeds.payout?.total).toBe(0);
  });
});
