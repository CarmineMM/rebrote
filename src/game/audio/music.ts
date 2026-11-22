import { MUSIC, MUSIC_TRACKS, MUSIC_TRACK_IDS, type MusicTrackId } from '../config/music';
import { MUSIC_CACHE } from '../../pwa/manifest';
import type { MusicCue } from './musicCues';
import { allMusicPaths, musicPath, staleMusic } from './musicUrls';
import { sfx } from './sfx';
import { volumeGain, type AudioFormat } from './voices';

/**
 * El unico que reproduce la musica de fondo (T-015). React le pasa lo que dice `musicFor` (que pista, cual viene despues
 * y a que volumen) y el volumen del jugador; aqui se descarga, se prepara y suena en bucle con Web Audio.
 *
 * - **Mismo contexto que los efectos** (`sfx.whenReady`): nace con el primer gesto del jugador, se suspende con la
 *   pestana oculta y el aviso de girar la pantalla, y pasa por el mismo compresor final.
 * - **Bucle sin salto.** Cada archivo trae el bucle con `MUSIC.padSeconds` de relleno por cada lado (el final antes del
 *   principio y el principio despues del final): suena entre `loopStart` y `loopEnd`, que distan justo lo que dura el
 *   bucle, asi que empalma aunque el decodificador anada retraso al principio (MP3).
 * - **Fundidos.** Al cambiar de pista, la que se va baja mientras la nueva sube; cualquier otra que quedase sonando (un
 *   cambio a mitad de otro fundido) baja tambien. Nunca hay dos a todo volumen.
 * - **Volumen 0:** no se descarga ni suena nada. La portada va primero: la pista se descarga cuando el navegador queda
 *   libre. Solo se guardan preparadas (decodificadas) la que suena y la siguiente: cada una ocupa decenas de MB.
 * - **Sin conexion (U-05).** En la version publicada (la que tiene service worker, instalada o no), despues de la portada
 *   se descargan todas las pistas en el formato de este navegador y se guardan en la cache de musica (`MUSIC_CACHE`), la
 *   misma que usa el service worker: se juega con musica sin red aunque no se haya oido. Cada archivo lleva su huella
 *   (`musicUrls.ts`); lo guardado de otra huella se borra.
 */

interface Voice {
  readonly track: MusicTrackId;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  /** Ya se esta yendo: baja hasta callarse. */
  leaving: boolean;
}

class MusicEngine {
  private ctx: AudioContext | null = null;
  /** Volumen del jugador. */
  private volumeNode: GainNode | null = null;
  /** Pausa y partida acabada (`MusicCue.level`). */
  private levelNode: GainNode | null = null;
  private readonly downloads = new Map<string, Promise<ArrayBuffer | null>>();
  private readonly buffers = new Map<MusicTrackId, AudioBuffer>();
  private readonly decodes = new Map<MusicTrackId, Promise<AudioBuffer | null>>();
  private readonly voices = new Set<Voice>();
  private cue: MusicCue = { track: null, next: null, level: 1 };
  private volume: number = MUSIC.defaultVolume;
  private installed = false;
  /** La portada ya se ve y el navegador quedo libre: ya se puede descargar. */
  private idle = false;
  /** Ya se bajo (o se esta bajando) toda la musica para jugar sin conexion. */
  private kept = false;
  private cachePromise: Promise<Cache | null> | null = null;

  /** Se llama una vez al arrancar, despues de `sfx.install()`. */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    this.installed = true;
    if (sfx.unavailable) return;
    sfx.whenReady((ctx, output) => this.attach(ctx, output));
    const idle = (window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
    const ready = () => {
      this.idle = true;
      this.fetchWanted();
      void this.keepOffline();
    };
    // Despues de los efectos: primero la portada, luego los efectos (pesan poco), luego la musica.
    window.setTimeout(() => (idle ? idle(ready, { timeout: MUSIC.idleDelayMs }) : ready()), MUSIC.idleDelayMs);
  }

  /** Lo que debe sonar ahora (sale de `musicFor`). */
  request(cue: MusicCue): void {
    const changed = cue.track !== this.cue.track || cue.next !== this.cue.next;
    this.cue = cue;
    this.applyLevel();
    if (changed) this.update();
  }

