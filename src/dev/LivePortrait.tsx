import { useEffect, useState } from 'react';
import type { CharacterDesign, Expression } from '../game/view/characters/design';
import { portraitUrl } from '../game/view/characters/portraitImage';

/**
 * Retrato animado de un personaje (T-031): parpadea y, si habla, abre y cierra la boca. Lo usan la galeria de propuestas
 * (`/propuestas/personajes.html`) y el catalogo (`/catalogo/personajes.html`, T-040). Solo desarrollo.
 */
export function LivePortrait({ design, expression, talking, height, className = 'char-portrait' }: { design: CharacterDesign; expression: Expression; talking: boolean; height: number; className?: string }) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setTime(now - start);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const blink = time % 3400 > 3250;
  const open = talking && Math.floor(time / 115) % 2 === 0 && time % 1400 < 1000;
  return <img className={className} style={{ height }} src={portraitUrl(design, { expression, blink, open })} alt="" />;
}
