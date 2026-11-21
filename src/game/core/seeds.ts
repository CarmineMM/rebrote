import { SEEDS } from '../config/balance';
import { isDefeated } from './combat';
import type { MatchState } from './match';
import { outbreakIndex, type OutbreakId } from './outbreaks';

/**
 * Semillas (T-020): la moneda que el jugador se lleva de la partida, aparte de la de la partida (`MatchState.balance`).
 * Las rondas superadas las van sumando a la partida (`MatchState.seeds`), pero no se cobran hasta que acaba: al ganar, con
 * lo del jefe y lo de los corazones que quedan; al perder, solo una parte de lo de las rondas. Lo cobrado pasa al
 * progreso permanente (`Progress.seeds`, ADR-0014), y eso lo hace la escena, no estas reglas.
 *
 * Decidido el 21 nov 2026 (C-01 a C-05), con los valores en `SEEDS` de `balance.ts`:
 * - Cada recompensa es un azar entre un porcentaje y otro de su tope, nunca un valor fijo (C-02).
 * - En un brote ya vencido el azar da mucho menos (C-03).
 * - Al perder se cobra, pero poco (C-04).
 * - Al ganar, cuantos mas corazones quedan, mas se cobra: un porcentaje de lo ganado (C-05).
 */

/** Lo que se cobro al acabar una partida, y de donde sale, para ensenarlo en la victoria y en la derrota. */
export interface SeedPayout {
  readonly won: boolean;
  /** El brote ya estaba vencido al empezar la partida (C-03). */
  readonly replay: boolean;
  /** Rondas superadas que dieron semillas (la del jefe no cuenta: da `bossSeeds`). */
  readonly rounds: number;
  /** Lo que dieron esas rondas, entero: al perder solo se cobra `keptPercent` de ello. */
  readonly roundSeeds: number;
  /** Lo que dio el jefe; 0 si se perdio. */
  readonly bossSeeds: number;
  /** Corazones que quedaban al ganar; 0 si se perdio. */
  readonly hearts: number;
  /** Lo que sumaron esos corazones (C-05). */
  readonly heartSeeds: number;
  /** Porcentaje de lo de las rondas que se cobra: 100 al ganar, `SEEDS.defeatPercent` al perder (C-04). */
  readonly keptPercent: number;
  /** Lo que se cobra: lo que pasa al progreso permanente. */
  readonly total: number;
}

/** Semillas de una partida: lo que llevan sus rondas superadas y, cuando acaba, lo que se cobro. */
export interface MatchSeeds {
  /** El brote ya estaba vencido al empezar (C-03): todo da menos. No cambia aunque se venza en otra pestana. */
  readonly replay: boolean;
  /** Rondas superadas que ya sumaron. */
  readonly rounds: number;
  /** Lo que sumaron, aun sin cobrar. */
  readonly earned: number;
  /**
   * Lo que se cobro al acabar, o null mientras sigue. Con el puesto, la partida ya pago: una partida acabada que se recrea
   * (al cambiar la calidad o el idioma) no paga otra vez.
   */
  readonly payout: SeedPayout | null;
}

/** Topes de un brote: lo maximo que puede dar cada ronda superada y su jefe. */
export interface SeedCaps {
  readonly round: number;
  readonly boss: number;
}

export interface RoundCredit {
  readonly state: MatchState;
  /** Lo que dio la ronda (0 si la partida ya estaba cobrada). */
  readonly seeds: number;
}

/** Semillas de una partida que empieza: nada sumado ni cobrado. */
export function newMatchSeeds(replay = false): MatchSeeds {
  return { replay, rounds: 0, earned: 0, payout: null };
}

/** Topes del brote: los del brote 1 (`SEEDS.round` y `SEEDS.boss`) mas `SEEDS.growthPercent` por cada brote anterior. */
export function seedCaps(outbreak: OutbreakId): SeedCaps {
  const percent = 100 + SEEDS.growthPercent * outbreakIndex(outbreak);
  return { round: Math.floor((SEEDS.round * percent) / 100), boss: Math.floor((SEEDS.boss * percent) / 100) };
}

