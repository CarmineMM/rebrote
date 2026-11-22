/**
 * Fabrica la musica de fondo (T-015) dentro de `npm run audio` (`build.ts` llama a `buildMusic`).
 *
 * Por cada pista de `MUSIC_MANIFEST` lee el original de `audio-lab/musica/`, recorta el bucle, cierra el empalme
 * (`cutLoop`), iguala el volumen y escribe OGG y MP3 en estereo con `MUSIC.padSeconds` de relleno por
 * cada lado: delante el final del bucle y detras su principio, para que el motor empalme aunque el decodificador meta
 * retraso (`src/game/audio/music.ts`).
 * - La elegida, en `public/audio/musica/` con su `LICENCIAS.md`.
 * - Las alternativas cuyo original este en `audio-lab/musica/`, en `audio-lab/musica/candidatos/` con su `catalogo.json`
 *   para la pagina de prueba (`/musica.html`). La que no este se salta (los originales no elegidos no van al repositorio).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LICENSE_URLS, MUSIC, MUSIC_TRACKS, MUSIC_TRACK_IDS, type MusicTrackId } from '../../src/game/config/music.ts';
import { MUSIC_MANIFEST, type MusicSource } from './manifest.ts';

const RATE = MUSIC.sampleRate;
/** Volumen al que se igualan: el de los trozos de 400 ms que suenan (sin los casi en silencio), en dBFS. */
const TARGET_RMS_DB = -18;
/** Pico maximo tras igualar, en dBFS (OGG y MP3 se pasan un poco al codificar). */
const PEAK_DB = -1.5;

