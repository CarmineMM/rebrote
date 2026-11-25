import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cinematicCue, cinematicTransitionCue } from '../../game/audio/cues';
import { sfx } from '../../game/audio/sfx';
import type { CinematicCutouts } from '../../game/view/portrait';
import { CAST } from '../../game/view/characters/cast';
import { portraitUrl } from '../../game/view/characters/portraitImage';
import { AI_DESIGN, type AiDesign } from '../../game/view/cinematic/aiArt';
import { type ArtEnv, type CinematicImages, NO_IMAGES } from '../../game/view/cinematic/art';
import { CinematicRenderer, layerResolution, stageFit, tintedImage } from '../../game/view/cinematic/render';
import { type Cinematic, SCENE_TITLE_MS, TRANSITION_MS, beatsBetween, startsScene, transitionInto, type Transition } from '../../game/view/cinematic/shots';
import { QUALITY_PROFILES, type QualityLevel } from '../../game/view/quality';
import { NO_AUTO_FULLSCREEN } from '../useFullscreen';
import { useText } from '../useText';
import { Cameo, SpokenText, reducedMotion, toneStyle, useSpeech } from './Portrait';
import { stepText, type StoryId, type StoryStep } from './stories';

interface CinematicOverlayProps {
  story: StoryId;
  /** El paso en curso: su plano y su texto. */
  step: StoryStep;
  index: number;
  count: number;
  cinematic: Cinematic;
  /** Nombre del jugador (T-033) o null: por si algun plano lo dice. */
  name: string | null;
  /** Nivel grafico (ADR-0006): cuanto se pinta y a que resolucion. */
  quality: QualityLevel;
  /** Creeper, el gusano y la disparadora recortados por la escena (regla 3); mientras no lleguen, no salen. */
  art: CinematicCutouts | null;
  /** Propuesta de la IA que se pinta; por defecto, la del juego. La galeria prueba otras. */
  ai?: AiDesign;
  /** Tapada por la pausa o el aviso de girar: no se ve, el tiempo no avanza y no atiende teclas. */
  hidden?: boolean;
  /** Empieza el primer plano a estos ms, sin su transicion: la galeria lo usa para revisar un momento concreto. */
  startAt?: number;
  onNext: () => void;
  onSkip: () => void;
}

/** Lo que tarda en irse al acabar o saltarla, en ms. */
const LEAVE_MS = 320;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/**
 * Las imagenes que usa la cinematica: los recortes de la escena (y sus versiones en el verde de las pantallas) y los bustos
 * de Boxer y Patty, con los ojos abiertos y cerrados.
 */
function useCinematicImages(art: CinematicCutouts | null): CinematicImages {
  const [images, setImages] = useState<CinematicImages>(NO_IMAGES);
  useEffect(() => {
    let alive = true;
    const bust = (id: 'boxer' | 'patty') =>
      Promise.all([false, true].map((blink) => loadImage(portraitUrl(CAST[id], { expression: 'happy', blink, open: false })))).then(([open, blink]) =>
        open && blink ? { open, blink } : null,
      );
    void Promise.all([
      loadImage(art?.creeper ?? ''),
      loadImage(art?.worm ?? ''),
      loadImage(art?.shooter ?? ''),
      bust('boxer'),
      bust('patty'),
    ]).then(([creeper, worm, shooter, boxer, patty]) => {
      if (!alive) return;
      setImages({
        creeper,
        worm,
        shooter,
        creeperGreen: creeper ? tintedImage(creeper, '#2fd07a') : null,
        wormGreen: worm ? tintedImage(worm, '#2fd07a') : null,
        busts: { ...(boxer ? { boxer } : {}), ...(patty ? { patty } : {}) },
      });
    });
    return () => {
      alive = false;
    };
  }, [art]);
  return images;
}

/** El reloj de la cinematica: el plano en curso, cuanto lleva, de cual se viene y cuanto lleva la transicion. */
interface Clock {
  index: number;
  t: number;
  transition: Transition;
  previous: { index: number; t: number } | null;
  last: number | null;
}

