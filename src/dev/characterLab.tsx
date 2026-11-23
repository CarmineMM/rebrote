import { useEffect, useState } from 'react';
import { LivePortrait } from './LivePortrait';
import { createRoot } from 'react-dom/client';
import { BOXER_DESIGNS, PATTY_PROPOSALS } from '../game/view/characters/catalog';
import { CAST, CAST_CHOSEN } from '../game/view/characters/cast';
import { type CharacterDesign, type CharacterId, EXPRESSIONS, type Expression } from '../game/view/characters/design';
import { portraitUrl } from '../game/view/characters/portraitImage';
import { LANGUAGES, getLanguage, setLanguage, type Language } from '../i18n';
import { STORY_ORDER, STORY_PROMPTS, storySteps, type StoryId } from '../ui/story/stories';
import { StoryOverlay } from '../ui/story/StoryOverlay';
import { useLanguage } from '../ui/useText';
import '../styles.css';
import './characterLab.css';

/**
 * Galeria de personajes (T-031): `npm run dev` y abrir `/proposals/personajes.html`. Tres propuestas de Boxer y tres de Patty (Y-01,
 * Y-02) con sus tres expresiones (Y-04), y la viñeta de verdad con las elegidas a 1600 x 900, 812 x 375 y 568 x 320. No la
 * ve el jugador (`npm run build` no la incluye), asi que sus textos van en espanol sin `src/i18n/`.
 */

type Tab = 'proposals' | 'vignette';

const EXPRESSION_NAMES: Record<Expression, string> = { normal: 'Normal', hurried: 'Apurado', happy: 'Contento' };

function ProposalCard({ design, chosen, talking }: { design: CharacterDesign; chosen: boolean; talking: boolean }) {
  const [expression, setExpression] = useState<Expression>('normal');
  return (
    <article className={`char-card${chosen ? ' is-chosen' : ''}`}>
      <header>
        <h3>{design.label}</h3>
        {chosen && <span className="char-badge">{CAST_CHOSEN[design.character] ? 'Elegida' : 'En el juego (provisional)'}</span>}
      </header>
      <div className="char-stage">
        <LivePortrait design={design} expression={expression} talking={talking} height={300} />
      </div>
      <div className="char-thumbs">
        {EXPRESSIONS.map((e) => (
          <button key={e} type="button" className={e === expression ? 'is-on' : ''} onClick={() => setExpression(e)}>
            <img src={portraitUrl(design, { expression: e, blink: false, open: false })} alt="" />
            <span>{EXPRESSION_NAMES[e]}</span>
          </button>
        ))}
      </div>
      <p>{design.about}</p>
    </article>
  );
}

