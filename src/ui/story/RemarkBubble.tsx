import { useEffect, useRef, useState } from 'react';
import { CAST } from '../../game/view/characters/cast';
import type { OutbreakId } from '../../game/core/outbreaks';
import { useText } from '../useText';
import { Cameo, SpokenText, reducedMotion, toneStyle, useSpeech } from './Portrait';
import { REMARK, remarkHoldMs, remarkText, type Remark } from './remarks';

interface RemarkBubbleProps {
  outbreak: OutbreakId;
  remark: Remark;
  /** Nombre del jugador (T-033) o null, por si la frase lo usa. */
  name: string | null;
  /** Algo encima (`useRemark`): no se ve, no habla y su reloj no corre; al destaparse sigue donde iba. */
  hidden: boolean;
  /** Se va: cerrado, acabado o cortado por el ataque (HG-04). */
  leaving: boolean;
  /** Ya se ve: cuenta como visto. */
  onShown: () => void;
  /** Un toque o se acabo su tiempo. */
  onDismiss: () => void;
  /** Ya se fue del todo. */
  onGone: () => void;
}

/**
 * Un comentario de la historia (T-043, HG-01): el retrato redondo de quien habla en la esquina de abajo a la derecha, por
 * donde entran los enemigos (en la preparacion no hay ninguno), y a su lado un bocadillo pequeno con su nombre y la frase,
 * letra a letra y con su voz. No para el juego ni tapa la bandeja, los inventos o la barra de sobrecarga, y solo el
 * bocadillo recoge toques: el resto del tablero se sigue usando. Espera un poco a salir, se queda lo justo para leerlo
 * (`REMARK`, HG-03) y se va solo; un toque lo cierra antes.
 */
export function RemarkBubble({ outbreak, remark, name, hidden, leaving, onShown, onDismiss, onGone }: RemarkBubbleProps) {
  const t = useText();
  const [visible, setVisible] = useState(false);
  const text = visible ? remarkText(t, outbreak, remark, name) : '';
  const speech = useSpeech({ speaker: remark.speaker, text, delayMs: 220, sound: 'voice', paused: hidden || leaving });
  /** Lo que lleva esperando a salir y lo que lleva en pantalla con la frase entera. Solo corre si se ve. */
  const clock = useRef({ waited: 0, held: 0, last: null as number | null });
  const done = visible && speech.done;

  // Su reloj: la espera antes de salir y, dicha la frase, lo que se queda. Tapado o yendose, quieto.
  useEffect(() => {
    if (hidden || leaving) return;
    let frame = 0;
    const tick = (now: number) => {
      const c = clock.current;
      const dt = c.last === null ? 0 : Math.min(100, now - c.last);
      c.last = now;
      if (!visible) {
        c.waited += dt;
        if (c.waited >= REMARK.delayMs) {
          setVisible(true);
          return;
        }
      } else if (done) {
        c.held += dt;
        if (c.held >= remarkHoldMs(text)) {
          onDismiss();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clock.current.last = null;
    };
  }, [hidden, leaving, visible, done, text, onDismiss]);

  useEffect(() => {
    if (visible) onShown();
  }, [visible, onShown]);

  // Se va con una animacion corta; sin animaciones, en el acto.
  useEffect(() => {
    if (!leaving) return;
    if (!visible || reducedMotion()) return onGone();
    const timer = window.setTimeout(onGone, REMARK.leaveMs);
    return () => window.clearTimeout(timer);
  }, [leaving, visible, onGone]);

  if (!visible) return null;
  const design = CAST[remark.speaker];
  return (
    <div className={`remark is-${remark.speaker}${hidden ? ' is-hidden' : ''}${leaving ? ' is-leaving' : ''}`} style={toneStyle(design)} role="status">
      <button type="button" className="remark-card" title={t.story.closeRemark} onClick={onDismiss} tabIndex={-1} data-silent>
        <span className="remark-bubble">
          <span className="remark-name">{t.story.names[remark.speaker]}</span>
          <span className="remark-text">
            <SpokenText text={text} typed={speech.typed} />
          </span>
        </span>
        <Cameo speaker={remark.speaker} expression={remark.expression} open={speech.open} blink={speech.blink} className="remark-cameo" />
      </button>
    </div>
  );
}
