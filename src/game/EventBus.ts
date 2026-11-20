import * as Phaser from 'phaser';
import type { CardId } from './core/match';
import type { ElementType } from './core/plants';
import type { RoundPhase } from './core/rounds';

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
  /** Phaser -> React. Payload: LossInfo. La partida se perdio; React muestra la pantalla de derrota. */
  matchLost: 'match-lost',
  /** Phaser -> React. Sin payload: superada la ultima ronda, la del jefe (T-008); React muestra la victoria. */
  matchWon: 'match-won',
  /**
   * Phaser -> React. Payload: BossInfo | null. Vida y fase del Creeper (T-008) para su barra. Solo se manda si cambia.
   * Al derrotarlo llega con la vida a 0; null cuando no hay jefe.
   */
  bossChanged: 'boss-changed',
  /**
   * Phaser -> React. Payload: RoundInfo. Ronda en curso (T-007): numero, fase, cuenta atras de la preparacion, cartas
   * de la bandeja y aviso. Solo se manda si algo cambia (en la preparacion, cada segundo).
   */
  roundChanged: 'round-changed',
  /**
   * Phaser -> React. Payload: PlantPanel | null. Disparadora seleccionada con un clic (T-003): su nivel, lo que cuesta
   * el siguiente y donde esta en la pagina, para pintar el panel de subir de nivel junto a ella. Null al cerrarlo.
   */
  plantPanel: 'plant-panel',
  /** React -> Phaser. Payload: carta que el jugador toma del HUD (CardId). */
  cardPicked: 'card-picked',
  /** React -> Phaser. Payload: posicion del puntero mientras arrastra la carta (PagePoint). */
  cardDragged: 'card-dragged',
  /** React -> Phaser. Payload: posicion donde suelta la carta (PagePoint). */
  cardDropped: 'card-dropped',
  /** React -> Phaser. Sin payload: soltar la carta elegida o cerrar el panel de la planta seleccionada (Esc). */
  selectionCancelled: 'selection-cancelled',
  /** React -> Phaser. Sin payload: subir un nivel la disparadora seleccionada (boton del panel). */
  levelUpRequested: 'level-up-requested',
  /** React -> Phaser. Sin payload: adelantar el ataque de la ronda en preparacion (boton "¡Que vengan!"). */
  attackRequested: 'attack-requested',
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

/**
 * Panel de la disparadora seleccionada (T-003). Sale de `levelUpOffer` en core; la escena solo anade donde esta.
 */
export interface PlantPanel {
  /** Casilla de la planta ("carril:columna"): cambia al seleccionar otra. */
  id: string;
  level: number;
  /** Lo que cuesta subir un nivel; null en el nivel maximo (el boton dice "Maximo"). */
  cost: number | null;
  /** Por cuanto se multiplica el costo de un canon: sus canones ("x3 = 225"). */
  multiplier: number;
  /** Si el saldo alcanza para subir. */
  affordable: boolean;
  /** Tramo de color de la medallita (cambia cada 5 niveles), para pintar la misma en el panel; null en nivel 1, que no lleva. */
  medalTier: number | null;
  /** Donde se apoya el panel: sobre la cabeza de la planta, o bajo sus pies si arriba no cabe. */
  above: PagePoint;
  below: PagePoint;
}

/** Como se perdio la partida. */
export interface LossInfo {
  /** El Creeper cruzo el jardin (T-008): se pierde aunque queden vidas. */
  byBoss: boolean;
}

/** Barra del jefe (T-008). Sale del Creeper del estado y de `CREEPER` en balance. */
export interface BossInfo {
  name: string;
  hp: number;
  maxHp: number;
  /** Fase 2: con la mitad de la vida o menos. */
  enraged: boolean;
  /** Umbrales de vida (fracciones) en los que salta de carril: la barra los marca. */
  jumpAt: number[];
}

/** Ronda en curso (T-007). Sale de `round` en el estado y de `rounds.ts` en core. */
export interface RoundInfo {
  /** Ronda en curso, desde 1 ("Ronda 3 de 10"). */
  number: number;
  total: number;
  /** Ronda del combate contra el jefe (T-008), desde 1, o null si el mundo no tiene. */
  bossRound: number | null;
  phase: RoundPhase;
  /** En la preparacion, segundos que faltan para el ataque (redondeados hacia arriba); null en otra fase. */
  prepSeconds: number | null;
  /** Cartas de la bandeja: las desbloqueadas. Las bloqueadas no se ven. */
  cards: CardId[];
  /** Elementos que ya se pueden infundir (el fuego se siembra solo una ronda antes de poder infundirlo). */
  infusable: ElementType[];
  /** Aviso de una linea con el concepto nuevo de la ronda. */
  notice: string;
}

/** Coordenadas DOM de pagina; la escena las traduce a coordenadas del juego. */
export interface PagePoint {
  pageX: number;
  pageY: number;
}
