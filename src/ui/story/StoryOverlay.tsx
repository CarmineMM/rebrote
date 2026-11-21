import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { sfx } from '../../game/audio/sfx';
import { voiceCue } from '../../game/audio/cues';
import { NICKNAME, cleanName, isValidName } from '../../game/playerName';
import { CAST } from '../../game/view/characters/cast';
import type { CharacterDesign, CharacterId } from '../../game/view/characters/design';
import { NameField } from '../NameField';
import { NO_AUTO_FULLSCREEN } from '../useFullscreen';
import { useText } from '../useText';
import { FACE, PortraitFrames, SPEAKING, reducedMotion, toneStyle } from './Portrait';
import { stepText, type StoryId, type StoryStep } from './stories';
import { glyphs, typedLength } from './typewriter';

interface StoryOverlayProps {
  story: StoryId;
  step: StoryStep;
  index: number;
  count: number;
  /** Nombre del jugador (T-033) o null: trato neutro. */
  name: string | null;
  /**
   * Recibe el nombre que escribe el jugador, o el apodo si prefiere no decirlo (T-033). Sin el, la viñeta que lo pregunta
   * se lee como las demas: asi se vuelve a ver la historia desde el Invernadero sin preguntarlo otra vez.
   */
  onAnswer?: (name: string) => void;
  /** Lo que hay escrito al preguntarlo: el nombre que ya tenia (de Opciones), o nada. */
  initialName?: string;
  /**
   * Tapada por la pausa o el aviso de girar la pantalla: no se ve, el texto no avanza y no atiende teclas. Sigue montada,
   * asi al volver continua donde iba.
   */
  hidden?: boolean;
  /** Propuestas que se pintan; por defecto, las del juego. La galeria de desarrollo prueba otras. */
  cast?: Readonly<Record<CharacterId, CharacterDesign>>;
  onNext: () => void;
  onSkip: () => void;
}

/** Lo que tarda en irse la viñeta al acabar la secuencia o saltarla, en ms. La boca y el parpadeo van al ritmo de `FACE`. */
const LOOK = { leaveMs: 220 } as const;

/**
 * Una viñeta de la historia (T-031, ADR-0019) sobre la escena oscurecida: el busto de quien habla, su nombre y el
 * bocadillo. El texto sale letra a letra con la voz del personaje; un toque, un clic, Espacio o Intro lo completa y el
 * siguiente pasa a la viñeta siguiente. "Saltar" (o Esc) cierra toda la secuencia. Mientras habla abre y cierra la boca,
 * y parpadea cada pocos segundos. El tamano sale del sitio que tiene (consultas de contenedor): se lee igual a
 * 1600 x 900 que en un movil en horizontal, y con el teclado en pantalla abierto se mete en lo que se ve (T-033).
 *
 * En la viñeta que pregunta el nombre (T-033), al acabar el texto sale el campo: se confirma con "¡Listo!" o con Intro
 * (apagado mientras no haya nombre) o se elige "Prefiero no decirlo", y la viñeta siguiente ya le llama asi.
 */
