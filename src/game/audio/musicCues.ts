import { MUSIC, MUSIC_STAGES, type MusicStage, type MusicTrackId } from '../config/music';
import { OUTBREAKS } from '../config/balance';
import { outbreakIndex, type OutbreakId } from '../core/outbreaks';

/**
 * Que musica suena en cada momento (T-015), sin Web Audio: asi se prueba con Vitest. React le cuenta donde esta el
 * jugador y le pasa al motor (`music.ts`) lo que devuelve.
 */

/** Lo que hace falta saber de la ronda en curso. */
export interface MusicRound {
  readonly outbreak: OutbreakId;
  /** Ronda en curso, desde 1. */
  readonly number: number;
  /** Ronda del combate contra el jefe, desde 1, o null si el brote no tiene. */
  readonly bossRound: number | null;
}

export interface MusicSituation {
  /** Portada y menus, o el tablero. */
  readonly screen: 'title' | 'board';
  /** Ronda en curso en el tablero; null mientras la escena aun no la ha contado (al cargar la partida). */
  readonly round: MusicRound | null;
  /** El juego espera: menu de pausa, aviso de lo desbloqueado, ficha o una viñeta (U-03: la musica baja). */
  readonly halted: boolean;
  /** Partida acabada, ganada o perdida: la musica baja para dejar oir su efecto (T-014). */
  readonly over: boolean;
  /**
   * Una secuencia de la historia con musica propia (`STORY_MUSIC`, T-049): la que se ve o, en la victoria, la ultima que se
   * vio. Manda sobre todo lo demas y suena a volumen normal, salvo tapada (la pausa o el aviso de girar). Sin decir, ninguna.
   */
  readonly story?: { readonly track: MusicTrackId; readonly covered: boolean } | null;
  /** La musica de una secuencia que puede salir pronto (la cinematica al vencer al jefe): se prepara. Sin decir, ninguna. */
  readonly storyAhead?: MusicTrackId | null;
}

export interface MusicCue {
  /** La pista que debe sonar, o null si ninguna. */
  readonly track: MusicTrackId | null;
  /** La que probablemente toca despues: se descarga y se prepara por adelantado. */
  readonly next: MusicTrackId | null;
  /** Fraccion del volumen de musica: 1 normal; menos en pausa o con la partida acabada. */
  readonly level: number;
}

/**
 * Tramo de la historia de un brote (`04-historia.md`): los cuatro primeros defienden el refugio y comparten pistas. Un
 * brote que aun no tiene tramo usa el ultimo (un test avisa: al anadir el quinto brote hay que decidir su musica).
 */
export function musicStage(outbreak: OutbreakId, stages: readonly MusicStage[] = MUSIC_STAGES): MusicStage {
  let first = 0;
  const index = outbreakIndex(outbreak);
  for (const stage of stages) {
    if (index < first + stage.outbreaks) return stage;
    first += stage.outbreaks;
  }
  return stages[stages.length - 1];
}

/** Si el brote tiene tramo propio en `MUSIC_STAGES` (los que no, usan el ultimo). */
export function hasMusicStage(outbreak: OutbreakId, stages: readonly MusicStage[] = MUSIC_STAGES): boolean {
  return outbreakIndex(outbreak) < stages.reduce((sum, stage) => sum + stage.outbreaks, 0);
}

const isBossRound = (round: MusicRound) => round.bossRound !== null && round.number >= round.bossRound;

/**
 * La musica de un momento. `current` es la que suena ahora: mientras el tablero carga y aun no hay ronda, sigue la que
 * habia (la del menu no se corta para volver enseguida).
 * - Portada, Invernadero, ruta y tienda: la del menu. La siguiente, la de ronda del primer tramo (el jugador puede
 *   empezar en cualquier momento).
 * - Tablero: la de ronda de su tramo y, desde la ronda del jefe (tambien su preparacion), la del jefe. La del jefe se
 *   prepara una ronda antes.
 * - Pausa, aviso, ficha o viñeta: baja a `MUSIC.haltedLevel`. Partida acabada: a `MUSIC.overLevel`.
 * - Una secuencia de la historia con musica propia (T-049): la suya, a volumen normal (baja solo tapada), y en la victoria
 *   sigue hasta salir del tablero. La de la que puede salir al vencer al jefe se prepara en su ronda, y en la portada en vez
 *   de la de ronda.
 */
export function musicFor(situation: MusicSituation, current: MusicTrackId | null = null): MusicCue {
  const { story, storyAhead = null } = situation;
  if (story) return { track: story.track, next: null, level: story.covered ? MUSIC.haltedLevel : 1 };
  const level = Math.min(situation.halted ? MUSIC.haltedLevel : 1, situation.over ? MUSIC.overLevel : 1);
  if (situation.screen === 'title') return { track: 'menu', next: storyAhead ?? musicStage(OUTBREAKS[0].id).round, level };
  const { round } = situation;
  if (!round) return { track: current, next: null, level };
  const stage = musicStage(round.outbreak);
  if (isBossRound(round)) return { track: stage.boss, next: storyAhead, level };
  const bossSoon = round.bossRound !== null && round.number >= round.bossRound - MUSIC.prepareBossRounds;
  return { track: stage.round, next: bossSoon ? stage.boss : null, level };
}
