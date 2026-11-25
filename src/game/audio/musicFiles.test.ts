import { describe, expect, it } from 'vitest';
import { MUSIC, MUSIC_TRACKS, MUSIC_TRACK_IDS } from '../config/music';

/** Los archivos de `public/audio/musica/`, como `data:` en base64, por su nombre. */
const FILES = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../../public/audio/musica/*.{ogg,mp3}', { query: '?inline', import: 'default', eager: true }),
  ).map(([path, data]) => [path.split('/').pop() ?? path, data]),
);

/** Los bytes de un archivo, decodificados una vez (con todos los tests a la vez, decodificar letra a letra pasaba de 5 s). */
const decoded = new Map<string, Uint8Array>();
const bytesOf = (data: string): Uint8Array => {
  let bytes = decoded.get(data);
  if (!bytes) {
    const raw = atob(data.split(',')[1]);
    bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    decoded.set(data, bytes);
  }
  return bytes;
};

/**
 * Muestras de un OGG Vorbis: la posicion ("granule") de su ultima pagina. Cada pagina empieza por "OggS" y lleva la
 * posicion en los bytes 6 a 13.
 */
function oggSamples(bytes: Uint8Array): number {
  for (let i = bytes.length - 27; i >= 0; i--) {
    if (bytes[i] === 0x4f && bytes[i + 1] === 0x67 && bytes[i + 2] === 0x67 && bytes[i + 3] === 0x53) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + i + 6, 8);
      return view.getUint32(0, true) + view.getUint32(4, true) * 2 ** 32;
    }
  }
  return -1;
}

describe('archivos de musica (T-015)', () => {
  it('cada pista tiene su OGG y su MP3 en public/audio/musica/', () => {
    for (const id of MUSIC_TRACK_IDS) {
      expect(FILES[`${id}.ogg`], `${id}.ogg`).toBeDefined();
      expect(FILES[`${id}.mp3`], `${id}.mp3`).toBeDefined();
    }
  });

  it('el OGG dura justo el bucle mas el relleno de cada lado: si no, el motor empalmaria en otro sitio', () => {
    for (const id of MUSIC_TRACK_IDS) {
      const samples = oggSamples(bytesOf(FILES[`${id}.ogg`]));
      const expected = Math.round(MUSIC_TRACKS[id].loopSeconds * MUSIC.sampleRate) + 2 * Math.round(MUSIC.padSeconds * MUSIC.sampleRate);
      expect(samples, id).toBe(expected);
    }
  });

  it('cada pista pesa menos de 2,5 MB (la portada no la espera, pero en el movil se nota)', () => {
    for (const name of Object.keys(FILES)) expect(bytesOf(FILES[name]).length, name).toBeLessThan(2.5 * 1024 * 1024);
  });
});
