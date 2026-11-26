import { BOARD } from '../../config/balance';
import { P, boardRect, cwAt } from '../boardCanvas';
import { type Ctx, smallFlower } from '../canvasKit';
import { pick } from '../random';
import type { FloorDesign } from './design';

/**
 * El suelo de siempre (T-050): el cesped a cuadros, guardado tal cual estaba al empezar la task (era `paintLawn` de
 * `textures.ts`), para poder compararlo con las propuestas y volver a el. No se toca: usa el aleatorio del terreno en el
 * mismo orden de siempre, asi que el terreno sale igual pixel a pixel. No dibuja nada distinto con las columnas a la vista
 * o insinuadas (SU-03): ya las dibuja siempre.
 */
export const LEGACY_FLOOR: FloorDesign = {
  id: 'legacy',
  paint(ctx, rand) {
    paintLawn(ctx, rand);
  },
};

function paintLawn(ctx: Ctx, rand: () => number): void {
  const { lanes, columns } = BOARD;
  for (let lane = 0; lane < lanes; lane++) {
    for (let col = 0; col < columns; col++) {
      boardRect(ctx, col, lane, col + 1, lane + 1);
      ctx.fillStyle = (lane + col) % 2 === 0 ? '#7fce5d' : '#70c051';
      ctx.fill();
      // Brillo suave en el centro de cada casilla: cesped recien cortado.
      const c = P(col + 0.5, lane + 0.5);
      const r = cwAt(col + 0.5, lane + 0.5) * 0.55;
      const sheen = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
      sheen.addColorStop(0, 'rgba(255, 255, 210, 0.10)');
      sheen.addColorStop(1, 'rgba(255, 255, 210, 0)');
      ctx.fillStyle = sheen;
      boardRect(ctx, col, lane, col + 1, lane + 1);
      ctx.fill();
    }
  }

  // Profundidad: el fondo un poco mas oscuro.
  boardRect(ctx, 0, 0, columns, lanes);
  const depth = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, lanes).y);
  depth.addColorStop(0, 'rgba(20, 70, 30, 0.22)');
  depth.addColorStop(1, 'rgba(255, 255, 200, 0.04)');
  ctx.fillStyle = depth;
  ctx.fill();

  ctx.lineCap = 'round';
  for (let i = 0; i < 3400; i++) {
    const x = 0.02 + rand() * (columns - 0.04);
    const y = 0.04 + rand() * (lanes - 0.06);
    const p = P(x, y);
    const cw = cwAt(x, y);
    const len = cw * (0.03 + rand() * 0.035);
    const a = -Math.PI / 2 + (rand() - 0.5) * 0.7;
    ctx.strokeStyle = pick(rand, ['rgba(170, 230, 120, 0.55)', 'rgba(70, 140, 50, 0.45)', 'rgba(120, 200, 90, 0.5)']);
    ctx.lineWidth = cw * 0.011;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
    ctx.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const x = 0.1 + rand() * (columns - 0.2);
    const y = 0.1 + rand() * (lanes - 0.2);
    const p = P(x, y);
    smallFlower(ctx, p.x, p.y, cwAt(x, y) * 0.016, '#ffffff', '#f6c343');
  }

  ctx.strokeStyle = 'rgba(30, 80, 30, 0.13)';
  ctx.lineWidth = 1.5;
  for (let col = 1; col < columns; col++) {
    const a = P(col, 0);
    const b = P(col, lanes);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let lane = 1; lane < lanes; lane++) {
    const a = P(0, lane);
    const b = P(columns, lane);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  boardRect(ctx, 0, 0, columns, lanes);
  ctx.strokeStyle = '#3c7a2f';
  ctx.lineWidth = 5;
  ctx.stroke();
  boardRect(ctx, 0.02, 0.02, columns - 0.02, lanes - 0.02);
  ctx.strokeStyle = 'rgba(210, 255, 170, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
}
