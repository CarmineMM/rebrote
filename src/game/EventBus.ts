import * as Phaser from 'phaser';
import type { CardId, MatchState } from './core/match';
import type { ElementType } from './core/plants';
import type { RoundPhase } from './core/rounds';

/** Canal unico entre React (interfaz) y Phaser (juego). */
export const EventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  /** Phaser -> React. Payload: clave de la escena lista (`SCENES`: la portada del menu de inicio o el tablero, T-011). */
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
  /**
   * Phaser -> React. Payload: UnlockInfo. Empieza una ronda con algo nuevo (T-009, tambien la 1): React muestra el aviso
   * "¡YA LO TIENES!" y deja el juego en pausa hasta que el jugador lo acepta. Se repite al pedir el estado mientras no
   * se acepte.
   */
  unlocked: 'unlocked',
  /**
   * Phaser -> React. Payload: EntityInfo. Doble clic (o doble toque) sobre una planta, una mina o un enemigo (T-010):
   * React muestra su ficha y deja el juego en pausa hasta que el jugador la cierra.
   */
  entityInfo: 'entity-info',
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
  /** React -> Phaser. Payload: ronda (desde 1) del aviso de desbloqueo que el jugador acepto (T-009). */
  unlockAccepted: 'unlock-accepted',
  /** React -> Phaser. Sin payload: el HUD se monto y pide el estado actual. */
  stateRequested: 'state-requested',
  /** React -> Phaser. Sin payload: empezar una partida nueva desde cero (pantalla de derrota). */
  restartRequested: 'restart-requested',
  /**
   * React -> Phaser. Payload: MatchRequest. Desde el menu de inicio (T-011): la portada deja paso al tablero con una
   * partida nueva o con la guardada.
   */
  matchRequested: 'match-requested',
  /** React -> Phaser. Sin payload: guardar la partida ya (la pestana se oculta o se cierra, T-011). */
  saveRequested: 'save-requested',
  /** React -> Phaser. Sin payload: volver al menu de inicio (T-011). El tablero guarda la partida y deja paso a la portada. */
  exitRequested: 'exit-requested',
  /**
   * React -> Phaser. Payload: boolean. Hay un tour de ayuda en pantalla (T-013, ADR-0012): la preparacion no descuenta,
   * pero el juego sigue vivo para que el jugador pueda hacer el gesto que se le ensena.
   */
  tourHold: 'tour-hold',
  /**
   * Phaser -> React. Payload: TourBoard. Mientras dura un tour: lo que se puede senalar en el tablero, ya en coordenadas
   * de la pagina. Solo se manda si cambia (tambien si cambia la ventana).
   */
  tourBoard: 'tour-board',
  /** Phaser -> React. Payload: TourArt. Dibujos de los bocadillos del tour, compuestos con las texturas del tablero. */
  tourArt: 'tour-art',
  /** Phaser -> React. Payload: PlayerAction. El jugador acaba de hacer algo que un tour puede estar ensenando (T-013). */
  playerAction: 'player-action',
  /**
   * Phaser -> React. Payload: DroppedCoin. Una moneda en el suelo ya se puede recoger (T-013: la pista de la moneda). Se
   * repite con la misma `id` si cambia la ventana.
   */
  coinDropped: 'coin-dropped',
  /** Phaser -> React. Payload: CoinGone. La moneda del suelo se recogio o se perdio. */
  coinGone: 'coin-gone',
} as const;

/** Partida que se pide desde el menu de inicio (T-011): nueva (sin `resume`) o la guardada, con su aviso sin aceptar. */
export interface MatchRequest {
  resume?: MatchState;
  pendingUnlock?: UnlockInfo | null;
}

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
  /** Tope de nivel de la ronda (T-009). */
  cap: number;
  /** En el tope: ronda (desde 1) en la que sube, o null si ya no sube. */
  capRaisedAt: number | null;
  /** Lo que cuesta subir un nivel; null en el tope (el boton dice "Maximo"). */
  cost: number | null;
  /** Por cuanto se multiplica el costo de un canon: sus canones ("x3 = 225"). */
  multiplier: number;
  /** Si el saldo alcanza para subir. */
  affordable: boolean;
  /** Tramo de color de la medallita (cambia cada 5 niveles), para pintar la misma en el panel; null en nivel 1, que no lleva. */
  medalTier: number | null;
  /**
   * Donde se apoya el panel: sobre la cabeza de la planta, o bajo sus pies si arriba no cabe; si tampoco (un movil en
   * horizontal, en las filas de abajo), a la altura de su cuerpo, a su derecha o a su izquierda.
   */
  above: PagePoint;
  below: PagePoint;
  right: PagePoint;
  left: PagePoint;
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

/**
 * Algo nuevo que se puede usar desde esta ronda (T-009). Infundir fuego y hielo llegan juntos y se cuentan como uno.
 * `levelCap` es el tope de nivel nuevo de las disparadoras.
 */
