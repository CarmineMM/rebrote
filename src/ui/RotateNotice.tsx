import { useId } from 'react';
import { useText } from './useText';

interface RotateNoticeProps {
  /** Hay una partida en marcha: se avisa de que espera en pausa. */
  paused: boolean;
}

/**
 * Aviso de girar la pantalla (ADR-0011). Tapa todo el juego mientras un movil o una tableta esta en vertical: un movil
 * de pie gira y se pone de lado, y en su pantalla aparece el jardin bien puesto. El juego duerme detras.
 */
export function RotateNotice({ paused }: RotateNoticeProps) {
  const t = useText();
  const titleId = useId();
  const bodyId = useId();
  return (
    <div className="rotate-notice" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
      <div className="rotate-art" aria-hidden="true">
        <svg className="rotate-arrow" viewBox="0 0 48 48">
          <path d="M40 30 A17 17 0 1 0 22 41" pathLength={100} />
          <path className="rotate-arrow-head" d="M15 35 L22 41 L15 46" />
        </svg>
        <span className="rotate-phone">
          <span className="rotate-screen">
            {/* El jardin esta pintado para verse en horizontal: de pie sale tumbado y al girar queda derecho. */}
            <span className="rotate-garden">
              <span className="rotate-sun" />
              <span className="rotate-sprout" />
              <span className="rotate-worm" />
            </span>
          </span>
        </span>
      </div>
      <h2 id={titleId} className="rotate-title">
        {t.rotate.title}
      </h2>
      <p id={bodyId} className="rotate-body">
        {t.rotate.body}
      </p>
      {paused && <p className="rotate-paused">{t.rotate.paused}</p>}
    </div>
  );
}
