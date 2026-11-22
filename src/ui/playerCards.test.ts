import { afterEach, describe, expect, it } from 'vitest';
import { createMatch } from '../game/core/match';
import { firstList, type Profile } from '../game/profiles';
import { PROGRESS_KEY, emptyProgress, encodeProgress, recordDefeat, recordMatchEnd, recordStory } from '../game/progress';
import { writeSave, type SaveStore } from '../game/save';
import { setLanguage, text } from '../i18n';
import { describePlayer, hasPlayed, lostLines, playerName } from './playerCards';
import { TOUR_STORAGE_KEY, emptyProgress as noTours, hasSeenTours, hintShown, markTourDone } from './tour/tourProgress';

function memoryStore(): SaveStore {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value), removeItem: (key) => void data.delete(key) };
}

const profile: Profile = firstList('a', 10).profiles[0];

afterEach(() => setLanguage('es'));

describe('pantalla de jugadores (T-034)', () => {
  it('un jugador sin nombre se llama "Jugador N" en el idioma del juego (PF-05)', () => {
    expect(playerName(text('es'), { ...profile, number: 2 })).toBe('Jugador 2');
    expect(playerName(text('en'), { ...profile, number: 2 })).toBe('Player 2');
    // El nombre que elija (T-033) no se traduce.
    expect(playerName(text('en'), { ...profile, name: 'Ana' })).toBe('Ana');
  });

  it('ha jugado si se guardo algo suyo despues de crearlo', () => {
    expect(hasPlayed(profile)).toBe(false);
    expect(hasPlayed({ ...profile, updatedAt: 11 })).toBe(true);
  });

  it('un jugador nuevo no tiene nada que perder', () => {
    const card = describePlayer(profile, memoryStore());
    expect(card).toEqual({ profile, progress: emptyProgress(), save: null, toursSeen: false });
    expect(lostLines(text('es'), card)).toEqual([]);
  });

  it('al borrarlo se pierden sus jefes vencidos, su partida y sus tours vistos', () => {
    const store = memoryStore();
    store.setItem(PROGRESS_KEY, encodeProgress(recordStory(recordDefeat(emptyProgress(), 'creeper'), 'opening')));
    writeSave(createMatch(), null, store, 1);
    store.setItem(TOUR_STORAGE_KEY, JSON.stringify(markTourDone(noTours(), 'basics')));
    expect(lostLines(text('es'), describePlayer(profile, store))).toEqual([
      'Jefes vencidos: Creeper',
      'Partida guardada en la ronda 1',
      'Las viñetas de la historia vistas',
      'Los tours de ayuda vistos',
    ]);
  });

  it('al borrarlo tambien se pierden sus semillas (T-020)', () => {
    const store = memoryStore();
    store.setItem(PROGRESS_KEY, encodeProgress(recordMatchEnd(emptyProgress(), 'creeper', 12345)));
    expect(lostLines(text('es'), describePlayer(profile, store))).toEqual(['Jefes vencidos: Creeper', 'Semillas: 12.345']);
  });

  it('al borrarlo tambien se pierden los poderes comprados en la tienda (T-022)', () => {
    const store = memoryStore();
    store.setItem(PROGRESS_KEY, encodeProgress({ ...recordDefeat(emptyProgress(), 'creeper'), powers: { grenade: 3, relocate: 1 }, carried: ['grenade'] }));
    expect(lostLines(text('es'), describePlayer(profile, store))).toEqual(['Jefes vencidos: Creeper', '2 poderes comprados en la tienda']);
  });

  it('al borrarlo tambien se pierde el nivel base de la disparadora (T-023)', () => {
    const store = memoryStore();
    store.setItem(PROGRESS_KEY, encodeProgress({ ...recordDefeat(emptyProgress(), 'creeper'), baseLevel: 3 }));
    expect(lostLines(text('es'), describePlayer(profile, store))).toEqual(['Jefes vencidos: Creeper', 'La disparadora en nivel base 3']);
  });

  it('quien solo vio la historia tambien tiene algo que perder (T-031)', () => {
    const store = memoryStore();
    store.setItem(PROGRESS_KEY, encodeProgress(recordStory(emptyProgress(), 'opening')));
    expect(lostLines(text('es'), describePlayer(profile, store))).toEqual(['Las viñetas de la historia vistas']);
  });

  it('cuenta como tours vistos tambien una pista que ya salio', () => {
    expect(hasSeenTours(noTours())).toBe(false);
    expect(hasSeenTours(hintShown(noTours(), 'droppedCoin'))).toBe(true);
    expect(hasSeenTours(markTourDone(noTours(), 'fuse'))).toBe(true);
  });
});
