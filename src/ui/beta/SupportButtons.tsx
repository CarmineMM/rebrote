import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { SUPPORT } from '../../game/config/support';
import { useText } from '../useText';
import { browserSupport, copyText, currentGameUrl, sendFeedback, shareGame, type SupportResult } from './support';

/** Lo que hace falta para pintar los botones de apoyo y su linea de estado, cada uno donde le toque. */
export interface Support {
  readonly result: SupportResult | null;
  /** La direccion de correo ya se copio desde la linea de estado. */
  readonly addressCopied: boolean;
  share: () => void;
  feedback: () => void;
  copyAddress: () => void;
}

/**
 * Estado de los dos botones para apoyar el proyecto (T-044): que paso al pulsar cada uno. Los textos que se mandan
 * (asunto con la version, texto de compartir) salen del idioma en curso; los enlaces, de `SUPPORT`.
 */
export function useSupport(): Support {
  const t = useText();
  const [result, setResult] = useState<SupportResult | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const share = useCallback(() => {
    setAddressCopied(false);
    void shareGame(browserSupport(), { title: t.beta.shareTitle, text: t.beta.shareText, url: currentGameUrl() }).then((next) => {
      if (alive.current) setResult(next);
    });
  }, [t]);

  const feedback = useCallback(() => {
    setAddressCopied(false);
    setResult(sendFeedback(browserSupport(), SUPPORT.feedbackEmail, t.beta.feedbackSubject(__APP_VERSION__)));
  }, [t]);

  const copyAddress = useCallback(() => {
    void copyText(SUPPORT.feedbackEmail).then((done) => {
      if (alive.current) setAddressCopied(done);
    });
  }, []);

  return { result, addressCopied, share, feedback, copyAddress };
}

/** "Compartir" y "Comentarios" (BT-01). */
export function SupportButtons({ support, className = '' }: { support: Support; className?: string }) {
  const t = useText();
  return (
    <div className={`support-actions ${className}`}>
      <button type="button" className="btn btn-primary support-share" onClick={support.share}>
        <ShareGlyph /> {t.beta.share}
      </button>
      <button type="button" className="btn support-feedback" onClick={support.feedback}>
        <MailGlyph /> {t.beta.feedback}
      </button>
    </div>
  );
}

/**
 * Lo que paso al pulsar: sin conexion, el aviso; el enlace copiado o, si no se pudo, a la vista; tras "Comentarios", la
 * direccion para copiarla por si el aparato no tiene aplicacion de correo. Siempre ocupa su sitio (vacia, sin texto).
 */
export function SupportStatus({ support, className = '' }: { support: Support; className?: string }) {
  const t = useText();
  const { result } = support;
  let content: ReactNode = null;
  if (result?.kind === 'offline') content = <span className="support-warn">{t.beta.offline}</span>;
  else if (result?.kind === 'copied') content = <span className="support-done">{t.beta.copied}</span>;
  else if (result?.kind === 'manual') {
    content = (
      <>
        {t.beta.copyLink} <code className="support-pick">{result.url}</code>
      </>
    );
  } else if (result?.kind === 'mail') {
    content = (
      <>
        {t.beta.mailFallback} <code className="support-pick">{result.email}</code>{' '}
        <button type="button" className="support-copy" onClick={support.copyAddress}>
          {support.addressCopied ? `✓ ${t.beta.copiedAddress}` : t.beta.copy}
        </button>
      </>
    );
  }
  return (
    <p className={`support-status ${className}`} role="status" aria-live="polite">
      {content}
    </p>
  );
}

/** Tres puntos unidos: compartir. */
function ShareGlyph() {
  return (
    <svg className="support-glyph" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M14.5 4.5 L5.5 10 L14.5 15.5" />
      <circle cx="14.5" cy="4.5" r="2.6" />
      <circle cx="5.5" cy="10" r="2.6" />
      <circle cx="14.5" cy="15.5" r="2.6" />
    </svg>
  );
}

/** Un sobre: correo. */
function MailGlyph() {
  return (
    <svg className="support-glyph" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M3.5 6 L10 11 L16.5 6" />
    </svg>
  );
}
