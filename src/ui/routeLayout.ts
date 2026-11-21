/**
 * Donde va cada lugar de la ruta de brotes (T-019) dentro del mapa, en pixeles CSS. El camino va de izquierda a derecha
 * subiendo y bajando; el ultimo lugar es el destino final, mas pequeno y mas alto porque esta lejos. Con pocos lugares
 * se juntan en el centro; con muchos, el mapa se hace mas ancho que la caja y se desplaza en horizontal.
 */
export interface RouteBox {
  readonly width: number;
  readonly height: number;
}

/** Centro de un lugar y su lado. */
export interface RoutePoint {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface RouteLayout {
  /** Ancho del mapa: el de la caja o, si no caben, mas. */
  readonly width: number;
  readonly height: number;
  readonly points: readonly RoutePoint[];
  /** El mapa es mas ancho que la caja: se desplaza. */
  readonly scrolls: boolean;
}

export const ROUTE_LOOK = {
  /** Lado de un lugar respecto al alto del mapa, con su minimo y su maximo. */
  sizeRatio: 0.42,
  minSize: 52,
  maxSize: 150,
  /** El destino final se ve mas pequeno: esta a lo lejos. */
  farScale: 0.68,
  /** Sitio bajo cada lugar para su nombre, en dos lineas. */
  caption: 36,
  /** Separacion entre centros, en lados de lugar: la minima (si no cabe, el mapa se desplaza) y la maxima. */
  minGap: 1.7,
  maxGap: 3.4,
  /** Margen a cada lado, en lados de lugar, y su minimo: el nombre del primero y del ultimo no se corta. */
  pad: 0.85,
  minPad: 64,
  /** Sitio encima de cada lugar para la flecha del que toca, en lados de lugar. */
  headroom: 0.3,
  /** Cuanto sube y baja el camino, de 0 a 1 del hueco vertical libre. */
  wave: 0.55,
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Coloca `count` lugares (el ultimo, el destino final) en la caja. */
export function layoutRoute(count: number, box: RouteBox): RouteLayout {
  const height = Math.max(0, box.height);
  const boxWidth = Math.max(0, box.width);
  const size = clamp(height * ROUTE_LOOK.sizeRatio, ROUTE_LOOK.minSize, ROUTE_LOOK.maxSize);
  const far = size * ROUTE_LOOK.farScale;
  const pad = Math.max(size * ROUTE_LOOK.pad, ROUTE_LOOK.minPad);
  const room = Math.max(0, boxWidth - 2 * pad);
  const gap = count > 1 ? clamp(room / (count - 1), size * ROUTE_LOOK.minGap, size * ROUTE_LOOK.maxGap) : 0;
  const track = 2 * pad + gap * Math.max(0, count - 1);
  const width = Math.max(boxWidth, track);
  const left = (width - track) / 2 + pad;

  // Hueco vertical para los centros: el lugar entero con su flecha arriba y su nombre abajo caben siempre.
  const top = size * (0.5 + ROUTE_LOOK.headroom) + 2;
  const bottom = Math.max(top, height - size / 2 - ROUTE_LOOK.caption);
  const mid = (top + bottom) / 2;
  const swing = ((bottom - top) / 2) * ROUTE_LOOK.wave;

  const points: RoutePoint[] = [];
  for (let i = 0; i < count; i++) {
    const x = left + gap * i;
    if (i === count - 1 && count > 1) {
      // El destino final, cerca del horizonte.
      points.push({ x, y: Math.max(far / 2 + 4, top - (size - far) / 2), size: far });
      continue;
    }
    points.push({ x, y: mid + (i % 2 === 0 ? swing : -swing), size });
  }
  return { width, height, points, scrolls: track > boxWidth + 0.5 };
}

/** Tramo del camino de `a` a `b`: una curva que sale y llega en horizontal (atributo `d` de un `<path>`). */
export function routeSegment(a: RoutePoint, b: RoutePoint): string {
  const bend = (b.x - a.x) / 2;
  const f = (n: number) => Math.round(n * 10) / 10;
  return `M ${f(a.x)} ${f(a.y)} C ${f(a.x + bend)} ${f(a.y)}, ${f(b.x - bend)} ${f(b.y)}, ${f(b.x)} ${f(b.y)}`;
}
