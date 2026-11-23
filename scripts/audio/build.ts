/**
 * Fabrica los efectos de sonido (T-014, ADR-0013) y la musica de fondo (T-015, `music.ts`): `npm run audio`.
 *
 * Lee `manifest.ts` y, por cada efecto, saca sus capas de los paquetes de Kenney (`audio-lab/kenney/<paquete>.zip`) o
 * las genera con jsfxr (`sfxr.ts`), las mezcla, quita el silencio del principio y del final, iguala el volumen y escribe
 * OGG y MP3 en mono:
 * - El elegido, en `public/audio/` (lo que carga el juego), con `public/audio/LICENCIAS.md` (origen y licencia de cada
 *   archivo).
 * - Las alternativas, en `audio-lab/candidatos/` con su `catalogo.json`, para la pagina de prueba (`/pruebas/sonidos.html`,
 *   solo en desarrollo).
 *
 * Necesita ffmpeg y unzip. Los paquetes de Kenney (CC0) se bajan de https://kenney.nl/assets/<paquete> (ver
 * `KENNEY_PACKS`) y estan, sin descomprimir, en `audio-lab/kenney/`, dentro del repositorio. Si falta algo, se para sin
 * tocar `public/audio/`; todo se fabrica primero en una carpeta temporal. Con `bitexact`, dos pasadas dan los mismos
 * archivos.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jsfxr from 'jsfxr';
import { SFX, SFX_IDS, sfxFiles } from '../../src/game/config/audio.ts';
import { KENNEY_PACKS, MANIFEST, type KenneyPack, type Layer, type Source } from './manifest.ts';
import { buildMusic, missingMusic } from './music.ts';
import { RECIPES, type RecipeName } from './sfxr.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const KENNEY_DIR = join(ROOT, 'audio-lab/kenney');
const PUBLIC_DIR = join(ROOT, 'public/audio');
const LAB_DIR = join(ROOT, 'audio-lab/candidatos');
/** Musica (T-015): la elegida va con los efectos (`public/audio/musica/`); las alternativas, aparte. */
const MUSIC_LAB_DIR = join(ROOT, 'audio-lab/musica/candidatos');
const RATE = 44100;
/** Volumen al que se igualan todos: el de la ventana de 50 ms mas fuerte, en dBFS. Luego `SFX` los mezcla. */
const TARGET_RMS_DB = -14;
/** Pico maximo tras igualar, en dBFS. */
const PEAK_DB = -1;

const work = mkdtempSync(join(tmpdir(), 'rebrote-audio-'));
let counter = 0;
const temp = (ext: string) => join(work, `${++counter}.${ext}`);