export type UnlockItem =
  | { id: 'shooter' | 'levelUp' | 'fireMine' | 'iceMine' | 'infuse' | 'fuse' }
  | { id: 'levelCap'; level: number };

/** Aviso de lo desbloqueado al empezar una ronda (T-009). Sale de `roundUnlocks` en core. */
export interface UnlockInfo {
  /** Ronda, desde 1. */
  round: number;
  items: UnlockItem[];
}

/** Color de la ficha de informacion (T-010): el de la planta, su elemento o el enemigo. */
export type InfoTone = 'plant' | 'fire' | 'ice' | 'worm' | 'armored' | 'spitter' | 'creeper';

/** Una fila de datos de la ficha: "Mordisco 57,5 (cada 1 s)". */
export interface InfoStat {
  label: string;
  value: string;
  /** Aclaracion en pequeno, o nada. */
  note?: string;
}

/** Estado del momento en la ficha (quemado, frenado, acelerado, contando...). */
export interface InfoTag {
  text: string;
  tone: 'fire' | 'ice' | 'haste' | 'alert' | 'calm';
}

/**
 * Ficha de informacion de una planta, una mina o un enemigo (T-010). La arma la escena con los datos del estado
 * (`view/entityInfo.ts`) y la foto sale de sus texturas (`view/portrait.ts`); React solo la pinta.
 */
export interface EntityInfo {
  /** Quien es ("planta:2:3", "enemigo:17"): cambia al abrir otra. */
  id: string;
  tone: InfoTone;
  title: string;
  /** Bajo el nombre: "2 cañones fusionados", "Jefe del mundo 1"... */
  subtitle: string;
  /** Nivel, con el tramo de su medallita (null en nivel 1) y una nota ("Tope 5"); null si no tiene (minas y Creeper). */
  level: { value: number; medalTier: number | null; note: string | null } | null;
  /** Vida que le queda y la llena, en enteros. */
  hp: { current: number; max: number };
  stats: InfoStat[];
  tags: InfoTag[];
  /** Como funciona, en una o dos frases. */
  about: string;
  /** Foto (data URL de una imagen PNG). */
  portrait: string;
}

/** Coordenadas DOM de pagina; la escena las traduce a coordenadas del juego. */
export interface PagePoint {
  pageX: number;
  pageY: number;
}

/** Lo que un tour puede iluminar en el tablero (T-013), con forma de elipse: casillas, plantas, minas y su alcance. */
export type TourSpotId =
  | 'sowCell'
  | 'mineCell'
  | 'shooter'
  | 'infusable'
  | 'mine'
  | 'mineTarget'
  | 'fuseFrom'
  | 'fuseTo'
  | 'fireMine'
  | 'fireBlast'
  | 'iceMine'
  | 'iceBlast';

/** Zonas del tablero que un tour ilumina con su contorno (T-013): el carril de una disparadora y el borde por donde se cuelan. */
export type TourAreaId = 'shooterLane' | 'exit';

/** Elipse en coordenadas de la pagina: centro y radios. */
export interface TourSpot {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/**
 * Lo que se puede senalar ahora mismo en el tablero (T-013). Lo elige `tourCells` (`view/tourSpots.ts`) con las reglas;
 * la escena solo lo pasa a la pagina. Lo que no hay (sin planta, sin par para fusionar...) no viene.
 */
export interface TourBoard {
  spots: Partial<Record<TourSpotId, TourSpot>>;
  /** Contornos (las esquinas, en orden). */
  areas: Partial<Record<TourAreaId, PagePoint[]>>;
}

/** Dibujos de los bocadillos del tour (T-013): plantas, minas y el gusano, recortados (data URL de una imagen PNG). */
export type TourArtKey = 'shooter' | 'shooter2' | 'shooterFire' | 'shooterIce' | 'fireMine' | 'fireMineArmed' | 'iceMine' | 'iceMineArmed' | 'worm';
export type TourArt = Record<TourArtKey, string>;

/** Algo que acaba de hacer el jugador y que un tour puede estar ensenando (T-013). */
export type PlayerAction =
  | { type: 'sow'; card: CardId }
  | { type: 'infuse'; element: ElementType; withMine: boolean }
  | { type: 'pick' }
  /** `level`: el nivel al que llega (en los que dan premio suena distinto). */
  | { type: 'levelUp'; level: number }
  | { type: 'fuse' };

/** Moneda en el suelo que ya se puede recoger (T-013): donde esta en la pagina y cuanto mide. */
export interface DroppedCoin {
  id: number;
  at: PagePoint;
  /** Diametro en pixeles de la pagina. */
  size: number;
}

export interface CoinGone {
  id: number;
  /** Se recogio (si no, se perdio en el suelo). */
  collected: boolean;
}
