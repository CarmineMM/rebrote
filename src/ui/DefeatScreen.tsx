import { useEffect, useId, useRef } from 'react';
import { LIVES } from '../game/config/balance';
import { HEART_PATH } from './Lives';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';

interface DefeatScreenProps {
  onRestart: () => void;
}

/** Grieta que parte el corazon en dos mitades (coordenadas del corazon de 24 x 24). */
const CRACK = 'L10.6 7 L13.2 11 L10.8 15 L12 24';

/**
 * Pantalla de derrota (ADR-0007): una superposicion como el menu de pausa, con el juego detenido detras.
 * "Jugar otra vez" empieza una partida nueva, no continua la anterior.
 */
export function DefeatScreen({ onRestart }: DefeatScreenProps) {
  const titleId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const lives: number = LIVES.start;
  const crossed = lives === 1 ? '1 gusano cruzó' : `${lives} gusanos cruzaron`;

  useEffect(() => {
    button.current?.focus();
  }, []);

  return (
    <div className="pause-overlay is-defeat" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <div className="pause-card">
        <div className="defeat-art" aria-hidden="true">
          <svg className="broken-heart" viewBox="0 0 24 24">
            <defs>
              <clipPath id="defeat-heart-left">
                <path d={`M0 0 H12.6 ${CRACK} H0 Z`} />
              </clipPath>
              <clipPath id="defeat-heart-right">
                <path d={`M24 0 H12.6 ${CRACK} H24 Z`} />
              </clipPath>
            </defs>
            <g className="broken-heart-half is-left" clipPath="url(#defeat-heart-left)">
              <path d={HEART_PATH} />
            </g>
            <g className="broken-heart-half is-right" clipPath="url(#defeat-heart-right)">
              <path d={HEART_PATH} />
            </g>
          </svg>
        </div>
        <p className="pause-kicker">Mundo 1: Gusanos</p>
        <h2 id={titleId} className="pause-title">
          ¡Se colaron!
        </h2>
        <p className="defeat-text">{crossed} el jardín.</p>
        <div className="pause-actions">
          <button ref={button} type="button" className="btn btn-primary" onClick={onRestart}>
            <span aria-hidden="true">↻</span> Jugar otra vez
          </button>
        </div>
        <p className="pause-hint">Cada disparadora solo defiende su carril: cubre los cinco.</p>
      </div>
    </div>
  );
}
