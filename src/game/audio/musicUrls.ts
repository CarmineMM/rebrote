import { MUSIC, MUSIC_TRACKS, MUSIC_TRACK_IDS, type MusicTrack, type MusicTrackId } from '../config/music';
import type { AudioFormat } from './voices';

/**
 * Direcciones de la musica (T-015, U-05), sin Web Audio ni navegador: asi se prueban con Vitest. Cada archivo lleva una
 * huella (`?v=`) que cambia si cambia la pista (otra obra, otro bucle) o como se fabrica (`MUSIC.fileVersion`). La musica
 * se guarda para jugar sin conexion: con la huella, una pista nueva se descarga aunque se llame igual (`round.ogg`) y la
 * vieja se borra.
 */

/** Huella corta de una pista: FNV-1a de lo que define su archivo, en base 36. */
export function musicFileKey(track: MusicTrackId, tracks: Readonly<Record<MusicTrackId, MusicTrack>> = MUSIC_TRACKS): string {
  const spec = tracks[track];
  const text = [spec.title, spec.author, spec.loopSeconds, MUSIC.padSeconds, MUSIC.sampleRate, MUSIC.fileVersion].join('|');
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

/** Ruta de una pista dentro de la web (sin la base de Vite), con su huella. */
export function musicPath(track: MusicTrackId, format: AudioFormat): string {
  return `${MUSIC.folder}${track}.${format}?v=${musicFileKey(track)}`;
}

/** Todas las pistas en un formato: lo que se guarda para jugar sin conexion. */
export function allMusicPaths(format: AudioFormat): string[] {
  return MUSIC_TRACK_IDS.map((track) => musicPath(track, format));
}

/**
 * Lo guardado que sobra: direcciones de la cache de musica que no son ninguna de las de ahora (una pista que cambio, otra
 * huella, el otro formato). `keep` son direcciones completas.
 */
export function staleMusic(cached: readonly string[], keep: readonly string[]): string[] {
  const wanted = new Set(keep);
  return cached.filter((url) => !wanted.has(url));
}
