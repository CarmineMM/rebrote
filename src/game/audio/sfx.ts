import { AUDIO, SFX, SFX_IDS, sfxFiles, type SfxBus, type SfxId } from '../config/audio';
import type { SfxCue } from './cues';
import { VoiceGate, jitteredVolume, pickFormat, pickVariant, pitchRate, volumeGain, type AudioFormat } from './voices';

/**
 * El unico que reproduce sonidos (T-014, ADR-0013). Escenas, vistas y componentes piden `sfx.play(id)`; aqui se decide
 * si suena (volumen, pausa, limites de voces) y se reproduce con Web Audio.
 *
 * Vive fuera de Phaser: el juego se recrea al cambiar la calidad o el idioma y los menus de React suenan sin escena.
 * - **Primer gesto.** El contexto de audio se crea con el primer toque, clic o tecla del jugador (antes el navegador no
 *   deja sonar y avisaria en la consola). Hasta entonces `play` no hace nada.
 * - **Carga.** Los archivos se descargan en segundo plano cuando la portada ya se ve, y se decodifican al crear el
 *   contexto. Lo que aun no esta listo no suena.
 * - **Pausa.** Con el juego en pausa se callan los del jardin (`world`) con un fundido corto; los de los menus siguen.
 * - **Pestana oculta y aviso de girar la pantalla.** El contexto entero se suspende: no suena nada.
 * - **Sin audio** (navegador sin Web Audio, archivo que falla): el juego sigue en silencio, sin errores.
 */

interface Voice {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  readonly bus: SfxBus;
}

/** Lo que mantiene el audio suspendido: pestana oculta o movil en vertical (ADR-0011). */
export type AudioHold = 'hidden' | 'rotate';

const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

type AudioContextClass = typeof AudioContext;