function run(command: string, args: string[]): Buffer {
  return execFileSync(command, args, { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
}

function ffmpeg(args: string[]): void {
  run('ffmpeg', ['-v', 'error', '-y', ...args]);
}

// ---------------------------------------------------------------------------
// Capas

const zipEntries = new Map<KenneyPack, Map<string, string>>();

/** Archivo de un paquete de Kenney, buscado por su nombre (sin carpeta ni extension). */
function kenneyFile(pack: KenneyPack, name: string): string {
  const zip = join(KENNEY_DIR, `${pack}.zip`);
  if (!existsSync(zip)) throw new Error(`Falta ${zip}: bajalo de https://kenney.nl/assets/${pack}`);
  let entries = zipEntries.get(pack);
  if (!entries) {
    entries = new Map();
    for (const entry of run('unzip', ['-Z1', zip]).toString().split('\n')) {
      const match = entry.match(/([^/]+)\.ogg$/);
      if (match && !entry.includes('Preview')) entries.set(match[1], entry);
    }
    zipEntries.set(pack, entries);
  }
  const entry = entries.get(name);
  if (!entry) throw new Error(`No esta ${name} en ${pack}`);
  const out = temp('ogg');
  writeFileSync(out, run('unzip', ['-p', zip, entry]));
  return out;
}

/** Azar con semilla: jsfxr usa `Math.random` para el ruido y asi cada receta suena siempre igual. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}

function recipeParams(recipe: RecipeName): Record<string, number> {
  const params = new jsfxr.Params();
  Object.assign(params, { sample_rate: RATE, sample_size: 16, sound_vol: 0.5 }, RECIPES[recipe].params);
  return params;
}

/** Codigo corto de sfxr.me para abrir la receta y afinarla alli. */
function recipeCode(recipe: RecipeName): string {
  return jsfxr.sfxr.b58encode(recipeParams(recipe));
}

/** Genera una receta de jsfxr como muestras en coma flotante. */
function sfxrFile(recipe: RecipeName): { file: string; format: string[] } {
  const random = Math.random;
  Math.random = seeded(hash(recipe));
  let samples: number[];
  try {
    samples = new jsfxr.SoundEffect(recipeParams(recipe)).getRawBuffer().normalized;
  } finally {
    Math.random = random;
  }
  const out = temp('f32');
  writeFileSync(out, Buffer.from(new Float32Array(samples).buffer));
  return { file: out, format: ['-f', 'f32le', '-ar', String(RATE), '-ac', '1'] };
}

function duration(file: string): number {
  return Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
}

/** Una capa, recortada, con su velocidad, fundidos, ganancia y retraso, como WAV mono. */
function renderLayer(layer: Layer): string {
  const input = 'sfxr' in layer ? sfxrFile(layer.sfxr) : { file: kenneyFile(layer.kenney, layer.file), format: [] };
  const filters: string[] = [];
  const startS = (layer.startMs ?? 0) / 1000;
  if (layer.startMs !== undefined || layer.lengthMs !== undefined) {
    filters.push(`atrim=start=${startS}${layer.lengthMs !== undefined ? `:duration=${layer.lengthMs / 1000}` : ''}`, 'asetpts=PTS-STARTPTS');
  }
  const rate = layer.rate ?? 1;
  if (rate !== 1) filters.push(`asetrate=${Math.round(RATE * rate)}`, `aresample=${RATE}`);
  if (layer.fadeInMs) filters.push(`afade=t=in:st=0:d=${layer.fadeInMs / 1000}`);
  if (layer.fadeOutMs) {
    const whole = layer.lengthMs !== undefined ? layer.lengthMs / 1000 : (input.format.length ? Infinity : duration(input.file)) - startS;
    const length = whole / rate;
    if (Number.isFinite(length)) filters.push(`afade=t=out:st=${Math.max(0, length - layer.fadeOutMs / 1000)}:d=${layer.fadeOutMs / 1000}`);
  }
  if (layer.lowpassHz) filters.push(`lowpass=f=${layer.lowpassHz}`);
  if (layer.echoMs) {
    // Se alarga con silencio para que quepan los rebotes; el silencio que sobre lo quita `renderSource`.
    const d = layer.echoMs;
    filters.push(`apad=pad_dur=${(3 * d) / 1000 + 0.2}`, `aecho=1:1:${d}|${2 * d}:0.35|0.15`);
  }
  if (layer.gainDb) filters.push(`volume=${layer.gainDb}dB`);
  if (layer.delayMs) filters.push(`adelay=${layer.delayMs}:all=1`);
  const out = temp('wav');
  ffmpeg([...input.format, '-i', input.file, '-ac', '1', '-ar', String(RATE), ...(filters.length ? ['-af', filters.join(',')] : []), '-c:a', 'pcm_f32le', out]);
  return out;
}

const layersOf = (source: Source): readonly Layer[] => (Array.isArray(source) ? source : [source as Layer]);

/** Mezcla las capas y quita el silencio del principio y del final. */
function renderSource(source: Source): string {
  const parts = layersOf(source).map(renderLayer);
  let mixed = parts[0];
  if (parts.length > 1) {
    mixed = temp('wav');
    const inputs = parts.flatMap((part) => ['-i', part]);
    const labels = parts.map((_, i) => `[${i}]`).join('');
    ffmpeg([...inputs, '-filter_complex', `${labels}amix=inputs=${parts.length}:normalize=0:duration=longest`, '-c:a', 'pcm_f32le', mixed]);
  }
  const trimmed = temp('wav');
  const silence = 'silenceremove=start_periods=1:start_threshold=-60dB';
  ffmpeg(['-i', mixed, '-af', `${silence},areverse,${silence},areverse`, '-c:a', 'pcm_f32le', trimmed]);
  return trimmed;
}

/** Pico y volumen de la ventana de 50 ms mas fuerte, en dBFS. */
function measure(file: string): { peakDb: number; rmsDb: number; seconds: number } {
  const raw = run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(RATE), '-']);
  const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const window = Math.round(RATE * 0.05);
  let best = 0;
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += x[i] * x[i];
    if (i >= window) sum -= x[i - window] * x[i - window];
    // Solo ventanas enteras: con las primeras muestras sueltas mediria el pico, no el volumen.
    if (i >= window - 1) best = Math.max(best, sum / window);
  }
  // Un sonido mas corto que la ventana se mide entero.
  if (x.length < window) best = sum / Math.max(1, x.length);
  const db = (v: number) => (v > 0 ? 20 * Math.log10(v) : -120);
  return { peakDb: db(peak), rmsDb: db(Math.sqrt(best)), seconds: x.length / RATE };
}

