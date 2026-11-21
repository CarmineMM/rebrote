/**
 * El teclado en pantalla (T-033). En un movil en horizontal tapa media pantalla o mas, y casi nunca encoge la pagina: lo
 * que encoge es la parte que se ve (`window.visualViewport`). Esta regla dice, sin React ni DOM, que trozo queda a la
 * vista mientras se escribe, para que lo que flota encima del juego (la viñeta que pregunta el nombre, el panel de
 * Opciones) se meta en el y se vea lo que se escribe y el boton de confirmar.
 */

/** Lo que tiene que tapar para contar como teclado: asi la barra del navegador que aparece y desaparece no cuenta. */
export const KEYBOARD = {
  /** Como poco, estos px... */
  minPx: 60,
  /** ...y esta parte del alto de la ventana. */
  minShare: 0.15,
  /** Con mas zoom que este, el jugador esta ampliando con los dedos: no se toca nada. */
  maxScale: 1.05,
} as const;

/** El trozo de la ventana que se ve, en px desde arriba de la ventana. */
export interface VisibleArea {
  readonly top: number;
  readonly height: number;
}

/** Lo que hace falta de `window.visualViewport`. */
export interface ViewportLike {
  readonly offsetTop: number;
  readonly height: number;
  readonly scale: number;
}

/**
 * El trozo que se ve con el teclado abierto, o null si no hay teclado: no se esta escribiendo, el navegador no sabe decirlo
 * (sin `visualViewport`), el jugador esta ampliando con los dedos o lo tapado es poco. Si la pagina entera encoge al abrir
 * el teclado (algunos Android), lo que se ve es toda la ventana y tampoco hace falta nada: el tamano lo ajusta el CSS.
 */
export function keyboardArea(windowHeight: number, viewport: ViewportLike | null, editing: boolean): VisibleArea | null {
  if (!editing || !viewport || viewport.scale > KEYBOARD.maxScale) return null;
  const covered = windowHeight - viewport.height;
  if (covered < Math.max(KEYBOARD.minPx, windowHeight * KEYBOARD.minShare)) return null;
  return { top: Math.max(0, Math.round(viewport.offsetTop)), height: Math.max(0, Math.round(viewport.height)) };
}

/** Un campo en el que se escribe con el teclado en pantalla. */
export function isTextEntry(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) return !element.readOnly && !element.disabled;
  if (element instanceof HTMLInputElement) {
    const typed = ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(element.type);
    return typed && !element.readOnly && !element.disabled;
  }
  return element instanceof HTMLElement && element.isContentEditable;
}
