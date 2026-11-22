import { useEffect, useSyncExternalStore } from 'react';
import { pwaInstall } from '../pwa/install';
import type { InstallOffer } from '../pwa/policy';
import { shouldApplyUpdate } from '../pwa/policy';
import { pwaUpdate } from '../pwa/update';

/** Lo que ofrece el boton "Instalar" de la portada (T-029). Se vuelve a pintar al instalar o al cancelar. */
export function useInstallOffer(): InstallOffer {
  return useSyncExternalStore(pwaInstall.subscribe, pwaInstall.offer, () => 'none');
}

/** Si el jugador esta escribiendo en un campo (su nombre, T-033). */
function typing(): boolean {
  return document.activeElement?.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]') ?? false;
}

/**
 * Aplica la version nueva del juego en cuanto toca (T-029, V-03): `onTitle` sin partida en marcha y `story` con una
 * vineta encima. Se vuelve a mirar al llegar la version, al cambiar de pantalla y al dejar de escribir.
 */
export function useUpdateWhenIdle(onTitle: boolean, story: boolean): void {
  const update = useSyncExternalStore(pwaUpdate.subscribe, pwaUpdate.state, () => 'none' as const);
  useEffect(() => {
    if (update === 'none' || !onTitle || story) return;
    const tryApply = () => {
      if (shouldApplyUpdate({ update, onTitle, story, typing: typing() })) pwaUpdate.apply();
    };
    tryApply();
    // Escribiendo su nombre: se espera a que salga del campo (y a que el foco haya salido de verdad).
    let timer = 0;
    const onFocusOut = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(tryApply, 0);
    };
    document.addEventListener('focusout', onFocusOut);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [update, onTitle, story]);
}
