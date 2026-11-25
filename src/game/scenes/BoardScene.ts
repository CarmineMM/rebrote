import * as Phaser from 'phaser';
import { actionCue, combatCues, grenadeTicks, mineTicks, roundCues } from '../audio/cues';
import { sfx } from '../audio/sfx';
import { panAt } from '../audio/voices';
import { BOARD, BRAIN, CREEPER, ECONOMY, ELK_CLONER, ENEMIES, ICE_WALL, LIMITS, MINE, OVERLOAD, SHIELD } from '../config/balance';
import { cellAt, cellCenter, type BoardPoint, type Cell } from '../core/board';
import { enemyMaxHp, enemyReward, isBoss, isDefeated, isEnraged, isHidden, overloadFill, poemWarning, spawnEnemy, stepCombat, type BossKind, type CombatEvent, type Enemy, type EnemyKind } from '../core/combat';
import { rollKillReward, stepIncome } from '../core/economy';
import {
  cardCost,
  cardElement,
  cardPlay,
  cardTap,
  createMatch,
  earn,
  fusePlants,
  fusedPlant,
  fusionBlocker,
  fusionTargets,
  iceAt,
  infuseWithElement,
  levelUpOffer,
  levelUpPlant,
  mineAt,
  elementDragBlocker,
  elementInfusion,
  elementInfusionTargets,
  plantAt,
  playCard,
  sownAt,
  uprootRefund,
  uprootSown,
  sownElement,
  sownMaxHp,
  wallAt,
  type CardId,
  type MatchState,
  type Mine,
  type Plant,
  type Wall,
} from '../core/match';
import {
  ICE_WALL_MAX_SPAN,
  grenadeAt,
  grenadeBlocker,
  iceWallBlocker,
  iceWallCellsIn,
  placeIceWall,
  powerBlocker,
  powerLevel,
  relocateBlocker,
  relocateSourceBlocker,
  relocatePlant,
  throwGrenade,
  type CarriedPower,
  type PowerId,
} from '../core/powers';
import { FIRST_OUTBREAK, hasOverload, outbreakScript, roundCount, type OutbreakId } from '../core/outbreaks';
import { plantMaxHp, type ElementType } from '../core/plants';
import { settleSeeds, type SeedPayout } from '../core/seeds';
import { NORMAL_SPEED, gameDelta, validSpeed, type GameSpeed } from '../core/speed';
import {
  availableCards,
  bossRoundIndex,
  broodEveryMs,
  carriedFeatures,
  createRound,
  infusableElements,
  infuseFeature,
  isBossPreparing,
  isBossRound,
  isUnlocked,
  isWon,
  levelCap,
  roundUnlocks,
  startAttack,
  stepRound,
  unlockRound,
  type RoundEvent,
} from '../core/rounds';
import {
  EventBus,
  GameEvents,
  type BossInfo,
  type OverloadInfo,
  type CardPreview,
  type LossInfo,
  type MenuPlace,
  type PagePoint,
  type PlantPanel,
  type PlayerAction,
  type PowerInfo,
  type RoundInfo,
  type SeedSummary,
  type TourArt,
  type TourBoard,
  type TourSpot,
  type UnlockInfo,
  type UnlockItem,
  type WinInfo,
} from '../EventBus';
import type { TitleSceneData } from './TitleScene';
import { createAmbience, type Ambience } from '../view/ambience';
import { BoardLabel, drawArea, drawCell, type LabelLine } from '../view/boardMarks';
import { BulletView } from '../view/bulletView';
import { bossShouts, createBossOmen, createEnemyView, type BossOmen } from '../view/bossView';
import { BrainView } from '../view/brainView';
import { MorrisView } from '../view/morrisView';
import { BugView } from '../view/bugView';
import { CreeperView, OMEN_LEAP_MS, bossLoadProgress } from '../view/creeperView';
import { ElkClonerView } from '../view/elkClonerView';
import { Effects } from '../view/effects';
import { enemyInfo, iceInfo, mineInfo, shooterInfo, wallInfo, type EntityInfoData } from '../view/entityInfo';
import { DRAG_LOOK, FusionDragView, carriedMine, carriedShooter, carriedWall, dragGround } from '../view/fusionDragView';
import { GrenadeView, grenadeFoot, grenadeScale } from '../view/grenadeView';
import { ICE_LOOK, IceBlockView, iceBlockScale } from '../view/iceWallView';
import { iceWear } from '../view/powerArt';
import { DEPTH, SCENERY, VIEW, entityDepth, perspective } from '../view/layout';
import { medalTier, showsMedal } from '../view/levelMedal';
import { MineView, mineAreaColor, mineScale } from '../view/mineView';
import { WallView, wallScale } from '../view/wallView';
import { PlantView, plantPlacement } from '../view/plantView';
import { cinematicCutouts, portraitUrl, type PortraitSubject } from '../view/portrait';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../view/quality';
import { SpitView } from '../view/spitView';
import { VerseView } from '../view/verseView';
import {
  GRENADE_SIZE,
  ICE_BLOCK_SIZE,
  MINE_SIZE,
  SHOOTER_SIZE,
  TEX,
  WALL_SIZE,
  iceBlockTexture,
  registerTextures,
  shooterTexture,
  mineTexture,
  wallTexture,
} from '../view/textures';
import { wallWear } from '../view/wallArt';
import { tourCells } from '../view/tourSpots';
import { WORM_LOOK, WormView, type EnemyView } from '../view/wormView';
import { formatAmount, text } from '../../i18n';
import { isOutbreakDefeated, playerProgress } from '../progress';
import { clearSave, writeSave } from '../save';
import { SCENES } from './keys';
import { FpsMeter, applyPostFx, fitCamera } from './sceneKit';

/** Solo aspecto y ritmo de las animaciones. Los numeros de juego viven en balance.ts. */
const LOOK = {
  highlightOk: 0xfff7d6,
  highlightBlocked: 0xff5a5f,
  /** Casilla de una disparadora que se puede infundir, del color del elemento. */
  highlightInfuse: { fire: 0xffa04d, ice: 0x6cc4ff, shield: 0xf0c27a },
  coinSize: 0.42,
  /** Altura a la que flota la moneda sobre el suelo, en anchos de casilla. */
  coinHover: 0.36,
  /** A partir de esta fraccion de su vida, la moneda soltada parpadea. */
  coinBlinkFrom: 0.7,
  /** Hacia donde vuelan las monedas cobradas: el saldo del HUD, medido desde la esquina superior derecha de la vista. */
  coinTargetFromCorner: { x: 150, y: 40 },
  /** Donde sale el aviso de vida perdida: en el camino, a la izquierda del cesped (casillas). */
  lifeLostX: -0.45,
  lifeLostText: { color: '#ff8fa3', stroke: '#5a0d1a' },
  /** Tiempo entre perder la ultima vida y la pantalla de derrota: deja ver como se cuela el gusano. */
  defeatDelayMs: 1100,
  /** Texto que salta sobre la planta al fusionar (y al recolocarla, T-021). */
  fusedText: { color: '#efffdf', stroke: '#24561c' },
  /** Lo que cura recolocar con nivel (T-022): verde hoja, poco despues de "¡Recolocada!". */
  healText: { color: '#b8ff8a', stroke: '#1d4a14' },
  healTextDelayMs: 260,
  /**
   * Poderes (T-021): casilla a la que apunta la granada y su alcance (rojo granada), las del muro de hielo (azul helado) y la
   * disparadora que se puede recolocar (dorada, como la seleccionada). El muro fantasma, mas transparente que la planta.
   */
  powerColors: { grenade: 0xff6a5a, iceWall: 0x9fe0ff, relocate: 0xffe36b },
  iceGhostAlpha: 0.45,
  /** La explosion de la granada sacude la camara algo mas que la mina. */
  grenadeShake: { ms: 240, intensity: 0.0055 },
  /** Casilla de la disparadora seleccionada para subirla de nivel (T-003): dorada, late despacio. */
  pickedColor: 0xffe36b,
  /** Donde se apoya el panel de nivel: sobre la cabeza y bajo los pies de la planta, en anchos de casilla. */
  panelAbove: 1.08,
  panelBelow: 0.14,
  /** Si no cabe ni encima ni debajo, a un lado de la planta: a la altura del cuerpo, en anchos de casilla. */
  panelSide: { x: 0.5, y: 0.5 },
  /** Al arrancar (T-046): la moneda sale cuando la planta ya asoma fuera de la tierra. */
  uprootCoinDelayMs: 160,
  /** Empieza el ataque de una ronda (T-007): aviso junto a los agujeros, en los colores de la corrupcion. */
  attackText: { color: '#b8ffd4', stroke: '#2b2034', fontSize: 44 },
  /** Ronda superada (T-007): texto en el centro del cesped. */
  clearedText: { color: '#fff6c0', stroke: '#24561c', fontSize: 48 },
  /**
   * Semillas que suma la ronda superada (T-020): debajo del texto de la ronda y algo despues, en el verde de las semillas
   * (el de la moneda es dorado).
   */
  seedsText: { color: '#b9f27c', stroke: '#2f4a12', fontSize: 34 },
  seedsBelow: 58,
  seedsDelayMs: 260,
  /** El premio de estreno de la ronda 1 del brote 1 (T-047): otra linea debajo, algo despues y con destellos. */
  bonusBelow: 116,
  bonusDelayMs: 620,
  bonusSparkles: 10,
  /** Partida ganada (T-007): tiempo de celebracion antes de que React muestre la victoria. */
  victoryDelayMs: 1600,
  /** Creeper (T-008): se escapa (en el camino) o lo derrotan (en el centro del cesped). */
  bossEscapedText: { color: '#ffd6df', stroke: '#5a0d1a', fontSize: 40 },
  /** Elk Cloner anuncia el poema entero (T-026): en dorado, en el centro del cesped. */
  poemText: { color: '#fff3b0', stroke: '#6a3a00', fontSize: 46 },
  /** La sobrecarga (T-042) se enciende: un rotulo rojo en el centro del cesped y un temblor corto. */
  overloadText: { color: '#ffd0d6', stroke: '#7a0d22', fontSize: 44 },
  overloadShake: { ms: 220, intensity: 0.004 },
  /** Copia que deja el Creeper al saltar: destello verde de "copiarse" sobre ella. */
  copyGlow: 0x39ff88,
  /** Doble clic (o doble toque) para abrir una ficha (T-010): tiempo maximo entre los dos y lo que se puede mover el puntero. */
  doubleTap: { ms: 450, distance: 30 },
  /**
   * Lo que ilumina un tour de ayuda (T-013), en anchos de casilla: una casilla (algo mayor que ella), el cuerpo de una
   * disparadora (centro sobre los pies y radios) y el de una mina. El borde por donde se cuelan los gusanos va del camino
   * (`fromX`) al borde del cesped.
   */
  tourSpot: {
    cell: 1.12,
    plant: { up: 0.42, rx: 0.58, ry: 0.66 },
    mine: { up: 0.22, rx: 0.5, ry: 0.44 },
    wall: { up: 0.42, rx: 0.62, ry: 0.62 },
    exitFromX: -0.85,
    /** Las tres casillas del muro de hielo (T-021): una elipse alta que las cubre. */
    iceWall: { rx: 0.62, ry: 1.62 },
  },
} as const;

/** Atajos de desarrollo para probar las rondas. */
const DEBUG = {
  /** Lo que da la tecla M. */
  coins: 500,
  /** Lo que sueltan las teclas J (un juglar) y K (un copion de cada tipo, por turnos) para probar las tropas de T-025. */
  minstrel: 'minstrel',
  copycats: ['copycat', 'copycatArmored', 'copycatSpitter'],
  /** Lo que sueltan las teclas L (un Lurker de cada tipo, por turnos) y S (un Skipper) para probar las de T-038. */
  lurkers: ['lurker', 'lurkerSpitter', 'lurkerArmored'],
  skipper: 'skipper',
} as const satisfies { coins: number; minstrel: EnemyKind; copycats: readonly EnemyKind[]; lurkers: readonly EnemyKind[]; skipper: EnemyKind };

/** Prueba de rendimiento en desarrollo (tecla H): el presupuesto de T-002, 20 plantas y 60 enemigos. */
const STRESS = {
  plantColumns: 4,
  enemies: 60,
  /** Los gusanos salen repartidos por la derecha del cesped y tardan unos segundos en llegar a las plantas. */
  fromX: 6,
  gap: 0.3,
  /** Mucha vida para que sigan en pantalla mientras se miden los fps. */
  hpFactor: 20,
} as const;

const cellKey = (cell: Cell) => `${cell.lane}:${cell.col}`;
const keyCell = (key: string): Cell => {
  const [lane, col] = key.split(':').map(Number);
  return { lane, col };
};
const sameCell = (a: Cell | null, b: Cell | null) => a !== null && b !== null && a.lane === b.lane && a.col === b.col;

/**
 * Planta (o mina, T-009, o muro, T-024) pulsada con el boton aun abajo: si el puntero se mueve lo bastante, empieza a
 * arrastrarse (T-006).
 */
interface PlantPress {
  /** Una disparadora (para fusionarla o seleccionarla) o un elemento sembrado, mina o muro (para infundir con el). */
  kind: 'plant' | 'element';
  cell: Cell;
  pointerId: number;
  x: number;
  y: number;
}

/**
 * Arrastre en curso de una planta para fusionarla con otra (T-006), o de una mina (T-009) o un muro (T-024) para infundir
 * una disparadora. Mientras dura, lo arrastrado sigue en su casilla.
 */
interface PlantDrag {
  kind: 'plant' | 'element';
  from: Cell;
  pointerId: number;
  /** Del punto pulsado a los pies de la planta, en anchos de casilla (ver `dragGround`). */
  grab: { x: number; y: number };
  view: FusionDragView;
  /** Casillas de las plantas sobre las que se puede soltar ahora mismo (fusionar o infundir). */
  targets: Cell[];
  /** Casilla bajo la planta arrastrada, si cae en el tablero. */
  over: Cell | null;
  /** Ancho de casilla de la ultima posicion valida (para cuando el puntero sale por encima del horizonte). */
  cellWidth: number;
}

/**
 * Disparadora en la mano para recolocarla con el poder (T-021). Mientras dura, sigue en su casilla medio transparente. Se
 * elige con un toque (y espera el toque en su destino) o se arrastra hasta el (`dragging`), como al fusionar.
 */
interface Relocation {
  from: Cell;
  view: FusionDragView;
  /** Del punto pulsado a sus pies, en anchos de casilla (ver `dragGround`); 0 tras elegirla con un toque. */
  grab: { x: number; y: number };
  cellWidth: number;
  /** Casilla bajo la planta que se lleva, si cae en el tablero. */
  over: Cell | null;
  /** Puntero que la tiene pulsada: si se mueve lo bastante, se arrastra. Null tras soltarla sin moverla. */
  pointerId: number | null;
  press: { x: number; y: number };
  dragging: boolean;
}

/**
 * Lo que se puede inspeccionar con doble clic (T-010): lo sembrado en una casilla (planta, mina, muro o, T-021, bloque de
 * hielo) o un enemigo.
 */
type InfoTarget = { kind: 'plant' | 'mine' | 'wall' | 'ice'; cell: Cell } | { kind: 'enemy'; id: number };

const infoKey = (target: InfoTarget) => (target.kind === 'enemy' ? `enemy:${target.id}` : `${target.kind}:${cellKey(target.cell)}`);

/** Datos con los que arranca la escena (ver createGame). */
export interface BoardSceneData {
  quality: QualityLevel;
  /** Partida a continuar: al cambiar el nivel grafico o el idioma, que recrean el juego, o al cargar la guardada (T-011). */
  resume?: MatchState;
  /** Brote de la partida nueva (T-018), si no se continua otra. Sin el, el primero. */
  outbreak?: OutbreakId;
  /** Aviso de lo desbloqueado que el jugador no habia aceptado en la partida guardada (T-011): vuelve a salir. */
  pendingUnlock?: UnlockInfo | null;
  /** Arrancar en pausa (por ejemplo, si se cambia la calidad desde el menu de pausa). */
  paused?: boolean;
  /**
   * Poderes de la partida nueva (T-021) con su nivel (T-022): los comprados que se eligieron antes del brote; sin ellos,
   * ninguno. En desarrollo, `?poderes=` en la direccion. Una partida que se continua ya lleva los suyos.
   */
  loadout?: CarriedPower[];
  /** Nivel base de la partida nueva (T-023): el comprado en el Invernadero; sin el, el 1. Una que se continua lleva el suyo. */
  baseLevel?: number;
}

/**
 * Tablero, siembra, moneda y combate. Las reglas viven en src/game/core/: aqui se avanza la partida,
 * se pinta lo que hay y se anima lo que paso (ADR-0008).
 */