function run(command: string, args: string[]): Buffer {
  return execFileSync(command, args, { maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Original, como dos canales en coma flotante a `RATE`. */
function readStereo(file: string): [Float32Array, Float32Array] {
  const raw = run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(RATE), '-']);
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const left = new Float32Array(all.length / 2);
  const right = new Float32Array(all.length / 2);
  for (let i = 0; i < left.length; i++) {
    left[i] = all[2 * i];
    right[i] = all[2 * i + 1];
  }
  return [left, right];
}

/** Muestra del original en la que acaba el bucle: la de `loopEnd`, o el final del archivo. */
function loopSamples(source: MusicSource, total: number): number {
  return source.loopEnd === undefined ? total : Math.round(source.loopEnd * RATE);
}

/**
 * El bucle con su empalme. Dos maneras, segun el original:
 * - `fold`: el original es una vuelta del bucle con algo detras (la cola de las ultimas notas o, en un MP3, el relleno del
 *   codificador y el final del bucle desplazado por su retraso). Todo lo que sigue al final del bucle se suma sobre su
 *   principio, como sonaria al repetirse.
 * - `seamMs`: el original no es un bucle (Incompetech) y se recorta entre dos puntos del mismo compas. Los `seamMs` que
 *   siguen al final del bucle bajan mientras sube su principio: al volver, la musica sigue como en el original.
 */
function cutLoop(source: MusicSource, channels: [Float32Array, Float32Array]): [Float32Array, Float32Array] {
  const total = channels[0].length;
  const start = Math.round((source.loopStart ?? 0) * RATE);
  const length = loopSamples(source, total) - start;
  const end = start + length;
  if (start < 0 || end > total || length <= 0) throw new Error(`${source.file}: el bucle (${source.loopStart}-${source.loopEnd} s) no cabe en el original`);
  const seam = Math.round(((source.seamMs ?? 0) / 1000) * RATE);
  if (end + seam > total) throw new Error(`${source.file}: no queda original tras el final del bucle para fundir ${source.seamMs} ms`);
  return channels.map((channel) => {
    const out = channel.slice(start, end);
    if (source.fold) for (let i = end; i < total; i++) out[(i - end) % length] += channel[i];
    for (let i = 0; i < seam; i++) {
      const t = (i + 0.5) / seam;
      out[i] = out[i] * t + channel[end + i] * (1 - t);
    }
    return out;
  }) as [Float32Array, Float32Array];
}

/** Volumen (los trozos de 400 ms que suenan) y pico, en dBFS. */
function measure(channels: [Float32Array, Float32Array]): { rmsDb: number; peakDb: number } {
  const block = Math.round(RATE * 0.4);
  const powers: number[] = [];
  let peak = 0;
  for (let start = 0; start + block <= channels[0].length; start += block) {
    let sum = 0;
    for (const channel of channels) {
      for (let i = start; i < start + block; i++) {
        sum += channel[i] * channel[i];
        peak = Math.max(peak, Math.abs(channel[i]));
      }
    }
    powers.push(sum / (2 * block));
  }
  const db = (power: number) => (power > 0 ? 10 * Math.log10(power) : -120);
  // Sin los trozos casi en silencio (un final que se apaga no baja la media).
  const loud = powers.filter((power) => db(power) > -50);
  const mean = loud.reduce((sum, power) => sum + power, 0) / Math.max(1, loud.length);
  return { rmsDb: db(mean), peakDb: peak > 0 ? 20 * Math.log10(peak) : -120 };
}

/** Escribe `<base>.ogg` (y `<base>.mp3`) con el relleno de cada lado. Devuelve los segundos del bucle y la ganancia aplicada. */
function encodeLoop(source: MusicSource, path: string, base: string, mp3: boolean, work: string): { seconds: number; gainDb: number } {
  const loop = cutLoop(source, readStereo(path));
  const { rmsDb, peakDb } = measure(loop);
  const gainDb = Math.min(TARGET_RMS_DB - rmsDb, PEAK_DB - peakDb);
  const gain = 10 ** (gainDb / 20);
  const length = loop[0].length;
  const pad = Math.round(MUSIC.padSeconds * RATE);
  if (pad >= length) throw new Error(`${source.file}: el bucle es mas corto que el relleno`);
  const frames = pad + length + pad;
  const interleaved = new Float32Array(frames * 2);
  for (let frame = 0; frame < frames; frame++) {
    // Delante, el final del bucle; detras, su principio: el archivo es el bucle "dando la vuelta" por los dos lados.
    const at = (frame - pad + length) % length;
    interleaved[2 * frame] = loop[0][at] * gain;
    interleaved[2 * frame + 1] = loop[1][at] * gain;
  }
  const raw = join(work, `${base.split('/').pop()}-${Date.now()}.f32`);
  writeFileSync(raw, Buffer.from(interleaved.buffer));
  const input = ['-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', raw];
  const exact = ['-fflags', '+bitexact', '-flags:a', '+bitexact'];
  run('ffmpeg', ['-v', 'error', '-y', ...input, '-c:a', 'libvorbis', '-q:a', '3', ...exact, `${base}.ogg`]);
  if (mp3) run('ffmpeg', ['-v', 'error', '-y', ...input, '-c:a', 'libmp3lame', '-b:a', '112k', ...exact, `${base}.mp3`]);
  return { seconds: length / RATE, gainDb };
}

const describe = (source: MusicSource): string => {
  const cut = source.loopStart !== undefined || source.loopEnd !== undefined ? `bucle ${source.loopStart ?? 0}-${source.loopEnd ?? 'fin'} s` : 'el archivo entero, que ya es un bucle';
  const seam = [source.fold ? 'lo que sigue al bucle, sumado a su principio' : '', source.seamMs ? `empalme fundido de ${source.seamMs} ms` : ''].filter(Boolean);
  return `\`${source.file}\` (${[cut, ...seam].join(', ')})`;
};

/** Que falta para fabricar la musica: el original de cada elegida. Las alternativas sin original se saltan. */
export function missingMusic(root: string): string[] {
  return MUSIC_TRACK_IDS.map((id) => MUSIC_MANIFEST[id].pick.file)
    .filter((file) => !existsSync(join(root, 'audio-lab/musica', file)))
    .map((file) => `audio-lab/musica/${file} (ver su pagina en MUSIC_MANIFEST)`);
}

/** Fabrica la musica en `publicOut` (la elegida) y `labOut` (las alternativas). */
export function buildMusic(root: string, publicOut: string, labOut: string, work: string): void {
  const dir = join(root, 'audio-lab/musica');
  mkdirSync(publicOut, { recursive: true });
  mkdirSync(labOut, { recursive: true });
  const rows: string[] = [];
  const catalog: unknown[] = [];
  for (const id of MUSIC_TRACK_IDS) {
    const entry = MUSIC_MANIFEST[id];
    const spec = MUSIC_TRACKS[id];
    const pick = entry.pick;
    const made = encodeLoop(pick, join(dir, pick.file), join(publicOut, id), true, work);
    // El motor suena entre `loopStart` y `loopEnd` con lo que dice `loopSeconds`: tiene que ser justo lo recortado.
    if (Math.round(spec.loopSeconds * RATE) !== Math.round(made.seconds * RATE)) {
      throw new Error(`${id}: MUSIC_TRACKS dice loopSeconds ${spec.loopSeconds} y el bucle recortado dura ${made.seconds.toFixed(6)} s`);
    }
    if (pick.title !== spec.title || pick.author !== spec.author || pick.license !== spec.license) {
      throw new Error(`${id}: titulo, autor o licencia de MUSIC_TRACKS no cuadran con los de su original en MUSIC_MANIFEST`);
    }
    rows.push(`| \`${id}\` | «${pick.title}», de ${pick.author} (${pick.url}) | ${describe(pick)} | ${pick.license} (${LICENSE_URLS[pick.license]}) |`);
    const kb = (file: string) => Math.round(statSync(file).size / 1024);
    const options = [{ source: pick, url: `audio/musica/${id}`, seconds: made.seconds, kb: kb(join(publicOut, `${id}.ogg`)), chosen: true }];
    mkdirSync(join(labOut, id), { recursive: true });
    entry.alternatives.forEach((alt, i) => {
      const path = join(dir, alt.file);
      if (!existsSync(path)) return;
      const base = join(labOut, id, String(i + 1));
      const { seconds } = encodeLoop(alt, path, base, false, work);
      options.push({ source: alt, url: `audio-lab/musica/candidatos/${id}/${i + 1}`, seconds, kb: kb(`${base}.ogg`), chosen: false });
    });
    catalog.push({
      id,
      about: entry.about,
      options: options.map(({ source, url, seconds, kb: size, chosen }) => ({
        url,
        chosen,
        title: source.title,
        author: source.author,
        license: source.license,
        page: source.url,
        about: source.about,
        cut: describe(source),
        seconds: Number(seconds.toFixed(3)),
        kb: size,
      })),
    });
    process.stdout.write(`musica:${id} `);
  }
  writeFileSync(
    join(publicOut, 'LICENCIAS.md'),
    [
      '# Música de fondo: origen y licencia',
      '',
      'Generado por `npm run audio` (`scripts/audio/music.ts`) a partir de `MUSIC_MANIFEST` (`scripts/audio/manifest.ts`). No se edita a mano.',
      `Cada pista va en OGG Vorbis y en MP3, en estéreo, recortada en bucle, con el volumen igualado y ${MUSIC.padSeconds} s de relleno por cada lado (el final del bucle delante y su principio detrás).`,
      'Los originales están en `audio-lab/musica/`. Los créditos del juego (`MUSIC_TRACKS` en `src/game/config/music.ts`) dicen título, autor y licencia de cada una.',
      '',
      '| Archivo | Obra | Recorte | Licencia |',
      '|---|---|---|---|',
      ...rows,
      '',
    ].join('\n'),
  );
  writeFileSync(join(labOut, 'catalogo.json'), JSON.stringify({ tracks: catalog }, null, 2));
}
