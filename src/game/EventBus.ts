import * as Phaser from 'phaser';

/** Canal unico entre React (interfaz) y Phaser (juego). */
export const EventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  sceneReady: 'scene-ready',
} as const;
