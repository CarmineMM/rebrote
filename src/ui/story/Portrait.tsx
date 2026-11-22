import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { keystrokeCue, voiceCue } from '../../game/audio/cues';
import { sfx } from '../../game/audio/sfx';
import { CAST } from '../../game/view/characters/cast';
import type { CharacterDesign, CharacterId, Expression } from '../../game/view/characters/design';
import { portraitUrl } from '../../game/view/characters/portraitImage';
import { glyphs, typedLength } from './typewriter';

/**
 * Los personajes en la interfaz (T-031, T-032): los fotogramas del retrato, la cara que habla y parpadea, y el retrato
 * pequeno y redondo (`Cameo`) que sale en los tours, en los avisos de desbloqueo y en la ficha del jefe. El retrato lo
 * pinta el pintor de Canvas 2D del personaje (ADR-0019); aqui solo se ensena como imagen.
 */

/** Ritmo de la boca al hablar y del parpadeo, en ms: el mismo en las viñetas y fuera de ellas. */
export const FACE = {
  mouthMs: 115,
  blinkEveryMs: 3400,
  blinkMs: 150,
} as const;

/** Letras y numeros: con ellos se mueve la boca; con espacios y signos, no. */
export const SPEAKING = /[\p{L}\p{N}]/u;

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Los colores del personaje como variables de CSS: la placa con su nombre, el borde del bocadillo y el aro del retrato. */
export function toneStyle(design: CharacterDesign): CSSProperties {
  return { '--tone-light': design.tone.light, '--tone-mid': design.tone.mid, '--tone-dark': design.tone.dark } as CSSProperties;
}

/** Los cuatro fotogramas de una expresion (boca y ojos), apilados: cambiar de uno a otro no parpadea. */
export function PortraitFrames({ design, expression, open, blink }: { design: CharacterDesign; expression: Expression; open: boolean; blink: boolean }) {
  const frames = useMemo(
    () =>
      [false, true].flatMap((b) =>
        [false, true].map((o) => ({ key: `${b ? 1 : 0}${o ? 1 : 0}`, blink: b, open: o, url: portraitUrl(design, { expression, blink: b, open: o }) })),
      ),
    [design, expression],
  );
  return (
    <>
      {frames.map((frame) => (
        <img
          key={frame.key}
          className={`story-frame${frame.blink === blink && frame.open === open ? ' is-on' : ''}`}
          src={frame.url}
          alt=""
          draggable={false}
        />
      ))}
    </>
  );
}

interface CameoProps {
  speaker: CharacterId;
  expression: Expression;
  open?: boolean;
  blink?: boolean;
  className?: string;
}

/**
 * Retrato pequeno y redondo de un personaje (T-032): cabeza y hombros en un circulo del color del personaje. Respira, y
 * habla y parpadea si se le dice. Es decorado: el nombre va al lado, en texto.
 */
export function Cameo({ speaker, expression, open = false, blink = false, className = '' }: CameoProps) {
  const design = CAST[speaker];
  return (
    <span className={`cameo is-${speaker}${className ? ` ${className}` : ''}`} style={toneStyle(design)} aria-hidden="true">
      <span key={expression} className="cameo-face">
        <PortraitFrames design={design} expression={expression} open={open} blink={blink} />
      </span>
    </span>
  );
}

interface SpeechOptions {
  speaker: CharacterId;
  /** Lo que dice. Al cambiar (o al cambiar `replay`), lo vuelve a decir desde el principio. Vacio: callado. */
  text: string;
  /** Lo que espera antes de empezar a hablar, en ms: deja entrar antes al bocadillo. */
  delayMs?: number;
  /**
   * Lo que suena mientras sale la frase: su voz (`voiceCue`, una de cada tres letras), como en las viñetas, o un teclado
   * bajito (`keystrokeCue`), como en los tours. Sin el, callado.
   */
  sound?: 'voice' | 'keys';
  /** Tapado (la pausa, el aviso de girar): ni habla ni parpadea, y sigue donde iba al destaparse. */
  paused?: boolean;
  /** Cambia para que vuelva a decir el mismo texto. */
  replay?: string | number;
}

