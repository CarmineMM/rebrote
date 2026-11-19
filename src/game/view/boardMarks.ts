import * as Phaser from 'phaser';
import type { BoardPoint, Cell } from '../core/board';
import type { Effects, FloatTextOptions } from './effects';
import { DEPTH, perspective } from './layout';

/**
 * Marcas sobre el tablero que comparten las cartas (sembrar, infundir) y el arrastre para fusionar:
 * casillas, areas y el rotulo que cuenta que pasara al soltar. Las reglas las decide core; aqui solo se pinta.
 */

/** Pinta el rombo en perspectiva de una casilla. */
export function drawCell(graphics: Phaser.GameObjects.Graphics, cell: Cell, color: number, fillAlpha: number, lineWidth: number): void {
  drawBoardPolygon(
    graphics,
    [
      { x: cell.col, y: cell.lane },
      { x: cell.col + 1, y: cell.lane },
      { x: cell.col + 1, y: cell.lane + 1 },
      { x: cell.col, y: cell.lane + 1 },
    ],
    color,
    fillAlpha,
    lineWidth,
  );
}

/** Pinta en perspectiva un circulo del tablero (`radius` en casillas): el alcance de una mina, por ejemplo. */
export function drawArea(
  graphics: Phaser.GameObjects.Graphics,
  center: BoardPoint,
  radius: number,
  color: number,
  fillAlpha: number,
  lineWidth: number,
): void {
  const points = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return { x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius };
  });
  drawBoardPolygon(graphics, points, color, fillAlpha, lineWidth);
}

function drawBoardPolygon(graphics: Phaser.GameObjects.Graphics, points: BoardPoint[], color: number, fillAlpha: number, lineWidth: number): void {
  const screen = points.map((p) => perspective.toScreen(p));
  graphics.fillStyle(color, fillAlpha).lineStyle(lineWidth, color, 0.95).beginPath();
  graphics.moveTo(screen[0].x, screen[0].y);
  for (const p of screen.slice(1)) graphics.lineTo(p.x, p.y);
  graphics.closePath().fillPath().strokePath();
}

/** Tamano en pantalla de un circulo del tablero de radio `radius` alrededor de `center`: ancho y alto de la elipse. */
export function areaSize(center: BoardPoint, radius: number): { width: number; height: number } {
  const left = perspective.toScreen({ x: center.x - radius, y: center.y });
  const right = perspective.toScreen({ x: center.x + radius, y: center.y });
  const back = perspective.toScreen({ x: center.x, y: center.y - radius });
  const front = perspective.toScreen({ x: center.x, y: center.y + radius });
  return { width: Math.abs(right.x - left.x), height: Math.abs(front.y - back.y) };
}

/** Linea de un rotulo: verde si se puede, ambar si avisa de algo, rojo si no se puede. */
export interface LabelLine {
  text: string;
  tone: 'ok' | 'warn' | 'blocked';
}

export const LABEL_TONES: Record<LabelLine['tone'], FloatTextOptions> = {
  ok: { color: '#efffdf', stroke: '#24561c' },
  warn: { color: '#ffd166', stroke: '#5a3d00' },
  blocked: { color: '#ff8fa3', stroke: '#5a0d1a' },
};

/**
 * Rotulo que sube y baja sobre una casilla y cuenta que pasara al soltar ("Fusionar: 2 canones",
 * "Infundir: x3 = 225"...). Solo se rehace si cambia lo que dice o donde.
 */
export class BoardLabel {
  private label?: Phaser.GameObjects.Container;
  private key = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
  ) {}

  /**
   * Muestra `lines` centradas en `x`, con la ultima linea apoyada en `bottom` (pantalla). `cellWidth` da el tamano
   * de la letra. `key` identifica lo mostrado: si no cambia, no se rehace.
   */
  show(key: string, lines: readonly LabelLine[], x: number, bottom: number, cellWidth: number): void {
    if (key === this.key) return;
    this.hide();
    this.key = key;
    if (lines.length === 0) return;
    const fontSize = Math.round(Phaser.Math.Clamp(cellWidth * 0.2, 18, 28));
    const texts = lines.map((line, i) =>
      this.scene.add
        .text(0, i * fontSize * 1.15, line.text, this.fx.textStyle({ fontSize, ...LABEL_TONES[line.tone] }))
        .setOrigin(0.5, 1),
    );
    const top = bottom - (lines.length - 1) * fontSize * 1.15;
    const label = this.scene.add.container(x, top, texts).setDepth(DEPTH.floatText - 1).setScale(0.5).setAlpha(0);
    this.scene.tweens.add({ targets: label, scale: 1, alpha: 1, duration: 200, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: label, y: top - cellWidth * 0.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 200 });
    this.label = label;
  }

  /** Quita el rotulo (`now`: sin esperar, para que no se pise con otro texto que sale en el mismo sitio). */
  hide(now = false): void {
    this.key = '';
    const label = this.label;
    if (!label) return;
    this.label = undefined;
    this.scene.tweens.killTweensOf(label);
    if (now) {
      label.destroy();
      return;
    }
    this.scene.tweens.add({ targets: label, alpha: 0, scale: 0.7, duration: 120, onComplete: () => label.destroy() });
  }
}
