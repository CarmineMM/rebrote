/**
 * Instalar el juego (T-029, ADR-0021): escucha al navegador y guarda lo que hace falta para el boton "Instalar" de la
 * portada. Que boton sale lo decide `installOffer` (`policy.ts`). `listen()` se llama al arrancar (`main.tsx`), antes de
 * React, porque Chrome avisa de que se puede instalar (`beforeinstallprompt`) en cuanto carga la pagina.
 */
import { installOffer, isInstalled, isIos, type InstallOffer } from './policy';

/** El aviso de Chrome y Edge: guarda el dialogo de instalacion para abrirlo con el boton. No esta en los tipos del DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Lo que paso al pulsar el boton con el dialogo del navegador. */
export type PromptResult = 'accepted' | 'dismissed' | 'unavailable';

let deferred: BeforeInstallPromptEvent | null = null;
let offered = false;
/** Se acaba de instalar en esta pagina (el navegador sigue abierto en la pestana). */
let installedHere = false;
let listening = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function media(query: string): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;
}

/** Si esta pagina se abrio como aplicacion instalada. */
function openedInstalled(): boolean {
  return isInstalled({
    standalone: media('(display-mode: standalone)')?.matches ?? false,
    fullscreen: media('(display-mode: fullscreen)')?.matches ?? false,
    fullscreenElement: !!document.fullscreenElement,
    iosStandalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
  });
}

export const pwaInstall = {
  /** Empieza a escuchar al navegador. Una vez basta. */
  listen(): void {
    if (listening || typeof window === 'undefined') return;
    listening = true;
    window.addEventListener('beforeinstallprompt', (event) => {
      // Sin la barrita de Chrome en Android: se instala con el boton de la portada.
      event.preventDefault();
      deferred = event as BeforeInstallPromptEvent;
      offered = true;
      notify();
    });
    window.addEventListener('appinstalled', () => {
      installedHere = true;
      deferred = null;
      notify();
    });
    for (const query of ['(display-mode: standalone)', '(display-mode: fullscreen)']) media(query)?.addEventListener('change', notify);
    document.addEventListener('fullscreenchange', notify);
    // Instalada, que el navegador no borre lo guardado (progreso y partida) si se queda sin espacio.
    if (openedInstalled()) void navigator.storage?.persist?.().catch(() => false);
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Lo que ofrece hoy el boton. Una cadena: vale tal cual para `useSyncExternalStore`. */
  offer(): InstallOffer {
    if (typeof window === 'undefined') return 'none';
    return installOffer({
      installed: installedHere || openedInstalled(),
      ios: isIos({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints ?? 0 }),
      canPrompt: deferred !== null,
      offered,
    });
  },

  /**
   * Abre el dialogo de instalacion del navegador. Solo vale una vez por aviso: despues, el boton explica el menu del
   * navegador hasta que vuelva a avisar. Si el jugador acepta, el boton desaparece.
   */
  async prompt(): Promise<PromptResult> {
    const event = deferred;
    if (!event) return 'unavailable';
    deferred = null;
    notify();
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === 'accepted') installedHere = true;
      notify();
      return outcome;
    } catch {
      return 'unavailable';
    }
  },
};
