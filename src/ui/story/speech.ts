import type { OutbreakId } from '../../game/core/outbreaks';
import { roundUnlocks, unlockPresenter } from '../../game/core/rounds';
import type { CharacterId, Expression } from '../../game/view/characters/design';
import type { Dictionary } from '../../i18n';

/**
 * Lo que dicen Boxer y Patty fuera de las viñetas (T-032): quien presenta cada desbloqueo con que frase, y lo que dice
 * Patty en el Invernadero. Sin React: los textos estan en `src/i18n/` y aqui solo se elige cual toca.
 */

/** Una frase suelta de un personaje, con su cara. */
export interface Speech {
  readonly speaker: CharacterId;
  readonly expression: Expression;
  readonly text: string;
}

/**
 * Quien presenta lo nuevo de la ronda `index` (desde 0) del brote en "¡YA LO TIENES!" y que dice (VT-02, VT-03): Boxer
 * en el brote 1 ("Toma, esto te va a hacer falta") y Patty en los siguientes ("¡He creado algo nuevo!"), segun el guion
 * (`unlockPresenter`). Sus frases rotan por el orden de los avisos que presenta en el brote: el primero, la primera.
 */
export function unlockSpeech(t: Dictionary, outbreak: OutbreakId, index: number): Speech {
  const speaker = unlockPresenter(outbreak, index);
  const lines = t.unlock.presenters[speaker];
  let before = 0;
  for (let i = 0; i < index; i++) {
    if (roundUnlocks(outbreak, i).length > 0 && unlockPresenter(outbreak, i) === speaker) before++;
  }
  return { speaker, expression: 'happy', text: lines[before % lines.length] };
}

/** Ritmo de Patty en el Invernadero (VT-05): a veces saluda al entrar y, si se la toca, dice otra cosa. */
export const PATTY_TALK = {
  /** Probabilidad de que diga algo al entrar. */
  greetChance: 0.5,
  /** Lo que espera a hablar al entrar: antes entra el panel y ella asoma. */
  greetDelayMs: 1100,
  /** Lo que sigue el bocadillo en pantalla cuando ya salio la frase entera. */
  holdMs: 4200,
} as const;

/** ¿Dice algo al entrar al Invernadero? A veces (VT-05). `random` en [0, 1), como Math.random. */
export function pattyGreets(random: () => number): boolean {
  return random() < PATTY_TALK.greetChance;
}

/** La frase siguiente de Patty, al azar entre `count` y nunca la misma que la anterior (`last`): asi no cansa. */
export function nextPattyLine(count: number, last: number | null, random: () => number): number {
  if (count <= 1) return 0;
  const others = last === null || last < 0 || last >= count ? count : count - 1;
  const pick = Math.min(others - 1, Math.floor(random() * others));
  return others < count && pick >= (last as number) ? pick + 1 : pick;
}

/** Frase `index` de Patty en el Invernadero, con el nombre del jugador si la frase lo usa (o null: trato neutro). */
export function pattyLine(t: Dictionary, index: number, name: string | null): string {
  const lines = t.greenhouse.patty;
  const line = lines[((index % lines.length) + lines.length) % lines.length];
  return typeof line === 'function' ? line(name) : line;
}
