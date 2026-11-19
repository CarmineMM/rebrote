import { useEffect, useState } from 'react';
import { EventBus, GameEvents, type RoundInfo } from '../game/EventBus';

interface RoundHudProps {
  round: RoundInfo;
}

/**
 * Ronda en curso (T-007): "Ronda N de 7" con una semillita por ronda (las superadas, verdes; la actual late). En la
 * preparacion, la cuenta atras y el boton para adelantar el ataque. Al empezar cada ronda sale debajo su aviso de una
 * linea, que se va solo. React solo pinta y avisa a Phaser por EventBus: la ronda vive en core.
 */
export function RoundHud({ round }: RoundHudProps) {
  const { number, total, phase, prepSeconds, notice } = round;
  const seedState = (i: number) => (i + 1 < number || phase === 'won' ? 'is-done' : i + 1 === number ? 'is-current' : '');

  return (
    <section className="round-info" aria-label="Ronda">
      <div className="round-badge">
        <span className="round-title">
          Ronda{' '}
          <strong key={number} className="round-number">
            {number}
          </strong>{' '}
          de {total}
        </span>
        <span className="round-progress" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`round-seed ${seedState(i)}`} />
          ))}
        </span>
      </div>
      {phase === 'prep' && prepSeconds !== null && (
        <div className="round-prep">
          <span className={`round-countdown${prepSeconds <= 3 ? ' is-soon' : ''}`}>
            Empieza en{' '}
            <strong key={prepSeconds} className="round-seconds">
              {prepSeconds}
            </strong>{' '}
            s
          </span>
          <button type="button" className="round-go" onClick={() => EventBus.emit(GameEvents.attackRequested)}>
            ¡Que vengan!
          </button>
        </div>
      )}
      {/* La clave cambia con la ronda: el aviso vuelve a salir. */}
      <RoundNotice key={number} text={notice} />
    </section>
  );
}

/** Lo que dura el aviso en pantalla: lo mismo que su animacion CSS (`notice-life`). */
const NOTICE_MS = 7000;

/**
 * Aviso de una linea con el concepto nuevo: entra con un salto, se queda unos segundos y se va. Lo lleva la animacion
 * CSS, que se congela con la pausa; sin animaciones (`prefers-reduced-motion`), un temporizador lo quita.
 */
function RoundNotice({ text }: { text: string }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setShown(false), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, []);
  if (!shown) return null;
  return (
    <p className="round-notice" role="status" onAnimationEnd={(event) => event.animationName === 'notice-life' && setShown(false)}>
      <span className="round-notice-spark" aria-hidden="true" />
      {text}
    </p>
  );
}