/** Iguala el volumen y escribe `<base>.ogg` y, si se pide, `<base>.mp3`. Devuelve la duracion en segundos. */
function encode(source: Source, base: string, mp3: boolean): number {
  const wav = renderSource(source);
  const { peakDb, rmsDb, seconds } = measure(wav);
  const gain = Math.min(TARGET_RMS_DB - rmsDb, PEAK_DB - peakDb);
  const fade = Math.min(0.005, seconds / 4);
  const af = `volume=${gain.toFixed(2)}dB,afade=t=out:st=${Math.max(0, seconds - fade).toFixed(4)}:d=${fade.toFixed(4)}`;
  ffmpeg(['-i', wav, '-af', af, '-ac', '1', '-ar', String(RATE), '-c:a', 'libvorbis', '-q:a', '4', '-fflags', '+bitexact', '-flags:a', '+bitexact', `${base}.ogg`]);
  if (mp3) ffmpeg(['-i', wav, '-af', af, '-ac', '1', '-ar', String(RATE), '-c:a', 'libmp3lame', '-b:a', '96k', '-fflags', '+bitexact', '-flags:a', '+bitexact', `${base}.mp3`]);
  return seconds;
}

// ---------------------------------------------------------------------------
// Descripcion de cada fuente (licencias y pagina de prueba)

function describeLayer(layer: Layer): string {
  const cut = [
    layer.startMs !== undefined || layer.lengthMs !== undefined ? `recortado ${layer.startMs ?? 0}-${(layer.startMs ?? 0) + (layer.lengthMs ?? 0)} ms` : '',
    layer.rate ? `velocidad ${layer.rate}` : '',
    layer.lowpassHz ? `sin agudos por encima de ${layer.lowpassHz} Hz` : '',
    layer.echoMs ? `eco de ${layer.echoMs} ms` : '',
    layer.gainDb ? `${layer.gainDb} dB` : '',
    layer.delayMs ? `+${layer.delayMs} ms` : '',
  ].filter(Boolean);
  const what = 'sfxr' in layer ? `jsfxr: receta \`${layer.sfxr}\`` : `Kenney ${KENNEY_PACKS[layer.kenney]}: \`${layer.file}.ogg\``;
  return cut.length ? `${what} (${cut.join(', ')})` : what;
}

const describeSource = (source: Source) => layersOf(source).map(describeLayer).join(' + ');

function licenseOf(source: Source): string {
  const layers = layersOf(source);
  const kenney = layers.some((layer) => 'kenney' in layer);
  const own = layers.some((layer) => 'sfxr' in layer);
  return [kenney ? 'CC0 1.0 (Kenney, www.kenney.nl)' : '', own ? 'propio, generado con jsfxr (dominio público)' : ''].filter(Boolean).join(' + ');
}

function recipesOf(source: Source): RecipeName[] {
  return layersOf(source).flatMap((layer) => ('sfxr' in layer ? [layer.sfxr] : []));
}

// ---------------------------------------------------------------------------

/**
 * Antes de tocar nada: que esten ffmpeg, unzip y todos los paquetes de Kenney que usa el manifiesto. Si falta algo, se
 * para aqui y `public/audio/` queda como estaba.
 */
function preflight(): void {
  const missing: string[] = [];
  for (const tool of ['ffmpeg', 'ffprobe', 'unzip']) {
    try {
      run(tool, tool === 'unzip' ? ['-v'] : ['-version']);
    } catch {
      missing.push(`el programa ${tool}`);
    }
  }
  const packs = new Set<KenneyPack>();
  for (const entry of Object.values(MANIFEST)) {
    const picks = Array.isArray(entry.pick) ? entry.pick : [entry.pick];
    for (const source of [...picks, ...entry.alternatives] as Source[]) {
      for (const layer of Array.isArray(source) ? source.flat() : [source]) if ('kenney' in layer) packs.add(layer.kenney);
    }
  }
  for (const pack of packs) {
    const zip = join(KENNEY_DIR, `${pack}.zip`);
    if (!existsSync(zip)) missing.push(`${zip} (bajalo de https://kenney.nl/assets/${pack})`);
  }
  missing.push(...missingMusic(ROOT));
  if (missing.length) {
    rmSync(work, { recursive: true, force: true });
    process.stderr.write(`No se fabrica nada: falta\n${missing.map((m) => `- ${m}`).join('\n')}\npublic/audio/ no se ha tocado.\n`);
    process.exit(1);
  }
}

