import { useEffect, useId, useRef, type CSSProperties } from 'react';
import type { EntityInfo } from '../game/EventBus';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';

interface InfoPanelProps {
  info: EntityInfo;
  onClose: () => void;
}

/**
 * Ficha de una planta, una mina o un enemigo (T-010): sale con doble clic y el juego espera en pausa detras. Foto a la
 * izquierda (sacada de las texturas del juego) y a la derecha nombre, nivel, vida, estados del momento, datos y como
 * funciona. Se cierra con el boton, con Esc o haciendo clic fuera. React solo pinta lo que le manda la escena.
 */
export function InfoPanel({ info, onClose }: InfoPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { level, hp } = info;
  const life = hp.max > 0 ? hp.current / hp.max : 0;

  // El foco va al boton de cerrar: Enter tambien cierra.
  useEffect(() => closeRef.current?.focus(), [info.id]);

  return (
    <div
      className="pause-overlay is-info"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      {...{ [NO_AUTO_FULLSCREEN]: '' }}
    >
      <section key={info.id} className={`info-card tone-${info.tone}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <figure className="info-photo">
          <img src={info.portrait} alt={info.title} width={200} height={200} draggable={false} />
        </figure>
        <div className="info-body">
          <header className="info-head">
            <h2 id={titleId} className="info-title">
              {info.title}
            </h2>
            <p className="info-subtitle">{info.subtitle}</p>
          </header>
          {level && (
            <p className="info-level">
              <span className={`medal ${level.medalTier === null ? 'medal-plain' : `medal-tier-${level.medalTier}`}`} aria-hidden="true">
                {level.value}
              </span>
              <span>
                Nivel {level.value}
                {level.note && <small> · {level.note}</small>}
              </span>
            </p>
          )}
          <div className="info-hp" role="meter" aria-label="Vida" aria-valuemin={0} aria-valuemax={hp.max} aria-valuenow={hp.current}>
            <span className="info-hp-heart" aria-hidden="true" />
            <span className="info-hp-bar">
              <span className={`info-hp-fill${life <= 0.3 ? ' is-low' : ''}`} style={{ '--life': life } as CSSProperties} />
            </span>
            <span className="info-hp-value">
              {hp.current} / {hp.max}
            </span>
          </div>
          {info.tags.length > 0 && (
            <ul className="info-tags">
              {info.tags.map((tag) => (
                <li key={tag.text} className={`info-tag is-${tag.tone}`}>
                  {tag.text}
                </li>
              ))}
            </ul>
          )}
          <dl className="info-stats">
            {info.stats.map((stat) => (
              <div key={stat.label} className="info-stat">
                <dt>{stat.label}</dt>
                <dd>
                  {stat.value}
                  {stat.note && <small>{stat.note}</small>}
                </dd>
              </div>
            ))}
          </dl>
          <p className="info-about">{info.about}</p>
        </div>
        <button ref={closeRef} type="button" className="info-close" aria-label="Cerrar la ficha" title="Cerrar (Esc)" onClick={onClose}>
          <span aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