/** Quien mas suena por el mismo contexto (la musica, T-015): recibe el contexto y la entrada del compresor final. */
export type AudioReadyListener = (ctx: AudioContext, output: AudioNode) => void;

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private readonly readyListeners: AudioReadyListener[] = [];
  private readonly buses = new Map<SfxBus, GainNode>();
  private readonly buffers = new Map<string, AudioBuffer>();
  /** Decodificaciones en curso o acabadas, por archivo: un sonido pedido antes de tiempo espera a la suya. */
  private readonly decodes = new Map<string, Promise<AudioBuffer | null>>();
  private readonly downloads = new Map<string, Promise<ArrayBuffer | null>>();
  private readonly voices = new Set<Voice>();
  private readonly lastVariant = new Map<SfxId, number>();
  private readonly gate = new VoiceGate();
  private readonly holds = new Set<AudioHold>();
  private format: AudioFormat = 'mp3';
  private volume: number = AUDIO.defaultSfxVolume;
  private worldPaused = false;
  private installed = false;
  private decoding = false;
  private disabled = false;

  /**
   * Prepara el audio: espera el primer gesto del jugador, sigue si la pestana se oculta y empieza a descargar los archivos
   * cuando el navegador este libre. Se llama una vez al arrancar; llamarla de nuevo no hace nada.
   */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    this.installed = true;
    const Context = audioContextClass();
    if (!Context) {
      this.disabled = true;
      return;
    }
    this.format = pickFormat((mime) => {
      try {
        return document.createElement('audio').canPlayType(mime);
      } catch {
        return '';
      }
    });
    const onGesture = () => this.unlock(Context);
    for (const type of GESTURES) window.addEventListener(type, onGesture, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => this.hold('hidden', document.hidden));
    this.hold('hidden', document.hidden);
    // La portada va primero: los sonidos se descargan cuando el navegador queda libre.
    const idle = (window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => this.preload(), { timeout: 3000 });
    else window.setTimeout(() => this.preload(), 1500);
  }

  /** Pide un efecto. `pan` va de -1 (izquierda) a 1 (derecha). Si no puede sonar ahora, no pasa nada. */
  play(id: SfxId, pan = 0): void {
    const bus = SFX[id].bus;
    if (bus === 'world' && this.worldPaused) return;
    this.start(id, pan, bus);
  }

  /**
   * Muestra de un efecto al mover el volumen en los ajustes: suena por el canal de los menus, asi que se oye tambien con
   * el juego en pausa.
   */
  preview(id: SfxId): void {
    this.start(id, 0, 'ui');
  }

  private start(id: SfxId, pan: number, bus: SfxBus, canWait = true): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.volume <= 0 || this.holds.size > 0) return;
    const now = ctx.currentTime * 1000;
    const delayMs = this.gate.delay(id, now);
    if (delayMs === null) return;
    const files = sfxFiles(id);
    const variant = pickVariant(files.length, this.lastVariant.get(id), Math.random);
    const buffer = this.buffers.get(files[variant]);
    const output = this.buses.get(bus);
    if (!output) return;
    if (!buffer) {
      // Aun decodificandose (el primer clic acaba de crear el contexto): espera un poco, si llega a tiempo suena.
      const decoding = this.decodes.get(files[variant]);
      if (canWait && decoding) {
        void decoding.then(() => {
          const late = ctx.currentTime * 1000 - now;
          if (late <= AUDIO.lateMs && !(bus === 'world' && this.worldPaused)) this.start(id, pan, bus, false);
        });
      }
      return;
    }
    this.lastVariant.set(id, variant);

    const spec = SFX[id];
    const rate = pitchRate(spec.pitchJitter, Math.random);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = jitteredVolume(spec.volume, AUDIO.volumeJitter, Math.random);
    source.connect(gain);
    let last: AudioNode = gain;
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      last = panner;
    }
    last.connect(output);
    const voice: Voice = { source, gain, bus };
    this.voices.add(voice);
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect();
      gain.disconnect();
      if (last !== gain) last.disconnect();
    };
    // Varios a la vez se escalonan unos ms (rafaga): `delayMs` lo dice la regla de voces.
    source.start(ctx.currentTime + delayMs / 1000);
    this.gate.started(id, now + delayMs, (buffer.duration * 1000) / rate);
  }

  /** Pide los sonidos que devuelven las reglas de `cues.ts`. */
  playCues(cues: readonly SfxCue[]): void {
    for (const cue of cues) this.play(cue.id, cue.pan);
  }

  /** Volumen de efectos del jugador, de 0 a 100. Con 0 no se reproduce nada. */
  setVolume(volume: number): void {
    this.volume = volume;
    this.applyVolume();
  }

  /** El juego entra o sale de la pausa: lo que suena en el jardin se calla con un fundido y no suena nada nuevo. */
  pauseWorld(paused: boolean): void {
    if (paused === this.worldPaused) return;
    this.worldPaused = paused;
    if (paused) this.silence('world');
  }

  /** Se acabo la partida en pantalla (salida al menu, partida nueva): lo que quedaba del jardin se calla. */
  stopWorld(): void {
    this.silence('world');
  }

  /** Suspende todo el audio mientras haya algun motivo (pestana oculta, aviso de girar la pantalla). */
  hold(reason: AudioHold, on: boolean): void {
    if (on) this.holds.add(reason);
    else this.holds.delete(reason);
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.holds.size > 0 && ctx.state === 'running') ctx.suspend().catch(() => undefined);
    else if (this.holds.size === 0 && ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  }

  /** Si ya puede sonar (hubo gesto, hay contexto y no esta suspendido). Para la pagina de prueba. */
  get ready(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Archivos ya decodificados, de todos los que hay. Para la pagina de prueba. */
  get loaded(): { done: number; total: number } {
    return { done: this.buffers.size, total: SFX_IDS.reduce((sum, id) => sum + sfxFiles(id).length, 0) };
  }

  /**
   * Reproduce un archivo suelto, sin limites ni pausa, por el canal de los menus (la pagina de prueba oye asi las
   * alternativas de cada efecto). `url` es completa, con extension.
   */
  async audition(url: string, volume = 1): Promise<void> {
    const ctx = this.ctx;
    const output = this.buses.get('ui');
    if (!ctx || !output || ctx.state !== 'running') return;
    const bytes = await fetchBytes(url);
    if (!bytes) return;
    const buffer = await ctx.decodeAudioData(bytes).catch(() => null);
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(output);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }

  private unlock(Context: AudioContextClass): void {
    if (this.disabled) return;
    if (this.ctx) {
      // iPhone puede interrumpir el audio (una llamada): vuelve con el siguiente gesto.
      if (this.ctx.state !== 'running' && this.holds.size === 0) this.ctx.resume().catch(() => undefined);
      return;
    }
    // Si el navegador dice que este evento no cuenta como gesto (un toque que aun no acabo), se espera al siguiente.
    const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    if (activation && !activation.isActive) return;
    try {
      this.ctx = new Context();
    } catch {
      this.disabled = true;
      return;
    }
    const ctx = this.ctx;
    const { compressor: c } = AUDIO;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = c.thresholdDb;
    compressor.knee.value = c.kneeDb;
    compressor.ratio.value = c.ratio;
    compressor.attack.value = c.attackMs / 1000;
    compressor.release.value = c.releaseMs / 1000;
    compressor.connect(ctx.destination);
    this.compressor = compressor;
    this.master = ctx.createGain();
    this.master.connect(compressor);
    for (const bus of ['world', 'ui'] as const) {
      const node = ctx.createGain();
      node.connect(this.master);
      this.buses.set(bus, node);
    }
    this.applyVolume();
    if (this.holds.size > 0) ctx.suspend().catch(() => undefined);
    else if (ctx.state !== 'running') ctx.resume().catch(() => undefined);
    this.preload();
    void this.decodeAll();
    for (const listener of this.readyListeners) listener(ctx, compressor);
  }

  /**
   * Avisa cuando ya hay contexto de audio (tras el primer gesto), o enseguida si ya lo hay. La musica (T-015) suena por
   * el mismo contexto: se calla igual con la pestana oculta y el aviso de girar, y pasa por el mismo compresor.
   */
  whenReady(listener: AudioReadyListener): void {
    if (this.ctx && this.compressor) listener(this.ctx, this.compressor);
    else this.readyListeners.push(listener);
  }

  /** Formato que se descarga (OGG o, si el navegador no lo reproduce, MP3). */
  get audioFormat(): AudioFormat {
    return this.format;
  }

  /** Si este navegador no tiene audio: entonces tampoco hay musica. */
  get unavailable(): boolean {
    return this.disabled;
  }

  private applyVolume(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const target = volumeGain(this.volume) * AUDIO.masterGain;
    this.master.gain.setTargetAtTime(target, ctx.currentTime, 0.02);
  }

  /** Calla con un fundido corto todo lo que suena en un canal. */
  private silence(bus: SfxBus): void {
    const ctx = this.ctx;
    this.gate.clear(bus);
    if (!ctx) return;
    const end = ctx.currentTime + AUDIO.fadeMs / 1000;
    for (const voice of this.voices) {
      if (voice.bus !== bus) continue;
      voice.gain.gain.cancelScheduledValues(ctx.currentTime);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, ctx.currentTime);
      voice.gain.gain.linearRampToValueAtTime(0, end);
      try {
        voice.source.stop(end);
      } catch {
        // Ya habia acabado.
      }
    }
  }

  /** Empieza a descargar todos los archivos (una vez). */
  private preload(): void {
    if (this.disabled) return;
    for (const id of SFX_IDS) for (const file of sfxFiles(id)) this.download(file, this.format);
  }

  private download(file: string, format: AudioFormat): Promise<ArrayBuffer | null> {
    const key = `${file}.${format}`;
    let pending = this.downloads.get(key);
    if (!pending) {
      pending = fetchBytes(audioUrl(file, format));
      this.downloads.set(key, pending);
    }
    return pending;
  }

  /** Decodifica todo lo descargado. Si un OGG no se decodifica (Safari antiguo), prueba con su MP3. */
  private async decodeAll(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || this.decoding) return;
    this.decoding = true;
    const files = SFX_IDS.flatMap((id) => sfxFiles(id));
    await Promise.all(
      files.map((file) => {
        const decoding = (async () => {
          let buffer = await this.decode(ctx, await this.download(file, this.format));
          if (!buffer && this.format === 'ogg') buffer = await this.decode(ctx, await this.download(file, 'mp3'));
          if (buffer) this.buffers.set(file, buffer);
          return buffer;
        })();
        this.decodes.set(file, decoding);
        return decoding;
      }),
    );
  }

  private async decode(ctx: AudioContext, bytes: ArrayBuffer | null): Promise<AudioBuffer | null> {
    if (!bytes) return null;
    try {
      // decodeAudioData se queda con el buffer: se le pasa una copia para poder reintentar.
      return await ctx.decodeAudioData(bytes.slice(0));
    } catch {
      return null;
    }
  }
}

function audioContextClass(): AudioContextClass | null {
  const scope = window as Window & { webkitAudioContext?: AudioContextClass };
  return window.AudioContext ?? scope.webkitAudioContext ?? null;
}

/** Direccion de un archivo de `public/audio/`, respetando la base de Vite. */
export function audioUrl(file: string, format: AudioFormat): string {
  return `${import.meta.env.BASE_URL}${AUDIO.folder}${file}.${format}`;
}

async function fetchBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export const sfx = new SfxEngine();
