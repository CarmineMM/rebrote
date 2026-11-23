import * as Phaser from 'phaser';
import type { BossKind } from './core/combat';
import type { CardId, MatchState } from './core/match';
import type { OutbreakId } from './core/outbreaks';
import type { ElementType } from './core/plants';
import type { CarriedPower, PowerBlocker, PowerId } from './core/powers';
import type { RoundPhase } from './core/rounds';
import type { SeedPayout } from './core/seeds';

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
  /** Phaser -> React. Payload: WinInfo. Superada la ultima ronda, la del jefe (T-008); React muestra la victoria. */
  matchWon: 'match-won',
  /**
   * Phaser -> React. Payload: BossInfo | null. Vida y fase del Creeper (T-008) para su barra. Solo se manda si cambia.
   * Al derrotarlo llega con la vida a 0; null cuando no hay jefe.
   */
  bossChanged: 'boss-changed',
  /**
   * Phaser -> React. Payload: OverloadInfo | null. La barra de sobrecarga del brote 4 (T-042): lo llena que esta y si esta
   * encendida. Null en un brote sin sobrecarga. Solo se manda si cambia (la barra, en pasos de un enemigo).
   */
  overloadChanged: 'overload-changed',
  /**
   * Phaser -> React. Payload: RoundInfo. Ronda en curso (T-007): numero, fase, cuenta atras de la preparacion, cartas
   * de la bandeja y aviso. Solo se manda si algo cambia (en la preparacion, cada segundo).
   */
  roundChanged: 'round-changed',
  /**
   * Phaser -> React. Payload: PlantPanel | null. Disparadora seleccionada con un clic (T-003): su nivel, lo que cuesta
   * el siguiente y donde esta en la pagina, para pintar el panel de subir de nivel junto a ella. Desde T-046, tambien lo
   * que devuelve arrancarla, y un muro seleccionado para arrancarlo. Null al cerrarlo.
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
  /** React -> Phaser. Payload: posicion del puntero mientras arrastra la carta o el poder (T-021) desde el HUD (PagePoint). */
  cardDragged: 'card-dragged',
  /** React -> Phaser. Payload: posicion donde suelta la carta o el poder (T-021) (PagePoint). */
  cardDropped: 'card-dropped',
  /**
   * Phaser -> React. Payload: PowerInfo[]. Poderes que lleva la partida (T-021), con sus cargas y si ahora se pueden usar,
   * para el panel izquierdo. Vacio: sin panel. Solo se manda si cambia.
   */
  powersChanged: 'powers-changed',
  /** Phaser -> React. Payload: poder elegido para apuntarlo en el tablero (PowerId | null). */
  powerSelected: 'power-selected',
  /**
   * React -> Phaser. Payload: poder que el jugador toma del panel (PowerId). Tomar el que ya estaba elegido lo suelta sin
   * gastarlo. Se lanza arrastrandolo al tablero o tocando despues una casilla, como una carta.
   */
  powerPicked: 'power-picked',
  /** React -> Phaser. Sin payload: soltar la carta elegida o cerrar el panel de la planta seleccionada (Esc). */
  selectionCancelled: 'selection-cancelled',
  /** React -> Phaser. Sin payload: subir un nivel la disparadora seleccionada (boton del panel). */
  levelUpRequested: 'level-up-requested',
  /**
   * React -> Phaser. Sin payload: arrancar la disparadora o el muro seleccionados (T-046). El panel lo manda al segundo
   * toque del boton, el que confirma.
   */
  uprootRequested: 'uproot-requested',
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
  /**
   * React -> Phaser. Payload: MenuPlace (sin el, la portada). Volver al menu de inicio (T-011): el tablero guarda la
   * partida y deja paso a la escena de portada, que arranca ya en la portada o en el Invernadero (T-019).
   */
  exitRequested: 'exit-requested',
  /**
   * React -> Phaser. Payload: MenuPlace. Fuera de la partida, el jugador pasa de la portada al Invernadero o al reves
   * (T-019): la escena de portada cambia la batalla por el jardin de sus plantas, o al reves. Si ya esta ahi, no hace nada.
   */
  menuPlaceChanged: 'menu-place-changed',
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
  /**
   * Phaser -> React. Payload: RouteArt. El jefe de cada brote recortado sobre transparente, compuesto con sus texturas,
   * para los lugares de la ruta de brotes (T-019). Lo manda la portada al arrancar y al pedirle el estado.
   */
  routeArt: 'route-art',
  /**
   * Phaser -> React. Payload: NurseryArt. La disparadora de cada nivel base (T-023), compuesta con sus texturas, para la
   * pantalla de las plantas del Invernadero. Lo manda la portada con `routeArt`.
   */
  nurseryArt: 'nursery-art',
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

/**
 * Donde se esta fuera de la partida (T-019): la portada, con la batalla de Creeper, o el Invernadero, con el jardin de
 * las plantas que el jugador ya tiene y sin enemigos.
 */
export type MenuPlace = 'cover' | 'greenhouse';

