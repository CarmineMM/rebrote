import type { ReactNode, RefObject } from 'react';
import { useText } from './useText';

interface InstallHelpProps {
  titleId: string;
  firstButton: RefObject<HTMLButtonElement | null>;
  /** `ios`: iPhone y iPad, desde Compartir (V-02). `menu`: Chrome o Edge despues de cancelar su dialogo. */
  variant: 'ios' | 'menu';
  onBack: () => void;
}

/** Icono de Compartir de Safari: un cuadrado abierto por arriba con una flecha que sale. */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v9A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17.5 9H16" />
      <path d="M12 14V3M8 6.5 12 3l4 3.5" />
    </svg>
  );
}

/** "Anadir a pantalla de inicio": un cuadrado redondeado con un mas. */
function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

/** Menu del navegador: tres puntos en columna. */
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="is-filled">
      <circle cx="12" cy="5.5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="18.5" r="2" />
    </svg>
  );
}

/** Instalar: una pantalla con una flecha que baja. */
function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 7v6.5M9 10.5l3 3 3-3" />
    </svg>
  );
}

function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="install-step" style={{ animationDelay: `${0.05 + 0.08 * n}s` }}>
      <span className="install-step-n" aria-hidden="true">
        {n}
      </span>
      <span className="install-step-icon">{icon}</span>
      <span className="install-step-text">{children}</span>
    </li>
  );
}

/**
 * Ayuda para instalar (T-029) en el panel de la portada, con la flecha de volver como Opciones y Creditos. En iPhone y
 * iPad no hay dialogo (V-02): los dos pasos de Safari y el aviso de que instalado empieza de cero, porque no comparte lo
 * guardado con Safari. En Chrome y Edge, si el jugador cancelo el dialogo, los dos pasos del menu del navegador.
 */
export function InstallHelp({ titleId, firstButton, variant, onBack }: InstallHelpProps) {
  const t = useText();
  const c = t.install;
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
      <p className="install-intro">{c.intro}</p>
      <ol className="install-steps">
        {variant === 'ios' ? (
          <>
            <Step n={1} icon={<ShareIcon />}>
              {c.iosShare}
            </Step>
            <Step n={2} icon={<AddIcon />}>
              {c.iosAdd}
            </Step>
          </>
        ) : (
          <>
            <Step n={1} icon={<MenuIcon />}>
              {c.menuOpen}
            </Step>
            <Step n={2} icon={<InstallIcon />}>
              {c.menuPick}
            </Step>
          </>
        )}
      </ol>
      {variant === 'ios' && <p className="install-note">{c.iosNote}</p>}
    </>
  );
}
