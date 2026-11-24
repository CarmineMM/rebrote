import { useLayoutEffect, useState, type RefObject } from 'react';
import { roundFitsBesideLives } from './hudFit';

/**
 * Si la ronda no cabe al lado de los corazones en la primera fila del HUD (`roundFitsBesideLives`). El HUD lleva entonces
 * `is-tight` y, en el movil en horizontal, la ronda baja debajo de los corazones (la regla esta en el CSS; en pantallas
 * grandes la clase no cambia nada). Se vuelve a medir cuando cambia de tamano el HUD, la bandeja, los marcadores o la ronda.
 * Lo que se mide no depende de donde esta la ronda, asi que moverla no hace que cambie de idea.
 * `watch`: cambia cuando aparecen o desaparecen las piezas (al entrar en el tablero, al llegar la primera ronda).
 */
export function useHudFit(hudRef: RefObject<HTMLElement | null>, watch: unknown): boolean {
  const [tight, setTight] = useState(false);
  useLayoutEffect(() => {
    const hud = hudRef.current;
    if (!hud) return;
    const tray = hud.querySelector<HTMLElement>('.seed-tray');
    const markers = hud.querySelector<HTMLElement>('.hud-right');
    const round = hud.querySelector<HTMLElement>('.round-badge');
    if (!tray || !markers || !round) return;
    // Desde los bordes del HUD y no desde donde estan la bandeja y los marcadores: si la ronda no cabe, la rejilla se
    // desborda y empuja los marcadores a la derecha, y entonces parece que si cabe. Anchos sin transformaciones
    // (`offsetWidth`): las piezas entran con animaciones que las escalan.
    const measure = () => {
      const style = getComputedStyle(hud);
      const box = hud.getBoundingClientRect();
      const trayRight = box.left + (parseFloat(style.paddingLeft) || 0) + tray.offsetWidth;
      const markersLeft = box.right - (parseFloat(style.paddingRight) || 0) - markers.offsetWidth;
      setTight(!roundFitsBesideLives(trayRight, round.offsetWidth, markersLeft, parseFloat(style.columnGap) || 0));
    };
    const observer = new ResizeObserver(measure);
    for (const element of [hud, tray, markers, round]) observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [hudRef, watch]);
  return tight;
}