function Proposals({ talking }: { talking: boolean }) {
  return (
    <div className="char-rows">
      {(
        [
          ['Boxer', 'Y-01: elegida la mezcla de a) y b). Las tres de la segunda ronda quedan como referencia.', BOXER_DESIGNS, CAST.boxer],
          ['Patty', 'Y-02: elegida la bata, con una flor en el pelo. Las otras dos quedan como referencia.', PATTY_PROPOSALS, CAST.patty],
        ] as const
      ).map(([name, rule, designs, chosen]) => (
        <section key={name}>
          <h2>
            {name} <small>{rule}</small>
          </h2>
          <div className="char-grid">
            {designs.map((design) => (
              <ProposalCard key={design.id} design={design} chosen={design === chosen} talking={talking} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Una viñeta de verdad en un marco del tamano de una pantalla: avanza al tocarla y vuelve a empezar al acabar. */
function VignetteFrame({ width, height, scale, story, cast, restart }: { width: number; height: number; scale: number; story: StoryId; cast: Record<CharacterId, CharacterDesign>; restart: number }) {
  const steps = storySteps(story, STORY_PROMPTS);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0);
  /** El nombre que se escribe en la viñeta que lo pregunta (T-033): las siguientes lo usan. */
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    setIndex(0);
    setName(null);
  }, [story, restart]);
  const again = () => {
    setIndex(0);
    setName(null);
    setRound((r) => r + 1);
  };
  const step = steps[Math.min(index, steps.length - 1)];
  return (
    <figure className="char-frame">
      <figcaption>
        {width} × {height}
        {scale !== 1 && <small> (al {Math.round(scale * 100)} %)</small>}
      </figcaption>
      <div className="char-screen" style={{ width: width * scale, height: height * scale }}>
        <div className="char-screen-inner" style={{ width, height, transform: `scale(${scale})` }}>
          <div className="char-backdrop" />
          <StoryOverlay
            key={`${story}:${restart}:${round}`}
            story={story}
            step={step}
            index={index}
            count={steps.length}
            name={name}
            onAnswer={(given) => {
              setName(given);
              setIndex(index + 1);
            }}
            cast={cast}
            onNext={() => (index + 1 < steps.length ? setIndex(index + 1) : again())}
            onSkip={again}
          />
        </div>
      </div>
    </figure>
  );
}

function Vignette() {
  const [boxer, setBoxer] = useState(CAST.boxer.id);
  const [patty, setPatty] = useState(CAST.patty.id);
  const [story, setStory] = useState<StoryId>('creeperDown');
  const [restart, setRestart] = useState(0);
  const cast = {
    boxer: BOXER_DESIGNS.find((d) => d.id === boxer) ?? CAST.boxer,
    patty: PATTY_PROPOSALS.find((d) => d.id === patty) ?? CAST.patty,
  };
  return (
    <div className="char-vignette">
      <div className="char-controls">
        <label>
          Boxer{' '}
          <select value={boxer} onChange={(e) => setBoxer(e.target.value)}>
            {BOXER_DESIGNS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Patty{' '}
          <select value={patty} onChange={(e) => setPatty(e.target.value)}>
            {PATTY_PROPOSALS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Secuencia{' '}
          <select value={story} onChange={(e) => setStory(e.target.value as StoryId)}>
            {STORY_ORDER.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setRestart((r) => r + 1)}>
          Volver a empezar
        </button>
        <span className="char-tip">Toca una viñeta para seguir. Las teclas mueven las tres a la vez.</span>
      </div>
      <div className="char-frames">
        <VignetteFrame width={1600} height={900} scale={0.5} story={story} cast={cast} restart={restart} />
        <VignetteFrame width={812} height={375} scale={1} story={story} cast={cast} restart={restart} />
        <VignetteFrame width={568} height={320} scale={1} story={story} cast={cast} restart={restart} />
      </div>
    </div>
  );
}

function CharacterLab() {
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(location.search).get('vista') === 'vineta' ? 'vignette' : 'proposals'));
  const [talking, setTalking] = useState(true);
  const language = useLanguage();
  return (
    <div className="char-lab">
      <header className="char-bar">
        <h1>
          Personajes · Boxer y Patty <span>propuestas, solo desarrollo</span>
        </h1>
        <nav className="char-tabs">
          <button className={tab === 'proposals' ? 'is-on' : ''} onClick={() => setTab('proposals')}>
            Propuestas
          </button>
          <button className={tab === 'vignette' ? 'is-on' : ''} onClick={() => setTab('vignette')}>
            Viñeta
          </button>
        </nav>
        <div className="char-tools">
          {tab === 'proposals' && (
            <label>
              <input type="checkbox" checked={talking} onChange={(e) => setTalking(e.target.checked)} /> Hablando
            </label>
          )}
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l === 'es' ? 'Español' : 'English'}
              </option>
            ))}
          </select>
        </div>
      </header>
      <main className="char-main">{tab === 'proposals' ? <Proposals talking={talking} /> : <Vignette />}</main>
    </div>
  );
}

if (getLanguage() !== 'es') setLanguage('es');
createRoot(document.getElementById('root') as HTMLElement).render(<CharacterLab />);
