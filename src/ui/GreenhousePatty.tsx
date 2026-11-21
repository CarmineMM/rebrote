import { useCallback, useEffect, useRef, useState } from 'react';
import { CAST } from '../game/view/characters/cast';
import { PortraitFrames, SpokenText, toneStyle, useSpeech } from './story/Portrait';
import { PATTY_TALK, nextPattyLine, pattyGreets, pattyLine } from './story/speech';
import { useText } from './useText';

interface GreenhousePattyProps {
  /** Tapada (una viñeta encima o la ruta abierta): no se ve ni habla, y si estaba por saludar, ya no saluda. */
  hidden: boolean;
  /** Nombre del jugador (T-033) o null, para la frase que lo usa. */
  name: string | null;
}

/** La ultima frase que dijo en esta sesion: al volver a entrar no repite la misma. */
let lastLine: number | null = null;

/**
 * Patty en el Invernadero (T-032, VT-05): su busto asoma por abajo, a la izquierda del panel, sin taparlo nunca. Respira y
 * parpadea. A veces, al entrar, dice una frase corta en un bocadillo, letra a letra y con su voz; tocarla le hace decir
 * otra. Las frases rotan sin repetir la anterior. Si al entrar sale una viñeta (la de Patty la primera vez), no saluda:
 * ya hablo.
 */
export function GreenhousePatty({ hidden, name }: GreenhousePattyProps) {
  const t = useText();
  const design = CAST.patty;
  /** Frase que dice ahora (indice en `greenhouse.patty`) y cuantas veces ha hablado, o null si esta callada. */
  const [talk, setTalk] = useState<{ line: number; count: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  /** Al entrar decide si saluda; una viñeta (o la ruta) antes de que lo haga se lo quita. */
  const greeting = useRef(pattyGreets(Math.random));
  const text = talk ? pattyLine(t, talk.line, name) : '';
  const speech = useSpeech({ speaker: 'patty', text, voice: true, paused: hidden, replay: talk?.count });

  const say = useCallback(() => {
    const line = nextPattyLine(t.greenhouse.patty.length, lastLine, Math.random);
    lastLine = line;
    setLeaving(false);
    setTalk((current) => ({ line, count: (current?.count ?? 0) + 1 }));
  }, [t.greenhouse.patty.length]);

  // Saluda (a veces) un poco despues de entrar, si nada la tapa.
  useEffect(() => {
    if (hidden) {
      greeting.current = false;
      return;
    }
    if (!greeting.current) return;
    const timer = window.setTimeout(() => {
      greeting.current = false;
      say();
    }, PATTY_TALK.greetDelayMs);
    return () => window.clearTimeout(timer);
  }, [hidden, say]);

  // Dicha la frase, el bocadillo se queda un rato y se va.
  const { done } = speech;
  useEffect(() => {
    if (!talk || !done || hidden) return;
    const hold = window.setTimeout(() => setLeaving(true), PATTY_TALK.holdMs);
    return () => window.clearTimeout(hold);
  }, [talk, done, hidden]);

  return (
    <div className={`greenhouse-patty${hidden ? ' is-hidden' : ''}`} style={toneStyle(design)}>
      {talk && (
        <p
          key={talk.count}
          className={`patty-bubble${leaving ? ' is-leaving' : ''}`}
          aria-live="polite"
          onAnimationEnd={(event) => {
            if (leaving && event.animationName === 'patty-bubble-out') setTalk(null);
          }}
        >
          <span className="patty-bubble-name">{t.story.names.patty}</span>
          <SpokenText text={text} typed={speech.typed} />
        </p>
      )}
      <button type="button" className="patty-figure" aria-label={t.greenhouse.talkToPatty} title={t.greenhouse.talkToPatty} onClick={say} data-silent tabIndex={hidden ? -1 : 0}>
        <span className={`patty-body${talk && !speech.done ? ' is-talking' : ''}`}>
          <PortraitFrames design={design} expression={talk ? 'happy' : 'normal'} open={speech.open} blink={speech.blink} />
        </span>
      </button>
    </div>
  );
}
