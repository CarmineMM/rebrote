/**
 * Versiones nuevas (T-029, V-03, ADR-0021). Registra el service worker que genera `vite-plugin-pwa` y avisa cuando hay
 * una version nueva esperando. No la aplica por su cuenta: lo pide `useUpdateWhenIdle` (`src/ui/usePwa.ts`) cuando
 * `shouldApplyUpdate` dice que es el momento, en la portada y nunca en mitad de una partida.
 *
 * Solo en la version publicada: con `npm run dev` no se registra nada.
 */
import type { UpdateState } from './policy';

/** Cada cuanto se mira si hay version nueva con el juego abierto mucho rato (instalado, se queda abierto dias). */
const CHECK_EVERY_MS = 60 * 60 * 1000;

let state: UpdateState = 'none';
let applySkipWaiting: (() => Promise<void>) | null = null;
let applying = false;
const listeners = new Set<() => void>();

function set(next: UpdateState): void {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener();
}

/** Mira si hay version nueva, sin molestar si no hay red o ya se esta bajando una. */
function check(registration: ServiceWorkerRegistration): void {
  if (!navigator.onLine || registration.installing) return;
  void registration.update().catch(() => {
    // Sin red o el servidor no contesta: se mira la proxima vez.
  });
}

export const pwaUpdate = {
  /** Registra el service worker. Una vez, al arrancar (`main.tsx`). */
  start(): void {
    if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    void import('virtual:pwa-register').then(({ registerSW }) => {
      applySkipWaiting = registerSW({
        immediate: true,
        // Bajada y esperando: se aplica cuando toque.
        onNeedRefresh: () => set('waiting'),
        // Ya manda (la dejo entrar esta pestana u otra): falta recargar, tambien cuando toque. Sin esto, otra pestana
        // en la portada recargaria esta en mitad de una partida.
        onNeedReload: () => set('reload'),
        onRegisteredSW: (_url, registration) => {
          if (!registration) return;
          // Al volver al juego (otra aplicacion, el movil bloqueado) y cada hora.
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') check(registration);
          });
          window.setInterval(() => check(registration), CHECK_EVERY_MS);
        },
      });
    });
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  state(): UpdateState {
    return state;
  },

  /**
   * Aplica la version nueva: la deja entrar y recarga la pagina, que arranca ya con ella. Lo guardado (perfiles,
   * progreso, partida y ajustes) esta en `localStorage` y no se toca; la cache de archivos es otra cosa.
   */
  apply(): void {
    if (state === 'reload') {
      window.location.reload();
      return;
    }
    if (state !== 'waiting' || applying || !applySkipWaiting) return;
    applying = true;
    // Cuando la nueva mande, `onNeedReload` pasa a `reload` y se recarga en el acto (sigue siendo el momento).
    void applySkipWaiting().finally(() => {
      applying = false;
    });
  },
};
