import * as Phaser from 'phaser';
import { BOARD } from './config/balance';
import { BoardScene } from './scenes/BoardScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: BOARD.offsetX * 2 + BOARD.columns * BOARD.cellSize,
    height: BOARD.offsetY * 2 + BOARD.lanes * BOARD.cellSize,
    backgroundColor: '#1d2b1f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BoardScene],
  });
}
