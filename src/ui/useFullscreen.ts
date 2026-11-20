import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lockLandscape } from './useLandscapeOnly';

/** Atributo para zonas (menus) donde un clic no debe activar la pantalla completa automatica. */
export const NO_AUTO_FULLSCREEN = 'data-no-autofullscreen';

const isSupported = () =>
  typeof document !== 'undefined' &&
  document.fullscreenEnabled === true &&
  typeof document.documentElement.requestFullscreen === 'function';

/**
 * Pantalla completa del navegador (ADR-0007). Los navegadores solo dejan entrar tras un gesto del jugador,
 * asi que con la preferencia activa se entra con el primer clic o tecla fuera de los menus.
 * `onExit` avisa cuando el jugador sale (por ejemplo con Esc), para poner el juego en pausa.
 */
export function useFullscreen(preferred: boolean, onExit: () => void) {
  const [supported] = useState(isSupported);
  const [active, setActive] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  const exitedAt = useRef(0);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    const onChange = () => {
      const now = !!document.fullscreenElement;
      setActive(now);
      if (!now) {
        exitedAt.current = performance.now();
        onExitRef.current();
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enter = useCallback(() => {
    if (!supported || document.fullscreenElement) return;
    document.documentElement
      .requestFullscreen({ navigationUI: 'hide' })
      // En movil, a pantalla completa el dispositivo se queda en horizontal donde el navegador lo deja (ADR-0011).
      .then(lockLandscape)
      .catch(() => {
        // El navegador lo rechazo (sin gesto valido o bloqueado): se sigue en ventana.
      });
  }, [supported]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!preferred || !supported) return;
    const onGesture = (event: Event) => {
      if (document.fullscreenElement) return;
      if (event instanceof KeyboardEvent && (event.key === 'Escape' || event.repeat)) return;
      const target = event.target as Element | null;
      if (target?.closest?.(`[${NO_AUTO_FULLSCREEN}]`)) return;
      enter();
    };
    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('keydown', onGesture, true);
    return () => {
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
    };
  }, [preferred, supported, enter]);

  useEffect(() => {
    if (!preferred) exit();
  }, [preferred, exit]);

  /** Al salir con Esc, algunos navegadores tambien entregan la tecla: se ignora justo despues de salir. */
  const exitedJustNow = useCallback(() => performance.now() - exitedAt.current < 400, []);

  return useMemo(() => ({ supported, active, enter, exit, exitedJustNow }), [supported, active, enter, exit, exitedJustNow]);
}
