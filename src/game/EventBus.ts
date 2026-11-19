import * as Phaser from 'phaser';

/** Canal unico entre React (interfaz) y Phaser (juego). */
export const EventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  /** Phaser -> React. Payload: clave de la escena (string). */
  sceneReady: 'scene-ready',
  /** Phaser -> React. Payload: saldo actual (number). */
  balanceChanged: 'balance-changed',
  /** Phaser -> React. Payload: fotogramas por segundo medidos en el ultimo segundo (number). */
  fpsSampled: 'fps-sampled',
  /** Phaser -> React. Payload: carta seleccionada (CardId | null). */
  selectionChanged: 'selection-changed',
  /** React -> Phaser. Payload: carta que el jugador toma del HUD (CardId). */
  cardPicked: 'card-picked',
  /** React -> Phaser. Payload: posicion del puntero mientras arrastra la carta (PagePoint). */
  cardDragged: 'card-dragged',
  /** React -> Phaser. Payload: posicion donde suelta la carta (PagePoint). */
  cardDropped: 'card-dropped',
  /** React -> Phaser. Sin payload: soltar la carta elegida (Esc). */
  selectionCancelled: 'selection-cancelled',
  /** React -> Phaser. Payload: si el juego queda en pausa (boolean). El menu de pausa lo controla. */
  pauseChanged: 'pause-changed',
  /** React -> Phaser. Sin payload: el HUD se monto y pide el estado actual. */
  stateRequested: 'state-requested',
} as const;

/** Coordenadas DOM de pagina; la escena las traduce a coordenadas del juego. */
export interface PagePoint {
  pageX: number;
  pageY: number;
}
