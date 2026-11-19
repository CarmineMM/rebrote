import * as Phaser from 'phaser';
import { BOARD } from '../config/balance';
import type { BoardPoint, Cell } from '../core/board';
import type { Shooter } from '../core/plants';
import { BoardLabel, drawCell, type LabelLine } from './boardMarks';
import type { Effects } from './effects';
import { DEPTH, perspective } from './layout';
import type { ScreenPoint } from './perspective';
import { SHOOTER_SIZE, TEX, artInv, shooterTexture } from './textures';

/**
 * Aspecto del arrastre para fusionar (T-006). Medidas en anchos de casilla salvo que se diga otra cosa.
 * Las reglas (que se puede fusionar con que) las decide core; aqui solo se pinta.
 */
export const DRAG_LOOK = {
  /** Cuanto flota la planta arrastrada sobre el suelo: lo bastante para no tapar a la planta de destino. */
  lift: 0.42,
  /** En la mano se ve un poco mas grande que sembrada. */
  scale: 1.08,
  /** Rapidez con que sigue al puntero: cuanto mayor, mas pegada (por segundo). */
  follow: 24,
  /** Se inclina segun la velocidad horizontal (grados por pixel/s) hasta un tope. */
  swayPerSpeed: 0.018,
  maxSway: 16,
  /** Pixeles de diseno que hay que mover el puntero con el boton pulsado para que empiece el arrastre. */
  startDistance: 10,
  /** Casillas de las plantas con las que se puede fusionar. */
  targetColor: 0x7dff5a,
  /** Casilla bajo la planta arrastrada: verde si se puede soltar ahi, roja si no. */
  hoverOkColor: 0xb8ff8c,
  hoverBlockedColor: 0xff5a5f,
} as const;

/** Lo que pisaria la planta arrastrada con el puntero en `pointer` (mundo). */
export interface DragGround {
  /** Punto del suelo bajo la planta, en pantalla. */
  screen: ScreenPoint;
  /** El mismo punto en el tablero; null si cae por encima del horizonte. */
  board: BoardPoint | null;
  cellWidth: number;
}

/**
 * Suelo bajo la planta arrastrada. La planta se lleva agarrada por donde se pulso: `grab` es la distancia
 * del punto pulsado a sus pies, en anchos de casilla, y se escala con la profundidad a la que va el puntero.
 * Asi, al empezar, la planta pisa su propia casilla y no la de detras aunque se pulse en lo alto de la cabeza.
 */
export function dragGround(pointer: ScreenPoint, grab: ScreenPoint, fallbackCellWidth: number): DragGround {
  const atPointer = perspective.toBoard(pointer);
  const cellWidth = atPointer ? perspective.cellWidthAt(atPointer) : fallbackCellWidth;
  const screen = { x: pointer.x + grab.x * cellWidth, y: pointer.y + grab.y * cellWidth };
  return { screen, board: perspective.toBoard(screen), cellWidth };
}

/** ¿Cae el punto en el cesped o justo al lado? Fuera de ahi (cielo, seto) la sombra no se pinta. */
const onLawn = (point: BoardPoint | null): boolean =>
  point !== null && point.x > -0.5 && point.x < BOARD.columns + 0.5 && point.y > -0.3 && point.y < BOARD.lanes + 0.3;

/**
 * La planta que el jugador lleva en la mano, su sombra, las casillas de destino y el rotulo de lo que pasara.
 * Vive lo que dura un arrastre: la escena la crea al empezar y la suelta con `dropInto`, `returnTo` o `poof`.
 */
export class FusionDragView {
  private readonly plant: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly targets: Phaser.GameObjects.Graphics;
  private readonly hoverMark: Phaser.GameObjects.Graphics;
  private readonly label: BoardLabel;
  private cellWidth: number;
  /** Donde quiere estar la planta (pies, en pantalla); la imagen la sigue con un poco de retraso. */
  private goal: ScreenPoint;
  private sway = 0;
  private wobble = Math.random() * Math.PI * 2;
  private released = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    shooter: Shooter,
    foot: ScreenPoint,
    cellWidth: number,
  ) {
    this.cellWidth = cellWidth;
    this.label = new BoardLabel(scene, fx);
    this.goal = { ...foot };
    this.targets = scene.add.graphics().setDepth(DEPTH.highlight);
    this.hoverMark = scene.add.graphics().setDepth(DEPTH.highlight + 0.5);
    scene.tweens.add({ targets: this.targets, alpha: 0.45, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.shadow = scene.add
      .image(foot.x, foot.y, TEX.shadow)
      .setDisplaySize(cellWidth * 0.7, cellWidth * 0.22)
      .setAlpha(0.55)
      .setDepth(DEPTH.highlight + 1);
    this.plant = scene.add
      .image(foot.x, foot.y, shooterTexture(shooter.cannons, shooter.element))
      .setOrigin(0.5, SHOOTER_SIZE.footY / SHOOTER_SIZE.height)
      .setScale(this.plantScale(cellWidth))
      .setDepth(DEPTH.floatText - 10);
    // Se despega del suelo con un estiron.
    const scale = this.plantScale(cellWidth);
    this.plant.setScale(scale * 0.9, scale * 1.15);
    scene.tweens.add({ targets: this.plant, scaleX: scale, scaleY: scale, duration: 260, ease: 'Back.Out' });
    fx.dirt(foot.x, foot.y, 6);
  }

  /** Marca en verde las casillas de las plantas con las que se puede fusionar. */
  showTargets(cells: readonly Cell[]): void {
    this.targets.clear();
    for (const cell of cells) drawCell(this.targets, cell, DRAG_LOOK.targetColor, 0.22, 3);
  }

  /** El puntero se movio: la planta flota sobre `ground` (ver `dragGround`). */
  moveTo(ground: DragGround): void {
    if (this.released) return;
    this.cellWidth = ground.cellWidth;
    this.goal = { x: ground.screen.x, y: ground.screen.y - DRAG_LOOK.lift * ground.cellWidth };
    this.shadow.setPosition(ground.screen.x, ground.screen.y).setDisplaySize(ground.cellWidth * 0.7, ground.cellWidth * 0.22);
    this.shadow.setVisible(onLawn(ground.board));
  }

  /**
   * Casilla bajo la planta: `ok` en verde, `blocked` en rojo, null sin marca. El rotulo sale encima de `labelAt`
   * (los pies de la planta de esa casilla), por encima de la planta que se lleva en la mano, con una linea por cosa que contar.
   */
  hover(cell: Cell | null, state: 'ok' | 'blocked' | null, lines: readonly LabelLine[] = [], labelAt?: ScreenPoint): void {
    this.hoverMark.clear();
    if (cell && state) {
      drawCell(this.hoverMark, cell, state === 'ok' ? DRAG_LOOK.hoverOkColor : DRAG_LOOK.hoverBlockedColor, 0.3, 5);
    }
    if (!cell || !labelAt || lines.length === 0) {
      this.label.hide();
      return;
    }
    // Por encima de la planta que se lleva en la mano, que flota sobre la casilla.
    const key = `${cell.lane}:${cell.col}:${lines.map((l) => l.text).join('|')}`;
    this.label.show(key, lines, labelAt.x, labelAt.y - this.cellWidth * (DRAG_LOOK.lift + 1.12), this.cellWidth);
  }

  /** Cada fotograma: la planta sigue al puntero con un poco de retraso y se inclina segun hacia donde va. */
  update(deltaMs: number): void {
    if (this.released) return;
    const dt = Math.max(deltaMs, 1) / 1000;
    const k = 1 - Math.exp(-DRAG_LOOK.follow * dt);
    const dx = (this.goal.x - this.plant.x) * k;
    this.plant.x += dx;
    this.plant.y += (this.goal.y - this.plant.y) * k;
    const targetSway = Phaser.Math.Clamp((dx / dt) * DRAG_LOOK.swayPerSpeed, -DRAG_LOOK.maxSway, DRAG_LOOK.maxSway);
    this.sway += (targetSway - this.sway) * Math.min(1, dt * 10);
    this.wobble += dt * 5;
    this.plant.setAngle(this.sway + Math.sin(this.wobble) * 2.5);
    if (!this.scene.tweens.isTweening(this.plant)) this.plant.setScale(this.plantScale(this.cellWidth));
  }

  /** Se suelta sobre un destino valido: se mete en la planta de `foot` y desaparece. */
  dropInto(foot: ScreenPoint, cellWidth: number): void {
    this.release(true);
    this.scene.tweens.add({
      targets: this.plant,
      x: foot.x,
      y: foot.y - cellWidth * 0.3,
      scaleX: this.plant.scaleX * 0.45,
      scaleY: this.plant.scaleY * 0.45,
      angle: 0,
      alpha: 0.2,
      duration: 150,
      ease: 'Cubic.In',
      onComplete: () => this.plant.destroy(),
    });
  }

  /** Se suelta donde no hay fusion: vuelve volando a su casilla y `onLanded` avisa al llegar. */
  returnTo(foot: ScreenPoint, cellWidth: number, onLanded: () => void): void {
    this.release();
    this.scene.tweens.add({
      targets: this.plant,
      x: foot.x,
      y: foot.y,
      scaleX: this.plantScale(cellWidth) / DRAG_LOOK.scale,
      scaleY: this.plantScale(cellWidth) / DRAG_LOOK.scale,
      angle: 0,
      duration: 230,
      ease: 'Quad.Out',
      onComplete: () => {
        this.plant.destroy();
        onLanded();
      },
    });
  }

  /** La planta de origen murio mientras se arrastraba: la de la mano se deshace en hojas. */
  poof(): void {
    this.release();
    this.fx.leaves(this.plant.x, this.plant.y - this.cellWidth * 0.4, 10);
    this.scene.tweens.add({
      targets: this.plant,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 220,
      ease: 'Back.In',
      onComplete: () => this.plant.destroy(),
    });
  }

  /** Deja de seguir al puntero y quita marcas y rotulo (`now`: el rotulo sin esperar, para que no se pise con otro texto). */
  private release(now = false): void {
    this.released = true;
    this.scene.tweens.killTweensOf([this.plant, this.targets]);
    this.label.hide(now);
    for (const mark of [this.targets, this.hoverMark]) {
      this.scene.tweens.add({ targets: mark, alpha: 0, duration: 140, onComplete: () => mark.destroy() });
    }
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 140, onComplete: () => this.shadow.destroy() });
  }

  private plantScale(cellWidth: number): number {
    return ((cellWidth * DRAG_LOOK.scale) / SHOOTER_SIZE.width) * artInv();
  }
}
