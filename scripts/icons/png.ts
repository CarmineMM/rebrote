/**
 * PNG con paleta y transparencia por color (T-028), para los iconos que sin perdida pesan demasiado.
 *
 * ffmpeg sabe reducir a 256 colores, pero su transparencia es de todo o nada: el borde redondeado de la ficha sale
 * dentado y con un filo de otro color. Aqui los colores los elige ffmpeg (sin transparencia) y cada pixel se guarda con
 * su color y su alfa (redondeado a pocos niveles): en un PNG con paleta cada entrada lleva su propio alfa (`tRNS`), asi
 * que los bordes siguen suaves y el archivo pesa como uno de 256 colores.
 */
import { crc32, deflateSync } from 'node:zlib';

/** Niveles de alfa de los pixeles a medias (los bordes): de 32 en 32. */
const ALPHA_STEP = 32;

/**
 * Junta los colores ya reducidos (`rgb`, 3 bytes por pixel) con la transparencia original (`rgba`, 4 bytes por pixel).
 * Devuelve null si salen mas de 256 combinaciones de color y alfa: hay que reducir a menos colores.
 */
export function indexedPng(rgba: Buffer, rgb: Buffer, width: number, height: number): Buffer | null {
  const palette: number[] = [];
  const alphas: number[] = [];
  const index = new Map<number, number>();
  const pixels = Buffer.alloc((width + 1) * height);
  let transparent = false;
  for (let y = 0; y < height; y++) {
    pixels[y * (width + 1)] = 0; // Filtro de la fila: ninguno (lo normal con paleta).
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      let a = Math.round(rgba[p * 4 + 3] / ALPHA_STEP) * ALPHA_STEP;
      a = Math.min(255, a);
      const key = a === 0 ? -1 : rgb[p * 3] * 0x1000000 + rgb[p * 3 + 1] * 0x10000 + rgb[p * 3 + 2] * 0x100 + a;
      let i = index.get(key);
      if (i === undefined) {
        if (palette.length / 3 === 256) return null;
        i = palette.length / 3;
        index.set(key, i);
        if (a === 0) palette.push(0, 0, 0);
        else palette.push(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
        alphas.push(a);
        if (a < 255) transparent = true;
      }
      pixels[y * (width + 1) + 1 + x] = i;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits por pixel
  header[9] = 3; // con paleta
  const chunks = [chunk('IHDR', header), chunk('PLTE', Buffer.from(palette))];
  // Sin `tRNS`, todo opaco (lo que quiere el iPhone).
  if (transparent) chunks.push(chunk('tRNS', Buffer.from(alphas)));
  chunks.push(chunk('IDAT', deflateSync(pixels, { level: 9 })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]);
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}