/**
 * Una cinematica de la historia (T-049, ADR-0027): planos de motion comic a pantalla completa que pinta un lienzo
 * (`CinematicRenderer`), con la narracion de Boxer en una franja abajo (MC-07): su retrato redondo, su nombre y el texto
 * letra a letra, sin voz: solo suena la musica. Cada paso de la secuencia es un plano; como en las viñetas (MC-06), un toque, un clic, Espacio
 * o Intro completa el texto y el siguiente pasa de plano, mientras el plano sigue moviendose. "Saltar" (o Esc) la cierra
 * entera. Con movimiento reducido, los planos salen quietos y solo cambian con fundidos.
 */
export function CinematicOverlay({ story, step, index, count, cinematic, name, quality, art, ai = AI_DESIGN, hidden = false, startAt = 0, onNext, onSkip }: CinematicOverlayProps) {
  const t = useText();
  const titleId = useId();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const images = useCinematicImages(art);
  const text = stepText(t, story, step, name);
  const speech = useSpeech({ speaker: step.speaker, text, delayMs: index === 0 ? 900 : 450, paused: hidden || leaving, replay: `${story}:${step.id}` });
  const last = index + 1 >= count;

  const renderer = useRef<CinematicRenderer | null>(null);
  if (!renderer.current) renderer.current = new CinematicRenderer(cinematic);
  useEffect(() => () => renderer.current?.dispose(), []);

  const profile = QUALITY_PROFILES[quality];
  const still = reducedMotion();
  const look = { particles: profile.particles, life: profile.life, glows: profile.glows, still };
  const env = useRef<ArtEnv>({ look, screen: t.story.cinematic.screen, images, ai });
  env.current = { look, screen: t.story.cinematic.screen, images, ai };
  /** Pixeles del lienzo por pixel CSS, y cuanto detalle llevan las capas, segun el nivel. */
  const detail = profile.renderScale < 1 ? 0.75 : 1;

  const clock = useRef<Clock>({ index, t: startAt, transition: transitionInto(cinematic, index), previous: null, last: null });

  // Un paso nuevo: el plano nuevo empieza de cero y entra con su transicion desde donde iba el anterior.
  useEffect(() => {
    const c = clock.current;
    if (c.index === index) return;
    const transition = transitionInto(cinematic, index);
    c.previous = { index: c.index, t: c.t };
    c.index = index;
    c.t = 0;
    c.transition = transition;
    const cue = cinematicTransitionCue(transition);
    if (cue) sfx.play(cue.id, cue.pan);
  }, [index, cinematic]);

  // El lienzo ocupa toda la pantalla, a la densidad de la pantalla (menos en la calidad baja).
  const view = useRef({ width: 1, height: 1, pixelRatio: 1 });
  /** Ajusta el lienzo al sitio que tiene, si cambio. */
  const fit = useCallback(() => {
    const element = host.current;
    const target = canvas.current;
    if (!element || !target) return;
    const width = Math.max(1, element.clientWidth);
    const height = Math.max(1, element.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * detail;
    const v = view.current;
    if (v.width === width && v.height === height && v.pixelRatio === pixelRatio) return;
    view.current = { width, height, pixelRatio };
    target.width = Math.round(width * pixelRatio);
    target.height = Math.round(height * pixelRatio);
  }, [detail]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit]);

  const resolution = () => layerResolution(stageFit(view.current.width, view.current.height).scale, window.devicePixelRatio || 1, detail);

  // Prepara las capas del plano y del siguiente, y suelta las de los que ya pasaron.
  useEffect(() => {
    const paint = renderer.current;
    if (!paint) return;
    paint.prepare(index, env.current, resolution());
    paint.keep([index - 1, index, index + 1]);
    const ahead = window.setTimeout(() => paint.prepare(index + 1, env.current, resolution()), 400);
    return () => window.clearTimeout(ahead);
    // `resolution` y `env` se leen en el momento.
  }, [index, ai, quality]);

  // El reloj y el dibujo: avanza solo a la vista; suena lo que toca en cada momento del plano.
  useEffect(() => {
    if (hidden) return;
    let frame = 0;
    const tick = (now: number) => {
      fit();
      const c = clock.current;
      const dt = c.last === null ? 0 : Math.min(100, now - c.last);
      c.last = now;
      const shot = cinematic.shots[c.index];
      const before = c.t;
      c.t += dt;
      if (c.previous) {
        c.previous.t += dt;
        if (c.t >= TRANSITION_MS[c.transition]) c.previous = null;
      }
      if (shot && !leaving) {
        for (const beat of beatsBetween(shot, before, c.t)) {
          const cue = cinematicCue(beat);
          sfx.play(cue.id, cue.pan);
        }
      }
      const showCaption = startsScene(cinematic, c.index) && c.t < SCENE_TITLE_MS;
      const scene = shot ? cinematic.scenes[shot.scene] : null;
      setCaption(showCaption && scene ? scene : null);
      const ctx = canvas.current?.getContext('2d');
      if (ctx && renderer.current) {
        const mix = env.current.look.still && c.transition !== 'fade' ? 1 : Math.min(1, c.t / TRANSITION_MS[c.transition]);
        renderer.current.draw(ctx, view.current, { index: c.index, t: c.t, transition: c.transition, mix, previous: c.previous }, env.current, resolution());
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clock.current.last = null;
    };
  }, [hidden, leaving, cinematic, fit]);

  const leave = useCallback(
    (then: () => void) => {
      if (leaving) return;
      if (reducedMotion()) return then();
      setLeaving(true);
      window.setTimeout(then, LEAVE_MS);
    },
    [leaving],
  );

  /** Un toque: completa el texto si aun sale; si ya salio, el plano siguiente (o se acaba). */
  const advance = useCallback(() => {
    if (leaving || hidden) return;
    if (!speech.done) {
      speech.finish();
      return;
    }
    if (last) leave(onNext);
    else onNext();
  }, [leaving, hidden, speech, last, leave, onNext]);

  const skip = useCallback(() => leave(onSkip), [leave, onSkip]);

  // El boton de seguir tiene el foco: Espacio e Intro funcionan desde el principio.
  useEffect(() => {
    if (!hidden) nextButton.current?.focus({ preventScroll: true });
  }, [hidden, step.id]);

  // Teclado, como en las viñetas: Espacio e Intro siguen, Esc salta; la P sigue llegando al juego para pausar.
  useEffect(() => {
    if (hidden) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'p' || event.key === 'P') return;
      event.stopPropagation();
      if (event.repeat) return;
      const onButton = event.target instanceof HTMLElement && event.target.closest('.cinematic button') !== null;
      if (event.key === 'Escape') {
        event.preventDefault();
        skip();
      } else if ((event.key === 'Enter' || event.key === ' ') && !onButton) {
        event.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [hidden, advance, skip]);

  const design = CAST[step.speaker];
  const scenes = t.story.cinematic.scenes as Readonly<Record<string, string>>;

  return (
    <div
      ref={host}
      className={`cinematic is-${step.speaker}${leaving ? ' is-leaving' : ''}${hidden ? ' is-hidden' : ''}`}
      style={toneStyle(design)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (!(event.target instanceof HTMLElement && event.target.closest('button'))) advance();
      }}
      {...{ [NO_AUTO_FULLSCREEN]: '' }}
    >
      <canvas ref={canvas} className="cinematic-canvas" aria-hidden="true" />
      {caption && (
        <p key={caption} className="cinematic-caption" style={{ animationDuration: `${SCENE_TITLE_MS}ms` }}>
          {scenes[caption] ?? caption}
        </p>
      )}
      <div className="cinematic-strip">
        <Cameo speaker={step.speaker} expression={step.expression} open={speech.open} blink={speech.blink} className="cinematic-cameo" />
        <div className="cinematic-say">
          <p id={titleId} className="cinematic-name">
            {t.story.names[step.speaker]}
          </p>
          <p className="cinematic-text">
            <SpokenText text={text} typed={speech.typed} />
          </p>
        </div>
        <div className="cinematic-foot">
          <span className="cinematic-dots" role="img" aria-label={t.story.cinematic.shotOf(index + 1, count)}>
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className={`cinematic-dot${i < index ? ' is-done' : i === index ? ' is-current' : ''}`} />
            ))}
          </span>
          <button type="button" className="cinematic-skip" onClick={skip}>
            {t.story.skip}
          </button>
          <button ref={nextButton} type="button" className={`cinematic-next${speech.done ? ' is-ready' : ''}`} onClick={advance}>
            {t.story.next} <span className="story-arrow" aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
