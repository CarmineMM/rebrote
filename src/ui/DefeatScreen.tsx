import { useEffect, useId, useRef } from 'react';
import { LIVES } from '../game/config/balance';
import { FIRST_OUTBREAK } from '../game/core/outbreaks';
import type { LossInfo, RoundInfo } from '../game/EventBus';
import { HEART_PATH } from './Lives';
import { outbreakBoss, outbreakTitle } from './outbreakName';
import { SeedsEarned } from './SeedsEarned';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import { useText } from './useText';

interface DefeatScreenProps {
  /** Ronda en la que se perdio (T-007), para saber hasta donde se llego. */
  round: RoundInfo | null;
  /** Como se perdio: si el Creeper cruzo el jardin (T-008), lo dice y da su pista. */
  loss: LossInfo | null;
  onRestart: () => void;
  /** Vuelve al menu de inicio (T-011). */
  onMenu: () => void;
}

/** Grieta que parte el corazon en dos mitades (coordenadas del corazon de 24 x 24). */
const CRACK = 'L10.6 7 L13.2 11 L10.8 15 L12 24';

/**
 * Pantalla de derrota (ADR-0007): una superposicion como el menu de pausa, con el juego detenido detras.
 * "Jugar otra vez" empieza una partida nueva desde la ronda 1, no continua la anterior; "Menu principal" vuelve al menu
 * de inicio (T-011; la partida guardada ya se borro al perder). Si gano el Creeper (T-008), lo cuenta a su manera. Ensena
 * las pocas semillas que se lleva (T-020): la parte de lo de sus rondas que se cobra al perder, y su saldo nuevo.
 */
export function DefeatScreen({ round, loss, onRestart, onMenu }: DefeatScreenProps) {
  const titleId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const lives: number = LIVES.start;
  const t = useText();
  const byBoss = loss?.byBoss ?? false;
  const outbreak = round?.outbreak ?? FIRST_OUTBREAK;
  const boss = outbreakBoss(outbreak);

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
        <p className="pause-kicker">{outbreakTitle(t, outbreak)}</p>
        <h2 id={titleId} className="pause-title">
          {byBoss ? t.defeat.bossTitle[boss] : t.defeat.title}
        </h2>
        <p className="defeat-text">
          {byBoss ? t.defeat.bossText[boss] : t.defeat.text(lives, round ? round.number : null, round?.total ?? 0, outbreak)}
        </p>
        {loss && <SeedsEarned seeds={loss.seeds} />}
        <div className="pause-actions">
          <button ref={button} type="button" className="btn btn-primary" onClick={onRestart}>
            <span aria-hidden="true">↻</span> {t.defeat.again}
          </button>
          <button type="button" className="btn" onClick={onMenu}>
            <span aria-hidden="true">⌂</span> {t.defeat.menu}
          </button>
        </div>
        <p className="pause-hint">
          {byBoss ? t.defeat.bossHint[boss] : t.defeat.hint}
        </p>
      </div>
    </div>
  );
}
