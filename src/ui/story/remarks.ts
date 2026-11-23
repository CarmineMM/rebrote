import type { OutbreakId } from '../../game/core/outbreaks';
import type { RoundPhase } from '../../game/core/rounds';
import type { CharacterId, Expression } from '../../game/view/characters/design';
import type { Dictionary } from '../../i18n';
import { typingDuration } from './typewriter';

/**
 * Los comentarios de la historia (T-043, ADR-0019): una frase de un personaje en la preparacion de una ronda, en un
 * bocadillo pequeno en una esquina, que no para el juego y se va sola. Cuentan la historia sin frenarla: las viñetas
 * paran el juego y en un brote largo cansan (HG-01). Sin React ni Phaser: aqui solo que se dice, quien, con que cara y
 * cuando. Los textos estan en `story.remarks.<brote>` de `src/i18n/`.
 *
 * Anadir los de otro brote es anadir datos aqui y sus textos: ningun componente cambia.
 */

export interface Remark {
  /** Clave de su texto en `story.remarks.<brote>`. */
  readonly id: string;
  /** Ronda del brote (desde 0) en cuya preparacion sale. */
  readonly round: number;
  readonly speaker: CharacterId;
  readonly expression: Expression;
}

/**
 * El guion de los comentarios de cada brote (`docs/specs/04-historia.md`). El brote 4, el giro: Boxer ve como juega el
 * jugador y propone salir; Patty duda un poco y se va convenciendo (T-043).
 */
export const REMARKS: Readonly<Partial<Record<OutbreakId, readonly Remark[]>>> = {
  morris: [
    { id: 'untouched', round: 1, speaker: 'boxer', expression: 'happy' },
    { id: 'tooGood', round: 2, speaker: 'boxer', expression: 'happy' },
    { id: 'noIdeas', round: 3, speaker: 'patty', expression: 'doubtful' },
    { id: 'maybe', round: 5, speaker: 'patty', expression: 'normal' },
    { id: 'promise', round: 7, speaker: 'patty', expression: 'happy' },
    { id: 'lastOne', round: 8, speaker: 'boxer', expression: 'normal' },
  ],
};

/** Como se apunta en lo visto del jugador (`Progress.story`, junto a las viñetas): `remark:<brote>:<frase>`. */
export const remarkKey = (outbreak: OutbreakId, remark: Remark): string => `remark:${outbreak}:${remark.id}`;

/** La ronda en curso de la partida: el brote, la ronda (desde 0) y su fase. */
export interface RemarkMoment {
  readonly outbreak: OutbreakId;
  readonly round: number;
  readonly phase: RoundPhase;
}

/**
 * El comentario que toca en este momento, o null: el de la ronda, solo en su preparacion y solo si no se vio (HG-02). Una
 * partida cargada en otra ronda no saca los de las rondas ya pasadas: cada uno solo sale en la suya.
 */
export function remarkAt(moment: RemarkMoment, seen: readonly string[]): Remark | null {
  if (moment.phase !== 'prep') return null;
  const remark = REMARKS[moment.outbreak]?.find((candidate) => candidate.round === moment.round) ?? null;
  return remark && !seen.includes(remarkKey(moment.outbreak, remark)) ? remark : null;
}

/** Texto del comentario en el idioma de `t`, con el nombre del jugador si la frase lo usa (o null: trato neutro). */
export function remarkText(t: Dictionary, outbreak: OutbreakId, remark: Remark, name: string | null): string {
  const lines = (t.story.remarks as Readonly<Partial<Record<OutbreakId, Readonly<Record<string, string | ((name: string | null) => string)>>>>>)[outbreak];
  const line = lines?.[remark.id];
  return typeof line === 'function' ? line(name) : (line ?? '');
}

/**
 * Ritmo del comentario (HG-03). Espera un poco a que entre la ronda y su aviso, dice la frase letra a letra y se queda
 * en pantalla lo justo para leerla: en total, unos 5 s. Un toque lo cierra antes. Todo se cuenta solo mientras se ve: la
 * pausa, una ficha o el aviso de girar lo congelan.
 */
export const REMARK = {
  /** Lo que espera a salir, ya sin nada encima, al empezar la preparacion. */
  delayMs: 1200,
  /** Lo que esta en pantalla, de que empieza a hablar a que se va, si la frase es corta. */
  onScreenMs: 5000,
  /** Lo que sigue en pantalla, como poco, cuando ya salio la frase entera: una larga se queda un poco mas de 5 s. */
  minHoldMs: 2500,
  /** Lo que tarda en irse. */
  leaveMs: 260,
} as const;

/** Lo que se queda el comentario en pantalla con la frase ya entera: hasta unos 5 s en total, y nunca menos de `minHoldMs`. */
export function remarkHoldMs(line: string): number {
  return Math.max(REMARK.minHoldMs, REMARK.onScreenMs - typingDuration(line));
}

/** Lo que pasa con un comentario en pantalla segun el momento: sigue, espera tapado o se corta. */
export type RemarkFate = 'show' | 'wait' | 'cut';

/**
 * Que hace un comentario que toca o esta en pantalla. Se corta en cuanto empieza el ataque (el jugador adelanto la
 * preparacion o se acabo la cuenta, HG-04: no debe tapar el combate) o se acaba la partida. Espera tapado (sin verse y con
 * su reloj quieto) mientras hay algo encima: una viñeta, un tour, el aviso de lo desbloqueado, una ficha, la pausa o el
 * aviso de girar; asi nunca coincide en pantalla con ellos. La ayuda apagada no lo quita: es historia, no ayuda (HG-07).
 */
export function remarkFate(state: { readonly phase: RoundPhase | null; readonly over: boolean; readonly covered: boolean }): RemarkFate {
  if (state.over || state.phase !== 'prep') return 'cut';
  return state.covered ? 'wait' : 'show';
}
