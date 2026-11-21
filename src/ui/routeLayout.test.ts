import { describe, expect, it } from 'vitest';
import { ROUTE_LOOK, layoutRoute, routeSegment, type RouteLayout } from './routeLayout';

/** Mapas de la ruta tal como quedan en pantalla: escritorio, movil en horizontal y el movil mas pequeno. */
const DESKTOP = { width: 1040, height: 330 };
const PHONE = { width: 760, height: 190 };
const SMALL = { width: 520, height: 150 };

function expectInside(layout: RouteLayout) {
  // Encima de cada lugar (menos el destino final, que nunca toca) cabe la flecha del que toca.
  for (const p of layout.points.slice(0, -1)) expect(p.y - p.size * (0.5 + ROUTE_LOOK.headroom)).toBeGreaterThanOrEqual(0);
  for (const p of layout.points) {
    expect(p.x - p.size / 2).toBeGreaterThanOrEqual(0);
    expect(p.x + p.size / 2).toBeLessThanOrEqual(layout.width);
    expect(p.y - p.size / 2).toBeGreaterThanOrEqual(0);
    // El nombre de debajo cabe.
    expect(p.y + p.size / 2 + ROUTE_LOOK.caption).toBeLessThanOrEqual(layout.height + 0.001);
  }
}

describe('colocar los lugares de la ruta (T-019)', () => {
  it('con los tres lugares de hoy caben sin desplazarse, en todos los tamanos', () => {
    for (const box of [DESKTOP, PHONE, SMALL]) {
      const layout = layoutRoute(3, box);
      expect(layout.scrolls).toBe(false);
      expect(layout.width).toBe(box.width);
      expectInside(layout);
    }
  });

  it('con pocos lugares se juntan en el centro: el mismo margen a cada lado', () => {
    const { points, width } = layoutRoute(3, DESKTOP);
    const first = points[0];
    const last = points[2];
    expect(first.x).toBeCloseTo(width - last.x);
    expect(last.x - first.x).toBeLessThan(width * 0.8);
  });

  it('ningun lugar pisa al de al lado', () => {
    for (const box of [DESKTOP, PHONE, SMALL]) {
      for (const count of [2, 3, 5, 12]) {
        const { points } = layoutRoute(count, box);
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1];
          const b = points[i];
          expect(Math.hypot(b.x - a.x, b.y - a.y), `${count} en ${box.width}`).toBeGreaterThan((a.size + b.size) / 2);
        }
      }
    }
  });

  it('con muchos lugares el mapa se hace mas ancho y se desplaza, sin salirse de su alto', () => {
    const layout = layoutRoute(12, SMALL);
    expect(layout.scrolls).toBe(true);
    expect(layout.width).toBeGreaterThan(SMALL.width);
    expect(layout.height).toBe(SMALL.height);
    expectInside(layout);
  });

  it('el camino sube y baja, y el destino final queda mas pequeno y mas alto, a lo lejos', () => {
    const { points } = layoutRoute(4, DESKTOP);
    expect(points[0].y).not.toBe(points[1].y);
    const final = points[3];
    expect(final.size).toBeLessThan(points[2].size);
    for (const p of points.slice(0, 3)) expect(final.y).toBeLessThan(p.y);
  });

  it('una caja sin medir (o vacia) no da numeros raros', () => {
    for (const box of [
      { width: 0, height: 0 },
      { width: -5, height: 40 },
    ]) {
      const layout = layoutRoute(3, box);
      for (const p of layout.points) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(p.size).toBeGreaterThan(0);
      }
    }
  });
});

describe('tramos del camino (T-019)', () => {
  it('cada tramo es una curva de un lugar al siguiente', () => {
    expect(routeSegment({ x: 10, y: 50, size: 40 }, { x: 110, y: 20, size: 40 })).toBe('M 10 50 C 60 50, 60 20, 110 20');
  });
});
