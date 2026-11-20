import type { PagePoint } from '../game/EventBus';

/** Rectangulo en coordenadas de la pagina (como `getBoundingClientRect`). */
export interface PageRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Lado de la planta donde va el panel: encima de la cabeza, bajo los pies, a su derecha o a su izquierda. */
export type PanelSide = 'above' | 'below' | 'right' | 'left';

export interface PanelPlace {
  left: number;
  top: number;
  side: PanelSide;
  /** Donde apunta la flechita, desde la esquina del panel: x si va encima o debajo, y si va a un lado. */
  arrow: number;
}

/** Puntos de la planta donde se apoya el panel en cada lado (los manda la escena en `PlantPanel`). */
export type PanelAnchors = Record<PanelSide, PagePoint>;

/** Separacion con los bordes de la pantalla y con el HUD. */
export const PANEL_MARGIN = 8;
/** Lo que asoma la flechita que apunta a la planta. */
export const PANEL_ARROW = 9;
/** La flechita no se acerca mas que esto a una esquina redondeada del panel. */
const ARROW_INSET = 16;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Coloca el panel de nivel (T-003) junto a la planta sin salirse de la pantalla ni meterse bajo el HUD. Prefiere
 * encima de la cabeza; si no cabe, bajo los pies; si tampoco (un movil en horizontal, en las filas de abajo), a un
 * lado de la planta, a la derecha o a la izquierda. Si no cabe en ningun sitio, va donde haya mas hueco, dentro de la
 * pantalla aunque tape un poco el HUD.
 */
export function placeLevelPanel(
  size: { width: number; height: number },
  anchors: PanelAnchors,
  obstacles: readonly PageRect[],
  viewport: { width: number; height: number },
): PanelPlace {
  const { width, height } = size;
  const bottomLimit = viewport.height - height - PANEL_MARGIN;
  const clampLeft = (left: number) => clamp(left, PANEL_MARGIN, viewport.width - width - PANEL_MARGIN);
  /** Lo mas arriba que puede empezar el panel en esa franja: bajo lo que del HUD le caiga encima. */
  const topLimit = (left: number) =>
    obstacles.reduce(
      (limit, rect) => (rect.right > left && rect.left < left + width ? Math.max(limit, rect.bottom + PANEL_MARGIN) : limit),
      PANEL_MARGIN,
    );
  const arrowX = (anchor: PagePoint, left: number) => clamp(anchor.pageX - left, ARROW_INSET, width - ARROW_INSET);
  const arrowY = (anchor: PagePoint, top: number) => clamp(anchor.pageY - top, ARROW_INSET, height - ARROW_INSET);

  const aboveLeft = clampLeft(anchors.above.pageX - width / 2);
  const aboveTop = anchors.above.pageY - height - PANEL_ARROW;
  const above: PanelPlace = { left: aboveLeft, top: aboveTop, side: 'above', arrow: arrowX(anchors.above, aboveLeft) };
  if (aboveTop >= topLimit(aboveLeft) && aboveTop <= bottomLimit) return above;

  const belowLeft = clampLeft(anchors.below.pageX - width / 2);
  const belowTop = anchors.below.pageY + PANEL_ARROW;
  const below: PanelPlace = { left: belowLeft, top: belowTop, side: 'below', arrow: arrowX(anchors.below, belowLeft) };
  if (belowTop >= topLimit(belowLeft) && belowTop <= bottomLimit) return below;

  // A un lado: centrado en la planta y corrido arriba o abajo lo justo para caber, con la flechita apuntandola.
  const beside = (side: 'right' | 'left'): PanelPlace | null => {
    const anchor = anchors[side];
    const left = side === 'right' ? anchor.pageX + PANEL_ARROW : anchor.pageX - PANEL_ARROW - width;
    if (left < PANEL_MARGIN || left + width > viewport.width - PANEL_MARGIN) return null;
    const min = topLimit(left);
    if (min > bottomLimit) return null;
    const top = clamp(anchor.pageY - height / 2, min, bottomLimit);
    // Si la planta queda fuera de la altura del panel, la flechita no la apuntaria.
    if (anchor.pageY < top + ARROW_INSET || anchor.pageY > top + height - ARROW_INSET) return null;
    return { left, top, side, arrow: arrowY(anchor, top) };
  };
  const side = beside('right') ?? beside('left');
  if (side) return side;

  // Sin sitio limpio: donde haya mas hueco, siempre dentro de la pantalla.
  const roomAbove = anchors.above.pageY - topLimit(aboveLeft);
  const roomBelow = viewport.height - anchors.below.pageY;
  const fallback = roomAbove >= roomBelow ? above : below;
  return { ...fallback, top: clamp(fallback.top, PANEL_MARGIN, Math.max(PANEL_MARGIN, bottomLimit)) };
}
