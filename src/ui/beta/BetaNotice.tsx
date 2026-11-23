import { useEffect, useId, useRef, type RefObject } from 'react';
import { NO_AUTO_FULLSCREEN } from '../useFullscreen';
import { useText } from '../useText';
import { SupportButtons, SupportStatus, useSupport } from './SupportButtons';

interface BetaNoticeProps {
  /** Ya se ve: cuenta como visto (BT-04). */
  onShown: () => void;
  onClose: () => void;
}

/**
 * Aviso de beta (T-044): sale una vez al vencer al ultimo brote del juego, tras sus viñetas y antes de la tarjeta de la
 * victoria (o al entrar al Invernadero, quien ya lo habia vencido). La misma tarjeta que la victoria, con un cartel que
 * senala el camino que sigue: la version, "Has llegado al final de la beta", que viene mas, los dos botones para apoyar
 * el proyecto, la linea de que el progreso puede reiniciarse (BT-06) y "Seguir". El foco empieza en "Seguir" y Esc
 * tambien cierra: quien sigue jugando no se queda atrapado (objetivo 3).
 */
export function BetaNotice({ onShown, onClose }: BetaNoticeProps) {
  const t = useText();
  const titleId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const support = useSupport();

  useEffect(() => {
    onShown();
    button.current?.focus({ preventScroll: true });
    // Solo al aparecer: `onShown` apunta lo visto una vez.
  }, []);

  // Esc cierra; lo de detras (el Invernadero, que volveria a la portada) no lo recibe.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      event.preventDefault();
      if (!event.repeat) onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="pause-overlay is-beta" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <div className="pause-card is-wide beta-card">
        <BetaArt />
        <p className="pause-kicker">{t.beta.kicker(__APP_VERSION__)}</p>
        <h2 id={titleId} className="pause-title beta-title">
          {t.beta.reachedTitle}
        </h2>
        <p className="beta-text">{t.beta.text}</p>
        <SupportButtons support={support} className="beta-support" />
        <SupportStatus support={support} className="beta-status" />
        <p className="beta-reset">{t.beta.reset}</p>
        <div className="pause-actions beta-continue">
          <button ref={button} type="button" className="btn" onClick={onClose}>
            {t.beta.continue} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface BetaPanelProps {
  titleId: string;
  firstButton: RefObject<HTMLButtonElement | null>;
  /** Ya vencio al ultimo brote: "Has llegado al final de la beta"; si no, "Rebrote esta en beta". */
  reached: boolean;
  onBack: () => void;
}

/**
 * El mismo mensaje en el panel de la portada (T-044), al tocar la marca "Beta" junto a la version: con la flecha de
 * volver, como Opciones y Creditos. Asi quien juega desde el principio sabe que es una beta y que el progreso puede
 * reiniciarse (BT-06), y puede compartir el juego cuando quiera.
 */
export function BetaPanel({ titleId, firstButton, reached, onBack }: BetaPanelProps) {
  const t = useText();
  const support = useSupport();
  return (
    <>
      <div className="settings-header">
        <button ref={firstButton} type="button" className="btn btn-ghost" onClick={onBack} aria-label={t.common.back} title={t.common.back}>
          <span aria-hidden="true">←</span>
        </button>
        <h2 id={titleId} className="pause-title is-small">
          {t.beta.badge}
        </h2>
      </div>
      <div className="beta-panel">
        <BetaArt small />
        <p className="beta-panel-title">{reached ? t.beta.reachedTitle : t.beta.title}</p>
        <p className="beta-text">{t.beta.text}</p>
        <SupportButtons support={support} className="beta-support" />
        <SupportStatus support={support} className="beta-status" />
        <p className="beta-reset">{t.beta.reset}</p>
      </div>
    </>
  );
}

/**
 * Un cartel de madera que senala el camino que sigue, con tres puntos que se encienden por turnos (viene mas) y un brote
 * que crece a sus pies. Sin letras: vale en todos los idiomas. Es dibujo de menu, como el brote del titulo.
 */
export function BetaArt({ small = false }: { small?: boolean }) {
  return (
    <div className={`beta-art${small ? ' is-small' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 160 84">
        <path className="beta-hill" d="M-4 86 C24 58 136 58 164 86 Z" />
        <path className="beta-path" d="M70 82 C82 74 98 70 112 66 S140 60 158 58" />
        <g className="beta-sign">
          <rect className="beta-post" x="64" y="24" width="7" height="52" rx="2" />
          <path className="beta-plank" d="M40 14 H96 L108 27 L96 40 H40 Z" />
          <path className="beta-plank-grain" d="M46 21 H88 M46 33 H82" />
          <circle className="beta-dot is-1" cx="58" cy="27" r="4" />
          <circle className="beta-dot is-2" cx="72" cy="27" r="4" />
          <circle className="beta-dot is-3" cx="86" cy="27" r="4" />
        </g>
        <g className="beta-sprout">
          <path className="beta-stem" d="M82 76 C82 70 82 66 83 61" />
          <path className="beta-leaf" d="M83 64 C77 64 74 60 74 56 C79 56 83 59 83 64" />
          <path className="beta-leaf is-right" d="M83 62 C89 62 92 58 92 54 C87 54 83 57 83 62" />
        </g>
        <path className="beta-spark is-a" d="M124 26 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" />
        <path className="beta-spark is-b" d="M26 34 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 Z" />
      </svg>
    </div>
  );
}