  /** Volumen de musica del jugador, de 0 a 100. Con 0 no se descarga ni suena nada. */
  setVolume(volume: number): void {
    const wasSilent = this.volume <= 0;
    this.volume = volume;
    this.applyVolume();
    if (wasSilent !== volume <= 0) {
      this.update();
      if (this.idle) void this.keepOffline();
    }
  }

  /** La pista que suena (o esta entrando) ahora, para la pagina de prueba y los tests en el navegador. */
  get playing(): MusicTrackId | null {
    for (const voice of this.voices) if (!voice.leaving) return voice.track;
    return null;
  }

  private attach(ctx: AudioContext, output: AudioNode): void {
    this.ctx = ctx;
    this.volumeNode = ctx.createGain();
    this.levelNode = ctx.createGain();
    this.levelNode.connect(this.volumeNode).connect(output);
    this.volumeNode.gain.value = this.volumeTarget();
    this.levelNode.gain.value = this.cue.level;
    this.update();
  }

  private volumeTarget(): number {
    return volumeGain(this.volume) * MUSIC.gain;
  }

  private applyVolume(): void {
    if (!this.ctx || !this.volumeNode) return;
    this.volumeNode.gain.setTargetAtTime(this.volumeTarget(), this.ctx.currentTime, 0.05);
  }

  private applyLevel(): void {
    if (!this.ctx || !this.levelNode) return;
    this.levelNode.gain.setTargetAtTime(this.cue.level, this.ctx.currentTime, MUSIC.levelMs / 1000);
  }

  /** Vuelve a mirar que tiene que sonar: arranca lo que falta, despide lo que sobra y prepara la siguiente. */
  private update(): void {
    const wanted = this.volume > 0 ? this.cue.track : null;
    for (const voice of this.voices) {
      if (!voice.leaving && voice.track !== wanted) this.leave(voice, wanted ? MUSIC.crossfadeMs : MUSIC.fadeOutMs);
    }
    this.fetchWanted();
    this.release();
    if (!wanted || this.playing === wanted) return;
    const buffer = this.buffers.get(wanted);
    if (buffer) this.start(wanted, buffer);
    // Cuando este lista, si aun toca, entra. Si no se pudo decodificar, no se insiste: el juego sigue sin ella.
    else void this.prepare(wanted)?.then((ready) => ready && this.update());
  }

  /** Descarga (y, con contexto, prepara) la que toca y la siguiente. Nada con el volumen a 0 o antes de la portada. */
  private fetchWanted(): void {
    if (this.volume <= 0) return;
    for (const track of [this.cue.track, this.cue.next]) {
      if (!track) continue;
      if (this.ctx) void this.prepare(track);
      else if (this.idle) void this.download(track, sfx.audioFormat);
    }
  }