/** Partida que se pide desde el menu de inicio (T-011): nueva (sin `resume`) o la guardada, con su aviso sin aceptar. */
export interface MatchRequest {
  resume?: MatchState;
  /** Brote de la partida nueva (T-018); sin el, el primero. Una guardada ya lleva el suyo. */
  outbreak?: OutbreakId;
  /**
   * Poderes de la partida nueva (T-021) con su nivel (T-022): los comprados que se eligieron antes del brote; sin ellos,
   * ninguno. En desarrollo, `?poderes=`.
   */
  loadout?: CarriedPower[];
  /**
   * Nivel con el que nacen las disparadoras de la partida nueva (T-023): el nivel base comprado en el Invernadero; sin el,
   * el 1. En desarrollo, `?nivelbase=`. Una partida que se continua ya lleva el suyo.
   */
  baseLevel?: number;
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

/** Lo de subir de nivel en el panel (T-003). Sale de `levelUpOffer` en core. */
export interface LevelUpPanel {
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
}

/**
 * Panel de lo seleccionado (T-003): una disparadora o, desde T-046, un muro, que solo se puede arrancar (AR-08). Sale de
 * `levelUpOffer` y `uprootRefund` en core; la escena solo anade donde esta.
 */
export interface PlantPanel {
  /** Casilla de la planta ("carril:columna"): cambia al seleccionar otra. */
  id: string;
  subject: 'shooter' | 'wall';
  /** Nivel de la disparadora; 1 en un muro, que no tiene. */
  level: number;
  /** Tramo de color de la medallita (cambia cada 5 niveles), para pintar la misma en el panel; null en nivel 1, que no lleva. */
  medalTier: number | null;
  /**
   * Subir de nivel, o null si aqui no se puede: en un muro, o rejugando un brote con arrancar traido de uno posterior antes
   * de la ronda que deja subir (T-046, AR-10). Entonces el panel solo trae "Arrancar".
   */
  levelUp: LevelUpPanel | null;
  /** Lo que devuelve arrancarlo (T-046), o null si en esta partida aun no se puede arrancar. */
  uproot: number | null;
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
/** Semillas de una partida acabada (T-020): lo que se cobro, de donde sale, y el saldo del jugador ya con ello. */
export interface SeedSummary {
  payout: SeedPayout;
  balance: number;
}

export interface LossInfo {
  /** El Creeper cruzo el jardin (T-008): se pierde aunque queden vidas. */
  byBoss: boolean;
  seeds: SeedSummary;
}

export interface WinInfo {
  seeds: SeedSummary;
}

/** Barra del jefe (T-008). Sale del jefe del estado y de lo suyo en balance (`CREEPER`, `ELK_CLONER`). */
export interface BossInfo {
  /** Que jefe es (T-026): de el salen la cara de la barra y sus rotulos. */
  kind: BossKind;
  name: string;
  hp: number;
  maxHp: number;
  /** Fase 2 (Creeper): con la mitad de la vida o menos. */
  enraged: boolean;
  /** Umbrales de vida (fracciones) en los que salta de carril (Creeper): la barra los marca. Vacio si no salta. */
  jumpAt: number[];
  /**
   * Elk Cloner (T-026): versos que lleva desde el ultimo poema entero, cuantos hacen falta para el siguiente y si lo esta
   * anunciando. Null si el jefe no recita.
   */
  poem: { sung: number; every: number; warning: boolean } | null;
  /** Brain (T-039): si esta oculto (las plantas no le apuntan) o descubierto. Null si el jefe no se oculta. */
  hidden: boolean | null;
  /**
   * Morris (T-042): cada cuanto suelta ahora un gusano (MR-07) y si esta mordiendo algo, a media marcha (MR-06). Null si el
   * jefe no suelta gusanos.
   */
  brood: { everyMs: number; chewing: boolean } | null;
}

/**
 * La barra de sobrecarga (T-042) del brote 4: lo llena que esta (de 0 a 1, `overloadFill`) y si esta encendida
 * (`MatchState.overload`). Null en un brote sin sobrecarga: no hay barra.
 */
export interface OverloadInfo {
  fill: number;
  active: boolean;
  /** Donde se apaga (MR-04), para marcarlo en la barra. */
  offBelow: number;
}

/** Ronda en curso (T-007). Sale de `round` en el estado y de `rounds.ts` en core. */
export interface RoundInfo {
  /** Brote de la partida (T-018): de el salen su nombre ("Brote 1: Creeper") y sus tours. */
  outbreak: OutbreakId;
  /** Ronda en curso, desde 1 ("Ronda 3 de 10"). */
  number: number;
  /** Rondas del brote. */
  total: number;
  /** Ronda del combate contra el jefe (T-008), desde 1, o null si el brote no tiene. */
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
  /** Semillas que llevan las rondas superadas de la partida, sin cobrar (T-020): el menu de pausa las ensena. */
  seeds: number;
  /** Poderes que lleva la partida (T-021), con o sin cargas: de ellos salen sus tours. */
  powers: PowerId[];
}

/**
 * Algo nuevo que se puede usar desde esta ronda (T-009). Infundir fuego y hielo llegan juntos y se cuentan como uno.
 * `levelCap` es el tope de nivel nuevo de las disparadoras.
 */
export type UnlockItem =
  | { id: 'shooter' | 'levelUp' | 'fireMine' | 'iceMine' | 'infuse' | 'fuse' | 'shield' | 'shieldInfuse' | 'uproot' }
  | { id: 'levelCap'; level: number };

/** Aviso de lo desbloqueado al empezar una ronda (T-009). Sale de `roundUnlocks` en core. */
export interface UnlockInfo {
  /** Ronda, desde 1. */
  round: number;
  items: UnlockItem[];
}

/** Un poder del panel izquierdo (T-021): sus cargas y por que no se puede usar ahora (null si se puede). Sale de `powerBlocker`. */
export interface PowerInfo {
  id: PowerId;
  /** Su nivel (T-022): de el salen lo que hace y las cargas con que empezo. */
  level: number;
  charges: number;
  blocker: PowerBlocker | null;
}

/** Color de la ficha de informacion (T-010): el de la planta, su elemento o el enemigo. */
export type InfoTone =
  | 'plant'
  | 'fire'
  | 'ice'
  | 'shield'
  | 'worm'
  | 'armored'
  | 'spitter'
  | 'creeper'
  // Tropas del brote 2 (T-025): las copias van con el tono de su copion.
  | 'copycat'
  | 'copycatArmored'
  | 'copycatSpitter'
  | 'minstrel'
  // Elk Cloner (T-026): el oro de su cornamenta y su poema.
  | 'elkCloner'
  // Tropas del brote 3 (T-038).
  | 'lurker'
  | 'lurkerSpitter'
  | 'lurkerArmored'
  | 'skipper'
  // Brain, jefe del brote 3 (T-039).
  | 'brain'
  // Morris, jefe del brote 4 (T-042).
  | 'morris'
  // Muro de hielo del poder (T-021).
  | 'iceWall';

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
  /**
   * `nursery`: lo que viene del Invernadero, como el nivel base (T-023). `recruit`: una tropa que vuelve en otro brote con su
   * color (T-041, "Reclutado por Morris").
   */
  tone: 'fire' | 'ice' | 'haste' | 'alert' | 'calm' | 'nursery' | 'recruit';
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
  /** Lo que cuenta Boxer del virus de verdad (T-032, VT-04): solo los jefes; null en lo demas. */
  lore: string | null;
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
  | 'iceBlast'
  // Escudo (T-024): donde sembrar el muro, el muro sembrado y la disparadora que se puede infundir con escudo
  | 'wallCell'
  | 'wall'
  | 'shieldInfusable'
  // Infundir el escudo arrastrando un muro (T-037): el muro y la disparadora a la que se puede llevar
  | 'wallSource'
  | 'wallTarget'
  // Poderes (T-021): adonde llevar la disparadora al recolocarla, donde lanzar la granada (con su alcance) y donde poner el
  // muro de hielo (sus tres casillas)
  | 'relocateTo'
  | 'grenadeCell'
  | 'grenadeBlast'
  | 'iceWallCells';

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
export type TourArtKey =
  | 'shooter'
  | 'shooter2'
  | 'shooterFire'
  | 'shooterIce'
  | 'shooterShield'
  | 'fireMine'
  | 'fireMineArmed'
  | 'iceMine'
  | 'iceMineArmed'
  | 'wall'
  | 'spitter'
  | 'worm'
  // Poderes (T-021): la granada encendida y un bloque del muro de hielo.
  | 'grenade'
  | 'iceBlock';
export type TourArt = Record<TourArtKey, string>;

/** Jefe de cada brote recortado (data URL), por el nombre del brote (ver `routeArt`). Uno sin jefe aun (T-024) no viene. */
export type RouteArt = Readonly<Partial<Record<OutbreakId, string>>>;

/** Foto de la disparadora recien sembrada (data URL) por nivel base, del 1 al maximo (T-023; ver `nurseryArt`). */
export type NurseryArt = Readonly<Record<number, string>>;

/** Algo que acaba de hacer el jugador y que un tour puede estar ensenando (T-013). */
export type PlayerAction =
  | { type: 'sow'; card: CardId }
  /** `dragged`: infundio arrastrando una mina o un muro (T-024) sembrados, no con la carta. */
  | { type: 'infuse'; element: ElementType; dragged: boolean }
  | { type: 'pick' }
  /** `level`: el nivel al que llega (en los que dan premio suena distinto). */
  | { type: 'levelUp'; level: number }
  | { type: 'fuse' }
  /** Arranco una disparadora o un muro (T-046). */
  | { type: 'uproot' }
  /** Tomo un poder del panel (T-021). */
  | { type: 'powerPicked'; power: PowerId }
  /** Uso un poder (T-021): recoloco una disparadora, lanzo la granada o puso el muro de hielo. */
  | { type: 'power'; power: PowerId };

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
