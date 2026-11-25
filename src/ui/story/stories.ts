import { OUTBREAKS } from '../../game/config/balance';
import { STORY_MUSIC, type MusicTrackId } from '../../game/config/music';
import { FIRST_OUTBREAK, isOutbreakId, type OutbreakId } from '../../game/core/outbreaks';
import { isGreenhouseOpen } from '../../game/core/route';
import { bossFirstSeenRound, bossRoundIndex, type RoundPhase } from '../../game/core/rounds';
import { NICKNAME } from '../../game/playerName';
import type { CharacterId, Expression } from '../../game/view/characters/design';
import type { Dictionary } from '../../i18n';
import { bossName } from '../outbreakName';

/**
 * Las viñetas de la historia (T-031, ADR-0019): que secuencias hay, quien dice cada viñeta y con que cara, y cuando sale
 * cada secuencia. Sin React ni Phaser. Los textos estan en `story.lines` de `src/i18n/` (el guion de
 * `docs/specs/04-historia.md`); aqui solo sus claves.
 */

/** Las secuencias del guion, cada una con sus viñetas en `STORIES`. */
export type ScriptedStoryId = 'opening' | 'rebellion' | 'creeperDown' | 'pattyGreenhouse' | 'morrisOpening' | 'morrisDebate' | 'morrisDown';

/**
 * Lo que cuenta Boxer del virus de verdad antes de cada jefe (T-032, VT-04): una secuencia por brote, `lore:<brote>`, con
 * una sola viñeta. No hay que declararla: sale de la lista de brotes, y su texto es `story.lore.<brote>.line` de
 * `src/i18n/`. Anadir la de un jefe nuevo es anadir ese texto.
 */
export type LoreStoryId = `lore:${OutbreakId}`;

/** Una secuencia de viñetas seguidas. */
export type StoryId = ScriptedStoryId | LoreStoryId;

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
  /**
   * Al caer Creeper por primera vez: la cinematica de la rebelion (T-049), un motion comic de dos escenas que narra Boxer.
   * Cada paso es un plano: sus capas y su movimiento estan en `CINEMATICS` (`src/game/view/cinematic/shots.ts`), y su
   * texto, como el de las viñetas, en `story.lines.rebellion`.
   */
  rebellion: [
    { id: 'creeper', speaker: 'boxer', expression: 'normal' },
    { id: 'ai', speaker: 'boxer', expression: 'hurried' },
    { id: 'factory', speaker: 'boxer', expression: 'hurried' },
    { id: 'chips', speaker: 'boxer', expression: 'normal' },
    { id: 'refuge', speaker: 'boxer', expression: 'normal' },
    { id: 'plants', speaker: 'boxer', expression: 'happy' },
  ],
  /** Despues de la cinematica (viñetas 4 y 5 del guion): Boxer pregunta el nombre y le invita al Invernadero. */
  creeperDown: [
    { id: 'name', speaker: 'boxer', expression: 'happy', prompt: 'name' },
    { id: 'onward', speaker: 'boxer', expression: 'happy' },
  ],
  /** Al llegar al Invernadero por primera vez: Patty se presenta (viñeta 6). */
  pattyGreenhouse: [{ id: 'hello', speaker: 'patty', expression: 'happy' }],
  /**
   * El giro (T-043): al empezar el brote 4, Boxer ve cuantos gusanos vienen y Patty explica por que el brote empieza con
   * mas moneda.
   */
  morrisOpening: [
    { id: 'howMany', speaker: 'boxer', expression: 'hurried' },
    { id: 'prepared', speaker: 'patty', expression: 'normal' },
  ],
  /** En la preparacion de la ronda 5 del brote 4: Boxer y Patty discuten si salir. Patty duda, pero poco (T-043). */
  morrisDebate: [
    { id: 'think', speaker: 'boxer', expression: 'normal' },
    { id: 'garden', speaker: 'patty', expression: 'doubtful' },
    { id: 'stay', speaker: 'boxer', expression: 'hurried' },
  ],
  /** Al caer Morris por primera vez: deciden pasar al ataque y Patty cierra el primer acto (T-043). */
  morrisDown: [
    { id: 'pots', speaker: 'boxer', expression: 'happy' },
    { id: 'convinced', speaker: 'patty', expression: 'normal' },
    { id: 'journey', speaker: 'patty', expression: 'happy' },
  ],
} as const satisfies Record<ScriptedStoryId, readonly StoryStep[]>;