/** Entre que porcentajes de su tope cae cada recompensa: menos en un brote ya vencido (C-03). */
export function seedPercentRange(replay: boolean): { readonly min: number; readonly max: number } {
  return replay ? SEEDS.replayPercent : SEEDS.firstPercent;
}

/** Porcentaje entero al azar entre los de `seedPercentRange`, los dos incluidos. `random` en [0, 1), como Math.random. */
export function rollSeedPercent(replay: boolean, random: () => number = Math.random): number {
  const { min, max } = seedPercentRange(replay);
  return Math.min(max, min + Math.floor(random() * (max - min + 1)));
}

/** Una recompensa de tope `cap`: su porcentaje al azar, redondeado hacia abajo. */
export function rollSeeds(cap: number, replay: boolean, random: () => number = Math.random): number {
  return Math.floor((cap * rollSeedPercent(replay, random)) / 100);
}

/** Lo que suman los corazones que quedan al ganar, en % de lo ganado (C-05). */
export function heartBonusPercent(hearts: number): number {
  return Math.max(0, hearts) * SEEDS.heartPercent;
}

/**
 * Suma a la partida lo que da la ronda recien superada (la llama `stepRound` al superar una que no es la ultima). Una
 * partida ya cobrada no suma nada. No modifica el estado recibido.
 */
export function creditRound(state: MatchState, random: () => number = Math.random): RoundCredit {
  if (state.seeds.payout) return { state, seeds: 0 };
  const seeds = rollSeeds(seedCaps(state.outbreak).round, state.seeds.replay, random);
  const next: MatchSeeds = { ...state.seeds, rounds: state.seeds.rounds + 1, earned: state.seeds.earned + seeds };
  return { state: { ...state, seeds: next }, seeds };
}

/**
 * Lo que se cobra al acabar la partida. Ganada: las rondas, el jefe y lo de los corazones. Perdida: solo
 * `SEEDS.defeatPercent` de las rondas (C-04). Siempre en enteros, hacia abajo.
 */
export function seedPayout(state: MatchState, random: () => number = Math.random): SeedPayout {
  const { replay, rounds, earned } = state.seeds;
  if (state.round.phase !== 'won') {
    const keptPercent = SEEDS.defeatPercent;
    const total = Math.floor((earned * keptPercent) / 100);
    return { won: false, replay, rounds, roundSeeds: earned, bossSeeds: 0, hearts: 0, heartSeeds: 0, keptPercent, total };
  }
  const bossSeeds = rollSeeds(seedCaps(state.outbreak).boss, replay, random);
  const hearts = Math.max(0, state.lives);
  const heartSeeds = Math.floor(((earned + bossSeeds) * heartBonusPercent(hearts)) / 100);
  return { won: true, replay, rounds, roundSeeds: earned, bossSeeds, hearts, heartSeeds, keptPercent: 100, total: earned + bossSeeds + heartSeeds };
}

/**
 * Cierra las semillas de una partida acabada (ganada o sin vidas): apunta en ella lo que se cobra. Si aun no acabo o ya
 * estaba cobrada, devuelve el mismo estado. No modifica el estado recibido.
 */
export function settleSeeds(state: MatchState, random: () => number = Math.random): MatchState {
  if (state.seeds.payout || !(state.round.phase === 'won' || isDefeated(state))) return state;
  return { ...state, seeds: { ...state.seeds, payout: seedPayout(state, random) } };
}

/** Suma `amount` a un saldo de semillas sin pasar de `SEEDS.maxBalance`. */
export function addSeeds(balance: number, amount: number): number {
  return Math.min(SEEDS.maxBalance, Math.max(0, balance) + Math.max(0, amount));
}
