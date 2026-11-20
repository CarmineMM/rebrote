import { useSyncExternalStore } from 'react';

/**
 * Pantalla tactil en vertical (ADR-0011): un movil o una tableta de pie. El juego solo se juega en horizontal, asi que
 * en ese caso se tapa con el aviso de girar la pantalla. Una ventana de escritorio estrecha (raton) no cuenta: ahi la
 * vista adaptable del ADR-0007 sigue mostrando el diseno entero.
 */
export const PORTRAIT_TOUCH_QUERY = '(orientation: portrait) and (pointer: coarse)';

function query(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(PORTRAIT_TOUCH_QUERY) : null;
}

function subscribe(listener: () => void): () => void {
  const list = query();
  list?.addEventListener('change', listener);
  return () => list?.removeEventListener('change', listener);
}

const getSnapshot = () => query()?.matches ?? false;

/** Si hay que pedir al jugador que gire la pantalla. Se vuelve a pintar al girar el dispositivo. */
export function useNeedsLandscape(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Deja el dispositivo en horizontal mientras dure la pantalla completa (ADR-0011). Solo lo permiten algunos navegadores
 * (Chrome y Firefox en Android) y solo a pantalla completa; si no, no pasa nada y el aviso de girar hace el trabajo.
 */
export function lockLandscape(): void {
  const orientation = typeof screen !== 'undefined' ? (screen.orientation as ScreenOrientationWithLock | undefined) : undefined;
  orientation?.lock?.('landscape').catch(() => {
    // Escritorio, iPhone o navegador sin bloqueo: se queda como esta.
  });
}

/** `lock` no esta en los tipos del DOM de todas las versiones de TypeScript. */
type ScreenOrientationWithLock = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };
