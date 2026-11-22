import { describe, expect, it } from 'vitest';
import { MUSIC, MUSIC_TRACKS, MUSIC_TRACK_IDS } from '../config/music';
import { MUSIC_URL_PATTERN } from '../../pwa/manifest';
import { allMusicPaths, musicFileKey, musicPath, staleMusic } from './musicUrls';

describe('direcciones de la musica para jugar sin conexion (T-015, U-05)', () => {
  it('cada pista lleva su huella, distinta de las demas y siempre la misma', () => {
    const keys = MUSIC_TRACK_IDS.map((id) => musicFileKey(id));
    expect(new Set(keys).size).toBe(keys.length);
    expect(musicFileKey('round')).toBe(musicFileKey('round'));
    expect(musicPath('round', 'ogg')).toBe(`${MUSIC.folder}round.ogg?v=${musicFileKey('round')}`);
  });

  it('otra obra u otro bucle con el mismo nombre de archivo cambian la huella: se vuelve a bajar', () => {
    const other = { ...MUSIC_TRACKS, round: { ...MUSIC_TRACKS.round, title: 'Otra' } };
    expect(musicFileKey('round', other)).not.toBe(musicFileKey('round'));
    const longer = { ...MUSIC_TRACKS, round: { ...MUSIC_TRACKS.round, loopSeconds: MUSIC_TRACKS.round.loopSeconds + 1 } };
    expect(musicFileKey('round', longer)).not.toBe(musicFileKey('round'));
    // El volumen de la mezcla no cambia el archivo.
    const louder = { ...MUSIC_TRACKS, round: { ...MUSIC_TRACKS.round, volume: 0.1 } };
    expect(musicFileKey('round', louder)).toBe(musicFileKey('round'));
  });

  it('se guardan todas las pistas en el formato del navegador', () => {
    expect(allMusicPaths('mp3')).toEqual(MUSIC_TRACK_IDS.map((id) => musicPath(id, 'mp3')));
  });

  it('lo guardado de otra huella sobra; lo de ahora, no', () => {
    const now = 'https://x/audio/musica/round.ogg?v=nueva';
    expect(staleMusic([now, 'https://x/audio/musica/round.ogg?v=vieja', 'https://x/audio/musica/round.ogg'], [now])).toEqual([
      'https://x/audio/musica/round.ogg?v=vieja',
      'https://x/audio/musica/round.ogg',
    ]);
  });

  it('el service worker reconoce la musica con su huella, y no los efectos', () => {
    for (const path of [...allMusicPaths('ogg'), ...allMusicPaths('mp3')]) expect(MUSIC_URL_PATTERN.test(`https://rebrote.app/${path}`), path).toBe(true);
    expect(MUSIC_URL_PATTERN.test('https://rebrote.app/audio/coin.ogg')).toBe(false);
    expect(MUSIC_URL_PATTERN.test('https://rebrote.app/audio/musica/LICENCIAS.md')).toBe(false);
  });
});
