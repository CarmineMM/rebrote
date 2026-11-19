import { useEffect, useId, useRef } from 'react';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';

interface VictoryScreenProps {
  /** Rondas superadas: todas las del mundo. */
  rounds: number;
  onRestart: () => void;
}

/**
 * Victoria provisional (T-007): se superaron todas las rondas del mundo 1. Cuando exista el jefe (T-008), esto
 * llegara despues de vencerlo. Misma tarjeta que la pausa y la derrota, con una copa que salta y destellos.
 * "Jugar otra vez" empieza una partida nueva desde la ronda 1.
 */
export function VictoryScreen({ rounds, onRestart }: VictoryScreenProps) {
  const titleId = useId();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus();
  }, []);

  return (
    <div className="pause-overlay is-victory" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <div className="pause-card">
        <div className="victory-art" aria-hidden="true">
          <svg className="trophy" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="trophy-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff6c0" />
                <stop offset="0.45" stopColor="#ffd23f" />
                <stop offset="1" stopColor="#d1920f" />
              </linearGradient>
            </defs>
            <path className="trophy-handle" d="M19 15 C7 15 8 31 21 31" />
            <path className="trophy-handle" d="M45 15 C57 15 56 31 43 31" />
            <path className="trophy-cup" d="M17 9 H47 V23 C47 34 40 40 32 40 C24 40 17 34 17 23 Z" />
            <rect className="trophy-cup" x="28.5" y="39" width="7" height="9" rx="1.5" />
            <rect className="trophy-cup" x="19" y="47" width="26" height="8" rx="3" />
            <path className="trophy-sprout" d="M32 33 C32 29 32 27 32 24 M32 27 C27 27 25 23 25 20 C29 20 32 22 32 27 M32 25 C37 25 39 21 39 18 C35 18 32 20 32 25" />
            <ellipse className="trophy-shine" cx="24" cy="17" rx="3" ry="6" transform="rotate(-12 24 17)" />
          </svg>
          <span className="victory-star is-a" />
          <span className="victory-star is-b" />
          <span className="victory-star is-c" />
        </div>
        <p className="pause-kicker">Mundo 1: Gusanos</p>
        <h2 id={titleId} className="pause-title">
          ¡Jardín a salvo!
        </h2>
        <p className="victory-text">Superaste las {rounds} rondas.</p>
        <div className="pause-actions">
          <button ref={button} type="button" className="btn btn-primary" onClick={onRestart}>
            <span aria-hidden="true">↻</span> Jugar otra vez
          </button>
        </div>
        <p className="pause-hint">Pronto: el Creeper, el primer gusano de la historia.</p>
      </div>
    </div>
  );
}