export function StoryOverlay({ story, step, index, count, name, onAnswer, initialName = '', hidden = false, cast = CAST, onNext, onSkip }: StoryOverlayProps) {
  const t = useText();
  const titleId = useId();
  const design = cast[step.speaker];
  const text = stepText(t, story, step, name);
  const total = glyphs(text).length;
  /** Viñeta en curso: el texto de otra no cuenta (asi no asoma entero un fotograma al cambiar). */
  const stepKey = `${story}:${step.id}`;
  const [progress, setProgress] = useState({ key: stepKey, typed: reducedMotion() ? total : 0 });
  const typed = progress.key === stepKey ? Math.min(progress.typed, total) : reducedMotion() ? total : 0;
  const [open, setOpen] = useState(false);
  const [blink, setBlink] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const nextButton = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  /** Lo que lleva escrito en el campo del nombre (T-033). */
  const [answer, setAnswer] = useState(initialName);
  /** Reloj de la viñeta: de cual es, cuantas letras van, lo que lleva el texto, lo que lleva en pantalla y el ultimo fotograma. */
  const clock = useRef({ key: stepKey, text, typed, step: 0, life: 0, last: null as number | null });
  const done = typed >= total;
  const last = index + 1 >= count;
  /** Boxer pregunta el nombre (T-033): con el texto ya entero, el campo y el boton de confirmar. */
  const asking = step.prompt === 'name' && onAnswer !== undefined && done;
  const answerValid = isValidName(answer);

  const show = useCallback((count: number) => {
    clock.current.typed = count;
    setProgress({ key: clock.current.key, typed: count });
  }, []);

  // Cada viñeta empieza su texto de cero. Si a mitad cambia el idioma, el texto nuevo sale entero.
  useEffect(() => {
    const c = clock.current;
    if (c.key !== stepKey) {
      c.key = stepKey;
      c.text = text;
      c.step = 0;
      show(reducedMotion() ? total : 0);
    } else if (c.text !== text) {
      c.text = text;
      show(total);
    }
  }, [stepKey, text, total, show]);

  useEffect(() => {
    if (hidden || leaving) return;
    let frame = 0;
    const chars = glyphs(text);
    const tick = (now: number) => {
      const c = clock.current;
      const dt = c.last === null ? 0 : Math.min(100, now - c.last);
      c.last = now;
      c.life += dt;
      c.step += dt;
      const shown = Math.max(c.typed, typedLength(text, c.step));
      if (shown !== c.typed) {
        const cue = voiceCue(step.speaker, text, c.typed, shown);
        if (cue) sfx.play(cue.id, cue.pan);
        show(shown);
      }
      const talking = c.typed < total && SPEAKING.test(chars[c.typed - 1] ?? '');
      setOpen(talking && Math.floor(c.step / FACE.mouthMs) % 2 === 0);
      setBlink(c.life % FACE.blinkEveryMs > FACE.blinkEveryMs - FACE.blinkMs);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clock.current.last = null;
    };
  }, [hidden, leaving, text, total, step.speaker, show]);

  // El boton de seguir tiene el foco: Espacio e Intro funcionan desde el principio. Si pregunta el nombre, el campo.
  useEffect(() => {
    if (hidden) return;
    if (asking) nameInput.current?.focus({ preventScroll: true });
    else nextButton.current?.focus({ preventScroll: true });
  }, [hidden, story, step.id, asking]);

  const leave = useCallback(
    (then: () => void) => {
      if (leaving) return;
      if (reducedMotion()) return then();
      setLeaving(true);
      window.setTimeout(then, LOOK.leaveMs);
    },
    [leaving],
  );

  /**
   * Un toque: completa el texto si aun sale; si ya salio, la viñeta siguiente (o se acaba). Con la pregunta del nombre en
   * pantalla no pasa nada: se sigue al confirmar o con "Prefiero no decirlo".
   */
  const advance = useCallback(() => {
    if (leaving || hidden || asking) return;
    if (clock.current.typed < total) {
      show(total);
      setOpen(false);
      return;
    }
    if (last) leave(onNext);
    else onNext();
  }, [leaving, hidden, asking, total, last, leave, onNext, show]);

  const skip = useCallback(() => leave(onSkip), [leave, onSkip]);

  /** El nombre que escribio (o el apodo). La viñeta siguiente ya le llama asi. */
  const reply = useCallback(
    (given: string) => {
      if (leaving || hidden || !asking || !onAnswer) return;
      onAnswer(given);
    },
    [leaving, hidden, asking, onAnswer],
  );

  // Teclado: Espacio e Intro siguen, Esc salta. Lo de detras (el menu, el Invernadero) no recibe las teclas mientras
  // hay viñeta; la P sigue llegando al juego para pausar. Escribiendo el nombre, las teclas son del campo (Intro
  // confirma con el formulario) y no llegan a nadie mas: ni la P pausa ni el juego las ve. Esc salta tambien ahi.
  useEffect(() => {
    if (hidden) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement && event.target.closest('.story')) {
        event.stopPropagation();
        if (event.key === 'Escape' && !event.repeat) {
          event.preventDefault();
          skip();
        }
        return;
      }
      if (event.key === 'p' || event.key === 'P') return;
      event.stopPropagation();
      if (event.repeat) return;
      const onButton = event.target instanceof HTMLElement && event.target.closest('.story button') !== null;
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

  const tone = toneStyle(design);
  const chars = glyphs(text);

  return (
    <div
      className={`story is-${step.speaker}${leaving ? ' is-leaving' : ''}${hidden ? ' is-hidden' : ''}${asking ? ' is-asking' : ''}`}
      style={tone}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (!(event.target instanceof HTMLElement && event.target.closest('button, .story-ask'))) advance();
      }}
      {...{ [NO_AUTO_FULLSCREEN]: '' }}
    >
      <div className="story-veil" />
      <div className="story-stage">
        <div key={`${story}:${step.speaker}`} className="story-portrait">
          <div key={`${step.id}:${step.expression}`} className="story-figure">
            <PortraitFrames design={design} expression={step.expression} open={open} blink={blink} />
          </div>
        </div>
        <div key={`${story}:${step.id}`} className="story-bubble">
          <p id={titleId} className="story-name">
            {t.story.names[step.speaker]}
          </p>
          <p className="story-text" aria-hidden="true">
            <span>{chars.slice(0, typed).join('')}</span>
            <span className="story-rest">{chars.slice(typed).join('')}</span>
          </p>
          <p className="visually-hidden" aria-live="polite">
            {text}
          </p>
          {asking && (
            <form
              className="story-ask"
              onSubmit={(event) => {
                event.preventDefault();
                if (answerValid) reply(cleanName(answer));
              }}
            >
              <NameField value={answer} onChange={setAnswer} placeholder={t.name.placeholder} inputRef={nameInput} tone="light" />
              <button type="submit" className="btn btn-primary story-confirm" disabled={!answerValid} title={answerValid ? undefined : t.name.empty}>
                <span aria-hidden="true">✓</span> {t.name.confirm}
              </button>
            </form>
          )}
          <div className="story-foot">
            {count > 1 && (
              <span className="story-dots" role="img" aria-label={t.story.stepOf(index + 1, count)}>
                {Array.from({ length: count }, (_, i) => (
                  <span key={i} className={`story-dot${i < index ? ' is-done' : i === index ? ' is-current' : ''}`} />
                ))}
              </span>
            )}
            {asking && (
              <button type="button" className="story-decline" onClick={() => reply(NICKNAME)}>
                {t.name.decline}
              </button>
            )}
            <button type="button" className="story-skip" onClick={skip}>
              {t.story.skip}
            </button>
            {!asking && (
              <button ref={nextButton} type="button" className={`story-next${done ? ' is-ready' : ''}`} onClick={advance}>
                {t.story.next} <span className="story-arrow" aria-hidden="true">›</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
