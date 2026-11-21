import { FIRST_OUTBREAK, type OutbreakId } from '../../game/core/outbreaks';
import { isGreenhouseOpen } from '../../game/core/route';
import type { RoundPhase } from '../../game/core/rounds';
import { NICKNAME } from '../../game/playerName';
import type { CharacterId, Expression } from '../../game/view/characters/design';
import type { Dictionary } from '../../i18n';

/**
 * Las viñetas de la historia (T-031, ADR-0019): que secuencias hay, quien dice cada viñeta y con que cara, y cuando sale
 * cada secuencia. Sin React ni Phaser. Los textos estan en `story.lines` de `src/i18n/` (el guion de
 * `docs/specs/04-historia.md`); aqui solo sus claves.
 */

/** Una secuencia de viñetas seguidas. */
export type StoryId = 'opening' | 'creeperDown' | 'pattyGreenhouse';

/**
 * Algo que una viñeta pide al jugador: su nombre (T-033). Una viñeta que pide algo que nadie atiende (`STORY_PROMPTS`) se
 * salta y la secuencia sigue sin preguntar.
 */
export type StoryPrompt = 'name';

export interface StoryStep {
  /** Clave de su texto en `story.lines.<secuencia>`. */
  readonly id: string;
  readonly speaker: CharacterId;
  readonly expression: Expression;
  readonly prompt?: StoryPrompt;
}

/** El guion del arranque (`docs/specs/04-historia.md`), viñeta a viñeta. */
export const STORIES = {
  /** Antes del brote 1: Boxer, con prisa. Despues, el tour de la ronda 1. */
  opening: [{ id: 'noTime', speaker: 'boxer', expression: 'hurried' }],
  /** Al caer Creeper por primera vez (viñetas 1 a 5 del guion). */
  creeperDown: [
    { id: 'creeper', speaker: 'boxer', expression: 'normal' },
    { id: 'ai', speaker: 'boxer', expression: 'hurried' },
    { id: 'chips', speaker: 'boxer', expression: 'normal' },
    { id: 'name', speaker: 'boxer', expression: 'happy', prompt: 'name' },
    { id: 'onward', speaker: 'boxer', expression: 'happy' },
  ],
  /** Al llegar al Invernadero por primera vez: Patty se presenta (viñeta 6). */
  pattyGreenhouse: [{ id: 'hello', speaker: 'patty', expression: 'happy' }],
} as const satisfies Record<StoryId, readonly StoryStep[]>;

/** En el orden de la historia: asi se cuentan en el Invernadero para volver a verlas (Y-05). */
export const STORY_ORDER: readonly StoryId[] = ['opening', 'creeperDown', 'pattyGreenhouse'];

/** La secuencia que cuenta Boxer al vencer por primera vez al jefe de cada brote. */
export const STORY_AFTER_BOSS: Readonly<Partial<Record<OutbreakId, StoryId>>> = { creeper: 'creeperDown' };

/** Cuando puede salir sola una secuencia. */
export type StoryMoment =
  /** La ronda en curso de una partida (al empezarla o al cargarla). `round` desde 0. */
  | { readonly kind: 'match'; readonly outbreak: OutbreakId; readonly round: number; readonly phase: RoundPhase }
  /** Se vencio al jefe del brote. */
  | { readonly kind: 'victory'; readonly outbreak: OutbreakId }
  /** Se esta en el Invernadero, con estos brotes vencidos. */
  | { readonly kind: 'greenhouse'; readonly defeated: readonly string[] };

/**
 * Las secuencias que salen solas en este momento, en orden, sin las ya vistas (una vista no vuelve a salir sola):
 * - al empezar el brote 1, en la preparacion de la ronda 1, la apertura (antes del primer tour);
 * - al vencer a un jefe, lo que cuenta Boxer de el;
 * - en el Invernadero, lo de Boxer que quedo sin ver (quien vencio a Creeper sin verlo, Y-06) y despues Patty.
 */
export function storiesAt(moment: StoryMoment, seen: readonly string[]): StoryId[] {
  const due: StoryId[] = [];
  if (moment.kind === 'match') {
    if (moment.outbreak === FIRST_OUTBREAK && moment.round === 0 && moment.phase === 'prep') due.push('opening');
  } else if (moment.kind === 'victory') {
    const after = STORY_AFTER_BOSS[moment.outbreak];
    if (after) due.push(after);
  } else if (isGreenhouseOpen(moment.defeated)) {
    for (const [outbreak, story] of Object.entries(STORY_AFTER_BOSS)) if (story && moment.defeated.includes(outbreak)) due.push(story);
    due.push('pattyGreenhouse');
  }
  return due.filter((id) => !seen.includes(id));
}

/** Las viñetas que se ven de una secuencia: las que piden algo que aun nadie pide (el nombre sin T-033) se saltan. */
export function storySteps(id: StoryId, prompts: readonly StoryPrompt[]): readonly StoryStep[] {
  const steps: readonly StoryStep[] = STORIES[id];
  return steps.filter((step) => !step.prompt || prompts.includes(step.prompt));
}

/** Las secuencias que ya vio, en el orden de la historia: las que se pueden volver a ver desde el Invernadero (Y-05). */
export function replayableStories(seen: readonly string[]): StoryId[] {
  return STORY_ORDER.filter((id) => seen.includes(id));
}

/** Lo que las viñetas pueden pedir al jugador: su nombre (T-033). */
export const STORY_PROMPTS: readonly StoryPrompt[] = ['name'];

/** La secuencia pregunta el nombre (la de Creeper, NJ-01). */
export function asksName(id: StoryId): boolean {
  const steps: readonly StoryStep[] = STORIES[id];
  return steps.some((step) => step.prompt === 'name');
}

/**
 * El nombre que hay que ponerle al jugador al acabar (o saltar) una secuencia que lo pregunta, si aun no tiene: el apodo de
 * Boxer (NJ-02, NJ-03). Nunca queda un jugador sin nombre. Null si no hay que cambiar nada: ya tenia uno (lo escribio en la
 * viñeta o en Opciones) o la secuencia no lo pregunta.
 */
export function nameAfterStory(id: StoryId, name: string | null): string | null {
  return asksName(id) && name === null ? NICKNAME : null;
}

/**
 * Texto de una viñeta en el idioma de `t`. `name` es el nombre que eligio el jugador (T-033), el apodo de Boxer o null
 * (trato neutro: quien vio la historia antes de T-033 y aun no tiene nombre).
 */
export function stepText(t: Dictionary, story: StoryId, step: StoryStep, name: string | null): string {
  const lines = t.story.lines[story] as Readonly<Record<string, string | ((name: string | null) => string)>>;
  const line = lines[step.id];
  return typeof line === 'function' ? line(name) : (line ?? '');
}
