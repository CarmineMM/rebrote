import * as Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AI_DESIGN, AI_DESIGNS, AI_HEIGHT, aiDesignById, paintAiEyes, paintLitStrand, type AiDesign, type AiView } from '../game/view/cinematic/aiArt';
import { glow, vertical } from '../game/view/cinematic/geometry';
import { REBELLION } from '../game/view/cinematic/rebellion';
import { cinematicCutouts, type CinematicCutouts } from '../game/view/portrait';
import { QUALITY_LEVELS, type QualityLevel } from '../game/view/quality';
import { registerTextures } from '../game/view/textures';
import { LANGUAGES, getLanguage, setLanguage, type Language } from '../i18n';
import { CinematicOverlay } from '../ui/story/CinematicOverlay';
import { STORIES } from '../ui/story/stories';
import { useLanguage } from '../ui/useText';
import '../styles.css';
import './characterLab.css';
import './cinematicLab.css';

/**
 * Propuestas de la cinematica (T-049): `npm run dev` y abrir `/proposals/cinematica.html`. "Silueta": las tres propuestas
 * de la IA (MC-05), de espaldas y de frente, de cuerpo entero y en primer plano. "Planos": la cinematica de verdad a
 * 1600 x 900, 812 x 375 y 568 x 320. No la ve el jugador (`npm run build` no la incluye), asi que sus textos van en
 * espanol sin `src/i18n/`.
 */

type Tab = 'silhouette' | 'shots';

