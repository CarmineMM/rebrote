import type { RefObject } from 'react';
import { LICENSE_URLS, MUSIC_TRACKS, MUSIC_TRACK_IDS } from '../game/config/music';
import { ClaudeLogo } from './ClaudeLogo';
import { useText } from './useText';

interface CreditsProps {
  titleId: string;
  firstButton: RefObject<HTMLButtonElement | null>;
  onBack: () => void;
}

/** Tecnologia con la que esta hecho el juego. Son nombres propios: no se traducen. */
const TECH = 'Phaser 4 · React 19 · Vite · TypeScript · Vitest';

/**
 * Creditos (T-011, I-09): autor, desarrollo con Claude (con su logo), estetica inspirada en Plants vs. Zombies, la musica
 * (T-015: titulo, autor y licencia de cada pista, como piden sus licencias) y los creditos tecnicos, con el aviso de
 * marca. Van en el panel de la derecha del menu de inicio.
 */
export function Credits({ titleId, firstButton, onBack }: CreditsProps) {
  const t = useText();
  const c = t.credits;
  return (
    <>
      <div className="settings-header">
        <button ref={firstButton} type="button" className="btn btn-ghost" onClick={onBack} aria-label={t.common.back} title={t.common.back}>
          <span aria-hidden="true">←</span>
        </button>
        <h2 id={titleId} className="pause-title is-small">
          {c.title}
        </h2>
      </div>
      <dl className="credits-list">
        <div className="credits-row" style={{ animationDelay: '0.05s' }}>
          <dt>{c.author}</dt>
          <dd>
            <strong>Carmine Maggio</strong>
            <small>{c.authorRole}</small>
          </dd>
        </div>
        <div className="credits-row is-claude" style={{ animationDelay: '0.12s' }}>
          <dt>{c.development}</dt>
          <dd>
            <span className="credits-claude">
              <ClaudeLogo size={34} title="Claude" />
              <strong>Claude</strong>
            </span>
            <small>{c.developmentBy}</small>
          </dd>
        </div>
        <div className="credits-row" style={{ animationDelay: '0.19s' }}>
          <dt>{c.aesthetic}</dt>
          <dd>
            <strong>{c.aestheticValue}</strong>
            <small>{c.aestheticNote}</small>
          </dd>
        </div>
        <div className="credits-row" style={{ animationDelay: '0.26s' }}>
          <dt>{c.art}</dt>
          <dd>{c.artValue}</dd>
        </div>
        <div className="credits-row" style={{ animationDelay: '0.33s' }}>
          <dt>{c.music}</dt>
          <dd>
            <ul className="credits-music">
              {MUSIC_TRACK_IDS.map((id) => {
                const track = MUSIC_TRACKS[id];
                return (
                  <li key={id}>
                    <a href={track.url} target="_blank" rel="noreferrer">
                      <strong>{c.musicTitle(track.title)}</strong>
                    </a>
                    <small>
                      {c.musicBy(track.author)} ·{' '}
                      <a href={LICENSE_URLS[track.license]} target="_blank" rel="noreferrer">
                        {track.license}
                      </a>{' '}
                      · {c.musicFor[id]}
                    </small>
                  </li>
                );
              })}
            </ul>
          </dd>
        </div>
        <div className="credits-row" style={{ animationDelay: '0.4s' }}>
          <dt>{c.tech}</dt>
          <dd>{TECH}</dd>
        </div>
      </dl>
      <p className="credits-thanks">{c.thanks}</p>
      <p className="credits-legal">{c.legal}</p>
    </>
  );
}
