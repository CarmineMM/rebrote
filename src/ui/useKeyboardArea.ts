import { useEffect, useState } from 'react';
import { isTextEntry, keyboardArea, type VisibleArea } from './keyboardArea';

const same = (a: VisibleArea | null, b: VisibleArea | null) => a === b || (a !== null && b !== null && a.top === b.top && a.height === b.height);

/**
 * El trozo de la ventana que se ve con el teclado en pantalla abierto, o null sin teclado (T-033, `keyboardArea`). Se
 * vuelve a medir al abrir, cerrar o mover el teclado y al entrar en un campo de texto. Al salir del campo no (ni al pasar
 * el foco a un boton): el teclado se cierra y eso ya avisa. Asi, al tocar "¡Listo!" o "Prefiero no decirlo" con el
 * teclado abierto, nada se mueve bajo el dedo antes del clic. Con el teclado abierto, el campo en el que se escribe se
 * deja a la vista dentro de su panel.
 */
export function useKeyboardArea(): VisibleArea | null {
  const [area, setArea] = useState<VisibleArea | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport ?? null;
    const update = () => {
      const next = keyboardArea(window.innerHeight, viewport, isTextEntry(document.activeElement));
      setArea((current) => (same(current, next) ? current : next));
    };
    const onFocus = (event: FocusEvent) => {
      if (isTextEntry(event.target instanceof Element ? event.target : null)) update();
    };
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', onFocus);
    update();
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', onFocus);
    };
  }, []);
  // Con el panel ya encogido a lo que se ve, el campo en el que se escribe se deja a la vista dentro de el (Opciones).
  useEffect(() => {
    const field = document.activeElement;
    if (area && field instanceof HTMLElement && isTextEntry(field) && field.closest('.pause-card')) field.scrollIntoView({ block: 'nearest' });
  }, [area]);
  return area;
}
