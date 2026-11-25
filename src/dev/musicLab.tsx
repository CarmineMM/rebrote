import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { music } from '../game/audio/music';
import { musicFor } from '../game/audio/musicCues';
import { sfx } from '../game/audio/sfx';
import { volumeGain } from '../game/audio/voices';
import { MUSIC, MUSIC_TRACK_IDS, type MusicTrackId } from '../game/config/music';
import './soundLab.css';

/**
 * Pagina de prueba de la musica (T-015, U-02): `npm run dev` y abrir `/tests/musica.html`. No la ve el jugador (`npm run build`
 * no la incluye), asi que sus textos van en espanol sin pasar por `src/i18n/`.
 *
 * Cada ambiente con la elegida y sus alternativas, ya recortadas en bucle como las oye el juego: se oyen enteras o justo
 * en el empalme (unos segundos antes de que vuelva a empezar), se marca con cual quedarse (se guarda en este navegador) y
 * se copian las elecciones para pasarselas a Claude Code. Abajo, el motor de verdad con sus fundidos, la pausa y el final.
 */

interface CatalogOption {
  url: string;
  chosen: boolean;
  title: string;
  author: string;
  license: string;
  page: string;
  about: string;
  cut: string;
  seconds: number;
  kb: number;
}

interface CatalogTrack {
  id: MusicTrackId;
  about: string;
  options: CatalogOption[];
}

const NAMES: Record<MusicTrackId, string> = { menu: 'Menú', round: 'Ronda', boss: 'Jefe', heroic: 'Historia (heroica)' };
const CHOICES_KEY = 'rebrote.musica.elecciones';
/** Cuanto antes del final empieza "Empalme": se oyen esos segundos, la vuelta y lo que sigue. */
const SEAM_LEAD_S = 5;

type Choices = Partial<Record<MusicTrackId, number>>;

function loadChoices(): Choices {
  try {
    return JSON.parse(localStorage.getItem(CHOICES_KEY) ?? '{}') as Choices;
  } catch {
    return {};
  }
}

/** Un reproductor aparte para oir las candidatas en bucle (el motor del juego solo conoce las elegidas). */
class Audition {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private current: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  playing: string | null = null;

  constructor() {
    sfx.whenReady((ctx, out) => {
      this.ctx = ctx;
      this.output = ctx.createGain();
      this.output.connect(out);
      this.setVolume(MUSIC.defaultVolume);
    });
  }

  setVolume(volume: number): void {
    if (this.ctx && this.output) this.output.gain.setTargetAtTime(volumeGain(volume) * MUSIC.gain, this.ctx.currentTime, 0.05);
  }

  async play(url: string, seconds: number, fromSeam: boolean): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.output) return;
    this.stop();
    this.playing = url;
    let pending = this.buffers.get(url);
    if (!pending) {
      pending = fetch(url)
        .then((response) => (response.ok ? response.arrayBuffer() : null))
        .then((bytes) => (bytes ? ctx.decodeAudioData(bytes) : null))
        .catch(() => null);
      this.buffers.set(url, pending);
    }
    const buffer = await pending;
    if (!buffer || this.playing !== url) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = MUSIC.padSeconds;
    source.loopEnd = MUSIC.padSeconds + seconds;
    const gain = ctx.createGain();
    source.connect(gain).connect(this.output);
    source.start(ctx.currentTime, MUSIC.padSeconds + (fromSeam ? Math.max(0, seconds - SEAM_LEAD_S) : 0));
    this.current = { source, gain };
  }

  stop(): void {
    const ctx = this.ctx;
    this.playing = null;
    if (!ctx || !this.current) return;
    const { source, gain } = this.current;
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    source.stop(ctx.currentTime + 0.3);
    this.current = null;
  }
}

const audition = new Audition();
const ogg = (url: string) => `${import.meta.env.BASE_URL}${url}.ogg`;

