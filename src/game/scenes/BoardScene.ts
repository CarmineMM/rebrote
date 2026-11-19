import * as Phaser from 'phaser';
import { BOARD } from '../config/balance';
import { EventBus, GameEvents } from '../EventBus';

/** Escena base: dibuja el tablero con formas simples (ver ADR-0004). */
export class BoardScene extends Phaser.Scene {
  constructor() {
    super('BoardScene');
  }

  create(): void {
    const { lanes, columns, cellSize, offsetX, offsetY } = BOARD;
    const g = this.add.graphics();

    for (let lane = 0; lane < lanes; lane++) {
      for (let col = 0; col < columns; col++) {
        const even = (lane + col) % 2 === 0;
        g.fillStyle(even ? 0x3f8f4a : 0x367d40, 1);
        g.fillRect(offsetX + col * cellSize, offsetY + lane * cellSize, cellSize, cellSize);
      }
    }

    EventBus.emit(GameEvents.sceneReady, this.scene.key);
  }
}
