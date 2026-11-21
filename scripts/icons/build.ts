/**
 * Fabrica el icono del juego (T-028): `npm run icons`.
 *
 * Saca todos los tamanos del dibujo maestro (`src/icons/iconArt.ts`, la propuesta `ICON`) y los deja en `public/`, que
 * es lo que enlaza `index.html` (y, con T-029, el manifiesto):
 * - `favicon.svg`: la pestana, sin fondo. `favicon.ico` (32 px), lo mismo para los navegadores sin SVG.
 * - `apple-touch-icon.png` (180): iPhone, cuadrado, a sangre y sin canal alfa.
 * - `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`: icono de aplicacion, ficha con esquinas redondeadas.
 * - `icons/maskable-192.png`, `icons/maskable-512.png`: Android, a sangre y sin canal alfa.
 *
 * Cada PNG se guarda sin perdida; si asi pasa de 50 kB, con una paleta de 256 colores que conserva la transparencia
 * suave de los bordes (`png.ts`).
 *
 * Necesita ffmpeg con librsvg (el mismo ffmpeg de `npm run audio`). Todo se fabrica primero en una carpeta temporal:
 * si algo falla o un PNG pesa mas de la cuenta, se para sin tocar `public/`. Con `bitexact`, dos pasadas dan los mismos
 * archivos.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { IconVariant } from '../../src/icons/iconArt.ts';
import { indexedPng } from './png.ts';

// El dibujo usa el pintor de la disparadora del juego, que importa sin extension (como todo `src/`, para Vite). Node
// necesita la extension: si un import relativo no se encuentra, se prueba con `.ts`.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.') || /\.\w+$/.test(specifier)) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
const { ICON, iconSvg } = await import('../../src/icons/iconArt.ts');

const ROOT = new URL('../../', import.meta.url).pathname;
const PUBLIC_DIR = join(ROOT, 'public');
/** Lo que puede pesar como mucho cada PNG (T-028: el de 512, menos de 50 kB). */
const MAX_BYTES = 50 * 1024;

interface Output {
  file: string;
  variant: IconVariant;
  /** Lado en pixeles; sin el, se escribe el SVG. */
  size?: number;
}

const OUTPUTS: readonly Output[] = [
  { file: 'favicon.svg', variant: 'tab' },
  { file: 'favicon.ico', variant: 'tab', size: 32 },
  { file: 'apple-touch-icon.png', variant: 'full', size: 180 },
  { file: 'icons/icon.svg', variant: 'tile' },
  { file: 'icons/icon-192.png', variant: 'tile', size: 192 },
  { file: 'icons/icon-512.png', variant: 'tile', size: 512 },
  { file: 'icons/maskable-192.png', variant: 'maskable', size: 192 },
  { file: 'icons/maskable-512.png', variant: 'maskable', size: 512 },
];

/** Las formas a sangre no llevan canal alfa: iOS pinta de negro lo transparente. */
const OPAQUE: ReadonlySet<IconVariant> = new Set(['full', 'maskable']);

/**
 * El lector de SVG de ffmpeg (librsvg) entrega los colores premultiplicados por el alfa como si no lo estuvieran: sin
 * deshacerlo, todo borde suavizado sale oscurecido.
 */
const UNPREMULTIPLY = 'format=rgba,unpremultiply=inplace=1';

/** Colores de la paleta cuando un PNG sin perdida pesa demasiado; si no caben con los bordes, se prueba con menos. */
const PALETTE_COLORS = [240, 208, 176];

function ffmpeg(args: string[]): Buffer {
  return execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
}

/** El SVG pintado a `size` pixeles, en bruto (`rgba` o `rgb24`), pasado por `filter`. */
function raster(svg: string, size: number, filter: string, pixels: 'rgba' | 'rgb24'): Buffer {
  return ffmpeg(['-width', `${size}`, '-height', `${size}`, '-i', svg, '-frames:v', '1', '-filter_complex', filter, '-f', 'rawvideo', '-pix_fmt', pixels, 'pipe:1']);
}

/** Sin perdida (con el canal alfa solo si hace falta). */
function losslessPng(svg: string, size: number, variant: IconVariant, out: string): void {
  const pixels = OPAQUE.has(variant) ? 'rgb24' : 'rgba';
  const codec = out.endsWith('.ico') ? ['-c:v', 'png'] : [];
  ffmpeg([
    '-width', `${size}`, '-height', `${size}`, '-i', svg,
    '-frames:v', '1', '-vf', UNPREMULTIPLY, '-pix_fmt', pixels, ...codec,
    '-compression_level', '9', '-pred', 'mixed',
    '-fflags', '+bitexact', '-flags:v', '+bitexact',
    out,
  ]);
}

/** Con paleta (`png.ts`): los colores los reduce ffmpeg y el alfa de cada pixel se conserva. */
function palettePng(svg: string, size: number, out: string): void {
  const rgba = raster(svg, size, UNPREMULTIPLY, 'rgba');
  for (const colors of PALETTE_COLORS) {
    const reduce = `${UNPREMULTIPLY},format=rgb24,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a`;
    const png = indexedPng(rgba, raster(svg, size, reduce, 'rgb24'), size, size);
    if (png) {
      writeFileSync(out, png);
      return;
    }
  }
  throw new Error(`${out}: no caben los colores y los bordes en una paleta de 256.`);
}

function checkFfmpeg(): void {
  let decoders: string;
  try {
    decoders = execFileSync('ffmpeg', ['-hide_banner', '-decoders'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    throw new Error('Falta ffmpeg.');
  }
  if (!/\blibrsvg\b/.test(decoders)) throw new Error('Este ffmpeg no lee SVG: hace falta uno compilado con librsvg.');
}

const work = mkdtempSync(join(tmpdir(), 'rebrote-icons-'));
try {
  checkFfmpeg();
  const svgs = new Map<IconVariant, string>();
  for (const variant of new Set(OUTPUTS.map((o) => o.variant))) {
    const path = join(work, `${variant}.svg`);
    writeFileSync(path, iconSvg(ICON, variant));
    svgs.set(variant, path);
  }
  for (const { file, variant, size } of OUTPUTS) {
    const out = join(work, 'out', file);
    mkdirSync(dirname(out), { recursive: true });
    const svg = svgs.get(variant)!;
    if (size === undefined) {
      cpSync(svg, out);
      continue;
    }
    losslessPng(svg, size, variant, out);
    if (statSync(out).size > MAX_BYTES && file.endsWith('.png')) palettePng(svg, size, out);
    const bytes = statSync(out).size;
    if (bytes > MAX_BYTES) throw new Error(`${file} pesa ${Math.round(bytes / 1024)} kB (maximo ${MAX_BYTES / 1024} kB).`);
  }
  cpSync(join(work, 'out'), PUBLIC_DIR, { recursive: true });
  for (const { file } of OUTPUTS) {
    console.log(`${file.padEnd(24)} ${(statSync(join(PUBLIC_DIR, file)).size / 1024).toFixed(1).padStart(6)} kB`);
  }
  console.log(`Icono "${ICON}" escrito en public/.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error('No se toco public/.');
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
