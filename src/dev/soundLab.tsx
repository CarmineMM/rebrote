import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { combatCues } from '../game/audio/cues';
import { sfx } from '../game/audio/sfx';
import { panAt } from '../game/audio/voices';
import { AUDIO, SFX, SFX_IDS, type SfxId } from '../game/config/audio';
import { BOARD } from '../game/config/balance';
import { spawnEnemy, stepCombat, type CombatEvent } from '../game/core/combat';
import { createMatch, createPlant } from '../game/core/match';
import { createShooter } from '../game/core/plants';
import './soundLab.css';

/**
 * Pagina de prueba de los efectos de sonido (T-014, S-02): `npm run dev` y abrir `/tests/sonidos.html`. No la ve el jugador
 * (`npm run build` no la incluye), asi que sus textos van en espanol sin pasar por `src/i18n/`.
 *
 * Lista cada efecto con el elegido y sus alternativas para oirlos uno a uno, deja marcar con cual quedarse (se guarda
 * en este navegador) y copiar las elecciones para pasarselas a Claude Code. Las pruebas de carga usan el combate de
 * verdad y las mismas reglas de sonido que el juego.
 */

interface CatalogFile {
  url: string;
  source: string;
  seconds: number;
  recipes?: Array<{ name: string; code: string }>;
}

interface CatalogSound {
  id: SfxId;
  about: string;
  pick: CatalogFile[];
  alternatives: CatalogFile[];
}

/** Los grupos de la pagina, con lo ultimo arriba. Un efecto que no este en ninguno sale en "Otros" (`groups`). */
const GROUPS: Array<{ title: string; ids: SfxId[] }> = [
  { title: 'Arrancar (T-046)', ids: ['uproot'] },
  { title: 'Morris y la sobrecarga (T-042)', ids: ['morrisTalk', 'morrisBrood', 'morrisDefeated', 'overloadOn', 'overloadOff'] },
  { title: 'Brain (T-039)', ids: ['brainTalk', 'brainHop', 'brainLand', 'brainDefeated'] },
  { title: 'Tropas del brote 3 (T-038)', ids: ['hop', 'reveal'] },
  { title: 'Plantas y jugador', ids: ['sow', 'shot', 'shotFire', 'shotIce', 'infuseFire', 'infuseIce', 'fuse', 'levelUp', 'plantDestroyed', 'coin'] },
  { title: 'Combate', ids: ['hit', 'hitFire', 'hitIce', 'hitArmor', 'bite', 'spit', 'spitHit', 'enemyKilled', 'enemyEscaped'] },
  { title: 'Minas', ids: ['mineTick', 'fireExplosion', 'iceExplosion'] },
  { title: 'Escudo (T-024)', ids: ['sowWall', 'infuseShield', 'wallHit', 'wallBreak'] },
  { title: 'Inventos (T-021)', ids: ['relocate', 'grenadeThrow', 'grenadeLand', 'grenadeBoom', 'iceWallRise', 'iceHit', 'iceBreak', 'iceMelt'] },
  { title: 'Tropas del brote 2 (T-025)', ids: ['minstrelInhale', 'verse', 'verseHit', 'clone'] },
  { title: 'Creeper', ids: ['creeperWarn', 'creeperTakeoff', 'creeperLand', 'creeperTalk', 'creeperRage', 'creeperDefeated'] },
  { title: 'Elk Cloner (T-026)', ids: ['elkClonerTalk', 'poemWarn', 'poem', 'elkClonerDefeated'] },
  { title: 'Laboratorio de Patty (T-022)', ids: ['purchase', 'powerUpgrade'] },
  { title: 'Historia y tours (T-031, T-013)', ids: ['voiceBoxer', 'voicePatty', 'keystroke'] },
  { title: 'Rondas, partida y menus', ids: ['attackStarted', 'roundCleared', 'unlock', 'defeat', 'victory', 'button'] },
];

/** Los grupos y, al final, los efectos que no estan en ninguno: asi un efecto nuevo siempre sale en la pagina. */
function groups(): Array<{ title: string; ids: SfxId[] }> {
  const listed = new Set(GROUPS.flatMap((group) => group.ids));
  const rest = SFX_IDS.filter((id) => !listed.has(id));
  return rest.length > 0 ? [...GROUPS, { title: 'Otros', ids: rest }] : GROUPS;
}

