import { AUDIO, SFX, type SfxBus, type SfxId, type SfxSpec } from '../config/audio';

/**
 * Lo que decide si un efecto suena y como (T-014, ADR-0013), sin Web Audio: asi se prueba con Vitest. El motor
 * (`sfx.ts`) le pregunta antes de cada sonido y le cuenta cuanto va a durar.
 */

/** Cuantas voces suenan y cuando arranco la ultima de cada efecto. El tiempo es el del reloj de audio, en ms. */
export class VoiceGate {
  /** Voces de cada efecto: cuando arrancan (o arrancaran, si van en rafaga) y cuando acaban. */
  private readonly ends = new Map<SfxId, Array<{ start: number; end: number }>>();
  private readonly lastStart = new Map<SfxId, number>();

  constructor(
    private readonly specs: Readonly<Record<SfxId, SfxSpec>> = SFX,
    private readonly maxWorldVoices: number = AUDIO.maxWorldVoices,
  ) {}

  /**
   * Dentro de cuantos ms puede sonar `id`, pedido en `now`: 0 si ya; si otro igual acaba de arrancar (o esta por
   * arrancar), su separacion minima despues, mientras quepa en la rafaga (`burst`); null si no debe sonar. Tampoco suena
   * si en ese momento ya suenan todas sus voces o, si es del jardin, todas las del jardin: nunca se corta uno que suena.
   */
  delay(id: SfxId, now: number): number | null {
    this.prune(now);
    const spec = this.specs[id];
    const last = this.lastStart.get(id);
    const at = last === undefined ? now : Math.max(now, last + spec.minGapMs);
    if (at - now > spec.burst * spec.minGapMs) return null;
    if (this.voices(id, at) >= spec.maxVoices) return null;
    if (spec.bus === 'world' && this.busVoices('world', at) >= this.maxWorldVoices) return null;
    return at - now;
  }

  /** Si `id` puede sonar ya mismo, sin esperar. */
  allows(id: SfxId, now: number): boolean {
    return this.delay(id, now) === 0;
  }

  /** `id` arranca en `at` (ahora o un poco mas tarde, si va en rafaga) y sonara `durationMs`. */
  started(id: SfxId, at: number, durationMs: number): void {
    this.lastStart.set(id, at);
    const list = this.ends.get(id) ?? [];
    list.push({ start: at, end: at + durationMs });
    this.ends.set(id, list);
  }

  /** Voces de `id` que suenan en `at`. */
  voices(id: SfxId, at: number): number {
    return this.ends.get(id)?.filter((voice) => voice.start <= at && voice.end > at).length ?? 0;
  }

  /** Se callaron de golpe todas las de un canal (pausa o salida al menu): ya no cuentan. */
  clear(bus: SfxBus): void {
    for (const id of this.ends.keys()) if (this.specs[id].bus === bus) this.ends.delete(id);
  }

  private busVoices(bus: SfxBus, at: number): number {
    let count = 0;
    for (const id of this.ends.keys()) if (this.specs[id].bus === bus) count += this.voices(id, at);
    return count;
  }

  /** Olvida las voces que ya acabaron. */
  private prune(now: number): void {
    for (const [id, list] of this.ends) this.ends.set(id, list.filter((voice) => voice.end > now));
  }
}

/** Velocidad de reproduccion para variar el tono al azar `semitones` hacia arriba o hacia abajo (1 = sin cambio). */
export function pitchRate(semitones: number, random: () => number): number {
  if (semitones <= 0) return 1;
  return 2 ** (((random() * 2 - 1) * semitones) / 12);
}

/** Volumen de una repeticion: el del efecto con una variacion al azar de `jitter` (fraccion). */
export function jitteredVolume(volume: number, jitter: number, random: () => number): number {
  return volume * (1 + (random() * 2 - 1) * jitter);
}

/**
 * Que variante suena (desde 0). Con varias, nunca la misma dos veces seguidas: asi un mordisco tras otro no suena
 * identico.
 */
export function pickVariant(count: number, last: number | undefined, random: () => number): number {
  if (count <= 1) return 0;
  if (last === undefined) return Math.floor(random() * count) % count;
  const other = Math.floor(random() * (count - 1)) % (count - 1);
  return other >= last ? other + 1 : other;
}

/** Ganancia del control de efectos del jugador (0 a 100), con su curva. 0 es silencio. */
export function volumeGain(volume: number, curve: number = AUDIO.volumeCurve): number {
  const clamped = Math.min(100, Math.max(0, volume));
  return (clamped / 100) ** curve;
}

/** Paneo estereo (de -1 a 1) para algo en la columna `x` del tablero (en casillas, de 0 a `columns`). */
export function panAt(x: number, columns: number, maxPan: number = AUDIO.maxPan): number {
  const centered = (x / columns) * 2 - 1;
  return Math.min(1, Math.max(-1, centered)) * maxPan;
}

export type AudioFormat = 'ogg' | 'mp3';

/**
 * Formato de los archivos: OGG si el navegador dice que lo reproduce, si no MP3 (S-03). `canPlayType` es el de un
 * elemento `<audio>`; si luego el OGG no se decodifica, el motor prueba con el MP3.
 */
export function pickFormat(canPlayType: (mime: string) => string): AudioFormat {
  return canPlayType('audio/ogg; codecs="vorbis"') !== '' ? 'ogg' : 'mp3';
}

/** Volumen de efectos guardado en los ajustes: entero de 0 a 100, o el de por defecto si no hay o no vale. */
export function parseVolume(value: unknown, fallback: number = AUDIO.defaultSfxVolume): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.round(Math.min(100, Math.max(0, value)));
}