/** La viñeta de cada `lore:<brote>`: Boxer, con prisa, en una linea (VT-04). */
const LORE_STEPS: readonly StoryStep[] = [{ id: 'line', speaker: 'boxer', expression: 'hurried' }];

/** La secuencia en la que Boxer cuenta que fue el jefe del brote de verdad (T-032). */
export const loreStory = (outbreak: OutbreakId): LoreStoryId => `lore:${outbreak}`;

/** El brote del que habla una secuencia `lore:<brote>`, o null si es otra. */
export function loreOutbreak(id: string): OutbreakId | null {
  if (!id.startsWith('lore:')) return null;
  const outbreak = id.slice('lore:'.length);
  return isOutbreakId(outbreak) ? outbreak : null;
}

/** Las viñetas de una secuencia, todas. */
export function storyScript(id: StoryId): readonly StoryStep[] {
  return loreOutbreak(id) ? LORE_STEPS : STORIES[id as ScriptedStoryId];
}

/**
 * Las secuencias que salen al vencer por primera vez al jefe de cada brote, en orden. Tras Creeper, la cinematica de la
 * rebelion y luego las viñetas del nombre y del Invernadero (T-049).
 */
export const STORY_AFTER_BOSS: Readonly<Partial<Record<OutbreakId, readonly StoryId[]>>> = {
  creeper: ['rebellion', 'creeperDown'],
  morris: ['morrisDown'],
};

/**
 * Las secuencias que son una cinematica (T-049, ADR-0027) y no viñetas: la pinta `CinematicOverlay` con los planos de
 * `CINEMATICS`, cada paso un plano.
 */
export const CINEMATIC_STORIES: readonly StoryId[] = ['rebellion'];

export const isCinematic = (id: StoryId): boolean => CINEMATIC_STORIES.includes(id);

/**
 * Las secuencias que salen en la preparacion de una ronda concreta de un brote (desde 0), solo en esa ronda: la apertura
 * del brote 1 y las del giro en el brote 4 (T-043). Una partida cargada en otra ronda no las saca.
 */
export const STORY_AT_ROUND: Readonly<Partial<Record<OutbreakId, Readonly<Record<number, StoryId>>>>> = {
  creeper: { 0: 'opening' },
  morris: { 0: 'morrisOpening', 4: 'morrisDebate' },
};

/** Las secuencias de `STORY_AT_ROUND` del brote, con su ronda, en orden. */
function roundStories(outbreak: OutbreakId): { round: number; id: StoryId }[] {
  return Object.entries(STORY_AT_ROUND[outbreak] ?? {})
    .map(([round, id]) => ({ round: Number(round), id }))
    .sort((a, b) => a.round - b.round);
}

/**
 * En el orden de la historia: asi se cuentan en el Invernadero para volver a verlas (Y-05). Por cada brote, las de sus
 * rondas y lo que cuenta Boxer de su jefe antes del combate (T-032), en el orden de sus rondas, y lo que sale al vencerlo;
 * tras el primero, Patty.
 */
