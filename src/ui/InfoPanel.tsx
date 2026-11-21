import { useEffect, useId, useRef, type CSSProperties } from 'react';
import type { EntityInfo } from '../game/EventBus';
import { CAST } from '../game/view/characters/cast';
import { Cameo, toneStyle } from './story/Portrait';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import { useText } from './useText';

interface InfoPanelProps {
  info: EntityInfo;
  onClose: () => void;
}

/**
 * Ficha de una planta, una mina o un enemigo (T-010): sale con doble clic y el juego espera en pausa detras. Foto a la
 * izquierda (sacada de las texturas del juego) y a la derecha nombre, nivel, vida, estados del momento, datos y como
 * funciona. Se cierra con el boton, con Esc o haciendo clic fuera. React solo pinta lo que le manda la escena. La de un
 * jefe acaba con lo que cuenta Boxer del virus de verdad (T-032), con su retrato y su nombre.
 */
export function InfoPanel({ info, onClose }: InfoPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { level, hp } = info;
  const life = hp.max > 0 ? hp.current / hp.max : 0;
  const t = useText();

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
                {t.info.level(level.value)}
                {level.note && <small> · {level.note}</small>}
              </span>
            </p>
          )}
          <div className="info-hp" role="meter" aria-label={t.info.hp} aria-valuemin={0} aria-valuemax={hp.max} aria-valuenow={hp.current}>
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
        {info.lore && (
          <aside className="info-lore" style={toneStyle(CAST.boxer)}>
            <Cameo speaker="boxer" expression="normal" className="info-lore-cameo" />
            <p className="info-lore-text">
              <span className="info-lore-name">{t.story.names.boxer}</span>
              {info.lore}
            </p>
          </aside>
        )}
        <button ref={closeRef} type="button" className="info-close" aria-label={t.info.close} title={t.info.closeTitle} onClick={onClose}>
          <span aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