function MusicLab() {
  const [catalog, setCatalog] = useState<CatalogTrack[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [ready, setReady] = useState(false);
  const [volume, setVolume] = useState<number>(MUSIC.defaultVolume);
  const [choices, setChoices] = useState<Choices>(loadChoices);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [engine, setEngine] = useState<string>('nada');
  const situation = useRef({ track: null as MusicTrackId | null, halted: false, over: false });

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}audio-lab/musica/candidatos/catalogo.json`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('sin catalogo'))))
      .then((data: { tracks: CatalogTrack[] }) => setCatalog(data.tracks))
      .catch(() => setMissing(true));
    const timer = window.setInterval(() => {
      setReady(sfx.ready);
      setEngine(music.playing ?? 'nada');
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    audition.setVolume(volume);
    music.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    try {
      localStorage.setItem(CHOICES_KEY, JSON.stringify(choices));
    } catch {
      // Sin almacenamiento: las elecciones duran lo que la pagina.
    }
  }, [choices]);

  const listen = (option: CatalogOption, fromSeam: boolean) => {
    const key = `${option.url}${fromSeam ? '#empalme' : ''}`;
    if (playing === key) {
      audition.stop();
      setPlaying(null);
      return;
    }
    request(null);
    void audition.play(ogg(option.url), option.seconds, fromSeam);
    setPlaying(key);
  };

  /** El motor del juego, como si el jugador fuera a ese sitio: con sus fundidos. */
  const request = (track: MusicTrackId | null, change: Partial<{ halted: boolean; over: boolean }> = {}) => {
    const next = { ...situation.current, ...change, track };
    situation.current = next;
    if (track) {
      audition.stop();
      setPlaying(null);
    }
    const screen = track === 'menu' ? 'title' : 'board';
    const round = track === 'boss' ? { outbreak: 'creeper' as const, number: 10, bossRound: 10 } : { outbreak: 'creeper' as const, number: 3, bossRound: 10 };
    const cue = track ? musicFor({ screen, round, halted: next.halted, over: next.over }) : { track: null, next: null, level: 1 };
    music.request(cue);
  };

  const summary = () => {
    const lines = (catalog ?? []).flatMap((track) => {
      const index = choices[track.id] ?? 0;
      if (index === 0) return [];
      const option = track.options[index];
      return [`${track.id}: alternativa ${index} («${option?.title}», de ${option?.author})`];
    });
    return lines.join('\n') || 'Me quedo con las tres elegidas.';
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copia esto:', summary());
    }
  };

  return (
    <main className="lab">
      <header className="lab-head">
        <h1>Música de Rebrote</h1>
        <p>
          Cada ambiente con la elegida y sus alternativas, ya recortadas en bucle como las oye el juego. «Bucle» la toca
          entera y vuelve a empezar; «Empalme» empieza {SEAM_LEAD_S} s antes del final para oír justo la vuelta. Marca con
          cuál te quedas y copia las elecciones.
        </p>
        <div className="lab-bar">
          <span className={`lab-state${ready ? ' is-on' : ''}`}>{ready ? 'Sonido activo' : 'Haz clic en cualquier sitio para activar el sonido'}</span>
          <label className="lab-volume">
            Volumen de música <input type="range" min={0} max={100} step={5} value={volume} onChange={(e) => setVolume(Number(e.target.value))} /> {volume}
          </label>
          <button type="button" onClick={copy}>
            {copied ? '¡Copiado!' : 'Copiar elecciones'}
          </button>
          <button
            type="button"
            onClick={() => {
              audition.stop();
              setPlaying(null);
            }}
            disabled={!playing}
          >
            Parar
          </button>
        </div>
        <div className="lab-bar">
          <strong>En el juego (las elegidas, con el motor de verdad):</strong>
          {MUSIC_TRACK_IDS.map((id) => (
            <button key={id} type="button" className={engine === id ? 'is-on' : ''} onClick={() => request(id)}>
              {NAMES[id]}
            </button>
          ))}
          <button type="button" onClick={() => request(situation.current.track, { halted: !situation.current.halted })}>
            Pausa sí / no
          </button>
          <button type="button" onClick={() => request(situation.current.track, { over: !situation.current.over })}>
            Partida acabada sí / no
          </button>
          <button type="button" onClick={() => request(null)}>
            Silencio
          </button>
          <span className="lab-state is-on">Suena: {engine === 'nada' ? 'nada' : NAMES[engine as MusicTrackId]}</span>
        </div>
        {missing && <p className="lab-warn">No hay catálogo: pasa `npm run audio` (necesita los originales en `audio-lab/musica/`).</p>}
      </header>

      {(catalog ?? []).map((track) => {
        const chosen = choices[track.id] ?? 0;
        return (
          <section key={track.id} className="lab-group">
            <h2>
              {NAMES[track.id]} · {track.about}
            </h2>
            {track.options.map((option, i) => (
              <article key={option.url} className={`lab-sound${chosen === i ? ' is-chosen' : ''}`}>
                <div className="lab-title">
                  <code>{i === 0 ? 'Elegida' : `Alternativa ${i}`}</code>
                  <span>
                    «{option.title}», de {option.author} · {option.license}
                  </span>
                  <small>
                    <a href={option.page} target="_blank" rel="noreferrer">
                      página de la obra
                    </a>
                  </small>
                </div>
                <div className="lab-options">
                  <div className="lab-bar">
                    <button type="button" className={playing === option.url ? 'is-on' : ''} onClick={() => listen(option, false)}>
                      ▶ Bucle
                    </button>
                    <button type="button" className={playing === `${option.url}#empalme` ? 'is-on' : ''} onClick={() => listen(option, true)}>
                      ▶ Empalme
                    </button>
                    <label>
                      <input type="radio" name={track.id} checked={chosen === i} onChange={() => setChoices((current) => ({ ...current, [track.id]: i }))} /> me
                      quedo
                    </label>
                  </div>
                  <small>{option.about}</small>
                  <small>
                    {option.cut} · bucle de {option.seconds.toFixed(1)} s · {option.kb} KB
                  </small>
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </main>
  );
}

sfx.install();
music.install();
createRoot(document.getElementById('root')!).render(<MusicLab />);