export class BoardScene extends Phaser.Scene {
  private match!: MatchState;
  private selected: CardId | null = null;
  /** Casilla bajo el puntero (o bajo la carta arrastrada), si cae en el tablero. */
  private hoverCell: Cell | null = null;
  private highlight!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Image;
  private fx!: Effects;
  private ambience!: Ambience;
  private level: QualityLevel = 'medium';
  private quality: QualityProfile = QUALITY_PROFILES.medium;
  private resume: MatchState | undefined;
  /** Brote de la partida nueva, si no se continua otra (T-018). */
  private outbreak: OutbreakId = FIRST_OUTBREAK;
  private plantViews = new Map<string, PlantView>();
  /** Vistas de los enemigos por id: gusanos (`WormView`) y los jefes (`CreeperView`, T-008; `ElkClonerView`, T-026). */
  private wormViews = new Map<number, EnemyView>();
  /** Creeper preparandose a la derecha (T-008), mientras toca verlo. */
  private omen: BossOmen | null = null;
  /** La partida se perdio porque el Creeper cruzo el jardin (T-008). */
  private lostToBoss = false;
  /** Ultima barra del jefe enviada al HUD, para avisar solo cuando cambia. */
  private bossKey = '';
  /** Ultima barra de sobrecarga mandada al HUD (T-042). */
  private overloadKey = '';
  private lastBoss: BossInfo | null = null;
  private bulletViews = new Map<number, BulletView>();
  private mineViews = new Map<string, MineView>();
  /** Muros (T-024): el escudo sembrado solo. */
  private wallViews = new Map<string, WallView>();
  private spitViews = new Map<number, SpitView>();
  /** Versos de los juglares en vuelo (T-025). */
  private verseViews = new Map<number, VerseView>();
  /** Granadas del poder en vuelo o contando (T-021), por id. */
  private grenadeViews = new Map<number, GrenadeView>();
  /** Bloques del muro de hielo del poder (T-021), por casilla. */
  private iceViews = new Map<string, IceBlockView>();
  /** Poder elegido en el panel para apuntarlo en el tablero (T-021), o null. */
  private power: PowerId | null = null;
  /** Disparadora en la mano para recolocarla (T-021), o null. */
  private relocation: Relocation | null = null;
  /** Bloques fantasma del muro de hielo mientras se apunta (T-021). */
  private iceGhosts: Phaser.GameObjects.Image[] = [];
  /** Ultimo panel de poderes enviado al HUD, para avisar solo cuando cambia. */
  private powersKey = '';
  /** Poderes de la partida nueva (T-021): se guardan para "Jugar otra vez". */
  private loadout: CarriedPower[] | undefined;
  private baseLevel: number | undefined;
  /** Siguiente copion que suelta la tecla K en desarrollo (T-025). */
  private debugCopycat = 0;
  /** Que Lurker suelta la tecla L la proxima vez (T-038). */
  private debugLurker = 0;
  /** Rotulo sobre la disparadora a la que apunta una carta de elemento: lo que costaria infundirla o por que no se puede. */
  private cardLabel!: BoardLabel;
  /** Ultimo precio de infusion enviado al HUD, para avisar solo cuando cambia. */
  private previewKey = '';
  private press: PlantPress | null = null;
  private drag: PlantDrag | null = null;
  /** Ultimo toque sobre algo con ficha, para reconocer el doble clic (T-010). */
  private lastTap: { key: string; time: number; x: number; y: number } | null = null;
  /** Disparadora seleccionada con un clic para subirla de nivel (T-003), y su marca en el suelo. */
  private picked: Cell | null = null;
  private pickedMark!: Phaser.GameObjects.Graphics;
  /** Ultimo panel enviado al HUD, para avisar solo cuando cambia. */
  private panelKey = '';
  private cursor = 'default';
  /** Sin vidas: el combate se detiene y React muestra la derrota. */
  private defeated = false;
  /** Superada la ultima ronda (T-007): el combate se detiene y React muestra la victoria. */
  private won = false;
  /** Ultima ronda enviada al HUD, para avisar solo cuando cambia. */
  private roundKey = '';
  /** Medicion de fps en tiempo real (el reloj del juego se frena cuando va lento, no sirve para esto). */
  private readonly fps = new FpsMeter();
  /** Aviso sin aceptar de la partida cargada (T-011), para volver a sacarlo al crear la escena. */
  private restoredUnlock: UnlockInfo | null = null;
  /** Aviso de desbloqueo (T-009) que el jugador aun no acepto: se repite si el HUD pide el estado. */
  private pendingUnlock: UnlockInfo | null = null;
  /** Pausa pedida por el HUD. Phaser marca la escena como activa al terminar create(): se aplica despues. */
  private wantPaused = false;
  /**
   * Hay un tour de ayuda en pantalla (T-013, ADR-0012): la preparacion no descuenta y se le manda a React lo que puede
   * senalar. Lo dice React con `tourHold`, tambien al arrancar la escena (responde a `sceneReady`).
   */
  private tourHold = false;
  /**
   * Velocidad del juego (T-048): cuanto tiempo de juego trae cada fotograma a la ronda, al goteo y al combate. La guarda
   * React y la manda con `speedChanged`, tambien al arrancar la escena (responde a `sceneReady`), como `tourHold`.
   */
  private speed: GameSpeed = NORMAL_SPEED;
  /** Ultimo `tourBoard` enviado, para avisar solo cuando cambia. */
  private tourBoardKey = '';
  /** Monedas del suelo que ya se pueden recoger (T-013, pista de la moneda), por id: donde estan en el mundo y su tamano. */
  private coinSpots = new Map<number, { x: number; y: number; size: number }>();
  private coinSeq = 0;
  private created = false;

  constructor() {
    super('BoardScene');
  }

  init(data: Partial<BoardSceneData>): void {
    this.level = data.quality ?? 'medium';
    this.quality = QUALITY_PROFILES[this.level];
    this.resume = data.resume;
    this.outbreak = data.outbreak ?? FIRST_OUTBREAK;
    this.restoredUnlock = data.pendingUnlock ?? null;
    this.wantPaused = data.paused ?? false;
    this.loadout = data.loadout;
    this.baseLevel = data.baseLevel;
    this.created = false;
  }

