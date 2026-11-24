import { useEffect, type RefObject } from 'react';

/** Pixeles que tiene que moverse el raton antes de que pulsar cuente como arrastrar (y no como tocar un lugar). */
const DRAG_START = 6;

/**
 * Desplaza en horizontal una caja con el raton: arrastrando con el boton izquierdo o con la rueda. El dedo ya la
 * desplaza solo (el navegador), asi que aqui solo se atiende al raton. Un arrastre no cuenta como clic en lo que hubiera
 * debajo al soltar. La caja lleva `is-dragging` mientras se arrastra.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const box = ref.current;
    if (!box || !enabled) return;

    let pointer: number | null = null;
    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    let swallowClick = false;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startScroll = box.scrollLeft;
      dragging = false;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      const dx = event.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_START) return;
        dragging = true;
        box.setPointerCapture(event.pointerId);
        box.classList.add('is-dragging');
      }
      box.scrollLeft = startScroll - dx;
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      if (!dragging) return;
      dragging = false;
      swallowClick = true;
      box.classList.remove('is-dragging');
      if (box.hasPointerCapture(event.pointerId)) box.releasePointerCapture(event.pointerId);
      // Si el clic no llega (se solto fuera), no se queda esperando al siguiente.
      setTimeout(() => (swallowClick = false), 0);
    };
    const onClick = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.stopPropagation();
      event.preventDefault();
    };
    // La rueda de siempre (arriba y abajo) mueve el camino de lado.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 40 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? box.clientWidth : 1;
      box.scrollLeft += event.deltaY * scale;
      event.preventDefault();
    };

    box.addEventListener('pointerdown', onDown);
    box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerup', onUp);
    box.addEventListener('pointercancel', onUp);
    box.addEventListener('click', onClick, true);
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      box.removeEventListener('pointerdown', onDown);
      box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointerup', onUp);
      box.removeEventListener('pointercancel', onUp);
      box.removeEventListener('click', onClick, true);
      box.removeEventListener('wheel', onWheel);
      box.classList.remove('is-dragging');
    };
  }, [ref, enabled]);
}
