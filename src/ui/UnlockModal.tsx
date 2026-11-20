import { useEffect, useId, useRef, type ReactNode } from 'react';
import { sfx } from '../game/audio/sfx';
import { MINE } from '../game/config/balance';
import type { UnlockInfo, UnlockItem } from '../game/EventBus';
import { formatSeconds, type Dictionary } from '../i18n';
import { medalTier } from '../game/view/levelMedal';
import { CardIcon } from './Card';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import { useText } from './useText';

interface UnlockModalProps {
  unlock: UnlockInfo;
  onAccept: () => void;
}

/** Lo que se cuenta de cada cosa nueva: dibujo, nombre y una linea de como se usa. */
interface Shown {
  key: string;
  icon: ReactNode;
  title: string;
  text: string;
}

/** Medallita de nivel, la misma del panel de la planta. */
const Medal = ({ level }: { level: number }) => <span className={`medal medal-tier-${medalTier(level)} unlock-medal`}>{level}</span>;

/**
 * Que se cuenta de cada cosa (T-009). Subir de nivel llega con su tope: se cuentan juntos. Infundir fuego y hielo
 * llegan juntos y ya vienen como uno.
 */
function describe(t: Dictionary['unlock'], items: readonly UnlockItem[]): Shown[] {
  const capWithLevelUp = items.some((item) => item.id === 'levelUp');
  const shown: Shown[] = [];
  for (const item of items) {
    switch (item.id) {
      case 'shooter':
        shown.push({ key: item.id, icon: <CardIcon card="shooter" />, title: t.shooter.title, text: t.shooter.text });
        break;
      case 'levelUp': {
        const cap = items.find((other) => other.id === 'levelCap');
        const upTo = cap && cap.id === 'levelCap' ? cap.level : null;
        shown.push({
          key: item.id,
          icon: <span className="unlock-arrow" />,
          title: t.levelUp.title,
          text: t.levelUp.text(upTo),
        });
        break;
      }
      case 'levelCap':
        if (capWithLevelUp) break;
        shown.push({
          key: item.id,
          icon: <Medal level={item.level} />,
          title: t.levelCap.title(item.level),
          text: t.levelCap.text(item.level),
        });
        break;
      case 'fireMine':
        shown.push({ key: item.id, icon: <CardIcon card="fire" />, title: t.fireMine.title, text: t.fireMine.text(formatSeconds(MINE.countdownMs)) });
        break;
      case 'iceMine':
        shown.push({ key: item.id, icon: <CardIcon card="ice" />, title: t.iceMine.title, text: t.iceMine.text });
        break;
      case 'infuse':
        shown.push({
          key: item.id,
          icon: (
            <span className="unlock-pair">
              <CardIcon card="fire" />
              <CardIcon card="ice" />
            </span>
          ),
          title: t.infuse.title,
          text: t.infuse.text,
        });
        break;
      case 'fuse':
        shown.push({
          key: item.id,
          icon: (
            <span className="unlock-pair is-fuse">
              <CardIcon card="shooter" />
              <CardIcon card="shooter" />
            </span>
          ),
          title: t.fuse.title,
          text: t.fuse.text,
        });
        break;
    }
  }
  return shown;
}

/**
 * Aviso de lo desbloqueado al empezar una ronda (T-009): "¡YA LO TIENES!" brillando en dorado, con rayos que giran
 * detras y una tarjeta por cosa nueva. El juego espera en pausa hasta que el jugador lo acepta (Enter, Esc o el boton).
 */
export function UnlockModal({ unlock, onAccept }: UnlockModalProps) {
  const titleId = useId();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus();
    // Suena con el aviso (T-014), por el canal de los menus: el juego espera en pausa detras.
    sfx.play('unlock');
  }, [unlock.round]);

  const t = useText();
  const shown = describe(t.unlock, unlock.items);

  return (
    <div className="pause-overlay is-unlock" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <div className="unlock-rays" aria-hidden="true" />
      <div className="pause-card unlock-card">
        <span className="victory-star is-a" aria-hidden="true" />
        <span className="victory-star is-b" aria-hidden="true" />
        <span className="victory-star is-c" aria-hidden="true" />
        <p className="pause-kicker">{t.unlock.round(unlock.round)}</p>
        <h2 id={titleId} className="unlock-title">
          {t.unlock.title}
        </h2>
        <ul className="unlock-list">
          {shown.map((item, i) => (
            <li key={item.key} className="unlock-item" style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
              <span className="unlock-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="unlock-text">
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
            </li>
          ))}
        </ul>
        <div className="pause-actions">
          <button ref={button} type="button" className="btn btn-primary unlock-go" onClick={onAccept}>
            {t.unlock.go}
          </button>
        </div>
      </div>
    </div>
  );
}