  private start(track: MusicTrackId, buffer: AudioBuffer): void {
    const ctx = this.ctx;
    if (!ctx || !this.levelNode) return;
    const spec = MUSIC_TRACKS[track];
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = MUSIC.padSeconds;
    source.loopEnd = MUSIC.padSeconds + spec.loopSeconds;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    // Si otra se esta yendo, esta entra con el mismo fundido; si no habia nada, entra algo mas deprisa.
    const fade = (this.voices.size > 0 ? MUSIC.crossfadeMs : MUSIC.fadeOutMs) / 1000;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(spec.volume, now + fade);
    source.connect(gain).connect(this.levelNode);
    const voice: Voice = { track, source, gain, leaving: false };
    this.voices.add(voice);
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect();
      gain.disconnect();
      this.release();
    };
    source.start(now, MUSIC.padSeconds);
  }

  /** Baja una pista hasta callarla y la para. */
  private leave(voice: Voice, fadeMs: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    voice.leaving = true;
    const now = ctx.currentTime;
    const end = now + fadeMs / 1000;
    const gain = voice.gain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, end);
    try {
      voice.source.stop(end);
    } catch {
      // Ya habia acabado.
    }
  }

  /** Olvida lo decodificado que ya no suena ni toca enseguida (lo descargado se queda: pesa poco). */
  private release(): void {
    const keep = new Set<MusicTrackId | null>([this.cue.track, this.cue.next]);
    for (const voice of this.voices) keep.add(voice.track);
    for (const track of [...this.buffers.keys()]) {
      if (keep.has(track)) continue;
      this.buffers.delete(track);
      this.decodes.delete(track);
    }
  }

  /** Descarga y decodifica una pista (una vez). Si el OGG no se decodifica (Safari antiguo), prueba con el MP3. */
  private prepare(track: MusicTrackId): Promise<AudioBuffer | null> | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    let decoding = this.decodes.get(track);
    if (!decoding) {
      decoding = (async () => {
        let buffer = await decode(ctx, await this.download(track, sfx.audioFormat));
        if (!buffer && sfx.audioFormat === 'ogg') buffer = await decode(ctx, await this.download(track, 'mp3'));
        // Mientras se decodificaba pudo dejar de hacer falta (o el jugador bajo la musica a 0).
        if (buffer && this.decodes.get(track) === decoding) this.buffers.set(track, buffer);
        // Sin red y sin guardar: se vuelve a intentar la proxima vez que toque (no ahora, para no insistir en bucle).
        if (!buffer && this.decodes.get(track) === decoding) this.decodes.delete(track);
        return buffer;
      })();
      this.decodes.set(track, decoding);
    }
    return decoding;
  }

  private download(track: MusicTrackId, format: AudioFormat): Promise<ArrayBuffer | null> {
    const url = musicUrl(track, format);
    let pending = this.downloads.get(url);
    if (!pending) {
      pending = this.fetchMusic(url);
      this.downloads.set(url, pending);
      // Si fallo (sin red), la proxima vez se vuelve a intentar.
      void pending.then((bytes) => bytes || this.downloads.delete(url));
    }
    return pending;
  }

  /** Cache de musica, solo en la version publicada (con service worker); null en desarrollo o sin cache. */
  private cache(): Promise<Cache | null> {
    if (!this.cachePromise) {
      const usable = import.meta.env.PROD && typeof caches !== 'undefined' && 'serviceWorker' in navigator;
      this.cachePromise = usable ? caches.open(MUSIC_CACHE).catch(() => null) : Promise.resolve(null);
    }
    return this.cachePromise;
  }

  /** Lo guardado si lo hay; si no, de la red, y se guarda para jugar sin conexion. */
  private async fetchMusic(url: string): Promise<ArrayBuffer | null> {
    const cache = await this.cache();
    if (cache) {
      const hit = await cache.match(url).catch(() => undefined);
      if (hit) return hit.arrayBuffer().catch(() => null);
    }
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      if (cache) await cache.put(url, response.clone()).catch(() => undefined);
      return await response.arrayBuffer();
    } catch {
      return null;
    }
  }

  /**
   * Baja de una en una las pistas que falten (primero las que tocan ya) para jugar sin conexion, y borra lo guardado de
   * otra huella. Nada con el volumen a 0, en desarrollo o si ya se hizo.
   */
  private async keepOffline(): Promise<void> {
    if (this.kept || this.volume <= 0) return;
    const cache = await this.cache();
    if (!cache || this.kept) return;
    this.kept = true;
    for (const track of MUSIC_TRACK_IDS) {
      if (!(await this.download(track, sfx.audioFormat))) this.kept = false;
    }
    const keep = [...allMusicPaths('ogg'), ...allMusicPaths('mp3')].map((path) => absolute(`${import.meta.env.BASE_URL}${path}`));
    const cached = (await cache.keys().catch(() => [])).map((request) => request.url);
    for (const url of staleMusic(cached, keep)) await cache.delete(url).catch(() => false);
  }
}

const absolute = (url: string) => new URL(url, window.location.href).href;

async function decode(ctx: AudioContext, bytes: ArrayBuffer | null): Promise<AudioBuffer | null> {
  if (!bytes) return null;
  try {
    // decodeAudioData se queda con el buffer: se le pasa una copia para poder volver a decodificarla mas tarde.
    return await ctx.decodeAudioData(bytes.slice(0));
  } catch {
    return null;
  }
}

/** Direccion de una pista de `public/audio/musica/`, respetando la base de Vite y con su huella. */
export function musicUrl(track: MusicTrackId, format: AudioFormat): string {
  return `${import.meta.env.BASE_URL}${musicPath(track, format)}`;
}

export const music = new MusicEngine();
