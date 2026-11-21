import { describe, expect, it } from 'vitest';
import { SHOOTER_CANNONS, SHOOTER_VARIANTS } from '../game/view/shooters/design';
import { SHOOTER } from '../game/view/shooterShape';
import { SvgCanvas, type SvgCanvasOptions } from './svgCanvas';

/** Un sumidero que lo guarda todo y mide lo pintado. */
function record(paint: (ctx: CanvasRenderingContext2D) => void, options?: SvgCanvasOptions) {
  const parts: string[] = [];
  const defs: string[] = [];
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  let ids = 0;
  const canvas = new SvgCanvas(
    {
      part: (svg) => parts.push(svg),
      def: (svg) => defs.push(svg),
      id: () => `t${++ids}`,
      extend: (x, y, pad) => {
        box.x0 = Math.min(box.x0, x - pad);
        box.y0 = Math.min(box.y0, y - pad);
        box.x1 = Math.max(box.x1, x + pad);
        box.y1 = Math.max(box.y1, y + pad);
      },
    },
    options,
  );
  paint(canvas.ctx);
  return { svg: parts.join(''), defs: defs.join(''), box };
}

describe('SvgCanvas: Canvas 2D escrito en SVG (T-028)', () => {
  it('un circulo entero son cuatro curvas que vuelven al principio', () => {
    const { svg, box } = record((ctx) => {
      ctx.beginPath();
      ctx.arc(10, 20, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0000';
      ctx.fill();
    });
    expect(svg).toBe(
      '<path d="M15 20C15 22.76 12.76 25 10 25C7.24 25 5 22.76 5 20C5 17.24 7.24 15 10 15C12.76 15 15 17.24 15 20" fill="#ff0000"/>',
    );
    expect(box).toEqual({ x0: 5, y0: 15, x1: 15, y1: 25 });
  });

  it('los puntos salen ya movidos y girados, aunque se rellene despues de `restore` (como hace `leafShape`)', () => {
    const { svg } = record((ctx) => {
      ctx.save();
      ctx.translate(100, 50);
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, 0);
      ctx.restore();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    expect(svg).toBe('<path d="M100 50L100 60" fill="none" stroke="#00ff00" stroke-width="2" stroke-miterlimit="10"/>');
  });

  it('un recorte dura hasta su `restore`', () => {
    const { svg, defs } = record((ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 10);
      ctx.closePath();
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, 10);
      ctx.stroke();
      ctx.restore();
    });
    expect(defs).toBe('<clipPath id="t1"><path d="M0 0L10 0L0 10Z"/></clipPath>');
    expect(svg.startsWith('<g clip-path="url(#t1)">')).toBe(true);
    expect(svg.endsWith('</g>')).toBe(true);
  });

  it('los degradados se escriben en coordenadas del dibujo', () => {
    const { svg, defs } = record((ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 40);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#000000');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, 40);
      ctx.lineTo(0, 40);
      ctx.fillStyle = g;
      ctx.fill();
    });
    expect(defs).toBe(
      '<linearGradient id="t1" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="40"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#000000"/></linearGradient>',
    );
    expect(svg).toContain('fill="url(#t1)"');
  });

  it('en silueta todo sale de un color; con `opaqueOnly` se salta lo semitransparente', () => {
    const paint = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = ctx.createRadialGradient(0, 0, 0, 0, 0, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();
    };
    const silhouette = record(paint, { silhouette: '#123456' });
    expect(silhouette.svg.match(/fill="#123456"/g)).toHaveLength(2);
    expect(silhouette.defs).toBe('');
    const opaque = record(paint, { opaqueOnly: true });
    expect(opaque.svg.match(/<path/g)).toHaveLength(1);
  });

  it('pinta la disparadora del juego entera, sin salirse de su textura', () => {
    for (const cannons of SHOOTER_CANNONS) {
      for (const variant of SHOOTER_VARIANTS) {
        const { svg, box } = record((ctx) => SHOOTER.paint(ctx, cannons, variant));
        expect(svg.length).toBeGreaterThan(1000);
        expect(box.x0).toBeGreaterThanOrEqual(0);
        expect(box.y0).toBeGreaterThanOrEqual(0);
        expect(box.x1).toBeLessThanOrEqual(SHOOTER.size.width);
        expect(box.y1).toBeLessThanOrEqual(SHOOTER.size.height);
      }
    }
  });
});
