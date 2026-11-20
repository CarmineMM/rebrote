import type { CSSProperties } from 'react';
import { CardIcon } from '../Card';
import type { PlacedGesture } from './tours';

/**
 * Mano de dibujos animados, hecha con SVG (T-013): un guante blanco con el indice estirado y un puno verde. La punta del
 * dedo esta en (22, 3) de su caja de 64 x 72: el CSS la coloca justo sobre el punto que senala.
 */
export function HandSvg() {
  const shapes = (
    <>
      <rect x="15" y="2" width="14" height="38" rx="7" />
      <rect x="27.5" y="21" width="12.5" height="22" rx="6.25" />
      <rect x="38.5" y="24.5" width="11.5" height="19" rx="5.75" />
      <rect x="48.5" y="28.5" width="9.5" height="16" rx="4.75" />
      <rect x="13" y="30" width="45" height="30" rx="13" />
      <ellipse cx="14" cy="43" rx="7" ry="11.5" transform="rotate(-32 14 43)" />
    </>
  );
  return (
    <svg className="tour-hand-svg" viewBox="0 0 64 72" aria-hidden="true">
      <g className="tour-hand-outline">{shapes}</g>
      <g className="tour-hand-fill">{shapes}</g>
      <path className="tour-hand-shade" d="M50 46 Q56 52 50 58 L36 58 Q48 54 50 46 Z" />
      <path className="tour-hand-crease" d="M31 36 Q33.5 38 36.5 36 M41.5 38 Q44 39.5 47 38 M51 40 Q53 41 55.5 40" />
      <ellipse className="tour-hand-shine" cx="19.5" cy="12" rx="2.2" ry="5" />
      <rect className="tour-hand-cuff" x="17" y="56" width="38" height="13" rx="4.5" />
      <path className="tour-hand-cuff-line" d="M21 62.5 H51" />
    </svg>
  );
}

interface TourHandProps {
  gesture: PlacedGesture;
}

/**
 * La mano haciendo el gesto en bucle sobre lo que se ensena (T-013): tocar (con una onda en la punta del dedo), tocar
 * dos veces o arrastrar de un punto a otro, levantandose en curva y llevando el dibujo de la carta si es una carta.
 */
export function TourHand({ gesture }: TourHandProps) {
  if (gesture.kind === 'drag') {
    const { from, to, carry } = gesture;
    const style = {
      left: from.pageX,
      top: from.pageY,
      '--dx': `${to.pageX - from.pageX}px`,
      '--dy': `${to.pageY - from.pageY}px`,
    } as CSSProperties;
    return (
      <div className="tour-gesture is-drag" style={style} aria-hidden="true">
        <span className="tour-ripple is-start" />
        <span className="tour-ripple is-end" />
        <div className="tour-hand-move">
          <div className="tour-hand-lift">
            {carry && (
              <span className={`tour-carry is-${carry}`}>
                <CardIcon card={carry} />
              </span>
            )}
            <HandSvg />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`tour-gesture is-${gesture.kind}`} style={{ left: gesture.at.pageX, top: gesture.at.pageY }} aria-hidden="true">
      <span className="tour-ripple" />
      {gesture.kind === 'doubleTap' && <span className="tour-ripple is-second" />}
      <div className="tour-hand-press">
        <HandSvg />
      </div>
    </div>
  );
}