/** Un lienzo con la silueta sobre un fondo oscuro con la luz de detras (contraluz), y sus cables encendiendose. */
function Silhouette({ design, view, close, height }: { design: AiDesign; view: AiView; close: boolean; height: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const width = Math.round(height * (close ? 0.9 : 1.25));
    element.width = width * 2;
    element.height = height * 2;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = ((now - start) % 7000) / 1000;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.fillStyle = vertical(ctx, 0, height, ['#0f1a22', '#101521', '#07070c']);
      ctx.fillRect(0, 0, width, height);
      glow(ctx, width / 2, height * (close ? 0.4 : 0.45), height * 0.7, 'rgba(125, 255, 192, 0.22)');
      // Suelo.
      ctx.fillStyle = 'rgba(57, 229, 140, 0.05)';
      ctx.fillRect(0, height * 0.86, width, height * 0.14);
      const scale = close ? (height * 2.3) / AI_HEIGHT : (height * 0.8) / AI_HEIGHT;
      ctx.translate(width / 2, close ? height * 0.36 + 578 * scale : height * 0.88);
      ctx.scale(scale, scale);
      const look = { rim: true, glows: true };
      const lit = () =>
        design.strands(view).forEach((strand, i) => {
          const p = (t - 0.6 - i * 0.22) / 1.4;
          if (p > 0) paintLitStrand(ctx, strand, 0, Math.min(1, p), look, 0.9);
        });
      // De frente, la luz de los cables va por detras del cuerpo; de espaldas, por encima.
      if (view === 'front') {
        design.paint(ctx, view, look, 'behind');
        lit();
        design.paint(ctx, view, look, 'body');
        paintAiEyes(ctx, Math.min(1, Math.max(0, (t - 1) / 0.5)), look);
      } else {
        design.paint(ctx, view, look);
        lit();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [design, view, close, height]);
  return <canvas ref={canvas} className="cin-canvas" />;
}

function SilhouetteTab() {
  return (
    <div className="cin-rows">
      <p className="cin-note">
        MC-05: tres variantes de la misma idea. Cambian la postura y cuánto pelo de cable llega al suelo. Los cables se encienden uno a uno, como en el
        plano 1.2, y de frente se abren los ojos, como en el 1.3. El juego usa la de borde dorado (<code>AI_DESIGN</code> en{' '}
        <code>src/game/view/cinematic/aiArt.ts</code>) mientras Carmine no elija otra.
      </p>
      {AI_DESIGNS.map((design) => (
        <section key={design.id} className={`cin-card${design === AI_DESIGN ? ' is-chosen' : ''}`}>
          <header>
            <h2>
              {design.label} {design === AI_DESIGN && <span className="char-badge">En el juego (recomendada)</span>}
            </h2>
            <p>{design.about}</p>
          </header>
          <div className="cin-views">
            <figure>
              <Silhouette design={design} view="back" close={false} height={360} />
              <figcaption>De espaldas (plano 1.2)</figcaption>
            </figure>
            <figure>
              <Silhouette design={design} view="front" close={false} height={360} />
              <figcaption>De frente, a contraluz (plano 1.3)</figcaption>
            </figure>
            <figure>
              <Silhouette design={design} view="front" close height={360} />
              <figcaption>Primer plano</figcaption>
            </figure>
            <figure>
              <Silhouette design={design} view="front" close={false} height={150} />
              <figcaption>A 568 × 320</figcaption>
            </figure>
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Creeper, el gusano y la disparadora recortados con las texturas del juego, como hace la escena para la cinematica: un
 * juego de Phaser pequeno y oculto solo para pintarlas.
 */
function useCutouts(): CinematicCutouts | null {
  const [art, setArt] = useState<CinematicCutouts | null>(null);
  useEffect(() => {
    const parent = document.createElement('div');
    parent.style.cssText = 'position:fixed;left:-10000px;top:0;width:8px;height:8px;';
    document.body.appendChild(parent);
    const game = new Phaser.Game({ type: Phaser.CANVAS, parent, width: 8, height: 8, audio: { noAudio: true }, banner: false });
    game.scene.add(
      'cutouts',
      class extends Phaser.Scene {
        create() {
          registerTextures(this, 1);
          setArt(cinematicCutouts(this));
        }
      },
      true,
    );
    return () => {
      game.destroy(true);
      parent.remove();
    };
  }, []);
  return art;
}

const FRAMES = [
  { width: 1600, height: 900, label: '1600 × 900' },
  { width: 812, height: 375, label: '812 × 375' },
  { width: 568, height: 320, label: '568 × 320' },
] as const;

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };

/** Un marco del tamano de una pantalla con la cinematica de verdad, escalado para caber en la pagina. */
function Frame({ width, height, label, art, quality, ai, start, show, at }: { width: number; height: number; label: string; art: CinematicCutouts | null; quality: QualityLevel; ai: AiDesign; start: number; show: number; at: number }) {
  const steps = STORIES.rebellion;
  const [index, setIndex] = useState(start);
  const [run, setRun] = useState(0);
  useEffect(() => {
    setIndex(start);
    setRun((r) => r + 1);
  }, [start]);
  const step = steps[index];
  return (
    <figure>
      <div className="cin-frame-box" style={{ width: width * show, height: height * show }}>
        <div className="cin-frame" style={{ width, height, transform: `scale(${show})` }}>
          <CinematicOverlay
            key={`${run}:${ai.id}:${quality}`}
            story="rebellion"
            step={step}
            index={index}
            count={steps.length}
            cinematic={REBELLION}
            name="Carmine"
            quality={quality}
            art={art}
            ai={ai}
            startAt={run <= 1 ? at : 0}
            onNext={() => {
              if (index + 1 < steps.length) setIndex(index + 1);
              else {
                setIndex(0);
                setRun((r) => r + 1);
              }
            }}
            onSkip={() => {
              setIndex(0);
              setRun((r) => r + 1);
            }}
          />
        </div>
      </div>
      <figcaption>
        {label} · plano {index + 1} de {steps.length}
      </figcaption>
    </figure>
  );
}

function ShotsTab() {
  const params = new URLSearchParams(location.search);
  const art = useCutouts();
  const language = useLanguage();
  const [quality, setQuality] = useState<QualityLevel>((params.get('calidad') as QualityLevel) ?? 'high');
  const [aiId, setAiId] = useState(params.get('ia') ?? AI_DESIGN.id);
  const [start, setStart] = useState(Number(params.get('plano') ?? 1) - 1);
  const only = params.get('tam');
  const frames = only ? FRAMES.filter((f) => String(f.width) === only) : FRAMES;
  return (
    <div className="cin-rows">
      <div className="cin-tools">
        <label>
          Empezar en el plano{' '}
          <select value={start} onChange={(e) => setStart(Number(e.target.value))}>
            {REBELLION.shots.map((shot, i) => (
              <option key={shot.id} value={i}>
                {i + 1}. {shot.id} (escena {shot.scene + 1})
              </option>
            ))}
          </select>
        </label>
        <label>
          Silueta{' '}
          <select value={aiId} onChange={(e) => setAiId(e.target.value)}>
            {AI_DESIGNS.map((design) => (
              <option key={design.id} value={design.id}>
                {design.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Calidad{' '}
          <select value={quality} onChange={(e) => setQuality(e.target.value as QualityLevel)}>
            {QUALITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {QUALITY_NAMES[level]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Idioma{' '}
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>
        <span className="cin-note">Un toque sigue; «Saltar» vuelve al principio. El sonido y la música se oyen en el juego, no aquí.</span>
      </div>
      <div className="cin-frames">
        {frames.map((frame) => (
          <Frame
            key={frame.width}
            {...frame}
            art={art}
            quality={quality}
            ai={aiDesignById(aiId)}
            start={start}
            at={Number(params.get('t') ?? 0)}
            show={only ? 1 : frame.width === 1600 ? 0.6 : 1}
          />
        ))}
      </div>
    </div>
  );
}

function Lab() {
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(location.search).get('vista') === 'planos' ? 'shots' : 'silhouette'));
  return (
    <div className="char-lab">
      <div className="char-bar">
        <h1>
          Cinemática <span>T-049 · la rebelión</span>
        </h1>
        <div className="char-tabs">
          <button type="button" className={tab === 'silhouette' ? 'is-on' : ''} onClick={() => setTab('silhouette')}>
            Silueta
          </button>
          <button type="button" className={tab === 'shots' ? 'is-on' : ''} onClick={() => setTab('shots')}>
            Planos
          </button>
        </div>
      </div>
      {tab === 'silhouette' ? <SilhouetteTab /> : <ShotsTab />}
    </div>
  );
}

if (getLanguage() !== 'es') setLanguage('es');

const root = document.getElementById('root');
if (root) createRoot(root).render(<Lab />);
