import { useEffect } from 'react';
import { sfx } from '../game/audio/sfx';

/** Lo que suena al pulsarlo: botones, opciones del selector de idioma, interruptores y opciones de calidad. */
const SOUNDING = 'button, [role="radio"], input[type="checkbox"], input[type="radio"]';

/**
 * Botones de los menus con su sonido (T-014). Un solo oyente para toda la pagina, asi ningun boton nuevo se queda mudo.
 * No suena lo que lleva `data-silent` (o esta dentro de algo que lo lleva): las cartas, "Subir" y "¡Que vengan!" ya
 * suenan con lo que hacen (sembrar, subir de nivel, el inicio del ataque). Un clic en la etiqueta de un interruptor llega
 * dos veces (etiqueta y casilla); la separacion minima del efecto deja oir solo una.
 */
export function useButtonSounds(): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(SOUNDING) : null;
      if (!target || target.closest('[data-silent]')) return;
      if ((target as HTMLButtonElement | HTMLInputElement).disabled) return;
      sfx.play('button');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
}
