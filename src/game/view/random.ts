/**
 * Aleatorio con semilla para el arte (ADR-0004): el decorado y el suelo salen igual en cada partida y en cada equipo.
 * Sin Phaser ni Canvas: lo usan los pintores, la geometria de los suelos (`floors/`) y sus tests.
 */

/** Numeros entre 0 y 1, siempre los mismos para la misma semilla. */
export function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uno cualquiera de la lista. */
export function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}

/** Un numero entre `min` y `max`. */
export function between(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}