export const STORY_ORDER: readonly StoryId[] = OUTBREAKS.flatMap(({ id }): StoryId[] => {
  const lore = bossFirstSeenRound(id);
  const during = [...roundStories(id), ...(lore === null ? [] : [{ round: lore + 0.5, id: loreStory(id) }])].sort((a, b) => a.round - b.round);
  const after = STORY_AFTER_BOSS[id] ?? [];
  return [...during.map((story) => story.id), ...after, ...(id === FIRST_OUTBREAK ? (['pattyGreenhouse'] as const) : [])];
});

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
 * - en la preparacion de la ronda que diga `STORY_AT_ROUND`, la suya: la apertura al empezar el brote 1 (antes del primer
 *   tour) y, en el brote 4, la de su apertura y la de la ronda 5 (T-043);
 * - en la preparacion de la ronda en que se ve por primera vez al jefe (T-032, VT-04: la 8 del brote 1, cuando Creeper se
 *   prepara), lo que cuenta Boxer del virus de verdad; si no se vio entonces (una partida guardada antes), en la
 *   preparacion de las siguientes hasta la del combate;
 * - al vencer a un jefe, lo que sale tras el (la cinematica de la rebelion y lo que cuenta Boxer tras Creeper, T-049; el
 *   final del giro con Morris, T-043);
 * - en el Invernadero, lo de despues de un jefe que quedo sin ver (quien vencio a Creeper sin verlo, Y-06; quien vio las
 *   viñetas de Creeper antes de T-049 ve una vez la cinematica, MC-11) y despues Patty.
 */
export function storiesAt(moment: StoryMoment, seen: readonly string[]): StoryId[] {
  const due: StoryId[] = [];
  if (moment.kind === 'match') {
    const atRound = STORY_AT_ROUND[moment.outbreak]?.[moment.round];
    if (atRound && moment.phase === 'prep') due.push(atRound);
    const seenFrom = bossFirstSeenRound(moment.outbreak);
    const fight = bossRoundIndex(moment.outbreak);
    if (moment.phase === 'prep' && seenFrom !== null && fight !== null && moment.round >= seenFrom && moment.round <= fight) {
      due.push(loreStory(moment.outbreak));
    }
  } else if (moment.kind === 'victory') {
    due.push(...(STORY_AFTER_BOSS[moment.outbreak] ?? []));
  } else if (isGreenhouseOpen(moment.defeated)) {
    for (const [outbreak, stories] of Object.entries(STORY_AFTER_BOSS)) if (stories && moment.defeated.includes(outbreak)) due.push(...stories);
    due.push('pattyGreenhouse');
  }
  return due.filter((id) => !seen.includes(id));
}

/**
 * La musica propia de la primera de estas secuencias que la tenga (`STORY_MUSIC`, T-049), o null. Con lo que saldria al
 * vencer al jefe o al entrar al Invernadero, dice que pista preparar por adelantado.
 */
export function storyMusicOf(ids: readonly StoryId[]): MusicTrackId | null {
  for (const id of ids) {
    const track = STORY_MUSIC[id];
    if (track) return track;
  }
  return null;
}

/** Las viñetas que se ven de una secuencia: las que piden algo que aun nadie pide (el nombre sin T-033) se saltan. */
export function storySteps(id: StoryId, prompts: readonly StoryPrompt[]): readonly StoryStep[] {
  const steps = storyScript(id);
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
  return storyScript(id).some((step) => step.prompt === 'name');
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
  const outbreak = loreOutbreak(story);
  if (outbreak) return t.story.lore[outbreak].line;
  const lines = t.story.lines[story as ScriptedStoryId] as Readonly<Record<string, string | ((name: string | null) => string)>>;
  const line = lines[step.id];
  return typeof line === 'function' ? line(name) : (line ?? '');
}

/** Titulo de una secuencia para volver a verla desde el Invernadero; las de cada jefe llevan su nombre (T-032). */
export function storyTitle(t: Dictionary, id: StoryId): string {
  const outbreak = loreOutbreak(id);
  if (!outbreak) return t.story.titles[id as ScriptedStoryId];
  return t.story.loreTitle(bossName(t, outbreak));
}
