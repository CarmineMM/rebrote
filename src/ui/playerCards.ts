import type { Profile } from '../game/profiles';
import { ProgressKeeper, hasProgress, type Progress } from '../game/progress';
import { readSave, summarizeSave, type SaveSummary } from '../game/save';
import type { SaveStore } from '../game/storage';
import { formatList, type Dictionary } from '../i18n';
import { defeatedBossName } from './outbreakName';
import { hasSeenTours, readTourProgress } from './tour/tourProgress';

/** Lo que la pantalla de jugadores (T-034) cuenta de cada uno: lo que tiene y lo que perderia al borrarlo. */
export interface PlayerCard {
  readonly profile: Profile;
  readonly progress: Progress;
  /** Su partida a medias, o null. */
  readonly save: SaveSummary | null;
  /** Ya vio algun tour de ayuda. */
  readonly toursSeen: boolean;
}

/** Lee lo de un jugador en su almacen (`profiles.storeOf`), sin tocar el del activo. */
export function describePlayer(profile: Profile, store: SaveStore): PlayerCard {
  const saved = readSave(store);
  return {
    profile,
    progress: new ProgressKeeper(() => store).read(),
    save: saved ? summarizeSave(saved) : null,
    toursSeen: hasSeenTours(readTourProgress(store)),
  };
}

/** El nombre que eligio (T-033) o, si aun no tiene, "Jugador N" en el idioma de `t` (PF-05). Siempre como texto. */
export function playerName(t: Dictionary, profile: Profile): string {
  return profile.name ?? t.players.defaultName(profile.number);
}

/** Ya jugo alguna vez: se guardo algo suyo despues de crearlo. */
export function hasPlayed(profile: Profile): boolean {
  return profile.updatedAt > profile.createdAt;
}

/** Lo que se perderia al borrarlo, una linea por cosa: jefes vencidos, partida a medias y tours vistos. */
export function lostLines(t: Dictionary, card: PlayerCard): string[] {
  const lines: string[] = [];
  if (hasProgress(card.progress)) lines.push(t.players.bosses(formatList(card.progress.defeated.map((id) => defeatedBossName(t, id)))));
  if (card.save) lines.push(t.players.save(card.save.round));
  if (card.toursSeen) lines.push(t.players.tours);
  return lines;
}
