import * as Phaser from 'phaser';
import type { CardId } from './core/match';

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
  /** Phaser -> React. Payload: vidas que quedan (number). */
  livesChanged: 'lives-changed',
  /**
   * Phaser -> React. Payload: CardPreview | null. Con una carta de elemento sobre una disparadora que se puede
   * infundir, lo que costaria (D-04: la carta muestra "x3 = 225" y se pone en rojo si no alcanza). Null al salir.
   */
  cardPreview: 'card-preview',
  /** Phaser -> React. Sin payload: la partida se perdio; React muestra la pantalla de derrota. */
  matchLost: 'match-lost',
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
  /** React -> Phaser. Sin payload: empezar una partida nueva desde cero (pantalla de derrota). */
  restartRequested: 'restart-requested',
} as const;

/** Precio de infundir la disparadora bajo la carta elegida (ver `cardPreview`). Sale de `cardPlay` en core. */
export interface CardPreview {
  card: CardId;
  /** Elementos que se gastan: uno por canon. */
  multiplier: number;
  cost: number;
  /** Si el saldo alcanza. Si no, la carta se pone en rojo y soltarla no hace nada. */
  affordable: boolean;
}

/** Coordenadas DOM de pagina; la escena las traduce a coordenadas del juego. */
export interface PagePoint {
  pageX: number;
  pageY: number;
}