/**
 * Un personaje diciendo una frase fuera de las viñetas (T-032): la frase sale al ritmo de las viñetas (`typewriter.ts`),
 * con la boca moviendose y, si se pide, su voz o un teclado; parpadea cada pocos segundos. Devuelve cuantas letras se ven, si ya la
 * dijo entera y la cara del momento. Con movimiento reducido, la frase sale entera.
 */
export function useSpeech({ speaker, text, delayMs = 0, sound, paused = false, replay }: SpeechOptions) {
  const total = glyphs(text).length;
  /** Frase en curso: las letras de otra no cuentan (asi no asoma entera un fotograma al cambiar). */
  const key = `${replay ?? ''}:${text}`;
  const start = () => (reducedMotion() ? total : 0);
  const [progress, setProgress] = useState(() => ({ key, typed: start() }));
  const typed = Math.min(progress.key === key ? progress.typed : start(), total);
  const [open, setOpen] = useState(false);
  const [blink, setBlink] = useState(false);
  /** De que frase es, lo que lleva (negativo mientras espera), lo que lleva en pantalla, las letras que van y el ultimo fotograma. */
  const clock = useRef({ key, step: -delayMs, life: 0, typed: typed, last: null as number | null });

  // Cada frase empieza de cero.
  useEffect(() => {
    const c = clock.current;
    if (c.key === key) return;
    c.key = key;
    c.step = -delayMs;
    c.typed = start();
    setProgress({ key, typed: c.typed });
    setOpen(false);
    // `delayMs` solo cuenta al empezar una frase.
  }, [key]);

  useEffect(() => {
    if (paused) return;
    let frame = 0;
    const chars = glyphs(text);
    const tick = (now: number) => {
      const c = clock.current;
      const dt = c.last === null ? 0 : Math.min(100, now - c.last);
      c.last = now;
      c.life += dt;
      c.step += dt;
      const shown = c.step < 0 ? c.typed : Math.max(c.typed, typedLength(text, c.step));
      if (shown !== c.typed) {
        if (sound) {
          const cue = sound === 'voice' ? voiceCue(speaker, text, c.typed, shown) : keystrokeCue(text, c.typed, shown);
          if (cue) sfx.play(cue.id, cue.pan);
        }
        c.typed = shown;
        setProgress({ key: c.key, typed: shown });
      }
      const talking = c.step >= 0 && c.typed < total && SPEAKING.test(chars[c.typed - 1] ?? '');
      setOpen(talking && Math.floor(c.step / FACE.mouthMs) % 2 === 0);
      setBlink(c.life % FACE.blinkEveryMs > FACE.blinkEveryMs - FACE.blinkMs);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clock.current.last = null;
    };
  }, [paused, text, total, speaker, sound]);

  /** La dice entera de golpe, sin voz. */
  const finish = useCallback(() => {
    const c = clock.current;
    c.typed = total;
    c.step = Math.max(c.step, 0);
    setProgress({ key: c.key, typed: total });
    setOpen(false);
  }, [total]);

  return { typed, done: typed >= total, open, blink, finish };
}

/**
 * Una frase que sale letra a letra: lo que aun no salio ocupa su sitio (asi el bocadillo no crece ni salta mientras se
 * dice) y los lectores de pantalla la leen entera.
 */
export function SpokenText({ text, typed }: { text: string; typed: number }) {
  const chars = glyphs(text);
  return (
    <>
      <span aria-hidden="true">
        {chars.slice(0, typed).join('')}
        <span className="spoken-rest">{chars.slice(typed).join('')}</span>
      </span>
      <span className="visually-hidden">{text}</span>
    </>
  );
}