  create(): void {
    // B-02 (T-018): una partida nueva empieza con el tablero vacio y el saldo inicial de su brote. Si su jefe ya estaba
    // vencido, sus semillas dan menos (T-020, C-03). Sus disparadoras nacen en el nivel base (T-023). Trae lo desbloqueado
    // en brotes posteriores ya vencidos (T-037, norma ES-03).
    if (this.resume) {
      this.match = this.resume;
    } else {
      const progress = playerProgress.read();
      const replay = isOutbreakDefeated(progress, this.outbreak);
      const carried = carriedFeatures(this.outbreak, progress.defeated);
      this.match = createMatch(undefined, 0, this.outbreak, replay, this.loadout, this.baseLevel, carried);
    }
    this.selected = null;
    this.hoverCell = null;
    this.defeated = false;
    this.won = false;
    this.roundKey = '';
    this.press = null;
    this.drag = null;
    this.lastTap = null;
    this.picked = null;
    this.panelKey = '';
    this.cursor = 'default';
    // Reiniciar la partida vuelve a pasar por aqui: nada de la anterior debe sobrevivir.
    this.plantViews = new Map();
    this.wormViews = new Map();
    this.bulletViews = new Map();
    this.mineViews = new Map();
    this.wallViews = new Map();
    this.spitViews = new Map();
    this.verseViews = new Map();
    this.grenadeViews = new Map();
    this.iceViews = new Map();
    this.power = null;
    this.relocation = null;
    this.powersKey = '';
    this.previewKey = '';
    this.omen = null;
    this.lostToBoss = false;
    this.bossKey = '';
    this.lastBoss = null;
    this.pendingUnlock = null;
    this.tourHold = false;
    this.speed = NORMAL_SPEED;
    this.tourBoardKey = '';
    this.coinSpots = new Map();

    registerTextures(this, this.quality.renderScale);
    this.fitView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitView, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitView, this));
    // Salir al menu o empezar otra partida: lo que sonaba en el jardin se calla (T-014).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => sfx.stopWorld());
    this.ambience = createAmbience(this, this.quality);
    applyPostFx(this, this.quality);
    this.createCursorFeedback();
    this.fx = new Effects(this, this.quality);
    this.cardLabel = new BoardLabel(this, this.fx);
    this.restoreEntities();
    this.syncOmen(false);

    this.bindPointer();
    this.bindHud();
    if (import.meta.env.DEV) this.bindDebugKeys();
    this.fps.reset();

    this.events.once(Phaser.Scenes.Events.CREATE, () => {
      this.created = true;
      this.applyPause(this.wantPaused);
    });

    // Lo que sale en la cinematica de la rebelion, al vencer a Creeper (T-049): recortado con las texturas del tablero.
    EventBus.emit(GameEvents.cinematicArt, cinematicCutouts(this));
    EventBus.emit(GameEvents.sceneReady, this.scene.key);
    // Partida nueva: aviso de lo que trae la ronda 1 (T-009). Una partida que se continua ya lo dio; una cargada (T-011)
    // vuelve a sacar el que no se habia aceptado.
    if (!this.resume) this.announceUnlocks(this.match.round.index);
    else this.pendingUnlock = this.restoredUnlock;
    this.emitState();
    // Una partida perdida (o ganada) que se recrea (por ejemplo, al cambiar la calidad) sigue igual.
    if (isDefeated(this.match)) this.enterDefeat(0);
    else if (isWon(this.match)) this.enterVictory(0);
    // Se guarda al empezar (T-011): una partida nueva sustituye a la guardada.
    else this.saveGame();
  }

  /** Lienzo y camara a la medida de la pantalla (ADR-0007, `fitCamera`). Las monedas del suelo cambian de sitio en la pagina. */
  private fitView(): void {
    fitCamera(this, this.quality.renderScale);
    this.coinSpots.forEach((_spot, id) => this.emitCoin(id));
  }

  /**
   * Congela la escena entera (temporizadores, tweens, particulas, input); se sigue viendo detras del menu.
   * Se aplica en el acto (`sys`), no en cola como `this.scene.pause()`: si la pausa se quita y se vuelve a poner
   * enseguida (aceptar un aviso de desbloqueo y que salga el siguiente, T-009), la cola leia un estado viejo y la escena
   * se quedaba en pausa sin nada abierto.
   */
  private applyPause(paused: boolean): void {
    this.wantPaused = paused;
    if (!this.created) return;
    // Un arrastre a medias no sobrevive a la pausa: la planta vuelve a su casilla (tambien la que se recoloca, T-021).
    if (paused) {
      this.cancelDrag();
      this.cancelRelocation();
    }
    if (paused && this.sys.isActive()) {
      this.sys.pause();
    } else if (!paused && this.sys.isPaused()) {
      this.sys.resume();
      // La pausa no cuenta como fotogramas lentos.
      this.fps.reset();
    }
  }

  /** Estado de la partida para continuarla en un juego nuevo (al cambiar el nivel grafico o el idioma). */
  snapshot(): MatchState {
    return this.match;
  }

  /**
   * Guarda la partida tal como esta (T-011, I-02), con el aviso de lo desbloqueado si aun no se acepto. Una partida
   * acabada no se guarda: al perder o ganar se borra (I-04).
   */
  private saveGame(): void {
    if (this.defeated || this.won) return;
    writeSave(this.match, this.pendingUnlock);
  }

  update(_time: number, delta: number): void {
    this.ambience.update(delta);
    this.drag?.view.update(delta);
    this.relocation?.view.update(delta);
    if (!this.defeated && !this.won) this.advance(delta);
    // El panel sigue a la planta aunque cambie la ventana (pantalla completa, giro del movil...).
    if (this.picked) this.emitPlantPanel();
    // Lo que senala un tour sigue a lo sembrado y a la ventana (T-013).
    if (this.tourHold) this.emitTourBoard();
    this.fps.tick();
  }

  /**
   * Recompensa por un enemigo eliminado en `at` (punto del tablero): la de su tipo (`ENEMIES[kind].reward`, T-009), o la de
   * una copia (T-025, `enemyReward`). La mayoria de las veces se cobra sola; a veces la moneda queda en el suelo. El que no
   * da nada (Creeper), nada.
   */
  rewardKill(at: BoardPoint, enemy: Pick<Enemy, 'kind' | 'clone'>, random?: () => number): void {
    const base = enemyReward(enemy);
    if (base <= 0) return;
    const reward = rollKillReward(base, random);
    if (reward.kind === 'auto') {
      this.credit(reward.amount, at);
    } else {
      this.spawnDroppedCoin(at, reward.amount);
    }
  }

  // -------------------------------------------------------------------------
  // Preparacion

  /** Al continuar una partida, vuelve a pintar plantas, minas, gusanos y balas donde estaban. */
  private restoreEntities(): void {
    this.match.plants.forEach((lane, laneIndex) =>
      lane.forEach((sown, col) => {
        if (sown?.kind === 'shooter') this.addPlantView({ lane: laneIndex, col }, sown, false);
        if (sown?.kind === 'mine') this.addMineView({ lane: laneIndex, col }, sown, false);
        if (sown?.kind === 'wall') this.addWallView({ lane: laneIndex, col }, sown, false);
        if (sown?.kind === 'ice') this.iceViews.set(cellKey({ lane: laneIndex, col }), new IceBlockView(this, this.fx, { lane: laneIndex, col }, sown, false));
      }),
    );
    this.match.grenades.forEach((grenade) => this.grenadeViews.set(grenade.id, new GrenadeView(this, this.fx, grenade, false)));
    this.match.enemies.forEach((enemy) => this.addWormView(enemy, false));
    this.match.bullets.forEach((bullet) => this.bulletViews.set(bullet.id, new BulletView(this, this.fx, bullet, false)));
    this.match.spits.forEach((spit) => this.spitViews.set(spit.id, new SpitView(this, this.fx, spit, false)));
    this.match.verses.forEach((verse) => this.verseViews.set(verse.id, new VerseView(this, this.fx, verse, false)));
  }

  private createCursorFeedback(): void {
    this.highlight = this.add.graphics().setDepth(DEPTH.highlight).setVisible(false);
    this.tweens.add({ targets: this.highlight, alpha: 0.55, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.pickedMark = this.add.graphics().setDepth(DEPTH.highlight).setVisible(false);
    this.tweens.add({ targets: this.pickedMark, alpha: 0.5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Planta fantasma: muestra donde quedara la disparadora antes de soltarla.
    this.ghost = this.add
      .image(0, 0, shooterTexture(1))
      .setOrigin(0.5, SHOOTER_SIZE.footY / SHOOTER_SIZE.height)
      .setAlpha(0.55)
      .setVisible(false);
    this.tweens.add({ targets: this.ghost, alpha: 0.3, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // Muro de hielo fantasma (T-021): un bloque por casilla, tantos como el muro mas largo (T-022).
    this.iceGhosts = Array.from({ length: ICE_WALL_MAX_SPAN }, () =>
      this.add
        .image(0, 0, iceBlockTexture(0))
        .setOrigin(ICE_BLOCK_SIZE.footX / ICE_BLOCK_SIZE.width, ICE_BLOCK_SIZE.footY / ICE_BLOCK_SIZE.height)
        .setAlpha(LOOK.iceGhostAlpha)
        .setVisible(false),
    );
  }

  private bindPointer(): void {
    this.input.mouse?.disableContextMenu();

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (this.drag) {
        if (pointer.id === this.drag.pointerId) this.moveDrag(pointer);
        return;
      }
      // Poderes (T-021): la planta que se recoloca sigue al puntero; la granada y el muro apuntan a la casilla del suelo.
      if (this.relocation) {
        this.moveRelocation(pointer);
        return;
      }
      if (this.power) {
        this.hover(this.cellAtScreen(pointer.worldX, pointer.worldY));
        this.setCursor(this.power === 'relocate' && this.plantCellAtScreen(pointer.worldX, pointer.worldY) ? 'grab' : 'pointer');
        return;
      }
      const press = this.press;
      if (press && pointer.id === press.pointerId) {
        if (!pointer.isDown) {
          this.press = null;
        } else if (
          (press.kind === 'element' || this.canDragPlants()) &&
          Phaser.Math.Distance.Between(press.x, press.y, pointer.worldX, pointer.worldY) >= DRAG_LOOK.startDistance
        ) {
          this.startDrag(pointer);
          return;
        }
      }
      this.hover(this.cardCellAt(pointer.worldX, pointer.worldY));
      this.setCursor(this.plantCursor(pointer.worldX, pointer.worldY));
    });
    this.input.on(Phaser.Input.Events.GAME_OUT, () => {
      if (!this.drag && !this.relocation) this.hover(null);
    });

    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (pointer.rightButtonDown()) {
          this.cancelDrag();
          this.cancelPower();
          this.select(null);
          this.pickPlant(null);
          return;
        }
        // Un clic sobre una moneda la recoge; no debe sembrar en la casilla de debajo.
        if (over.length > 0 || this.drag) return;
        // Con un poder elegido (T-021), el toque es para el: elegir la planta a recolocar, su destino o donde lanzarlo.
        if (this.power) {
          this.powerDown(pointer);
          return;
        }
        // Doble clic sobre una planta, una mina o un enemigo: su ficha (T-010). Con una carta elegida el clic la juega.
        if (this.checkDoubleTap(pointer)) return;
        // Sin carta elegida, pulsar una planta la prepara para arrastrarla (T-006) o, si se suelta sin moverla,
        // para seleccionarla (T-003). Pulsar una mina que espera la prepara para arrastrarla e infundir (T-009). Cada
        // gesto, solo si su ronda ya lo desbloqueo (T-007).
        const plantCell =
          this.canDragPlants() || this.canPickPlants() ? this.plantCellAtScreen(pointer.worldX, pointer.worldY) : null;
        if (plantCell) {
          this.press = { kind: 'plant', cell: plantCell, pointerId: pointer.id, x: pointer.worldX, y: pointer.worldY };
          return;
        }
        const elementCell = this.draggableElementAtScreen(pointer.worldX, pointer.worldY);
        if (elementCell) {
          this.press = { kind: 'element', cell: elementCell, pointerId: pointer.id, x: pointer.worldX, y: pointer.worldY };
          return;
        }
        // Un clic fuera de las plantas cierra el panel de nivel.
        this.pickPlant(null);
        this.tryPlay(this.cardCellAt(pointer.worldX, pointer.worldY));
      },
    );

    // Soltar dentro del lienzo o fuera de el (sobre el HUD, por ejemplo).
    const onUp = (pointer: Phaser.Input.Pointer, inside: boolean) => {
      const press = this.press;
      if (press?.pointerId === pointer.id) {
        this.press = null;
        // Pulsar y soltar una planta sin arrastrarla la selecciona (otra vez, la deselecciona). Un muro, igual, desde que se
        // puede arrancar (T-046, AR-08): su panel solo trae "Arrancar".
        const pickable =
          press.kind === 'plant'
            ? this.canPickPlants() && plantAt(this.match, press.cell) !== null
            : this.canPickWalls() && wallAt(this.match, press.cell) !== null;
        if (inside && pickable) this.pickPlant(sameCell(this.picked, press.cell) ? null : press.cell);
      }
      if (this.drag?.pointerId === pointer.id) this.dropDrag(pointer);
      if (this.relocation?.pointerId === pointer.id) this.releaseRelocation(pointer);
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => onUp(pointer, true));
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, (pointer: Phaser.Input.Pointer) => onUp(pointer, false));

    // Esc lo gestiona el HUD: cancela la carta elegida o abre el menu de pausa (que devuelve a su casilla una planta arrastrada).
  }

  private bindHud(): void {
    // En pausa o con la partida acabada la escena no atiende ordenes del HUD (los menus las tapan, pero por si acaso).
    const running = () => this.sys.isActive() && !this.defeated && !this.won;
    const onPicked = (card: CardId) => {
      // Una carta bloqueada no se ve en la bandeja (T-007), pero por si acaso.
      if (!running() || !availableCards(this.match).includes(card)) return;
      this.cancelDrag();
      // Tomar otra vez la elegida la suelta, como los inventos del panel izquierdo (T-045, SC-03).
      this.select(this.selected === card ? null : card);
    };
    const onCancelled = () => {
      this.cancelPower();
      this.select(null);
      this.pickPlant(null);
    };
    // Poderes (T-021): tomar uno del panel lo elige; tomar otra vez el elegido lo suelta sin gastarlo.
    const onPowerPicked = (power: PowerId) => {
      if (!running()) return;
      if (this.power === power) this.cancelPower();
      else this.selectPower(power);
    };
    const onLevelUp = () => running() && this.tryLevelUp();
    const onUproot = () => running() && this.tryUproot();
    const onAttack = () => {
      if (!running()) return;
      this.match = startAttack(this.match);
      this.emitRound();
    };
    const onDragged = (point: PagePoint) => {
      if (!running()) return;
      // Un poder arrastrado desde el panel (T-021) apunta a la casilla del suelo, como al moverlo sobre el tablero.
      if (this.power) this.hover(this.cellAtPage(point));
      else this.hover(this.cardCellAtPage(point));
    };
    const onDropped = (point: PagePoint) => {
      if (!running()) return;
      if (this.power) {
        this.powerDropped(point);
        return;
      }
      // Soltar la carta arrastrada donde se puede la juega; fuera del tablero o donde no se puede, la suelta (T-045,
      // SC-04). Un simple toque en la carta no llega aqui (`Card.tsx`).
      this.tryPlay(this.cardCellAtPage(point));
    };
    const onStateRequested = () => this.emitState();
    const onUnlockAccepted = (round: number) => {
      if (this.pendingUnlock?.round === round) this.pendingUnlock = null;
    };
    const onPause = (paused: boolean) => this.applyPause(paused);
    const onTourHold = (hold: boolean) => this.setTourHold(hold);
    const onSpeed = (speed: unknown) => {
      this.speed = validSpeed(speed);
    };
    // Partida nueva desde cero, del mismo brote: no continua la anterior (sin `resume`) y arranca sin pausa.
    const onRestart = () => this.scene.restart({ quality: this.level, outbreak: this.match.outbreak, loadout: this.loadout, baseLevel: this.match.baseLevel } satisfies BoardSceneData);
    // T-011: se guarda al ocultar o cerrar la pestana, y al salir al menu de inicio, que pasa a la portada.
    const onSave = () => this.saveGame();
    // T-019: la escena de portada arranca ya en el sitio al que se vuelve (la portada o, desde la victoria, el Invernadero).
    const onExit = (place?: MenuPlace) => {
      this.saveGame();
      this.scene.start(SCENES.title, { quality: this.level, place } satisfies TitleSceneData);
    };

    EventBus.on(GameEvents.cardPicked, onPicked);
    EventBus.on(GameEvents.powerPicked, onPowerPicked);
    EventBus.on(GameEvents.selectionCancelled, onCancelled);
    EventBus.on(GameEvents.levelUpRequested, onLevelUp);
    EventBus.on(GameEvents.uprootRequested, onUproot);
    EventBus.on(GameEvents.attackRequested, onAttack);
    EventBus.on(GameEvents.cardDragged, onDragged);
    EventBus.on(GameEvents.cardDropped, onDropped);
    EventBus.on(GameEvents.stateRequested, onStateRequested);
    EventBus.on(GameEvents.unlockAccepted, onUnlockAccepted);
    EventBus.on(GameEvents.pauseChanged, onPause);
    EventBus.on(GameEvents.tourHold, onTourHold);
    EventBus.on(GameEvents.speedChanged, onSpeed);
    EventBus.on(GameEvents.restartRequested, onRestart);
    EventBus.on(GameEvents.saveRequested, onSave);
    EventBus.on(GameEvents.exitRequested, onExit);

    const unbind = () => {
      EventBus.off(GameEvents.cardPicked, onPicked);
      EventBus.off(GameEvents.powerPicked, onPowerPicked);
      EventBus.off(GameEvents.selectionCancelled, onCancelled);
      EventBus.off(GameEvents.levelUpRequested, onLevelUp);
      EventBus.off(GameEvents.uprootRequested, onUproot);
      EventBus.off(GameEvents.attackRequested, onAttack);
      EventBus.off(GameEvents.cardDragged, onDragged);
      EventBus.off(GameEvents.cardDropped, onDropped);
      EventBus.off(GameEvents.stateRequested, onStateRequested);
      EventBus.off(GameEvents.unlockAccepted, onUnlockAccepted);
      EventBus.off(GameEvents.pauseChanged, onPause);
      EventBus.off(GameEvents.tourHold, onTourHold);
      EventBus.off(GameEvents.speedChanged, onSpeed);
      EventBus.off(GameEvents.restartRequested, onRestart);
      EventBus.off(GameEvents.saveRequested, onSave);
      EventBus.off(GameEvents.exitRequested, onExit);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbind);
    this.events.once(Phaser.Scenes.Events.DESTROY, unbind);
  }

  /** Atajos solo en desarrollo. */
  private bindDebugKeys(): void {
    // H: prueba de rendimiento de T-002 (medir con "Mostrar FPS" en Ajustes).
    this.input.keyboard?.on('keydown-H', () => this.stressTest());
    // N: salta a la preparacion de la ronda siguiente; M: da moneda (T-007, para probar las rondas).
    this.input.keyboard?.on('keydown-N', () => this.skipRound());
    this.input.keyboard?.on('keydown-M', () => !this.defeated && !this.won && this.credit(DEBUG.coins));
    // J: suelta un juglar; K: un copion (gusano, acorazado y escupidor, por turnos), en el carril del puntero (T-025).
    this.input.keyboard?.on('keydown-J', () => this.debugSpawn(DEBUG.minstrel));
    this.input.keyboard?.on('keydown-K', () => {
      this.debugSpawn(DEBUG.copycats[this.debugCopycat]);
      this.debugCopycat = (this.debugCopycat + 1) % DEBUG.copycats.length;
    });
    // L: suelta un Lurker (base, escupidor y acorazado, por turnos); S: un Skipper, en el carril del puntero (T-038).
    this.input.keyboard?.on('keydown-L', () => {
      this.debugSpawn(DEBUG.lurkers[this.debugLurker]);
      this.debugLurker = (this.debugLurker + 1) % DEBUG.lurkers.length;
    });
    this.input.keyboard?.on('keydown-S', () => this.debugSpawn(DEBUG.skipper));
  }

  /** Saca un enemigo de `kind` por el agujero del carril del puntero (el del centro si no esta sobre el tablero). */
  private debugSpawn(kind: EnemyKind): void {
    if (this.defeated || this.won) return;
    const pointer = this.input.activePointer;
    const lane = this.cellAtScreen(pointer.worldX, pointer.worldY)?.lane ?? Math.floor(BOARD.lanes / 2);
    this.match = spawnEnemy(this.match, kind, lane, SCENERY.holeX);
    this.addWormView(this.match.enemies[this.match.enemies.length - 1], true);
  }

  /** Pasa a la preparacion de la ronda siguiente sin esperar; los enemigos que hubiera siguen ahi. */
  private skipRound(): void {
    const next = this.match.round.index + 1;
    if (this.defeated || this.won || next >= roundCount(this.match.outbreak)) return;
    this.match = { ...this.match, round: createRound(this.match.outbreak, next) };
    this.cancelDrag();
    this.announceUnlocks(next);
    this.emitRound();
    this.refreshHighlight();
  }

  /** Siembra gratis las 4 primeras columnas (20 plantas) y suelta 60 gusanos con mucha vida. */
  private stressTest(): void {
    if (this.defeated || this.won) return;
    // Siembra en casillas que un arrastre a medias daria por vacias.
    this.cancelDrag();
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      for (let col = 0; col < STRESS.plantColumns; col++) {
        const cell = { lane, col };
        if (sownAt(this.match, cell)) continue;
        this.match = playCard(earn(this.match, cardCost('shooter')), 'shooter', cell);
        this.addPlantView(cell, plantAt(this.match, cell) as Plant, true);
      }
    }
    for (let i = 0; i < STRESS.enemies; i++) {
      const lane = i % BOARD.lanes;
      const x = STRESS.fromX + Math.floor(i / BOARD.lanes) * STRESS.gap;
      this.match = spawnEnemy(this.match, 'worm', lane, x, ENEMIES.worm.hp * STRESS.hpFactor);
      this.addWormView(this.match.enemies[this.match.enemies.length - 1], true);
    }
    this.refreshHighlight();
  }

  // -------------------------------------------------------------------------
  // Combate

  /**
   * Avanza la partida: la ronda cuenta su preparacion y saca sus enemigos (T-007), cae el goteo de moneda (solo durante el
   * ataque, T-010), se mueve el combate, se animan los eventos y se recolocan las vistas.
   */
  private advance(realDelta: number): void {
    // A la velocidad elegida (T-048), cada fotograma trae mas tiempo de juego. Solo a las reglas (VJ-01): la preparacion
    // tambien (VJ-02), pero las animaciones de cada evento, el decorado y las monedas del suelo siguen en tiempo real.
    const delta = gameDelta(realDelta, this.speed);
    // Con un tour de ayuda en pantalla (T-013) la preparacion no descuenta: en ella no hay enemigos, asi que no hay nada
    // mas que parar. "¡Que vengan!" sigue adelantando el ataque.
    const holding = this.tourHold && this.match.round.phase === 'prep';
    const round = stepRound(this.match, holding ? 0 : delta, SCENERY.holeX);
    this.match = round.state;
    this.showSpawned(round.spawned);
    round.events.forEach((event) => this.showRoundEvent(event));
    sfx.playCues(roundCues(round.events, roundCount(this.match.outbreak)));

    const income = stepIncome(this.match, delta);
    this.match = income.state;
    if (income.earned > 0) this.balanceGained();

    const livesBefore = this.match.lives;
    const before = this.match;
    const { state, events } = stepCombat(this.match, delta);
    this.match = state;
    events.forEach((event) => this.showEvent(event));
    // Lo que suena (T-014) lo deciden las reglas de `cues.ts`: un disparo por planta, sin repetir lo que ya suena.
    sfx.playCues(combatCues(events, before));
    sfx.playCues(mineTicks(before, this.match));
    sfx.playCues(grenadeTicks(before, this.match));

    for (const enemy of this.match.enemies) {
      const view = this.wormViews.get(enemy.id);
      view?.sync(enemy);
      // La sobrecarga (T-042): mientras dura, las tropas llevan las rayas del acelerado.
      view?.rush?.(this.match.overload);
    }
    for (const bullet of this.match.bullets) this.bulletViews.get(bullet.id)?.sync(bullet);
    for (const spit of this.match.spits) this.spitViews.get(spit.id)?.sync(spit);
    for (const verse of this.match.verses) this.verseViews.get(verse.id)?.sync(verse);
    this.mineViews.forEach((view, key) => {
      const mine = mineAt(this.match, keyCell(key));
      if (mine) view.sync(mine);
    });
    this.wallViews.forEach((view, key) => {
      const wall = wallAt(this.match, keyCell(key));
      if (wall) view.sync(wall);
    });
    // Poderes (T-021): las granadas en vuelo o contando y los bloques del muro de hielo que se gastan y se derriten.
    for (const grenade of this.match.grenades) this.grenadeViews.get(grenade.id)?.sync(grenade);
    this.iceViews.forEach((view, key) => {
      const block = iceAt(this.match, keyCell(key));
      if (block) view.sync(block);
    });
    // El poder elegido puede dejar de poderse usar (acaba el ataque: la granada y el muro, solo en el, O-07).
    if (this.power && powerBlocker(this.match, this.power)) this.cancelPower();
    this.emitPowers();
    if (this.match.lives !== livesBefore) this.emitLives();
    this.syncOmen(true);
    this.emitRound();
    this.emitBoss();
    this.emitOverload();
    if (isDefeated(this.match)) this.enterDefeat(LOOK.defeatDelayMs);
  }

  /**
   * Enemigos que acaban de salir por su agujero. El Creeper (T-008) salta desde donde se preparaba y sale del suelo al
   * caer; a los acelerados de las rondas 8 y 9 les llega un chispazo suyo.
   */
  private showSpawned(spawned: readonly Enemy[]): void {
    for (const enemy of spawned) {
      if (isBoss(enemy.kind) && this.omen) {
        // El salto dura lo mismo en tiempo de juego (T-048): a mas velocidad, el jefe anda mas deprisa y tiene que caer antes.
        const leapMs = OMEN_LEAP_MS / this.speed;
        this.omen.leapTo({ x: enemy.x, y: enemy.lane + 0.64 }, leapMs);
        this.omen = null;
        this.addWormView(enemy, true, leapMs);
      } else {
        this.addWormView(enemy, true);
      }
    }
    if (this.omen) {
      const lanes = new Set(spawned.filter((enemy) => enemy.haste > 1).map((enemy) => enemy.lane));
      lanes.forEach((lane) => this.omen?.zap(lane));
    }
  }

  /**
   * Creeper preparandose (T-008): aparece cuando la ronda lo dice (con su entrada si `animate`), llena su barra y se va
   * si deja de tocar sin combate (por ejemplo, con el atajo de saltar de ronda).
   */
  private syncOmen(animate: boolean): void {
    const wanted = isBossPreparing(this.match);
    const boss = outbreakScript(this.match.outbreak).boss;
    if (wanted && !this.omen && boss) this.omen = createBossOmen(boss, this, this.fx, bossLoadProgress(this.match), animate);
    if (!wanted && this.omen) {
      this.omen.vanish();
      this.omen = null;
    }
    this.omen?.setProgress(bossLoadProgress(this.match));
  }

  /** Lo que pasa con las rondas (T-007). El aviso del concepto nuevo y la cuenta atras los pinta React. */
  private showRoundEvent(event: RoundEvent): void {
    switch (event.type) {
      case 'attackStarted':
        this.announceAttack();
        break;
      case 'roundCleared':
        if (event.index + 1 < roundCount(this.match.outbreak)) this.celebrate(text().board.roundCleared(event.index + 1), event.seeds, event.bonus);
        break;
      case 'won':
        this.enterVictory(LOOK.victoryDelayMs);
        break;
      case 'roundStarted':
        // Lo recien desbloqueado puede cambiar lo que pasa al soltar la carta elegida (infundir).
        this.refreshHighlight();
        this.announceUnlocks(event.index);
        // Cada ronda que empieza queda guardada (T-011), con su aviso sin aceptar.
        this.saveGame();
        break;
      case 'shout':
        // El jefe manda a su escolta (T-009): lo grita desde donde se prepara (Creeper, ademas, la acelera).
        this.omen?.command(bossShouts(this.bossKind())[event.shout]);
        break;
      case 'brooded':
        // Morris suelta un gusano (T-042, MR-07): se le desprende uno; el de verdad sale por el agujero (`showSpawned`).
        this.morrisView()?.brooded(event.lane);
        break;
    }
  }

  /**
   * Avisa al HUD de lo nuevo de la ronda `index` (T-009): React lo muestra en un aviso que hay que aceptar y deja el
   * juego en pausa mientras tanto. Una ronda sin nada nuevo no avisa.
   */
  private announceUnlocks(index: number): void {
    const items: UnlockItem[] = [];
    for (const unlock of roundUnlocks(this.match.outbreak, index)) {
      if (unlock.kind === 'levelCap') {
        items.push({ id: 'levelCap', level: unlock.level });
        continue;
      }
      const { feature } = unlock;
      const id = feature === 'fireInfuse' || feature === 'iceInfuse' ? 'infuse' : feature;
      if (!items.some((item) => item.id === id)) items.push({ id });
    }
    if (items.length === 0) return;
    // Un arrastre, una carta o un poder a medias no sobreviven al aviso, que pausa el juego.
    this.cancelDrag();
    this.cancelPower();
    this.select(null);
    this.pickPlant(null);
    this.pendingUnlock = { round: index + 1, items };
    EventBus.emit(GameEvents.unlocked, this.pendingUnlock);
  }

  /** Empieza el ataque: los agujeros brillan y salta "¡Ahí vienen!" junto a ellos. */
  private announceAttack(): void {
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      const hole = perspective.toScreen({ x: SCENERY.holeX, y: lane + 0.6 });
      const width = perspective.cellWidthAt({ x: SCENERY.holeX, y: lane + 0.6 });
      this.fx.glow(hole.x, hole.y, width * 1.2, 0x39ff88, DEPTH.highlight + 1, 520);
      this.fx.bits(hole.x, hole.y - width * 0.1, 4);
    }
    const at = perspective.toScreen({ x: BOARD.columns - 1.6, y: BOARD.lanes / 2 });
    this.fx.floatText(text().board.attack, at.x, at.y, LOOK.attackText);
  }

  /** Ronda superada: las plantas dan un saltito una tras otra, con destellos, y sale el texto en el centro. */
  private celebrate(label: string, seeds = 0, bonus = 0): void {
    this.plantViews.forEach((view, key) => {
      const { col } = keyCell(key);
      // Si muere antes de su turno, ya no salta.
      this.time.delayedCall(col * 70, () => this.plantViews.get(key) === view && view.beckon());
    });
    const center = perspective.toScreen({ x: BOARD.columns / 2, y: BOARD.lanes / 2 });
    this.fx.floatText(label, center.x, center.y, LOOK.clearedText);
    this.fx.sparkles(center.x, center.y, 18);
    // Lo que la ronda sumo a la partida (T-020), debajo y un poco despues, en el color de las semillas.
    if (seeds > 0) {
      this.time.delayedCall(LOOK.seedsDelayMs, () => this.fx.floatText(text().board.seedsEarned(formatAmount(seeds), seeds), center.x, center.y + LOOK.seedsBelow, LOOK.seedsText));
    }
    // El premio de estreno (T-047), en otra linea: se ve que es aparte de lo de la ronda.
    if (bonus > 0) {
      this.time.delayedCall(LOOK.bonusDelayMs, () => {
        const y = center.y + LOOK.bonusBelow;
        this.fx.floatText(text().board.openingBonus(formatAmount(bonus)), center.x, y, LOOK.seedsText);
        this.fx.sparkles(center.x, y, LOOK.bonusSparkles);
      });
    }
  }

  /** La regla ya esta aplicada en el estado; aqui solo se anima. */
  private showEvent(event: CombatEvent): void {
    switch (event.type) {
      case 'shot': {
        const plant = this.plantViews.get(cellKey(event.cell));
        plant?.recoil(event.cannon);
        this.bulletViews.set(event.bullet.id, new BulletView(this, this.fx, event.bullet, true, plant?.muzzleOffset(event.cannon)));
        break;
      }
      case 'hit':
        this.bulletViews.get(event.bulletId)?.impact();
        this.bulletViews.delete(event.bulletId);
        this.wormViews.get(event.enemyId)?.hit();
        break;
      case 'bulletGone':
        this.bulletViews.get(event.bulletId)?.vanish();
        this.bulletViews.delete(event.bulletId);
        break;
      case 'bite':
        this.wormViews.get(event.enemyId)?.chomp();
        this.sownHurt(event.cell);
        break;
      case 'spat':
        this.wormViews.get(event.enemyId)?.spat();
        this.spitViews.set(event.spit.id, new SpitView(this, this.fx, event.spit, true));
        break;
      case 'spitHit':
        this.spitViews.get(event.spitId)?.impact();
        this.spitViews.delete(event.spitId);
        this.sownHurt(event.cell);
        break;
      case 'spitGone':
        this.spitViews.get(event.spitId)?.vanish();
        this.spitViews.delete(event.spitId);
        break;
      case 'verseWarned':
        this.wormViews.get(event.enemyId)?.inhale();
        break;
      case 'sang':
        this.wormViews.get(event.enemyId)?.sang();
        this.verseViews.set(event.verse.id, new VerseView(this, this.fx, event.verse, true));
        break;
      case 'verseHit':
        // Lo que cruza reacciona como a un escupitajo; el escudo que lo para (F-05), ademas, deshace el verso.
        if (event.blocked) {
          this.verseViews.get(event.verseId)?.blocked();
          this.verseViews.delete(event.verseId);
        } else {
          this.verseViews.get(event.verseId)?.crossed();
        }
        this.sownHurt(event.cell);
        break;
      case 'verseGone':
        this.verseViews.get(event.verseId)?.vanish();
        this.verseViews.delete(event.verseId);
        break;
      case 'cloned':
        this.showClone(event.clone);
        break;
      case 'plantDestroyed': {
        const key = cellKey(event.cell);
        // Una disparadora, una mina (que asi no explota) o un muro (T-024).
        this.plantViews.get(key)?.die();
        this.plantViews.delete(key);
        this.mineViews.get(key)?.die();
        this.mineViews.delete(key);
        this.wallViews.get(key)?.die();
        this.wallViews.delete(key);
        // Un bloque del muro de hielo (T-021) roto a mordiscos o a disparos.
        this.iceViews.get(key)?.die();
        this.iceViews.delete(key);
        // La casilla vuelve a estar libre: si hay una carta elegida, el resaltado cambia.
        this.refreshHighlight();
        this.plantLostDuringDrag(event.cell);
        // La disparadora que se recolocaba ya no esta (T-021): la de la mano se deshace en hojas; el poder sigue elegido.
        if (this.relocation && sameCell(this.relocation.from, event.cell)) {
          this.relocation.view.poof();
          this.relocation = null;
        }
        // Si era la seleccionada, su panel se cierra.
        if (sameCell(this.picked, event.cell)) this.pickPlant(null);
        break;
      }
      case 'mineArmed':
        this.mineViews.get(cellKey(event.cell))?.arm();
        // Una mina que empieza a contar ya no se puede llevar a una disparadora (T-009): vuelve a su casilla.
        if (this.drag?.kind === 'element' && sameCell(this.drag.from, event.cell)) this.cancelDrag();
        break;
      case 'mineExploded': {
        const key = cellKey(event.cell);
        this.mineViews.get(key)?.explode();
        this.mineViews.delete(key);
        this.plantLostDuringDrag(event.cell);
        // La de fuego sacude a los alcanzados; la de hielo los deja tiesos y tiritando, con un temblor mas corto.
        if (event.element === 'fire') {
          event.enemyIds.forEach((id) => this.wormViews.get(id)?.blasted());
          this.cameras.main.shake(180, 0.0035);
        } else {
          event.enemyIds.forEach((id) => this.wormViews.get(id)?.frosted());
          this.cameras.main.shake(120, 0.002);
        }
        this.refreshHighlight();
        break;
      }
      case 'enemyKilled': {
        const view = this.wormViews.get(event.enemyId);
        view?.die();
        this.wormViews.delete(event.enemyId);
        if (view instanceof CreeperView || view instanceof ElkClonerView || view instanceof BrainView || view instanceof MorrisView) this.cameras.main.shake(380, 0.008);
        this.rewardKill(event.at, event);
        break;
      }
      case 'enemyEscaped':
        this.wormViews.get(event.enemyId)?.escape();
        this.wormViews.delete(event.enemyId);
        if (isBoss(event.kind)) this.showBossEscaped(event.lane);
        else this.showLifeLost(event.lane);
        break;
      case 'jumpWarned':
        this.creeperView(event.enemyId)?.warn();
        break;
      case 'jumped':
        this.creeperView(event.enemyId)?.takeoff();
        event.copies.forEach((copy) => this.showCopy(copy));
        break;
      case 'landed':
        this.creeperView(event.enemyId)?.land();
        if (event.cell) this.sownHurt(event.cell);
        this.cameras.main.shake(200, 0.005);
        break;
      case 'poemWarned':
        // Elk Cloner anuncia el poema entero (T-026, L-03): lo dice el, y sale el aviso en el centro del cesped.
        // El bocadillo dura lo que el aviso en tiempo de juego (T-048), a la velocidad de cuando empieza.
        this.elkView(event.enemyId)?.poemWarn(event.warnMs / this.speed);
        this.announcePoem();
        break;
      case 'poemRecited':
        this.elkView(event.enemyId)?.recite();
        event.verses.forEach((verse) => this.verseViews.set(verse.id, new VerseView(this, this.fx, verse, true)));
        this.cameras.main.shake(260, 0.006);
        break;
      // Poderes (T-021): la granada cae y explota (sacude a los alcanzados), y un bloque de hielo se derrite.
      case 'grenadeLanded':
        this.grenadeViews.get(event.grenadeId)?.land();
        break;
      case 'grenadeExploded':
        this.grenadeViews.get(event.grenadeId)?.explode();
        this.grenadeViews.delete(event.grenadeId);
        event.enemyIds.forEach((id) => this.wormViews.get(id)?.blasted());
        this.cameras.main.shake(LOOK.grenadeShake.ms, LOOK.grenadeShake.intensity);
        break;
      case 'iceMelted': {
        const key = cellKey(event.cell);
        this.iceViews.get(key)?.melt();
        this.iceViews.delete(key);
        this.refreshHighlight();
        this.refreshDragTargets();
        break;
      }
      // Tropas del brote 3 (T-038): el Skipper despega levantando tierra. Agacharse, el vuelo, caer y lo oculto salen del
      // estado en `BugView.sync`; aqui solo suenan (`combatCues`). Brain (T-039), ademas, hace temblar el suelo al caer y dice
      // algo al descubrirlo una mina y al volver a ocultarse.
      case 'hopped': {
        const view = this.wormViews.get(event.enemyId);
        if (view instanceof BugView || view instanceof BrainView) view.hopped();
        break;
      }
      case 'hopLanded':
        if (this.wormViews.get(event.enemyId) instanceof BrainView) this.cameras.main.shake(140, 0.003);
        break;
      case 'revealed': {
        const view = this.wormViews.get(event.enemyId);
        if (view instanceof BrainView) view.revealed(event.cause);
        break;
      }
      case 'overloaded':
        // La sobrecarga (T-042): al encenderse, su rotulo en el centro del cesped y un temblor; a Morris, si esta, le entra el
        // apuro. Las rayas de las tropas salen del estado (`rush`).
        if (event.active) {
          const at = perspective.toScreen({ x: BOARD.columns / 2, y: BOARD.lanes / 2 - 0.4 });
          this.fx.floatText(text().board.overload, at.x, at.y, LOOK.overloadText);
          this.cameras.main.shake(LOOK.overloadShake.ms, LOOK.overloadShake.intensity);
        }
        this.morrisView()?.overloaded(event.active);
        break;
      case 'concealed': {
        const view = this.wormViews.get(event.enemyId);
        if (view instanceof BrainView) view.concealed();
        break;
      }
    }
  }

  /** La vista de Morris (T-042), si esta en el tablero. */
  private morrisView(): MorrisView | null {
    const morris = this.match.enemies.find((enemy) => enemy.kind === 'morris');
    const view = morris ? this.wormViews.get(morris.id) : undefined;
    return view instanceof MorrisView ? view : null;
  }

  private elkView(id: number): ElkClonerView | null {
    const view = this.wormViews.get(id);
    return view instanceof ElkClonerView ? view : null;
  }

  /** Jefe del brote de la partida (el de Creeper si el brote aun no tuviera). */
  private bossKind(): BossKind {
    return outbreakScript(this.match.outbreak).boss ?? 'creeper';
  }

  /** Aviso del poema entero de Elk Cloner (T-026): un rotulo dorado en el centro del cesped, como el de la ronda. */
  private announcePoem(): void {
    const at = perspective.toScreen({ x: BOARD.columns / 2, y: BOARD.lanes / 2 - 0.4 });
    this.fx.floatText(text().board.poem, at.x, at.y, LOOK.poemText);
  }

  private creeperView(id: number): CreeperView | null {
    const view = this.wormViews.get(id);
    return view instanceof CreeperView ? view : null;
  }

  /** Copia que deja el Creeper al saltar (J-03): sale del suelo donde estaba el, con un destello verde de "copiarse". */
  private showCopy(copy: Enemy): void {
    this.addWormView(copy, true);
    const foot = { x: copy.x, y: copy.lane + 0.64 };
    const at = perspective.toScreen(foot);
    const width = perspective.cellWidthAt(foot);
    this.fx.glow(at.x, at.y - width * 0.3, width * 1.4, LOOK.copyGlow, entityDepth(at.y) + 1, 420);
    this.fx.ring(at.x, at.y - width * 0.3, width * 1.1, LOOK.copyGlow, entityDepth(at.y) + 1, 320);
    this.fx.bits(at.x, at.y - width * 0.3, 8);
  }

  /**
   * Copia que deja un copion al caer (T-025, F-01): sale de su disquete, del tamano del copion, y encoge al suyo con un
   * destello y un anillo verdes de "copiarse", como las del Creeper.
   */
  private showClone(clone: Enemy): void {
    this.addWormView(clone, false);
    const view = this.wormViews.get(clone.id);
    if (view instanceof WormView) view.popOut();
    const foot = { x: clone.x, y: clone.lane + WORM_LOOK.footY };
    const at = perspective.toScreen(foot);
    const width = perspective.cellWidthAt(foot);
    this.fx.glow(at.x, at.y - width * 0.25, width * 1.1, LOOK.copyGlow, entityDepth(at.y) + 1, 380);
    this.fx.ring(at.x, at.y - width * 0.25, width * 0.85, LOOK.copyGlow, entityDepth(at.y) + 1, 300);
    this.fx.bits(at.x, at.y - width * 0.25, 6);
  }

  /** El Creeper cruzo el jardin (T-008): la partida se pierde en el acto, con un temblor fuerte. */
  private showBossEscaped(lane: number): void {
    this.lostToBoss = true;
    const at = perspective.toScreen({ x: LOOK.lifeLostX, y: lane + 0.5 });
    this.fx.floatText(text().board.bossEscaped, at.x + 40, at.y - perspective.cellWidthAt({ x: LOOK.lifeLostX, y: lane + 0.5 }) * 0.8, LOOK.bossEscapedText);
    this.cameras.main.shake(420, 0.008);
  }

  /** Una planta, una mina o un muro pierde vida (mordisco o escupitajo): se encoge y destella; la planta amarillea. */
  private sownHurt(cell: Cell): void {
    const sown = sownAt(this.match, cell);
    this.plantViews.get(cellKey(cell))?.bitten(sown ? sown.hp / sownMaxHp(sown) : 0);
    this.mineViews.get(cellKey(cell))?.bitten();
    this.wallViews.get(cellKey(cell))?.bitten();
    this.iceViews.get(cellKey(cell))?.bitten();
  }

  private addWormView(enemy: Enemy, emerge: boolean, emergeDelayMs = 0): void {
    this.wormViews.set(enemy.id, createEnemyView(this, this.fx, enemy, emerge, emergeDelayMs));
  }

  private addPlantView(cell: Cell, plant: Plant, sprout: boolean): void {
    // Con nivel base comprado (T-023), la medallita lleva el brote del Invernadero.
    const view = new PlantView(this, this.fx, cell, plant.shooter, plant.hp / plantMaxHp(plant.shooter), sprout).setBaseLevel(this.match.baseLevel, sprout);
    this.plantViews.set(cellKey(cell), view);
  }

  private addMineView(cell: Cell, mine: Mine, sprout: boolean): void {
    this.mineViews.set(cellKey(cell), new MineView(this, this.fx, mine.element, cell, mine, sprout));
  }

  private addWallView(cell: Cell, wall: Wall, sprout: boolean): void {
    this.wallViews.set(cellKey(cell), new WallView(this, this.fx, cell, wall, sprout));
  }

  /** Un gusano se colo: aviso en el camino y un temblor corto. React quita el corazon. */
  private showLifeLost(lane: number): void {
    const at = perspective.toScreen({ x: LOOK.lifeLostX, y: lane + 0.5 });
    this.fx.floatText(text().board.lifeLost, at.x, at.y - perspective.cellWidthAt({ x: LOOK.lifeLostX, y: lane + 0.5 }) * 0.6, LOOK.lifeLostText);
    this.cameras.main.shake(220, 0.004);
  }

  /**
   * Sin vidas: el combate y el goteo se detienen al momento, las balas se apagan y los gusanos celebran.
   * Al cabo de `delayMs` React muestra la pantalla de derrota.
   */
  private enterDefeat(delayMs: number): void {
    if (this.defeated) return;
    this.defeated = true;
    this.cancelDrag();
    this.cancelPower();
    this.press = null;
    this.setCursor('default');
    this.select(null);
    this.pickPlant(null);
    this.clearProjectiles();
    this.wormViews.forEach((worm) => worm.cheer());
    // Se cobra lo poco que dan las rondas al perder (T-020) y despues se borra la guardada: perder obliga a empezar desde la
    // ronda 1 (I-04).
    const seeds = this.settle();
    // Una partida perdida que se recrea (al cambiar la calidad) no vuelve a sonar.
    if (delayMs > 0) sfx.play('defeat');
    const loss: LossInfo = { byBoss: this.lostToBoss, seeds };
    this.time.delayedCall(delayMs, () => EventBus.emit(GameEvents.matchLost, loss));
  }

  /**
   * Superada la ultima ronda (T-007): el combate y el goteo se detienen, las plantas celebran en oleada con hojas y
   * destellos por el cesped, y al cabo de `delayMs` React muestra la victoria (provisional hasta el jefe, T-008).
   */
  private enterVictory(delayMs: number): void {
    if (this.won) return;
    this.won = true;
    // El jefe del brote queda vencido para siempre (T-017) y se cobran las semillas (T-020); despues se borra la guardada.
    const seeds = this.settle();
    this.cancelDrag();
    this.cancelPower();
    this.press = null;
    this.setCursor('default');
    this.select(null);
    this.pickPlant(null);
    this.clearProjectiles();
    this.omen?.vanish();
    this.omen = null;
    this.emitRound();
    this.emitBoss();
    if (delayMs > 0) {
      sfx.play('victory');
      this.celebrate(isBossRound(this.match.outbreak, this.match.round.index) ? text().board.bossDown[this.bossKind()] : text().board.gardenSafe);
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(180 + i * 190, () => {
          const at = perspective.toScreen({ x: Phaser.Math.FloatBetween(1, BOARD.columns - 1), y: Phaser.Math.FloatBetween(0.5, BOARD.lanes - 0.5) });
          this.fx.sparkles(at.x, at.y, 10);
          this.fx.leaves(at.x, at.y, 6);
        });
      }
    }
    const win: WinInfo = { seeds };
    this.time.delayedCall(delayMs, () => EventBus.emit(GameEvents.matchWon, win));
  }

  /**
   * La partida acabo (T-020): apunta en ella lo que se cobra y, si aun no estaba cobrada, lo pasa al progreso permanente en
   * una sola escritura, con el jefe vencido si gano. Todo antes de borrar la partida guardada (I-04): si la pestana se cierra
   * justo ahora, no se pierde lo ganado, y no queda partida que cargar para cobrar dos veces. Una partida acabada que se
   * recrea (al cambiar la calidad o el idioma) ya trae su cobro: no paga otra vez.
   */
  private settle(): SeedSummary {
    const alreadyPaid = this.match.seeds.payout !== null;
    this.match = settleSeeds(this.match);
    const payout = this.match.seeds.payout as SeedPayout;
    const progress = alreadyPaid ? playerProgress.read() : playerProgress.recordMatchEnd(isWon(this.match) ? this.match.outbreak : null, payout.total);
    clearSave();
    return { payout, balance: progress.seeds };
  }

  /** Balas, escupitajos, versos y granadas (T-021) en vuelo se apagan (la partida acabo y ya no se mueven). */
  private clearProjectiles(): void {
    this.grenadeViews.forEach((grenade) => grenade.vanish());
    this.grenadeViews.clear();
    this.bulletViews.forEach((bullet) => bullet.vanish());
    this.bulletViews.clear();
    this.spitViews.forEach((spit) => spit.vanish());
    this.spitViews.clear();
    this.verseViews.forEach((verse) => verse.vanish());
    this.verseViews.clear();
  }

  // -------------------------------------------------------------------------
  // Puntero y casillas

  private cellAtScreen(x: number, y: number): Cell | null {
    const point = perspective.toBoard({ x, y });
    return point ? cellAt(point) : null;
  }

  /**
   * Casilla a la que apunta la carta elegida. Con un elemento, primero la disparadora que se ve bajo el puntero
   * (para infundirla aunque se apunte a su cabeza, que asoma sobre la casilla de detras); si no, la del suelo.
   */
  private cardCellAt(x: number, y: number): Cell | null {
    const element = this.selected ? cardElement(this.selected) : null;
    return (element && this.plantCellAtScreen(x, y)) || this.cellAtScreen(x, y);
  }

  /**
   * El canvas se escala con Scale.FIT y la camara amplia segun el nivel grafico:
   * coordenadas DOM -> pixeles del lienzo -> coordenadas de diseno (mundo).
   */
  private cardCellAtPage(point: PagePoint): Cell | null {
    this.scale.updateBounds();
    const world = this.cameras.main.getWorldPoint(this.scale.transformX(point.pageX), this.scale.transformY(point.pageY));
    return this.cardCellAt(world.x, world.y);
  }

  private select(card: CardId | null): void {
    // Tomar una carta suelta el poder elegido (T-021): los dos gestos no se mezclan.
    if (card) this.cancelPower();
    this.selected = card;
    // Tomar una carta cierra el panel de nivel: o se juega la carta o se sube la planta.
    if (card) this.pickPlant(null);
    this.refreshHighlight();
    EventBus.emit(GameEvents.selectionChanged, card);
  }

  private hover(cell: Cell | null): void {
    this.hoverCell = cell;
    this.refreshHighlight();
  }

  /**
   * Con una carta elegida, resalta la casilla a la que apunta y cuenta que pasara al soltar (las reglas son de
   * `cardPlay`):
   * - Sembrar: casilla clara con la planta, la mina o el muro fantasma (la mina, con el alcance de su explosion).
   * - Infundir: casilla del color del elemento y rotulo con el precio ("Infundir: x3 = 225"); el HUD muestra el mismo precio (D-04).
   * - No se puede: casilla roja, y sobre una disparadora, el motivo.
   */
  private refreshHighlight(): void {
    const card = this.selected;
    const cell = this.hoverCell;
    this.highlight.clear();
    for (const ghost of this.iceGhosts) ghost.setVisible(false);
    if (this.power) {
      this.refreshPowerHighlight();
      return;
    }
    if (!card || !cell) {
      this.highlight.setVisible(false);
      this.ghost.setVisible(false);
      this.cardLabel.hide();
      this.emitPreview(null);
      return;
    }
    const play = cardPlay(this.match, card, cell);
    const blocked = play.blocker !== null;
    const element = cardElement(card);
    const color = blocked
      ? LOOK.highlightBlocked
      : play.action === 'infuse' && element
        ? LOOK.highlightInfuse[element]
        : LOOK.highlightOk;
    drawCell(this.highlight, cell, color, 0.25, 4);
    this.highlight.setVisible(true);

    if (play.action === 'sow' && !blocked) {
      if (element && element !== 'shield') drawArea(this.highlight, cellCenter(cell), MINE.blastRadius, mineAreaColor(element), 0.1, 2);
      this.showGhost(cell, card);
    } else {
      this.ghost.setVisible(false);
    }

    const plant = play.action === 'infuse' ? plantAt(this.match, cell) : null;
    const view = plant ? this.plantViews.get(cellKey(cell)) : undefined;
    if (!plant || !view) {
      this.cardLabel.hide();
      this.emitPreview(null);
      return;
    }
    const price = play.multiplier > 1 ? `×${play.multiplier} = ${play.cost}` : `${play.cost}`;
    const unlocksAt = element ? unlockRound(this.match.outbreak, infuseFeature(element)) : null;
    const labels = text().board;
    const lines: LabelLine[] =
      play.blocker === 'locked'
        ? [{ text: unlocksAt === null ? labels.infuseLater : labels.infuseFrom(unlocksAt + 1), tone: 'blocked' }]
        : play.blocker === 'has-element'
          ? [{ text: labels.hasElement[plant.shooter.element ?? 'fire'], tone: 'blocked' }]
          : play.blocker === 'insufficient-funds'
            ? [
                { text: labels.infuse(price), tone: 'blocked' },
                { text: labels.noFunds, tone: 'blocked' },
              ]
            : [{ text: labels.infuse(price), tone: 'ok' }];
    const foot = view.foot();
    const { cellWidth } = plantPlacement(cell);
    this.cardLabel.show(`${cellKey(cell)}:${lines.map((l) => l.text).join('|')}`, lines, foot.x, foot.y - cellWidth * 1.12, cellWidth);
    this.emitPreview(
      play.blocker === 'has-element' || play.blocker === 'locked'
        ? null
        : { card, multiplier: play.multiplier, cost: play.cost, affordable: play.blocker !== 'insufficient-funds' },
    );
  }

  /** Planta, mina o muro fantasma: donde quedara lo que se siembra con `card`. */
  private showGhost(cell: Cell, card: CardId): void {
    const { screen, scale, cellWidth } = plantPlacement(cell);
    const element = cardElement(card);
    if (element === 'shield') {
      this.ghost.setTexture(wallTexture(0)).setOrigin(WALL_SIZE.footX / WALL_SIZE.width, WALL_SIZE.footY / WALL_SIZE.height).setScale(wallScale(cellWidth));
    } else if (element) {
      this.ghost.setTexture(mineTexture(element, false)).setOrigin(0.5, MINE_SIZE.footY / MINE_SIZE.height).setScale(mineScale(cellWidth));
    } else {
      this.ghost.setTexture(shooterTexture(1)).setOrigin(0.5, SHOOTER_SIZE.footY / SHOOTER_SIZE.height).setScale(scale);
    }
    this.ghost.setPosition(screen.x, screen.y).setDepth(entityDepth(screen.y)).setVisible(true);
  }

  /** Avisa al HUD del precio de infundir bajo la carta (D-04), solo si cambia. */
  private emitPreview(preview: CardPreview | null): void {
    const key = preview ? `${preview.card}:${preview.multiplier}:${preview.cost}:${preview.affordable}` : '';
    if (key === this.previewKey) return;
    this.previewKey = key;
    EventBus.emit(GameEvents.cardPreview, preview);
  }

  /**
   * Juega la carta elegida en la casilla si se puede (sembrar o infundir), cobra y suelta la carta. Fuera del tablero o
   * donde no se puede, la suelta sin cobrar (T-045, `cardTap`): en el movil no hay Esc ni boton derecho.
   */
  private tryPlay(cell: Cell | null): void {
    const card = this.selected;
    if (this.defeated || this.won || !card) return;
    if (!cell || cardTap(this.match, card, cell) === 'release') {
      this.select(null);
      return;
    }
    const { action } = cardPlay(this.match, card, cell);
    this.match = playCard(this.match, card, cell);
    const element = cardElement(card);
    const sown = sownAt(this.match, cell);
    if (action === 'infuse' && element) {
      this.plantViews.get(cellKey(cell))?.infuse(element);
    } else if (sown?.kind === 'mine') {
      this.addMineView(cell, sown, true);
    } else if (sown?.kind === 'wall') {
      this.addWallView(cell, sown, true);
    } else if (sown?.kind === 'shooter') {
      this.addPlantView(cell, sown, true);
    }
    this.select(null);
    this.emitBalance();
    this.emitAction(action === 'infuse' && element ? { type: 'infuse', element, dragged: false } : { type: 'sow', card }, cell);
  }

  // -------------------------------------------------------------------------
  // Fusionar por arrastre (T-006). Las reglas son de core (fusionBlocker, fusionTargets, fusePlants);
  // aqui se lleva el puntero y se anima.

  /** Las plantas se tocan (para arrastrarlas o seleccionarlas) sin carta ni poder elegido y con la partida en juego. */
  private canTouchPlants(): boolean {
    return !this.selected && !this.power && !this.defeated && !this.won && this.sys.isActive();
  }

  /** Arrastrar para fusionar, desde la ronda que lo desbloquea (T-007). */
  private canDragPlants(): boolean {
    return this.canTouchPlants() && isUnlocked(this.match, 'fuse');
  }

  /** Seleccionar para subir de nivel, desde la ronda que lo desbloquea (T-007). */
  private canPickPlants(): boolean {
    return this.canTouchPlants() && (isUnlocked(this.match, 'levelUp') || isUnlocked(this.match, 'uproot'));
  }

  /** Seleccionar un muro, para arrancarlo (T-046, AR-08). */
  private canPickWalls(): boolean {
    return this.canTouchPlants() && isUnlocked(this.match, 'uproot');
  }

  /**
   * Cursor sobre una planta: mano para arrastrarla, o dedo si solo se puede seleccionar. Sobre una mina (T-009) o un muro
   * (T-024) que se puede arrastrar, mano.
   */
  private plantCursor(x: number, y: number): string {
    const canDrag = this.canDragPlants();
    if ((canDrag || this.canPickPlants()) && this.plantCellAtScreen(x, y)) return canDrag ? 'grab' : 'pointer';
    return this.draggableElementAtScreen(x, y) ? 'grab' : 'default';
  }

  /**
   * Mina o muro bajo un punto de pantalla que se puede arrastrar ahora para infundir (T-009, T-024): sin carta elegida,
   * desde la ronda que desbloquea infundir su elemento y, la mina, mientras aun espera (no cuenta). Primero lo que se ve
   * ahi; si no, lo de la casilla bajo el punto.
   */
  private draggableElementAtScreen(x: number, y: number): Cell | null {
    if (!this.canTouchPlants()) return null;
    let found: Cell | null = null;
    let bestFootY = -Infinity;
    const views: Array<[string, MineView | WallView]> = [...this.mineViews, ...this.wallViews];
    for (const [key, view] of views) {
      const footY = view.foot().y;
      if (footY > bestFootY && view.contains(x, y)) {
        found = keyCell(key);
        bestFootY = footY;
      }
    }
    const cell = found ?? this.cellAtScreen(x, y);
    return cell && elementDragBlocker(this.match, cell) === null ? cell : null;
  }

  /**
   * Planta bajo un punto de pantalla. Primero la que se ve ahi (las de delante tapan a las de atras,
   * y la cabeza asoma sobre la casilla de detras); si no, la de la casilla bajo el punto.
   */
  private plantCellAtScreen(x: number, y: number): Cell | null {
    let best: string | null = null;
    let bestFootY = -Infinity;
    for (const [key, view] of this.plantViews) {
      const footY = view.foot().y;
      if (footY > bestFootY && view.contains(x, y)) {
        best = key;
        bestFootY = footY;
      }
    }
    if (best) return keyCell(best);
    const cell = this.cellAtScreen(x, y);
    return cell && plantAt(this.match, cell) ? cell : null;
  }

  private setCursor(cursor: string): void {
    if (cursor === this.cursor) return;
    this.cursor = cursor;
    this.input.setDefaultCursor(cursor);
  }

  /** Lo que se arrastra, en su casilla: la planta (T-006), la mina (T-009) o el muro (T-024). */
  private dragSource(drag: Pick<PlantDrag, 'kind' | 'from'>): PlantView | MineView | WallView | undefined {
    const key = cellKey(drag.from);
    return drag.kind === 'plant' ? this.plantViews.get(key) : (this.mineViews.get(key) ?? this.wallViews.get(key));
  }

  /** Destinos del arrastre ahora mismo: plantas con las que fusionar, o disparadoras que infundir con la mina o el muro. */
  private dragTargets(drag: Pick<PlantDrag, 'kind' | 'from'>): Cell[] {
    return drag.kind === 'plant' ? fusionTargets(this.match, drag.from) : elementInfusionTargets(this.match, drag.from);
  }

  /** Empieza el arrastre: la planta (o la mina) sale a la mano, sus destinos se marcan en verde y el resto se atenua. */
  private startDrag(pointer: Phaser.Input.Pointer): void {
    const press = this.press;
    this.press = null;
    if (!press) return;
    const kind = press.kind;
    const plant = kind === 'plant' ? plantAt(this.match, press.cell) : null;
    const carried = kind === 'element' && elementDragBlocker(this.match, press.cell) === null ? sownAt(this.match, press.cell) : null;
    const view = this.dragSource({ kind, from: press.cell });
    if ((!plant && !carried) || !view) return;
    // Arrastrar cierra el panel de nivel (de esta o de otra planta).
    this.pickPlant(null);

    const { cellWidth } = plantPlacement(press.cell);
    const foot = view.foot();
    const grab = { x: (foot.x - press.x) / cellWidth, y: (foot.y - press.y) / cellWidth };
    const targets = this.dragTargets({ kind, from: press.cell });
    const look = plant
      ? carriedShooter(plant.shooter)
      : carried?.kind === 'mine'
        ? carriedMine(carried.element)
        : carriedWall(wallWear((carried?.hp ?? SHIELD.wallHp) / SHIELD.wallHp));
    const dragView = new FusionDragView(this, this.fx, look, foot, cellWidth);
    this.drag = { kind, from: press.cell, pointerId: pointer.id, grab, view: dragView, targets, over: null, cellWidth };
    view.setLifted(true);
    this.markTargets(true);
    this.plantViews.forEach((other, key) => {
      if (targets.some((t) => cellKey(t) === key)) other.beckon();
    });
    this.hover(null);
    this.setCursor('grabbing');
    this.moveDrag(pointer);
  }

  /** Marca los destinos validos y atenua el resto de plantas (o lo deshace con `on` a false). */
  private markTargets(on: boolean): void {
    const drag = this.drag;
    if (on && drag) drag.view.showTargets(drag.targets);
    const from = drag ? cellKey(drag.from) : '';
    this.plantViews.forEach((view, key) => {
      view.setDimmed(on && key !== from && !drag?.targets.some((t) => cellKey(t) === key));
    });
  }

  private moveDrag(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag) return;
    const ground = dragGround({ x: pointer.worldX, y: pointer.worldY }, drag.grab, drag.cellWidth);
    drag.cellWidth = ground.cellWidth;
    drag.view.moveTo(ground);
    const over = ground.board ? cellAt(ground.board) : null;
    if (!sameCell(over, drag.over)) {
      drag.over = over;
      this.refreshDragHover();
    }
  }

  /** Marca la casilla bajo la planta arrastrada y cuenta que pasara al soltar (o por que no se puede). */
  private refreshDragHover(): void {
    const drag = this.drag;
    if (!drag) return;
    const to = drag.over;
    const toView = to ? this.plantViews.get(cellKey(to)) : undefined;
    if (!to || !toView) {
      // Casilla vacia o fuera del tablero: soltar ahi no hace nada.
      drag.view.hover(null, null);
      return;
    }
    if (drag.kind === 'element') {
      this.refreshElementDragHover(drag, to, toView.foot());
      return;
    }
    const blocker = fusionBlocker(this.match, drag.from, to);
    if (blocker === null) {
      const source = plantAt(this.match, drag.from) as Plant;
      const target = plantAt(this.match, to) as Plant;
      const result = fusedPlant(source, target).shooter;
      const lines: LabelLine[] = [{ text: text().board.fuse(result.cannons), tone: 'ok' }];
      // Aviso de perdida de nivel: el resultado se queda con el nivel mas bajo de las dos.
      if (source.shooter.level !== target.shooter.level) lines.push({ text: text().board.willBeLevel(result.level), tone: 'warn' });
      drag.view.hover(to, 'ok', lines, toView.foot());
    } else if (blocker === 'variant') {
      drag.view.hover(to, 'blocked', [{ text: text().board.otherVariant, tone: 'blocked' }], toView.foot());
    } else if (blocker === 'max-cannons') {
      drag.view.hover(to, 'blocked', [{ text: text().board.maxCannons(LIMITS.maxCannons), tone: 'blocked' }], toView.foot());
    } else {
      // Su propia casilla: soltar ahi no hace nada.
      drag.view.hover(null, null);
    }
  }

  /**
   * Con una mina (T-009) o un muro (T-024) en la mano, sobre una disparadora: "Infundir con la mina" (o "con el muro"),
   * con lo que se paga aparte si es una fusionada ("+ ×2 = 150"), o por que no se puede.
   */
  private refreshElementDragHover(drag: PlantDrag, to: Cell, labelAt: { x: number; y: number }): void {
    const play = elementInfusion(this.match, drag.from, to);
    const plant = plantAt(this.match, to);
    const extra = play.multiplier > 1 ? `×${play.multiplier} = ${play.cost}` : `${play.cost}`;
    const labels = text().board;
    const wall = wallAt(this.match, drag.from) !== null;
    const pay =
      play.cost > 0 ? (wall ? labels.infuseWallPlus(extra) : labels.infuseMinePlus(extra)) : wall ? labels.infuseWithWall : labels.infuseWithMine;
    if (play.blocker === null) {
      drag.view.hover(to, 'ok', [{ text: pay, tone: 'ok' }], labelAt);
    } else if (play.blocker === 'locked') {
      // T-037 (ES-02): un muro antes de poder infundir el escudo. Desde que ronda, o "aun no" si no es en este brote.
      const element = sownAt(this.match, drag.from);
      const unlocksAt = element ? unlockRound(this.match.outbreak, infuseFeature(sownElement(element) ?? 'shield')) : null;
      const reason = unlocksAt === null ? labels.infuseLater : labels.infuseFrom(unlocksAt + 1);
      drag.view.hover(to, 'blocked', [{ text: reason, tone: 'blocked' }], labelAt);
    } else if (play.blocker === 'has-element') {
      drag.view.hover(to, 'blocked', [{ text: labels.hasElement[plant?.shooter.element ?? 'fire'], tone: 'blocked' }], labelAt);
    } else if (play.blocker === 'insufficient-funds') {
      drag.view.hover(
        to,
        'blocked',
        [
          { text: pay, tone: 'blocked' },
          { text: labels.noFunds, tone: 'blocked' },
        ],
        labelAt,
      );
    } else {
      drag.view.hover(null, null);
    }
  }

  /** Suelta la planta: si cae sobre un destino valido se fusionan; si no, vuelve a su casilla sin cambios. */
  private dropDrag(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag) return;
    this.moveDrag(pointer);
    this.endDrag();
    const to = drag.over;
    if (drag.kind === 'element') {
      this.dropElement(drag, to);
      return;
    }
    if (!to || fusionBlocker(this.match, drag.from, to) !== null) {
      this.returnDrag(drag);
      return;
    }

    // La regla se aplica en el acto; la animacion acompana.
    this.match = fusePlants(this.match, drag.from, to);
    const fused = plantAt(this.match, to) as Plant;
    const fromView = this.plantViews.get(cellKey(drag.from));
    this.plantViews.delete(cellKey(drag.from));
    fromView?.uproot();
    const toView = this.plantViews.get(cellKey(to));
    if (!toView) return;
    const foot = toView.foot();
    const { cellWidth } = plantPlacement(to);
    drag.view.dropInto(foot, cellWidth);
    toView.fuse(fused.shooter.cannons, fused.hp / plantMaxHp(fused.shooter), fused.shooter.level);
    this.fx.floatText(text().board.fused, foot.x, foot.y - cellWidth * 1.05, LOOK.fusedText);
    this.refreshHighlight();
    this.emitAction({ type: 'fuse' }, to);
  }

  /**
   * Suelta la mina (T-009) o el muro (T-024): sobre una disparadora que se puede infundir, la regla se aplica en el acto,
   * lo de la mano se mete en la planta, lo de la casilla se hunde y la planta se infunde con su animacion de siempre. Si
   * no, vuelve.
   */
  private dropElement(drag: PlantDrag, to: Cell | null): void {
    const carried = sownAt(this.match, drag.from);
    const element = carried ? sownElement(carried) : null;
    if (!to || !element || elementInfusion(this.match, drag.from, to).blocker !== null) {
      this.returnDrag(drag);
      return;
    }
    this.match = infuseWithElement(this.match, drag.from, to);
    const fromKey = cellKey(drag.from);
    this.mineViews.get(fromKey)?.consume();
    this.mineViews.delete(fromKey);
    this.wallViews.get(fromKey)?.consume();
    this.wallViews.delete(fromKey);
    const toView = this.plantViews.get(cellKey(to));
    if (toView) {
      drag.view.dropInto(toView.foot(), plantPlacement(to).cellWidth);
      toView.infuse(element);
    } else {
      drag.view.poof();
    }
    this.emitBalance();
    this.refreshHighlight();
    this.emitAction({ type: 'infuse', element, dragged: true }, to);
  }

  /** Corta el arrastre sin fusionar: la planta vuelve a su casilla. */
  private cancelDrag(): void {
    this.press = null;
    const drag = this.drag;
    if (!drag) return;
    this.endDrag();
    this.returnDrag(drag);
  }

  /** Quita marcas y atenuado y deja de seguir al puntero. */
  private endDrag(): void {
    this.markTargets(false);
    this.drag = null;
    this.setCursor('default');
  }

  /** La planta (o la mina) de la mano vuelve volando a su casilla y la de la casilla recupera su aspecto. */
  private returnDrag(drag: PlantDrag): void {
    const view = this.dragSource(drag);
    if (!view) {
      drag.view.poof();
      return;
    }
    drag.view.returnTo(view.foot(), plantPlacement(drag.from).cellWidth, () => {
      // Si mientras volaba murio o se empezo a arrastrar otra vez, no hay nada que devolver.
      if (this.dragSource(drag) === view && !sameCell(this.drag?.from ?? null, drag.from)) view.setLifted(false);
    });
  }

  /** Vuelve a calcular a que se puede soltar lo que se lleva en la mano (cambio el saldo o murio una planta). */
  private refreshDragTargets(): void {
    const drag = this.drag;
    if (!drag) return;
    drag.targets = this.dragTargets(drag);
    drag.view.showTargets(drag.targets);
    this.markTargets(true);
    this.refreshDragHover();
  }

  /**
   * Una planta murio en mitad de un arrastre. Si era la arrastrada, el arrastre se cancela.
   * Si era un destino, deja de serlo: soltar ahi ya no fusiona.
   */
  private plantLostDuringDrag(cell: Cell): void {
    const drag = this.drag;
    if (!drag) return;
    if (sameCell(cell, drag.from)) {
      this.endDrag();
      drag.view.poof();
      return;
    }
    this.refreshDragTargets();
  }

  // -------------------------------------------------------------------------
  // Poderes (T-021, ADR-0020). Las reglas son de core (`powers.ts`); aqui se elige el poder, se apunta, se aplica en el
  // acto y se anima. Se toma del panel izquierdo (React) y se lanza tocando el tablero o arrastrandolo, como una carta.

  /** Elige el poder `id` para apuntarlo: suelta la carta, el arrastre y el panel de nivel. Uno que no se puede usar, no. */
  private selectPower(id: PowerId): void {
    if (this.defeated || this.won || powerBlocker(this.match, id)) return;
    this.cancelDrag();
    this.press = null;
    if (this.selected) this.select(null);
    this.pickPlant(null);
    this.cancelRelocation();
    this.power = id;
    this.refreshHighlight();
    EventBus.emit(GameEvents.powerSelected, id);
    this.emitAction({ type: 'powerPicked', power: id });
  }

  /** Suelta el poder elegido sin gastarlo (Esc, clic derecho, tocar fuera del tablero o volver a tocarlo en el panel). */
  private cancelPower(): void {
    this.cancelRelocation();
    if (!this.power) return;
    this.power = null;
    this.setCursor('default');
    this.refreshHighlight();
    EventBus.emit(GameEvents.powerSelected, null);
  }

  /** Coordenadas del mundo de un punto de la pagina (ver `cardCellAtPage`). */
  private pageToWorld(point: PagePoint): { x: number; y: number } {
    this.scale.updateBounds();
    const world = this.cameras.main.getWorldPoint(this.scale.transformX(point.pageX), this.scale.transformY(point.pageY));
    return { x: world.x, y: world.y };
  }

  /** Casilla del suelo bajo un punto de la pagina, para el poder que se arrastra desde el panel. */
  private cellAtPage(point: PagePoint): Cell | null {
    const world = this.pageToWorld(point);
    return this.cellAtScreen(world.x, world.y);
  }

  /**
   * Toque en el tablero con un poder elegido. Fuera del tablero, lo suelta sin gastarlo. La granada y el muro se lanzan
   * en la casilla tocada si se puede. Recolocar: el primer toque elige la disparadora (o empieza a arrastrarla); con una
   * en la mano, el siguiente toque la lleva a la casilla vacia tocada, la deja en su sitio (si se toca ella) o cambia a otra.
   */
  private powerDown(pointer: Phaser.Input.Pointer): void {
    const x = pointer.worldX;
    const y = pointer.worldY;
    const cell = this.cellAtScreen(x, y);
    if (this.power === 'grenade' || this.power === 'iceWall') {
      if (!cell) this.cancelPower();
      else if (this.power === 'grenade') this.tryGrenade(cell);
      else this.tryIceWall(cell);
      return;
    }
    const plantCell = this.plantCellAtScreen(x, y);
    const carried = this.relocation;
    if (carried) {
      if (carried.pointerId !== null) return;
      if (plantCell && sameCell(plantCell, carried.from)) {
        this.cancelRelocation();
        return;
      }
      if (plantCell && relocateSourceBlocker(this.match, plantCell) === null) {
        this.cancelRelocation();
        this.startRelocation(plantCell, { x, y }, pointer.id);
        return;
      }
      if (!cell) this.cancelPower();
      else if (relocateBlocker(this.match, carried.from, cell) === null) this.finishRelocation(cell);
      return;
    }
    if (plantCell && relocateSourceBlocker(this.match, plantCell) === null) this.startRelocation(plantCell, { x, y }, pointer.id);
    else if (!cell) this.cancelPower();
  }

  /**
   * El poder se solto sobre el tablero arrastrandolo desde el panel: la granada y el muro se lanzan ahi; recolocar coge la
   * disparadora de ahi, que espera el toque en su destino. Soltarlo fuera (o un simple toque en el panel) no lo gasta y lo
   * deja elegido.
   */
  private powerDropped(point: PagePoint): void {
    const world = this.pageToWorld(point);
    const cell = this.cellAtScreen(world.x, world.y);
    if (!cell) return;
    if (this.power === 'grenade') this.tryGrenade(cell);
    else if (this.power === 'iceWall') this.tryIceWall(cell);
    else if (this.power === 'relocate' && !this.relocation) {
      const plantCell = this.plantCellAtScreen(world.x, world.y);
      if (plantCell && relocateSourceBlocker(this.match, plantCell) === null) this.startRelocation(plantCell, world, null);
    }
  }

  /**
   * Con un poder elegido, lo que pasara al tocar la casilla bajo el puntero:
   * - Granada: la casilla y su alcance en el suelo (mayor que el de la mina) y la granada fantasma. Puede caer junto a una planta.
   * - Muro de hielo: sus tres casillas en azul helado con los bloques fantasma; las ocupadas, en rojo, y "Hay algo en medio".
   * - Recolocar: la disparadora bajo el puntero en dorado (con una en la mano, lo marca su vista).
   */
  private refreshPowerHighlight(): void {
    const cell = this.hoverCell;
    this.ghost.setVisible(false);
    this.cardLabel.hide();
    this.emitPreview(null);
    if (!cell || !this.power || this.relocation) {
      this.highlight.setVisible(false);
      return;
    }
    if (this.power === 'grenade') {
      const blocked = grenadeBlocker(this.match, cell) !== null;
      drawCell(this.highlight, cell, blocked ? LOOK.highlightBlocked : LOOK.powerColors.grenade, 0.25, 4);
      if (!blocked) {
        drawArea(this.highlight, cellCenter(cell), grenadeAt(powerLevel(this.match, 'grenade')).radius, LOOK.powerColors.grenade, 0.1, 2);
        const foot = grenadeFoot(cell);
        const at = perspective.toScreen(foot);
        this.ghost
          .setTexture(TEX.grenade.idle)
          .setOrigin(0.5, GRENADE_SIZE.footY / GRENADE_SIZE.height)
          .setScale(grenadeScale(perspective.cellWidthAt(foot)))
          .setPosition(at.x, at.y)
          .setDepth(entityDepth(at.y) + 1)
          .setVisible(true);
      }
    } else if (this.power === 'iceWall') {
      const cells = iceWallCellsIn(this.match, cell);
      const blocker = iceWallBlocker(this.match, cell);
      cells.forEach((c, i) => {
        drawCell(this.highlight, c, sownAt(this.match, c) ? LOOK.highlightBlocked : LOOK.powerColors.iceWall, 0.25, 4);
        const ghost = this.iceGhosts[i];
        if (blocker !== null || !ghost) return;
        const { screen, cellWidth } = plantPlacement(c);
        ghost.setPosition(screen.x, screen.y).setScale(iceBlockScale(cellWidth)).setDepth(entityDepth(screen.y)).setVisible(true);
      });
      const taken = blocker === 'occupied' ? cells.find((c) => sownAt(this.match, c)) : undefined;
      if (taken) {
        const { screen, cellWidth } = plantPlacement(taken);
        this.cardLabel.show(`ice:${cellKey(taken)}`, [{ text: text().board.iceBlocked, tone: 'blocked' }], screen.x, screen.y - cellWidth * 1.12, cellWidth);
      }
    } else {
      if (!plantAt(this.match, cell) || relocateSourceBlocker(this.match, cell) !== null) {
        this.highlight.setVisible(false);
        return;
      }
      drawCell(this.highlight, cell, LOOK.powerColors.relocate, 0.22, 4);
    }
    this.highlight.setVisible(true);
  }

  /** Lanza la granada a `cell` si se puede: sale volando desde detras de las plantas y el poder queda gastado. */
  private tryGrenade(cell: Cell): void {
    if (this.defeated || this.won || grenadeBlocker(this.match, cell)) return;
    this.match = throwGrenade(this.match, cell);
    const grenade = this.match.grenades[this.match.grenades.length - 1];
    this.grenadeViews.set(grenade.id, new GrenadeView(this, this.fx, grenade, true));
    this.cancelPower();
    this.emitPowers();
    // Suena desde donde la lanzan: a la izquierda, detras de las plantas.
    this.emitAction({ type: 'power', power: 'grenade' }, { lane: cell.lane, col: 0 });
  }

  /** Pone el muro de hielo apuntando a `cell` si se puede: brotan los tres bloques y salen de sus casillas los que estaban. */
  private tryIceWall(cell: Cell): void {
    if (this.defeated || this.won || iceWallBlocker(this.match, cell)) return;
    const placed = placeIceWall(this.match, cell);
    this.match = placed.state;
    placed.cells.forEach((c, i) => {
      const block = iceAt(this.match, c);
      if (block) this.iceViews.set(cellKey(c), new IceBlockView(this, this.fx, c, block, true, i * ICE_LOOK.staggerMs));
    });
    for (const push of placed.pushed) this.wormViews.get(push.enemyId)?.shoved(push.fromX, push.toX);
    this.cancelPower();
    this.emitPowers();
    this.emitAction({ type: 'power', power: 'iceWall' }, cell);
  }

  /**
   * Coge la disparadora de `cell` para recolocarla: sale a la mano (como al fusionar) y la de la casilla se queda medio
   * transparente. Con `pointerId`, se agarra por donde se pulso y puede arrastrarse; sin el (soltada desde el panel), espera
   * el toque en su destino.
   */
  private startRelocation(cell: Cell, at: { x: number; y: number }, pointerId: number | null): void {
    const plant = plantAt(this.match, cell);
    const view = this.plantViews.get(cellKey(cell));
    if (!plant || !view || relocateSourceBlocker(this.match, cell) !== null) return;
    const { cellWidth } = plantPlacement(cell);
    const foot = view.foot();
    const grab = pointerId === null ? { x: 0, y: 0 } : { x: (foot.x - at.x) / cellWidth, y: (foot.y - at.y) / cellWidth };
    const carried = new FusionDragView(this, this.fx, carriedShooter(plant.shooter), foot, cellWidth);
    view.setLifted(true);
    this.relocation = { from: cell, view: carried, grab, cellWidth, over: null, pointerId, press: { ...at }, dragging: false };
    this.highlight.setVisible(false);
    this.setCursor('grabbing');
  }

  /** El puntero se movio con una disparadora en la mano: la sigue y marca si se puede soltar en la casilla de debajo. */
  private moveRelocation(pointer: Phaser.Input.Pointer): void {
    const r = this.relocation;
    if (!r) return;
    const pressed = r.pointerId === pointer.id && pointer.isDown;
    if (pressed && !r.dragging && Phaser.Math.Distance.Between(r.press.x, r.press.y, pointer.worldX, pointer.worldY) >= DRAG_LOOK.startDistance) {
      r.dragging = true;
    }
    // Recien pulsada y sin moverla aun: se queda donde esta.
    if (pressed && !r.dragging) return;
    const ground = dragGround({ x: pointer.worldX, y: pointer.worldY }, r.grab, r.cellWidth);
    r.cellWidth = ground.cellWidth;
    r.view.moveTo(ground);
    const over = ground.board ? cellAt(ground.board) : null;
    if (!sameCell(over, r.over)) {
      r.over = over;
      this.refreshRelocationHover();
    }
  }

  /**
   * Se suelta el boton con una disparadora en la mano. Si se arrastro, se lleva a la casilla de debajo si esta vacia (si
   * no, vuelve a la suya y el poder sigue elegido). Si fue un toque, se queda en la mano esperando el toque en su destino.
   */
  private releaseRelocation(pointer: Phaser.Input.Pointer): void {
    const r = this.relocation;
    if (!r || r.pointerId !== pointer.id) return;
    r.pointerId = null;
    if (!r.dragging) {
      r.grab = { x: 0, y: 0 };
      return;
    }
    this.moveRelocation(pointer);
    const to = r.over;
    if (to && relocateBlocker(this.match, r.from, to) === null) this.finishRelocation(to);
    else this.cancelRelocation();
  }

  /** Casilla bajo la disparadora que se recoloca: verde y "Recolocar aqui" si esta vacia; roja y "Casilla ocupada" si no. */
  private refreshRelocationHover(): void {
    const r = this.relocation;
    if (!r) return;
    const to = r.over;
    if (!to || sameCell(to, r.from)) {
      r.view.hover(null, null);
      return;
    }
    const blocker = relocateBlocker(this.match, r.from, to);
    const foot = plantPlacement(to).screen;
    const labels = text().board;
    if (blocker === null) r.view.hover(to, 'ok', [{ text: labels.relocateHere, tone: 'ok' }], foot);
    else if (blocker === 'occupied') r.view.hover(to, 'blocked', [{ text: labels.occupied, tone: 'blocked' }], foot);
    else r.view.hover(null, null);
  }

  /**
   * Lleva la disparadora de la mano a `to`: la regla se aplica en el acto (gasta la carga). La de su casilla se arranca
   * dejando tierra, la de la mano se mete en la casilla nueva y alli brota tal como estaba, con un anillo dorado.
   */
  private finishRelocation(to: Cell): void {
    const r = this.relocation;
    if (!r || relocateBlocker(this.match, r.from, to) !== null) return;
    this.relocation = null;
    const before = plantAt(this.match, r.from);
    this.match = relocatePlant(this.match, r.from, to);
    const fromKey = cellKey(r.from);
    const fromView = this.plantViews.get(fromKey);
    this.plantViews.delete(fromKey);
    fromView?.uproot();
    const plant = plantAt(this.match, to) as Plant;
    const { screen, cellWidth } = plantPlacement(to);
    r.view.dropInto(screen, cellWidth);
    this.addPlantView(to, plant, true);
    this.fx.groundRing(screen.x, screen.y, cellWidth, cellWidth * 0.32, LOOK.powerColors.relocate, entityDepth(screen.y) - 0.4, 380, 0.85);
    this.fx.leaves(screen.x, screen.y - cellWidth * 0.4, 6);
    this.fx.floatText(text().board.relocated, screen.x, screen.y - cellWidth * 1.05, LOOK.fusedText);
    // Con nivel, llega curada (T-022): lo que gano sube un poco despues, en verde, con unos destellos.
    const healed = Math.round(plant.hp - (before?.hp ?? plant.hp));
    if (healed > 0) {
      this.time.delayedCall(LOOK.healTextDelayMs, () => {
        this.fx.floatText(text().board.healed(healed), screen.x, screen.y - cellWidth * 0.72, LOOK.healText);
        this.fx.sparkles(screen.x, screen.y - cellWidth * 0.45, 6);
      });
    }
    this.cancelPower();
    this.emitPowers();
    this.refreshHighlight();
    this.emitAction({ type: 'power', power: 'relocate' }, to);
  }

  /** Suelta la disparadora de la mano sin recolocarla: vuelve volando a su casilla. El poder sigue elegido. */
  private cancelRelocation(): void {
    const r = this.relocation;
    if (!r) return;
    this.relocation = null;
    this.setCursor('default');
    const key = cellKey(r.from);
    const view = this.plantViews.get(key);
    if (!view) {
      r.view.poof();
      return;
    }
    r.view.returnTo(view.foot(), plantPlacement(r.from).cellWidth, () => {
      // Si mientras volvia se murio o se volvio a coger, no hay nada que devolver.
      if (this.plantViews.get(key) === view && !sameCell(this.relocation?.from ?? null, r.from)) view.setLifted(false);
    });
  }

  /** Avisa al panel de poderes de sus cargas y de si se pueden usar ahora, solo si cambia. */
  private emitPowers(): void {
    const info: PowerInfo[] = this.match.powers.map((slot) => ({ id: slot.id, level: slot.level, charges: slot.charges, blocker: powerBlocker(this.match, slot.id) }));
    const key = JSON.stringify(info);
    if (key === this.powersKey) return;
    this.powersKey = key;
    EventBus.emit(GameEvents.powersChanged, info);
  }

  // -------------------------------------------------------------------------
  // Ficha de informacion (T-010). Los datos salen de las reglas (`view/entityInfo.ts`) y la foto, de las texturas
  // (`view/portrait.ts`); la pinta React, que deja el juego en pausa mientras se ve.

  /**
   * ¿Es este toque el segundo de un doble clic sobre lo mismo? Si lo es, abre su ficha. Solo sin carta elegida y con
   * la partida en juego. El primer toque hace lo de siempre (seleccionar una planta, por ejemplo).
   */
  private checkDoubleTap(pointer: Phaser.Input.Pointer): boolean {
    if (this.selected || this.power || this.defeated || this.won) {
      this.lastTap = null;
      return false;
    }
    const target = this.infoTargetAt(pointer.worldX, pointer.worldY);
    const key = target ? infoKey(target) : null;
    const last = this.lastTap;
    const double =
      target !== null &&
      last !== null &&
      last.key === key &&
      pointer.downTime - last.time <= LOOK.doubleTap.ms &&
      Phaser.Math.Distance.Between(last.x, last.y, pointer.worldX, pointer.worldY) <= LOOK.doubleTap.distance;
    this.lastTap = double || key === null ? null : { key, time: pointer.downTime, x: pointer.worldX, y: pointer.worldY };
    if (double) this.openInfo(target);
    return double;
  }

  /**
   * Lo que tiene ficha bajo un punto de pantalla: lo que se ve ahi (lo de delante tapa a lo de atras, sea planta, mina o
   * enemigo); si no hay nada, lo sembrado en la casilla bajo el punto.
   */
  private infoTargetAt(x: number, y: number): InfoTarget | null {
    let best: InfoTarget | null = null;
    let bestFootY = -Infinity;
    for (const [key, view] of this.plantViews) {
      const footY = view.foot().y;
      if (footY > bestFootY && view.contains(x, y)) {
        best = { kind: 'plant', cell: keyCell(key) };
        bestFootY = footY;
      }
    }
    for (const [key, view] of this.mineViews) {
      const footY = view.foot().y;
      if (footY > bestFootY && view.contains(x, y)) {
        best = { kind: 'mine', cell: keyCell(key) };
        bestFootY = footY;
      }
    }
    for (const [key, view] of this.wallViews) {
      const footY = view.foot().y;
      if (footY > bestFootY && view.contains(x, y)) {
        best = { kind: 'wall', cell: keyCell(key) };
        bestFootY = footY;
      }
    }
    for (const [key, view] of this.iceViews) {
      const footY = view.foot().y;
      if (footY > bestFootY && view.contains(x, y)) {
        best = { kind: 'ice', cell: keyCell(key) };
        bestFootY = footY;
      }
    }
    for (const [id, view] of this.wormViews) {
      const footY = view.ground().y;
      if (footY > bestFootY && view.contains(x, y)) {
        best = { kind: 'enemy', id };
        bestFootY = footY;
      }
    }
    if (best) return best;
    const cell = this.cellAtScreen(x, y);
    const sown = cell ? sownAt(this.match, cell) : null;
    if (!cell || !sown) return null;
    return { kind: sown.kind === 'shooter' ? 'plant' : sown.kind, cell };
  }

  /** Arma la ficha de lo inspeccionado con el estado de ahora y se la manda a React, que pausa el juego. */
  private openInfo(target: InfoTarget): void {
    let data: EntityInfoData;
    let subject: PortraitSubject;
    if (target.kind === 'enemy') {
      const enemy = this.match.enemies.find((e) => e.id === target.id);
      if (!enemy) return;
      data = enemyInfo(enemy, this.match.overload);
      subject = { kind: 'enemy', enemy: enemy.kind, level: enemy.level, enraged: isEnraged(enemy), hasted: enemy.haste > 1, clone: enemy.clone, variant: enemy.variant };
    } else if (target.kind === 'plant') {
      const plant = plantAt(this.match, target.cell);
      if (!plant) return;
      data = shooterInfo(plant, target.cell, isUnlocked(this.match, 'levelUp') ? levelCap(this.match) : null, this.match.baseLevel);
      const { cannons, element, level } = plant.shooter;
      subject = { kind: 'shooter', cannons, element, level, baseLevel: this.match.baseLevel };
    } else if (target.kind === 'wall') {
      const wall = wallAt(this.match, target.cell);
      if (!wall) return;
      data = wallInfo(wall, target.cell, isUnlocked(this.match, infuseFeature('shield')));
      subject = { kind: 'wall', wear: wallWear(wall.hp / SHIELD.wallHp) };
    } else if (target.kind === 'ice') {
      const block = iceAt(this.match, target.cell);
      if (!block) return;
      data = iceInfo(block, target.cell);
      subject = { kind: 'ice', wear: iceWear(block.hp / block.maxHp) };
    } else {
      const mine = mineAt(this.match, target.cell);
      if (!mine) return;
      data = mineInfo(mine, target.cell);
      subject = { kind: 'mine', element: mine.element, armed: mine.fuseMs !== null };
    }
    // Un arrastre a medias no sobrevive a la pausa de la ficha.
    this.cancelDrag();
    EventBus.emit(GameEvents.entityInfo, { ...data, portrait: portraitUrl(this, subject) });
  }

  // -------------------------------------------------------------------------
  // Subir de nivel (T-003). Las reglas son de core (levelUpOffer, levelUpPlant); aqui se selecciona y se anima.
  // El panel (nivel, costo y boton) lo pinta React junto a la planta.

  /** Selecciona la disparadora de `cell` (o ninguna): marca su casilla y abre o cierra el panel de nivel. */
  private pickPlant(cell: Cell | null): void {
    if (sameCell(this.picked, cell) || (this.picked === null && cell === null)) return;
    this.picked = cell;
    this.pickedMark.clear().setVisible(cell !== null);
    if (cell) {
      drawCell(this.pickedMark, cell, LOOK.pickedColor, 0.22, 4);
      this.plantViews.get(cellKey(cell))?.beckon();
      this.wallViews.get(cellKey(cell))?.beckon();
    }
    this.emitPlantPanel();
    if (cell) this.emitAction({ type: 'pick' });
  }

  /** Sube un nivel la planta seleccionada si se puede: cobra en el acto y la planta lo celebra. */
  private tryLevelUp(): void {
    const cell = this.picked;
    if (this.defeated || this.won || !cell) return;
    const offer = levelUpOffer(this.match, cell);
    if (!offer || offer.blocker) return;
    this.match = levelUpPlant(this.match, cell);
    const plant = plantAt(this.match, cell) as Plant;
    this.plantViews.get(cellKey(cell))?.levelUp(plant.shooter.level);
    this.emitBalance();
    this.emitAction({ type: 'levelUp', level: plant.shooter.level }, cell);
  }

  /**
   * Arranca lo seleccionado si se puede (T-046): la regla se aplica en el acto (la casilla queda libre y la moneda vuelve
   * al saldo), la planta o el muro salen de la tierra de un tiron y la moneda salta al marcador.
   */
  private tryUproot(): void {
    const cell = this.picked;
    if (this.defeated || this.won || !cell) return;
    const refund = uprootRefund(this.match, cell);
    if (refund === null) return;
    this.match = uprootSown(this.match, cell);
    const key = cellKey(cell);
    this.plantViews.get(key)?.pullOut();
    this.plantViews.delete(key);
    this.wallViews.get(key)?.pullOut();
    this.wallViews.delete(key);
    this.pickPlant(null);
    this.balanceGained();
    this.coinsFrom(refund, { x: cell.col + 0.5, y: cell.lane + 0.5 }, LOOK.uprootCoinDelayMs);
    this.emitAction({ type: 'uproot' }, cell);
  }

  /** Avisa al HUD de como esta el panel de la planta seleccionada (o de que se cerro), solo si cambia. */
  private emitPlantPanel(): void {
    const cell = this.picked;
    const key = cell ? cellKey(cell) : '';
    const plant = cell ? plantAt(this.match, cell) : null;
    const view = cell ? (plant ? this.plantViews.get(key) : this.wallViews.get(key)) : undefined;
    const uproot = cell ? uprootRefund(this.match, cell) : null;
    const offer = cell && isUnlocked(this.match, 'levelUp') ? levelUpOffer(this.match, cell) : null;
    let panel: PlantPanel | null = null;
    // Una disparadora con algo que hacer, o un muro que se puede arrancar (T-046).
    if (cell && view && (offer || uproot !== null) && (plant || wallAt(this.match, cell))) {
      const foot = view.foot();
      const { cellWidth } = plantPlacement(cell);
      const level = plant?.shooter.level ?? 1;
      panel = {
        id: key,
        subject: plant ? 'shooter' : 'wall',
        level,
        medalTier: plant && showsMedal(level) ? medalTier(level) : null,
        levelUp: offer && {
          cap: offer.cap,
          capRaisedAt: offer.capRaisedAt === null ? null : offer.capRaisedAt + 1,
          cost: offer.cost,
          multiplier: offer.multiplier,
          affordable: offer.blocker === null,
        },
        uproot,
        above: this.worldToPage(foot.x, foot.y - cellWidth * LOOK.panelAbove),
        below: this.worldToPage(foot.x, foot.y + cellWidth * LOOK.panelBelow),
        right: this.worldToPage(foot.x + cellWidth * LOOK.panelSide.x, foot.y - cellWidth * LOOK.panelSide.y),
        left: this.worldToPage(foot.x - cellWidth * LOOK.panelSide.x, foot.y - cellWidth * LOOK.panelSide.y),
      };
    }
    const shown = panel ? JSON.stringify(panel) : '';
    if (shown === this.panelKey) return;
    this.panelKey = shown;
    EventBus.emit(GameEvents.plantPanel, panel);
  }

  /** Inverso de `cardCellAtPage`: coordenadas de diseno (mundo) -> pixeles del lienzo -> coordenadas DOM. */
  private worldToPage(x: number, y: number): PagePoint {
    const canvas = this.cameras.main.matrixCombined.transformPoint(x, y, { x: 0, y: 0 });
    const bounds = this.scale.canvasBounds;
    return {
      pageX: Math.round(bounds.left + canvas.x / this.scale.displayScale.x),
      pageY: Math.round(bounds.top + canvas.y / this.scale.displayScale.y),
    };
  }

  // -------------------------------------------------------------------------
  // Tours de ayuda (T-013, ADR-0012). Los pinta React; aqui se para la preparacion mientras se ven, se le dice que
  // senalar (lo elige `tourCells` con las reglas) y se le cuenta lo que hace el jugador.

  /** Empieza o acaba un tour: con el, React recibe los dibujos de los bocadillos y lo que puede senalar. */
  private setTourHold(hold: boolean): void {
    this.tourHold = hold;
    if (!hold) return;
    this.emitTourArt();
    this.tourBoardKey = '';
    this.emitTourBoard();
  }

  /** El jugador acaba de hacer algo que un tour puede estar ensenando. Si se oye (T-014), suena desde su casilla. */
  private emitAction(action: PlayerAction, cell: Cell | null = null): void {
    EventBus.emit(GameEvents.playerAction, action);
    const cue = cell ? actionCue(action, cell.col + 0.5) : null;
    if (cue) sfx.play(cue.id, cue.pan);
  }

  /** Dibujos de los bocadillos: las mismas texturas del tablero, recortadas (como la foto de la ficha, sin fondo). */
  private emitTourArt(): void {
    const cutout = (subject: PortraitSubject) => portraitUrl(this, subject, { backdrop: false });
    const shooter = (cannons: 1 | 2, element: ElementType | null) => cutout({ kind: 'shooter', cannons, element, level: 1 });
    const mine = (element: 'fire' | 'ice', armed: boolean) => cutout({ kind: 'mine', element, armed });
    const art: TourArt = {
      shooter: shooter(1, null),
      shooter2: shooter(2, null),
      shooterFire: shooter(1, 'fire'),
      shooterIce: shooter(1, 'ice'),
      shooterShield: shooter(1, 'shield'),
      fireMine: mine('fire', false),
      fireMineArmed: mine('fire', true),
      iceMine: mine('ice', false),
      iceMineArmed: mine('ice', true),
      wall: cutout({ kind: 'wall', wear: 0 }),
      grenade: cutout({ kind: 'grenade' }),
      iceBlock: cutout({ kind: 'ice', wear: 0 }),
      spitter: cutout({ kind: 'enemy', enemy: 'spitter', level: 1, enraged: false, hasted: false }),
      worm: cutout({ kind: 'enemy', enemy: 'worm', level: 1, enraged: false, hasted: false }),
    };
    EventBus.emit(GameEvents.tourArt, art);
  }

  /** Lo que el tour puede senalar ahora mismo, en la pagina. Solo avisa si cambia. */
  private emitTourBoard(): void {
    const cells = tourCells(this.match);
    const spots: TourBoard['spots'] = {};
    const areas: TourBoard['areas'] = {};
    if (cells.sowCell) spots.sowCell = this.cellSpot(cells.sowCell);
    if (cells.mineCell) spots.mineCell = this.cellSpot(cells.mineCell);
    if (cells.shooter) {
      spots.shooter = this.plantSpot(cells.shooter);
      areas.shooterLane = this.boardArea(cells.shooter.col, BOARD.columns, cells.shooter.lane, cells.shooter.lane + 1);
    }
    if (cells.infusable) spots.infusable = this.plantSpot(cells.infusable);
    // Escudo (T-024): donde sembrar el muro, el muro sembrado y la disparadora que se puede infundir con escudo.
    if (cells.wallCell) spots.wallCell = this.cellSpot(cells.wallCell);
    if (cells.wall) spots.wall = this.wallSpot(cells.wall);
    if (cells.shieldInfusable) spots.shieldInfusable = this.plantSpot(cells.shieldInfusable);
    // T-037: el muro que se puede llevar a una disparadora y esa disparadora.
    if (cells.wallInfusion) {
      spots.wallSource = this.wallSpot(cells.wallInfusion.wall);
      spots.wallTarget = this.plantSpot(cells.wallInfusion.target);
    }
    if (cells.mineInfusion) {
      spots.mine = this.mineSpot(cells.mineInfusion.mine);
      spots.mineTarget = this.plantSpot(cells.mineInfusion.target);
    }
    if (cells.fusion) {
      spots.fuseFrom = this.plantSpot(cells.fusion.from);
      spots.fuseTo = this.plantSpot(cells.fusion.to);
    }
    const { fire, ice } = cells.mines;
    if (fire) {
      spots.fireMine = this.mineSpot(fire);
      spots.fireBlast = this.blastSpot(fire);
    }
    if (ice) {
      spots.iceMine = this.mineSpot(ice);
      spots.iceBlast = this.blastSpot(ice);
    }
    // Poderes (T-021): adonde recolocar la disparadora senalada, donde lanzar la granada (y su alcance) y el muro de hielo.
    if (cells.relocateTo) spots.relocateTo = this.cellSpot(cells.relocateTo);
    spots.grenadeCell = this.cellSpot(cells.grenadeCell);
    spots.grenadeBlast = this.blastSpot(cells.grenadeCell, grenadeAt(powerLevel(this.match, 'grenade')).radius);
    if (cells.iceWallCell) spots.iceWallCells = this.iceWallSpot(cells.iceWallCell);
    areas.exit = this.boardArea(LOOK.tourSpot.exitFromX, 0, 0, BOARD.lanes);
    const board: TourBoard = { spots, areas };
    const key = JSON.stringify(board);
    if (key === this.tourBoardKey) return;
    this.tourBoardKey = key;
    EventBus.emit(GameEvents.tourBoard, board);
  }

  /** Elipse de la pagina con centro en un punto del mundo y radios en unidades del mundo. */
  private pageSpot(x: number, y: number, rx: number, ry: number): TourSpot {
    const center = this.worldToPage(x, y);
    const edge = this.worldToPage(x + rx, y + ry);
    return { x: center.pageX, y: center.pageY, rx: Math.abs(edge.pageX - center.pageX), ry: Math.abs(edge.pageY - center.pageY) };
  }

  /** Una casilla del suelo, algo mayor que ella. */
  private cellSpot(cell: Cell): TourSpot {
    const center = cellCenter(cell);
    const at = perspective.toScreen(center);
    const top = perspective.toScreen({ x: center.x, y: cell.lane }).y;
    const bottom = perspective.toScreen({ x: center.x, y: cell.lane + 1 }).y;
    const grow = LOOK.tourSpot.cell;
    return this.pageSpot(at.x, at.y, (perspective.cellWidthAt(center) / 2) * grow, ((bottom - top) / 2) * grow);
  }

  /** El cuerpo de la disparadora de una casilla. */
  private plantSpot(cell: Cell): TourSpot {
    const { screen, cellWidth } = plantPlacement(cell);
    const { up, rx, ry } = LOOK.tourSpot.plant;
    return this.pageSpot(screen.x, screen.y - cellWidth * up, cellWidth * rx, cellWidth * ry);
  }

  /** El cuerpo de la mina de una casilla. */
  private mineSpot(cell: Cell): TourSpot {
    const { screen, cellWidth } = plantPlacement(cell);
    const foot = this.mineViews.get(cellKey(cell))?.foot() ?? screen;
    const { up, rx, ry } = LOOK.tourSpot.mine;
    return this.pageSpot(foot.x, foot.y - cellWidth * up, cellWidth * rx, cellWidth * ry);
  }

  /** El cuerpo del muro de una casilla (T-024): mas ancho y algo mas alto que una disparadora. */
  private wallSpot(cell: Cell): TourSpot {
    const { screen, cellWidth } = plantPlacement(cell);
    const foot = this.wallViews.get(cellKey(cell))?.foot() ?? screen;
    const { up, rx, ry } = LOOK.tourSpot.wall;
    return this.pageSpot(foot.x, foot.y - cellWidth * up, cellWidth * rx, cellWidth * ry);
  }

  /**
   * Las casillas del muro de hielo (T-021; tres, o mas con su nivel, T-022) que se pone apuntando a `cell`: una elipse alta
   * sobre su columna, del primer carril al ultimo.
   */
  private iceWallSpot(cell: Cell): TourSpot {
    const cells = iceWallCellsIn(this.match, cell);
    const first = cells[0].lane;
    const last = cells[cells.length - 1].lane;
    const center = { x: cell.col + 0.5, y: (first + last + 1) / 2 };
    const at = perspective.toScreen(center);
    // La elipse de siempre cubre tres carriles; con mas, crece en proporcion.
    const lane = (perspective.toScreen({ x: center.x, y: center.y + 0.5 }).y - perspective.toScreen({ x: center.x, y: center.y - 0.5 }).y) * (cells.length / ICE_WALL.span);
    const { rx, ry } = LOOK.tourSpot.iceWall;
    return this.pageSpot(at.x, at.y, perspective.cellWidthAt(center) * rx, lane * ry);
  }

  /** Hasta donde llega la explosion de una casilla (la de la mina, `MINE.blastRadius`, o la de la granada), aplastado por la camara. */
  private blastSpot(cell: Cell, radius: number = MINE.blastRadius): TourSpot {
    const center = cellCenter(cell);
    const at = perspective.toScreen(center);
    const top = perspective.toScreen({ x: center.x, y: center.y - radius }).y;
    const bottom = perspective.toScreen({ x: center.x, y: center.y + radius }).y;
    return this.pageSpot(at.x, at.y, perspective.cellWidthAt(center) * radius, (bottom - top) / 2);
  }

  /** Contorno en la pagina de un trozo del tablero (de `x0` a `x1` en columnas y de `y0` a `y1` en carriles). */
  private boardArea(x0: number, x1: number, y0: number, y1: number): PagePoint[] {
    return [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ].map((corner) => {
      const at = perspective.toScreen(corner);
      return this.worldToPage(at.x, at.y);
    });
  }

  /** Avisa a React de donde esta una moneda del suelo que ya se puede recoger (T-013). */
  private emitCoin(id: number): void {
    const spot = this.coinSpots.get(id);
    if (!spot) return;
    const at = this.worldToPage(spot.x, spot.y);
    const edge = this.worldToPage(spot.x + spot.size, spot.y);
    EventBus.emit(GameEvents.coinDropped, { id, at, size: Math.abs(edge.pageX - at.pageX) });
  }

  /** La moneda del suelo se recogio o se perdio. */
  private coinGone(id: number, collected: boolean): void {
    if (this.coinSpots.delete(id)) EventBus.emit(GameEvents.coinGone, { id, collected });
  }

  // -------------------------------------------------------------------------
  // Monedas

  /**
   * Moneda en el suelo: se cobra (con el extra ya incluido en `amount`) solo si el jugador hace clic. Se queda donde
   * cae, pero se pinta por encima de enemigos y matas (T-010, `DEPTH.droppedCoins`) para que siempre se vea; su sombra
   * sigue en el suelo, tapada por lo que pase por encima.
   */
  private spawnDroppedCoin(at: BoardPoint, amount: number): void {
    const cellWidth = perspective.cellWidthAt(at);
    const ground = perspective.toScreen(at);
    const size = cellWidth * LOOK.coinSize;
    const hover = cellWidth * LOOK.coinHover;
    const landX = ground.x + Phaser.Math.FloatBetween(-0.25, 0.25) * cellWidth;
    const restY = ground.y - hover;
    // Entre monedas, la de delante (mas abajo en pantalla) tapa a la de atras.
    const depth = DEPTH.droppedCoins + ground.y / VIEW.height;

    const shadow = this.add
      .image(landX, ground.y, TEX.shadow)
      .setDisplaySize(size * 1.2, size * 0.38)
      .setAlpha(0)
      .setDepth(entityDepth(ground.y) - 0.5);
    const glow = this.add
      .image(landX, restY, TEX.glow)
      .setDisplaySize(size * 2.4, size * 2.4)
      .setTint(0xffe27a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setVisible(this.quality.glows)
      .setDepth(depth - 0.002);
    const coin = this.add.image(ground.x, restY, TEX.coin).setDisplaySize(size, size).setDepth(depth);
    const label = this.add
      .text(landX, restY - size * 0.95, `+${amount}`, this.fx.textStyle({ fontSize: Math.round(size * 0.5) }))
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(depth + 0.001);
    // La moneda gira estrechandose; el clic lo recibe una zona fija y algo mas grande para que sea facil acertar.
    const hit = this.add.zone(landX, restY, size * 1.6, size * 1.6).setDepth(depth + 0.002);
    const parts = [shadow, glow, coin, label, hit];
    const coinScale = coin.scaleX;
    const id = ++this.coinSeq;

    let collected = false;
    const startIdle = () => {
      if (collected) return;
      hit.setInteractive({ useHandCursor: true });
      // Ya se puede recoger: React la senala si toca la pista de la moneda (T-013).
      this.coinSpots.set(id, { x: landX, y: restY, size });
      this.emitCoin(id);
      this.tweens.add({ targets: [shadow, label], alpha: 1, duration: 200 });
      this.tweens.add({ targets: glow, alpha: { from: 0.25, to: 0.7 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: [coin, glow, hit], y: restY - cellWidth * 0.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: label, y: label.y - cellWidth * 0.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: coin, scaleX: coinScale * 0.2, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    };

    // Sale despedida del enemigo, cae y rebota.
    this.tweens.add({ targets: coin, x: landX, duration: 700 });
    this.tweens.add({
      targets: coin,
      y: restY - cellWidth * 0.7,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => this.tweens.add({ targets: coin, y: restY, duration: 440, ease: 'Bounce.Out', onComplete: startIdle }),
    });

    const blink = this.time.delayedCall(ECONOMY.dropLifetimeMs * LOOK.coinBlinkFrom, () => {
      this.tweens.add({ targets: [coin, label], alpha: 0.3, duration: 150, yoyo: true, repeat: -1 });
    });
    const expire = this.time.delayedCall(ECONOMY.dropLifetimeMs, () => {
      collected = true;
      this.coinGone(id, false);
      hit.disableInteractive();
      this.tweens.killTweensOf(parts);
      this.tweens.add({
        targets: parts,
        alpha: 0,
        scaleY: 0,
        duration: 260,
        ease: 'Back.In',
        onComplete: () => parts.forEach((part) => part.destroy()),
      });
    });

    hit.once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (collected) return;
      collected = true;
      this.coinGone(id, true);
      blink.remove();
      expire.remove();
      this.tweens.killTweensOf(parts);
      [shadow, glow, label, hit].forEach((part) => part.destroy());
      coin.setScale(coinScale);
      this.credit(amount);
      sfx.play('coin', panAt(at.x, BOARD.columns));
      this.fx.floatText(`+${amount}`, coin.x, coin.y - size);
      this.fx.sparkles(coin.x, coin.y, 14);
      this.flyToBalance(coin, coinScale);
    });
  }

  /** Moneda que se cobra sola: aparece, brilla y vuela al marcador. */
  private spawnAutoCoin(at: BoardPoint): void {
    const cellWidth = perspective.cellWidthAt(at);
    const ground = perspective.toScreen(at);
    const coin = this.add
      .image(ground.x, ground.y - cellWidth * LOOK.coinHover, TEX.coin)
      .setDepth(DEPTH.floatText - 2)
      .setScale(0);
    const scale = (cellWidth * LOOK.coinSize) / coin.width;
    this.fx.sparkles(coin.x, coin.y, 8);
    this.tweens.add({
      targets: coin,
      scale,
      y: coin.y - cellWidth * 0.25,
      duration: 260,
      ease: 'Back.Out',
      onComplete: () => this.flyToBalance(coin, scale),
    });
  }

  private flyToBalance(coin: Phaser.GameObjects.Image, scale: number): void {
    coin.setDepth(DEPTH.floatText - 2);
    // El saldo esta en la esquina de la pantalla, que depende de la proporcion de la ventana.
    const view = this.cameras.main.worldView;
    this.tweens.add({
      targets: coin,
      x: view.right - LOOK.coinTargetFromCorner.x,
      y: view.top + LOOK.coinTargetFromCorner.y,
      scale: scale * 0.6,
      angle: 200,
      duration: 650,
      ease: 'Cubic.In',
      onComplete: () => coin.destroy(),
    });
  }

  private credit(amount: number, at?: BoardPoint): void {
    this.match = earn(this.match, amount);
    this.balanceGained();
    if (at) this.coinsFrom(amount, at);
  }

  /** "+N" sobre `at` y una moneda que sale de ahi y vuela al marcador (lo cobrado ya esta en el saldo). */
  private coinsFrom(amount: number, at: BoardPoint, delayMs = 0): void {
    const show = () => {
      const ground = perspective.toScreen(at);
      this.fx.floatText(`+${amount}`, ground.x, ground.y - perspective.cellWidthAt(at) * 0.8);
      this.spawnAutoCoin(at);
    };
    if (delayMs > 0) this.time.delayedCall(delayMs, show);
    else show();
  }

  /** El saldo subio (una moneda o el goteo): el HUD y lo que depende del saldo se ponen al dia. */
  private balanceGained(): void {
    this.emitBalance();
    // Si hay una carta elegida, el saldo nuevo puede cambiar el color del resaltado.
    this.refreshHighlight();
    // Con una mina en la mano, el saldo nuevo puede alcanzar para infundir una fusionada (T-009).
    if (this.drag?.kind === 'element') this.refreshDragTargets();
  }

  private emitBalance(): void {
    EventBus.emit(GameEvents.balanceChanged, this.match.balance);
    // Con el saldo nuevo el boton de subir de nivel puede pasar a alcanzar (o dejar de hacerlo).
    this.emitPlantPanel();
  }

  private emitLives(): void {
    EventBus.emit(GameEvents.livesChanged, this.match.lives);
  }

  /** Avisa al HUD de la ronda en curso (T-007), solo si cambia: en la preparacion, la cuenta atras cambia cada segundo. */
  private emitRound(): void {
    const { round, outbreak } = this.match;
    const bossRound = bossRoundIndex(outbreak);
    const info: RoundInfo = {
      outbreak,
      number: round.index + 1,
      total: roundCount(outbreak),
      bossRound: bossRound === null ? null : bossRound + 1,
      phase: round.phase,
      prepSeconds: round.phase === 'prep' ? Math.ceil(round.prepMs / 1000) : null,
      cards: availableCards(this.match),
      infusable: infusableElements(this.match),
      notice: text().round.notices[outbreak]?.[round.index] ?? '',
      seeds: this.match.seeds.earned,
      powers: this.match.powers.map((slot) => slot.id),
    };
    const key = JSON.stringify(info);
    if (key === this.roundKey) return;
    this.roundKey = key;
    EventBus.emit(GameEvents.roundChanged, info);
  }

  /**
   * Avisa al HUD de la vida del jefe, solo si cambia: de Creeper (T-008), su fase y sus umbrales de salto; de Elk Cloner
   * (T-026), los versos que lleva hacia el poema entero y si lo esta anunciando; de Brain (T-039), si esta oculto y donde
   * entra en su fase 2. Derrotado, la barra se queda a 0 hasta la
   * victoria; si se escapo, se queda como estaba.
   */
  private emitBoss(): void {
    const boss = this.match.enemies.find((enemy) => isBoss(enemy.kind));
    let info: BossInfo | null = this.lastBoss;
    if (boss && isBoss(boss.kind)) {
      const kind = boss.kind;
      info = {
        kind,
        name: text().info.enemy.names[kind],
        hp: Math.max(0, Math.ceil(boss.hp)),
        maxHp: enemyMaxHp(kind),
        enraged: isEnraged(boss),
        // Creeper marca donde salta; Brain (T-039), donde entra en su fase 2.
        jumpAt: kind === 'creeper' ? [...CREEPER.jumpAt] : kind === 'brain' ? [BRAIN.enragedBelow] : [],
        poem: boss.recital ? { sung: Math.min(boss.recital.sung, ELK_CLONER.poemEvery), every: ELK_CLONER.poemEvery, warning: poemWarning(boss) !== null } : null,
        hidden: boss.revealMs === null ? null : isHidden(boss),
        // Morris (T-042): cada cuanto suelta ahora un gusano (MR-07), en decimas de segundo para no avisar al HUD en cada
        // fotograma, y si muerde algo sin pararse (MR-06).
        brood: kind === 'morris' ? { everyMs: Math.round(broodEveryMs(this.match.round.brood?.sinceMs ?? 0) / 100) * 100, chewing: boss.attackMs !== null } : null,
      };
    } else if (this.lastBoss && !this.lostToBoss) {
      info = { ...this.lastBoss, hp: 0 };
    }
    this.lastBoss = info;
    const key = JSON.stringify(info);
    if (key === this.bossKey) return;
    this.bossKey = key;
    EventBus.emit(GameEvents.bossChanged, info);
  }

  /**
   * Avisa al HUD de la barra de sobrecarga (T-042), solo si cambia: lo llena que esta (`overloadFill`) y si esta encendida.
   * Null en un brote sin sobrecarga: no hay barra.
   */
  private emitOverload(): void {
    const info: OverloadInfo | null = hasOverload(this.match.outbreak)
      ? { fill: overloadFill(this.match), active: this.match.overload, offBelow: OVERLOAD.offBelow }
      : null;
    const key = JSON.stringify(info);
    if (key === this.overloadKey) return;
    this.overloadKey = key;
    EventBus.emit(GameEvents.overloadChanged, info);
  }

  private emitState(): void {
    this.emitBalance();
    this.emitLives();
    this.roundKey = '';
    this.emitRound();
    this.bossKey = '';
    this.emitBoss();
    this.overloadKey = '';
    this.emitOverload();
    EventBus.emit(GameEvents.selectionChanged, this.selected);
    // El precio de infusion que tuviera el HUD era de la escena anterior (por ejemplo, al cambiar la calidad).
    this.previewKey = '';
    EventBus.emit(GameEvents.cardPreview, null);
    this.panelKey = 'stale';
    this.emitPlantPanel();
    // El panel de poderes (T-021) y el que estaba elegido.
    this.powersKey = '';
    this.emitPowers();
    EventBus.emit(GameEvents.powerSelected, this.power);
    if (this.pendingUnlock) EventBus.emit(GameEvents.unlocked, this.pendingUnlock);
  }
}