function main(): void {
  preflight();
  // Todo se fabrica primero en una carpeta temporal: si algo falla a medias, public/audio/ queda como estaba.
  const PUBLIC_OUT = join(work, 'public-audio');
  const LAB_OUT = join(work, 'candidatos');
  const MUSIC_LAB_OUT = join(work, 'musica-candidatos');
  mkdirSync(PUBLIC_OUT, { recursive: true });
  mkdirSync(LAB_OUT, { recursive: true });

  const licenseRows: string[] = [];
  const usedRecipes = new Set<RecipeName>();
  const catalog: unknown[] = [];

  for (const id of SFX_IDS) {
    const entry = MANIFEST[id];
    const files = sfxFiles(id);
    // Con varias variantes, `pick` trae una fuente por variante; con una, `pick` es la fuente (y una lista son capas).
    const picks: Source[] = SFX[id].variants > 1 ? (entry.pick as Source[]) : [entry.pick as Source];
    if (picks.length !== files.length) {
      throw new Error(`${id}: SFX dice ${files.length} variantes y el manifiesto trae ${picks.length}`);
    }
    const pickInfo = picks.map((source, i) => {
      const seconds = encode(source, join(PUBLIC_OUT, files[i]), true);
      recipesOf(source).forEach((recipe) => usedRecipes.add(recipe));
      licenseRows.push(`| \`${files[i]}\` | ${describeSource(source)} | ${licenseOf(source)} |`);
      return { url: `audio/${files[i]}`, source: describeSource(source), seconds: Number(seconds.toFixed(3)) };
    });
    mkdirSync(join(LAB_OUT, id), { recursive: true });
    const alternatives = entry.alternatives.map((source, i) => {
      const seconds = encode(source, join(LAB_OUT, id, String(i + 1)), false);
      return { url: `audio-lab/candidatos/${id}/${i + 1}`, source: describeSource(source), seconds: Number(seconds.toFixed(3)), recipes: recipesOf(source).map((r) => ({ name: r, code: recipeCode(r) })) };
    });
    catalog.push({ id, about: entry.about, spec: SFX[id], pick: pickInfo, alternatives });
    process.stdout.write(`${id} `);
  }

  const recipeRows = [...usedRecipes].map((recipe) => `| \`${recipe}\` | ${RECIPES[recipe].about} | https://sfxr.me/#${recipeCode(recipe)} |`);
  writeFileSync(
    join(PUBLIC_OUT, 'LICENCIAS.md'),
    [
      '# Efectos de sonido: origen y licencia',
      '',
      'Generado por `npm run audio` (`scripts/audio/build.ts`) a partir de `scripts/audio/manifest.ts`. No se edita a mano.',
      'Cada efecto va en OGG Vorbis y en MP3, en mono, con el volumen igualado y sin silencio al principio ni al final.',
      '',
      '- **Kenney** (www.kenney.nl): paquetes Interface Sounds, Impact Sounds, RPG Audio, Music Jingles, Sci-Fi Sounds y Digital Audio, bajados el 20 nov 2026. Licencia Creative Commons Zero (CC0 1.0): uso libre, sin atribución obligatoria.',
      '- **jsfxr** (https://sfxr.me, dominio público): sonidos propios generados a partir de las recetas de `scripts/audio/sfxr.ts`.',
      '',
      '| Archivo | Origen | Licencia |',
      '|---|---|---|',
      ...licenseRows,
      '',
      '## Recetas de jsfxr',
      '',
      'El enlace abre la receta en sfxr.me para oírla y afinarla.',
      '',
      '| Receta | Qué es | sfxr.me |',
      '|---|---|---|',
      ...recipeRows,
      '',
    ].join('\n'),
  );
  writeFileSync(join(LAB_OUT, 'catalogo.json'), JSON.stringify({ sounds: catalog }, null, 2));
  buildMusic(ROOT, join(PUBLIC_OUT, 'musica'), MUSIC_LAB_OUT, work);
  // Todo salio bien: ahora si se sustituyen las carpetas de verdad.
  for (const [from, to] of [[PUBLIC_OUT, PUBLIC_DIR], [LAB_OUT, LAB_DIR], [MUSIC_LAB_OUT, MUSIC_LAB_DIR]]) {
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
  }
  rmSync(work, { recursive: true, force: true });
  const size = Number(run('du', ['-sk', PUBLIC_DIR]).toString().split('\t')[0]);
  const musicSize = Number(run('du', ['-sk', join(PUBLIC_DIR, 'musica')]).toString().split('\t')[0]);
  process.stdout.write(`\nListo: ${SFX_IDS.length} efectos y la musica en public/audio/ (${size} KB, ${musicSize} KB de musica).\n`);
}

try {
  main();
} catch (error) {
  rmSync(work, { recursive: true, force: true });
  process.stderr.write(`\nNo se termino: ${(error as Error).message}\npublic/audio/ no se ha tocado.\n`);
  process.exit(1);
}
