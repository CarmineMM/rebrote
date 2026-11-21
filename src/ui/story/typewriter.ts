/**
 * Ritmo del texto de las viñetas (T-031, Y-07): sale letra a letra, con una pausa tras cada signo que corta la frase, y
 * un toque lo completa de golpe. Sin React: la viñeta pregunta cuantas letras se ven segun el tiempo que lleva.
 */

export const TYPEWRITER = {
  /** Lo que tarda cada letra en salir, en ms. */
  msPerChar: 30,
  /** Pausa extra tras un signo seguido de espacio (o al final), en ms. */
  pauseMs: { '.': 280, '!': 280, '?': 280, '…': 320, ',': 130, ':': 170, ';': 170 } as Readonly<Record<string, number>>,
} as const;

/** Las letras de un texto como las ve el jugador (un emoji o una letra con tilde compuesta cuentan como una). */
export function glyphs(text: string): string[] {
  return Array.from(text);
}

/** Cuando sale cada letra, en ms desde que empieza la viñeta: la primera, enseguida. */
export function revealTimes(text: string): number[] {
  const chars = glyphs(text);
  const times: number[] = [];
  let t = 0;
  chars.forEach((char, i) => {
    times.push(t);
    t += TYPEWRITER.msPerChar;
    const next = chars[i + 1];
    if (next === undefined || next === ' ') t += TYPEWRITER.pauseMs[char] ?? 0;
  });
  return times;
}

/** Cuantas letras se ven al cabo de `elapsedMs`. */
export function typedLength(text: string, elapsedMs: number): number {
  const times = revealTimes(text);
  let count = 0;
  while (count < times.length && times[count] <= elapsedMs) count++;
  return count;
}

/** Lo que tarda en salir el texto entero, en ms. */
export function typingDuration(text: string): number {
  const times = revealTimes(text);
  return times.length ? times[times.length - 1] : 0;
}
