import type { Box } from './tours';

export interface Size {
  width: number;
  height: number;
}

export interface BubblePlace {
  left: number;
  top: number;
}

/** Distancia minima a los bordes de la pantalla y a lo iluminado. */
export const BUBBLE_MARGIN = 10;
export const BUBBLE_GAP = 14;

/**
 * Donde va el bocadillo de un tour (T-013): junto a lo que se ilumina, sin taparlo, dentro de la pantalla y, si puede,
 * sin meterse bajo `avoid` (la mano que hace el gesto, por ejemplo). Prueba alrededor de cada objetivo (debajo, encima,
 * a la derecha y a la izquierda) y de todos juntos, y en las esquinas de abajo; se queda con el que menos tapa y, entre
 * los que no tapan nada, con el mas cercano. Sin objetivos, en el centro, algo bajo.
 */
export function placeBubble(size: Size, targets: readonly Box[], viewport: Size, avoid: readonly Box[] = []): BubblePlace {
  const clamp = (left: number, top: number): BubblePlace => ({
    left: Math.round(Math.max(BUBBLE_MARGIN, Math.min(left, viewport.width - size.width - BUBBLE_MARGIN))),
    top: Math.round(Math.max(BUBBLE_MARGIN, Math.min(top, viewport.height - size.height - BUBBLE_MARGIN))),
  });
  if (targets.length === 0) {
    return clamp((viewport.width - size.width) / 2, viewport.height * 0.56 - size.height / 2);
  }

  const all = union(targets);
  const around = [...targets, all];
  const candidates: BubblePlace[] = [];
  for (const t of around) {
    const cx = t.left + t.width / 2;
    const cy = t.top + t.height / 2;
    candidates.push(
      clamp(cx - size.width / 2, t.top + t.height + BUBBLE_GAP),
      clamp(cx - size.width / 2, t.top - BUBBLE_GAP - size.height),
      clamp(t.left + t.width + BUBBLE_GAP, cy - size.height / 2),
      clamp(t.left - BUBBLE_GAP - size.width, cy - size.height / 2),
    );
  }
  const bottom = viewport.height - size.height - BUBBLE_MARGIN;
  candidates.push(
    clamp((viewport.width - size.width) / 2, bottom),
    clamp(BUBBLE_MARGIN, bottom),
    clamp(viewport.width - size.width - BUBBLE_MARGIN, bottom),
  );

  const area = size.width * size.height;
  const blocked = targets.map((t) => inflate(t, BUBBLE_GAP / 2));
  const focus = { x: all.left + all.width / 2, y: all.top + all.height / 2 };
  const diagonal = Math.hypot(viewport.width, viewport.height);
  let best = candidates[0];
  let bestScore = Infinity;
  for (const place of candidates) {
    const box = { ...place, ...size };
    const covered = blocked.reduce((sum, t) => sum + overlap(box, t), 0) / area;
    const hidden = avoid.reduce((sum, t) => sum + overlap(box, t), 0) / area;
    const distance = Math.hypot(place.left + size.width / 2 - focus.x, place.top + size.height / 2 - focus.y) / diagonal;
    const score = covered * 100 + hidden * 10 + distance;
    if (score < bestScore - 1e-9) {
      best = place;
      bestScore = score;
    }
  }
  return best;
}

function union(boxes: readonly Box[]): Box {
  const left = Math.min(...boxes.map((b) => b.left));
  const top = Math.min(...boxes.map((b) => b.top));
  const right = Math.max(...boxes.map((b) => b.left + b.width));
  const bottom = Math.max(...boxes.map((b) => b.top + b.height));
  return { left, top, width: right - left, height: bottom - top };
}

function inflate(box: Box, by: number): Box {
  return { left: box.left - by, top: box.top - by, width: box.width + by * 2, height: box.height + by * 2 };
}

/** Area que comparten dos cajas. */
export function overlap(a: Box, b: Box): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}