const CHOICES_KEY = 'rebrote.sonidos.elecciones';

/** Eleccion de cada efecto: 0 el elegido, 1 en adelante una alternativa. */
type Choices = Partial<Record<SfxId, number>>;

function loadChoices(): Choices {
  try {
    return JSON.parse(localStorage.getItem(CHOICES_KEY) ?? '{}') as Choices;
  } catch {
    return {};
  }
}

const ext = (url: string) => `${import.meta.env.BASE_URL}${url}.ogg`;

function SoundLab() {
  const [catalog, setCatalog] = useState<CatalogSound[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(sfx.loaded);
  const [volume, setVolume] = useState<number>(AUDIO.defaultSfxVolume);
  const [choices, setChoices] = useState<Choices>(loadChoices);
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const stop = useRef<() => void>(() => undefined);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}audio-lab/candidatos/catalogo.json`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('sin catalogo'))))
      .then((data: { sounds: CatalogSound[] }) => setCatalog(data.sounds))
      .catch(() => setMissing(true));
    const timer = window.setInterval(() => {
      setReady(sfx.ready);
      setLoaded(sfx.loaded);
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => sfx.setVolume(volume), [volume]);

  useEffect(() => {
    try {
      localStorage.setItem(CHOICES_KEY, JSON.stringify(choices));
    } catch {
      // Sin almacenamiento: las elecciones duran lo que la pagina.
    }
  }, [choices]);

  const byId = new Map((catalog ?? []).map((sound) => [sound.id, sound]));

  /** Corre una prueba de carga durante `ms`, llamando a `tick` cada fotograma de 16 ms. */
  const runTest = (name: string, ms: number, tick: (t: number) => void) => {
    stop.current();
    setRunning(name);
    let t = 0;
    const timer = window.setInterval(() => {
      tick(t);
      t += 16;
      if (t >= ms) stop.current();
    }, 16);
    stop.current = () => {
      window.clearInterval(timer);
      setRunning(null);
      stop.current = () => undefined;
    };
  };

  /** 15 disparadoras de 3 canones contra gusanos que no mueren: el combate y las reglas de sonido del juego. */
  const shootout = () => {
    let state = createMatch();
    const plants = state.plants.map((lane) => lane.map((_, col) => (col < 3 ? createPlant({ ...createShooter(), cannons: 3 }) : null)));
    state = { ...state, plants };
    for (let lane = 0; lane < BOARD.lanes; lane++) for (let i = 0; i < 3; i++) state = spawnEnemy(state, i === 1 ? 'armored' : 'worm', lane, 5 + i, 1e9);
    runTest('shootout', 6000, () => {
      const before = state;
      const step = stepCombat(state, 16);
      state = step.state;
      sfx.playCues(combatCues(step.events, before));
    });
  };

  /** Doce enemigos eliminados en un segundo y una explosion con seis dentro. */
  const kills = () => {
    const events: CombatEvent[] = [];
    runTest('kills', 2200, (t) => {
      events.length = 0;
      if (t < 1000 && t % 80 < 16) events.push({ type: 'enemyKilled', enemyId: t, kind: 'worm', clone: false, at: { x: 2 + (t % 7), y: 1.5 } });
      if (t >= 1400 && t < 1416) {
        events.push({ type: 'mineExploded', cell: { lane: 2, col: 4 }, element: 'fire', enemyIds: [1, 2, 3, 4, 5, 6] });
        for (let id = 1; id <= 6; id++) events.push({ type: 'enemyKilled', enemyId: id, kind: 'worm', clone: false, at: { x: 4.5, y: 2.5 } });
      }
      sfx.playCues(combatCues(events, createMatch()));
    });
  };

  const choose = (id: SfxId, index: number) => setChoices((current) => ({ ...current, [id]: index }));

  const summary = () =>
    SFX_IDS.filter((id) => (choices[id] ?? 0) !== 0)
      .map((id) => {
        const sound = byId.get(id);
        const index = choices[id] ?? 0;
        return `${id}: alternativa ${index} (${sound?.alternatives[index - 1]?.source ?? '?'})`;
      })
      .join('\n') || 'Me quedo con todos los elegidos.';

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
        <h1>Sonidos de Rebrote</h1>
        <p>
          Cada efecto con el elegido y sus alternativas. «Elegido» suena como en el juego (con su variación de tono y sus
          límites); las alternativas suenan tal cual. Marca con cuál te quedas y copia las elecciones.
        </p>
        <div className="lab-bar">
          <span className={`lab-state${ready ? ' is-on' : ''}`}>
            {ready ? `Sonido activo · ${loaded.done} de ${loaded.total} archivos` : 'Haz clic en cualquier sitio para activar el sonido'}
          </span>
          <label className="lab-volume">
            Volumen de efectos <input type="range" min={0} max={100} step={5} value={volume} onChange={(e) => setVolume(Number(e.target.value))} /> {volume}
          </label>
          <button type="button" onClick={copy}>
            {copied ? '¡Copiado!' : 'Copiar elecciones'}
          </button>
        </div>
        <div className="lab-bar">
          <strong>Pruebas de carga:</strong>
          <button type="button" className={running === 'shootout' ? 'is-on' : ''} onClick={shootout}>
            15 disparadoras de 3 cañones (6 s)
          </button>
          <button type="button" className={running === 'kills' ? 'is-on' : ''} onClick={kills}>
            12 eliminados en 1 s y una explosión con 6
          </button>
          <button type="button" onClick={() => stop.current()} disabled={!running}>
            Parar
          </button>
        </div>
        {missing && <p className="lab-warn">No hay alternativas: pasa `npm run audio` para generarlas (necesita los paquetes de Kenney en `audio-lab/kenney/`).</p>}
      </header>

      {groups().map((group) => (
        <section key={group.title} className="lab-group">
          <h2>{group.title}</h2>
          {group.ids.map((id) => {
            const spec = SFX[id];
            const sound = byId.get(id);
            const chosen = choices[id] ?? 0;
            return (
              <article key={id} className="lab-sound">
                <div className="lab-title">
                  <code>{id}</code>
                  <span>{sound?.about ?? ''}</span>
                  <small>
                    {spec.bus === 'ui' ? 'menús' : 'jardín'} · volumen {spec.volume} · hasta {spec.maxVoices} a la vez · separación {spec.minGapMs} ms · tono ±
                    {spec.pitchJitter} st
                  </small>
                </div>
                <div className="lab-options">
                  <div className={`lab-option${chosen === 0 ? ' is-chosen' : ''}`}>
                    <button type="button" onClick={() => sfx.play(id, panAt(BOARD.columns / 2, BOARD.columns))}>
                      ▶ Elegido
                    </button>
                    {(sound?.pick.length ?? 0) > 1 &&
                      sound?.pick.map((file, i) => (
                        <button key={file.url} type="button" className="is-small" onClick={() => sfx.audition(ext(file.url), spec.volume)}>
                          {i + 1}
                        </button>
                      ))}
                    <label>
                      <input type="radio" name={id} checked={chosen === 0} onChange={() => choose(id, 0)} /> me quedo
                    </label>
                    <small>{sound?.pick[0]?.source}</small>
                  </div>
                  {sound?.alternatives.map((alt, i) => (
                    <div key={alt.url} className={`lab-option${chosen === i + 1 ? ' is-chosen' : ''}`}>
                      <button type="button" onClick={() => sfx.audition(ext(alt.url), spec.volume)}>
                        ▶ Alternativa {i + 1}
                      </button>
                      <label>
                        <input type="radio" name={id} checked={chosen === i + 1} onChange={() => choose(id, i + 1)} /> me quedo
                      </label>
                      <small>
                        {alt.source}
                        {alt.recipes?.map((recipe) => (
                          <a key={recipe.name} href={`https://sfxr.me/#${recipe.code}`} target="_blank" rel="noreferrer">
                            {' '}
                            abrir en sfxr.me
                          </a>
                        ))}
                      </small>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </main>
  );
}

sfx.install();
createRoot(document.getElementById('root')!).render(<SoundLab />);
