import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { DroppedCoin } from '../../game/EventBus';
import { useText } from '../useText';
import { TourHand } from './TourHand';

interface CoinHintProps {
  coin: DroppedCoin;
}

/** Distancia minima del bocadillo a los bordes de la pantalla. */
const EDGE = 8;

/**
 * Pista de la moneda en el suelo (T-013, G-08): sin parar el juego ni oscurecer nada, un aro dorado late alrededor de la
 * moneda, la mano la toca y un bocadillo pequeno dice que vale mas. No recoge clics: el clic llega a la moneda.
 */
export function CoinHint({ coin }: CoinHintProps) {
  const t = useText();
  const label = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);
  const { pageX, pageY } = coin.at;

  // El bocadillo va centrado sobre la moneda, pero nunca se sale por los lados.
  useLayoutEffect(() => {
    const element = label.current;
    if (!element) return;
    const half = element.offsetWidth / 2;
    const left = pageX - half;
    const right = pageX + half;
    setShift(left < EDGE ? EDGE - left : right > window.innerWidth - EDGE ? window.innerWidth - EDGE - right : 0);
  }, [pageX, t]);

  const style = { left: pageX, top: pageY, '--coin': `${Math.max(24, coin.size)}px`, '--shift': `${shift}px` } as CSSProperties;
  return (
    <div className="coin-hint" style={style} aria-hidden="true">
      <span className="coin-hint-ring" />
      <span ref={label} className="coin-hint-label">
        <span className="coin coin-small" />
        {t.tour.coin}
      </span>
      <TourHand gesture={{ kind: 'tap', at: { pageX: 0, pageY: 0 } }} />
    </div>
  );
}
