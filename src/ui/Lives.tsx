import { useEffect, useRef, useState } from 'react';
import { LIVES } from '../game/config/balance';
import { useText } from './useText';

/** Contorno de corazon (24 x 24), compartido con la pantalla de derrota. */
export const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

interface LivesProps {
  lives: number | null;
}

type HeartState = 'full' | 'breaking' | 'lost';

/** Vidas de la partida (D-07, provisional): un corazon por vida. El que se pierde se rompe y se apaga. */
export function Lives({ lives }: LivesProps) {
  const max = LIVES.start;
  const t = useText();
  const current = lives ?? max;
  const previous = useRef(current);
  const [breaking, setBreaking] = useState<number | null>(null);

  useEffect(() => {
    // Los corazones se pierden de derecha a izquierda: el que acaba de perderse es el de indice `current`.
    setBreaking(current < previous.current ? current : null);
    previous.current = current;
  }, [current]);

  const stateOf = (index: number): HeartState => (index < current ? 'full' : index === breaking ? 'breaking' : 'lost');

  return (
    <div className="hud-lives" data-tour="lives" role="img" aria-label={t.hud.lives(current, max)}>
      {Array.from({ length: max }, (_, index) => (
        <svg key={index} className={`heart is-${stateOf(index)}`} viewBox="0 0 24 24" aria-hidden="true">
          <path d={HEART_PATH} />
          <ellipse className="heart-shine" cx="7.4" cy="7.6" rx="2.3" ry="1.4" transform="rotate(-35 7.4 7.6)" />
        </svg>
      ))}
    </div>
  );
}
