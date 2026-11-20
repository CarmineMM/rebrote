import * as Phaser from 'phaser';
import { BOARD, CREEPER, ECONOMY, ENEMIES, LIMITS, MINE } from '../config/balance';
import { cellAt, cellCenter, type BoardPoint, type Cell } from '../core/board';
import { isDefeated, isEnraged, spawnEnemy, stepCombat, type CombatEvent, type Enemy } from '../core/combat';
import { rollKillReward } from '../core/economy';
import {
  cardCost,
  cardElement,
  cardPlay,
  createMatch,
  earn,
  fusePlants,
  fusedPlant,
  fusionBlocker,
  fusionTargets,
  levelUpOffer,
  levelUpPlant,
  mineAt,
  plantAt,
  playCard,
  sownAt,
  sownMaxHp,
  type CardId,
  type MatchState,
  type Mine,
  type Plant,
} from '../core/match';
import { plantMaxHp } from '../core/plants';
import {
  ROUND_COUNT,
  availableCards,
  bossRoundIndex,
  createRound,
  infusableElements,
  infuseFeature,
  isBossPreparing,
  isBossRound,
  isUnlocked,
  isWon,
  roundScript,
  startAttack,
  stepRound,
  unlockRound,
  type RoundEvent,
} from '../core/rounds';
import { EventBus, GameEvents, type BossInfo, type CardPreview, type LossInfo, type PagePoint, type PlantPanel, type RoundInfo } from '../EventBus';
import { createAmbience, type Ambience } from '../view/ambience';
import { BoardLabel, drawArea, drawCell, type LabelLine } from '../view/boardMarks';
import { BulletView } from '../view/bulletView';
import { CreeperOmen, CreeperView, OMEN_LEAP_MS, bossLoadProgress } from '../view/creeperView';
import { Effects } from '../view/effects';
import { DRAG_LOOK, FusionDragView, dragGround } from '../view/fusionDragView';
import { DEPTH, SCENERY, entityDepth, perspective, viewFor } from '../view/layout';
import { medalTier, showsMedal } from '../view/levelMedal';
import { MineView, mineAreaColor, mineScale } from '../view/mineView';
import { PlantView, plantPlacement } from '../view/plantView';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../view/quality';
import { SpitView } from '../view/spitView';
import { MINE_SIZE, SHOOTER_SIZE, TEX, registerTextures, shooterTexture, mineTexture } from '../view/textures';
import { WormView, type EnemyView } from '../view/wormView';

/** Solo aspecto y ritmo de las animaciones. Los numeros de juego viven en balance.ts. */
const LOOK = {
  highlightOk: 0xfff7d6,
  highlightBlocked: 0xff5a5f,
  /** Casilla de una disparadora que se puede infundir, del color del elemento. */
  highlightInfuse: { fire: 0xffa04d, ice: 0x6cc4ff },
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
  /** Texto que salta sobre la planta al fusionar. */
  fusedText: { color: '#efffdf', stroke: '#24561c' },
  /** Casilla de la disparadora seleccionada para subirla de nivel (T-003): dorada, late despacio. */
  pickedColor: 0xffe36b,
  /** Donde se apoya el panel de nivel: sobre la cabeza y bajo los pies de la planta, en anchos de casilla. */
  panelAbove: 1.08,
  panelBelow: 0.14,
  /** Empieza el ataque de una ronda (T-007): aviso junto a los agujeros, en los colores de la corrupcion. */
  attackText: { color: '#b8ffd4', stroke: '#2b2034', fontSize: 44 },
  /** Ronda superada (T-007): texto en el centro del cesped. */
  clearedText: { color: '#fff6c0', stroke: '#24561c', fontSize: 48 },
  /** Partida ganada (T-007): tiempo de celebracion antes de que React muestre la victoria. */
  victoryDelayMs: 1600,
  /** Creeper (T-008): se escapa (en el camino) o lo derrotan (en el centro del cesped). */
  bossEscapedText: { color: '#ffd6df', stroke: '#5a0d1a', fontSize: 40 },
  bossDownText: '¡Creeper atrapado!',
  /** Copia que deja el Creeper al saltar: destello verde de "copiarse" sobre ella. */
  copyGlow: 0x39ff88,
} as const;

/** Atajos de desarrollo para probar las rondas. */
const DEBUG = {
  /** Lo que da la tecla M. */
  coins: 500,
} as const;

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

/** Planta pulsada con el boton aun abajo: si el puntero se mueve lo bastante, empieza a arrastrarse (T-006). */
interface PlantPress {
  cell: Cell;
  pointerId: number;
  x: number;
  y: number;
}

/** Arrastre en curso de una planta para fusionarla con otra (T-006). Mientras dura, la planta sigue en su casilla. */
interface PlantDrag {
  from: Cell;
  pointerId: number;
  /** Del punto pulsado a los pies de la planta, en anchos de casilla (ver `dragGround`). */
  grab: { x: number; y: number };
  view: FusionDragView;
  /** Casillas de las plantas con las que se puede fusionar ahora mismo. */
  targets: Cell[];
  /** Casilla bajo la planta arrastrada, si cae en el tablero. */
  over: Cell | null;
  /** Ancho de casilla de la ultima posicion valida (para cuando el puntero sale por encima del horizonte). */
  cellWidth: number;
}

/** Datos con los que arranca la escena (ver createGame). */
export interface BoardSceneData {
  quality: QualityLevel;
  /** Partida a continuar: se usa al cambiar el nivel grafico, que recrea el juego. */
  resume?: MatchState;
  /** Arrancar en pausa (por ejemplo, si se cambia la calidad desde el menu de pausa). */
  paused?: boolean;
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
  private plantViews = new Map<string, PlantView>();
  /** Vistas de los enemigos por id: gusanos (`WormView`) y el Creeper (`CreeperView`, T-008). */
  private wormViews = new Map<number, EnemyView>();
  /** Creeper preparandose a la derecha (T-008), mientras toca verlo. */
  private omen: CreeperOmen | null = null;
  /** La partida se perdio porque el Creeper cruzo el jardin (T-008). */
  private lostToBoss = false;
  /** Ultima barra del jefe enviada al HUD, para avisar solo cuando cambia. */
  private bossKey = '';
  private lastBoss: BossInfo | null = null;
  private bulletViews = new Map<number, BulletView>();
  private mineViews = new Map<string, MineView>();
  private spitViews = new Map<number, SpitView>();
  /** Rotulo sobre la disparadora a la que apunta una carta de elemento: lo que costaria infundirla o por que no se puede. */
  private cardLabel!: BoardLabel;
  /** Ultimo precio de infusion enviado al HUD, para avisar solo cuando cambia. */
  private previewKey = '';
  private passiveIncome?: Phaser.Time.TimerEvent;
  private press: PlantPress | null = null;
  private drag: PlantDrag | null = null;
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
  private fpsWindowStart = 0;
  private fpsFrames = 0;
  /** Pausa pedida por el HUD. Phaser marca la escena como activa al terminar create(): se aplica despues. */
  private wantPaused = false;
  private created = false;

  constructor() {
    super('BoardScene');
  }

  init(data: Partial<BoardSceneData>): void {
    this.level = data.quality ?? 'medium';
    this.quality = QUALITY_PROFILES[this.level];
    this.resume = data.resume;
    this.wantPaused = data.paused ?? false;
    this.created = false;
  }

  create(): void {
    this.match = this.resume ?? createMatch();
    this.selected = null;
    this.hoverCell = null;
    this.defeated = false;
    this.won = false;
    this.roundKey = '';
    this.press = null;
    this.drag = null;
    this.picked = null;
    this.panelKey = '';
    this.cursor = 'default';
    // Reiniciar la partida vuelve a pasar por aqui: nada de la anterior debe sobrevivir.
    this.plantViews = new Map();
    this.wormViews = new Map();
    this.bulletViews = new Map();
    this.mineViews = new Map();
    this.spitViews = new Map();
    this.previewKey = '';
    this.omen = null;
    this.lostToBoss = false;
    this.bossKey = '';
    this.lastBoss = null;

    registerTextures(this, this.quality.renderScale);
    this.fitView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitView, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitView, this));
    this.ambience = createAmbience(this, this.quality);
    this.applyPostFx();
    this.createCursorFeedback();
    this.fx = new Effects(this, this.quality);
    this.cardLabel = new BoardLabel(this, this.fx);
    this.restoreEntities();
    this.syncOmen(false);

    this.bindPointer();
    this.bindHud();
    this.passiveIncome = this.time.addEvent({
      delay: ECONOMY.passiveIntervalMs,
      loop: true,
      callback: () => this.credit(ECONOMY.passiveIncome),
    });
    if (import.meta.env.DEV) this.bindDebugKeys();
    this.fpsWindowStart = performance.now();
    this.fpsFrames = 0;

    this.events.once(Phaser.Scenes.Events.CREATE, () => {
      this.created = true;
      this.applyPause(this.wantPaused);
    });

    EventBus.emit(GameEvents.sceneReady, this.scene.key);
    this.emitState();
    // Una partida perdida (o ganada) que se recrea (por ejemplo, al cambiar la calidad) sigue igual.
    if (isDefeated(this.match)) this.enterDefeat(0);
    else if (isWon(this.match)) this.enterVictory(0);
  }

  /**
   * Pantalla completa sin bandas (ADR-0007): el lienzo toma la proporcion de la pantalla y la camara
   * muestra el diseno entero mas el decorado extra que haga falta. Todo sigue en coordenadas de diseno.
   */
  private fitView(): void {
    const { width: parentWidth, height: parentHeight } = this.scale.parentSize;
    const view = viewFor(parentWidth / parentHeight);
    const zoom = this.quality.renderScale;
    const width = Math.max(1, Math.round(view.width * zoom));
    const height = Math.max(1, Math.round(view.height * zoom));
    if (Math.abs(this.scale.width - width) > 1 || Math.abs(this.scale.height - height) > 1) {
      // Vuelve a emitir RESIZE; la segunda vez los tamanos ya coinciden y solo se recoloca la camara.
      this.scale.setGameSize(width, height);
      return;
    }
    this.cameras.main
      .setSize(this.scale.width, this.scale.height)
      .setZoom(zoom)
      .centerOn(view.x + view.width / 2, view.y + view.height / 2);
  }

  /** Congela la escena entera (temporizadores, tweens, particulas, input); se sigue viendo detras del menu. */
  private applyPause(paused: boolean): void {
    this.wantPaused = paused;
    if (!this.created) return;
    // Un arrastre a medias no sobrevive a la pausa: la planta vuelve a su casilla.
    if (paused) this.cancelDrag();
    if (paused && this.sys.isActive()) {
      this.scene.pause();
    } else if (!paused && this.sys.isPaused()) {
      this.scene.resume();
      // La pausa no cuenta como fotogramas lentos.
      this.fpsWindowStart = performance.now();
      this.fpsFrames = 0;
    }
  }

  /** Estado de la partida para continuarla en un juego nuevo (al cambiar el nivel grafico). */
  snapshot(): MatchState {
    return this.match;
  }

  update(_time: number, delta: number): void {
    this.ambience.update(delta);
    this.drag?.view.update(delta);
    if (!this.defeated && !this.won) this.advance(delta);
    // El panel sigue a la planta aunque cambie la ventana (pantalla completa, giro del movil...).
    if (this.picked) this.emitPlantPanel();
    this.sampleFps();
  }

  /** Cada segundo real avisa al HUD de los fps (contador y modo automatico de ADR-0006). */
  private sampleFps(): void {
    this.fpsFrames++;
    const now = performance.now();
    const elapsed = now - this.fpsWindowStart;
    if (elapsed < 1000) return;
    EventBus.emit(GameEvents.fpsSampled, Math.round((this.fpsFrames * 1000) / elapsed));
    this.fpsWindowStart = now;
    this.fpsFrames = 0;
  }

  /**
   * Recompensa por enemigo eliminado en `at` (punto del tablero).
   * La mayoria de las veces se cobra sola; a veces la moneda queda en el suelo.
   */
  rewardKill(at: BoardPoint, random?: () => number): void {
    const reward = rollKillReward(undefined, random);
    if (reward.kind === 'auto') {
      this.credit(reward.amount, at);
    } else {
      this.spawnDroppedCoin(at, reward.amount);
    }
  }

  // -------------------------------------------------------------------------
  // Preparacion

  /**
   * Ultra: color algo mas vivo y una vineta muy suave que centra la mirada en el cesped.
   * Ambos filtros leen un pixel por pixel. Se descarto el tilt-shift: 100 lecturas por pixel a doble resolucion.
   */
  private applyPostFx(): void {
    if (!this.quality.postFx) return;
    const filters = this.cameras.main.filters.external;
    const grade = filters.addColorMatrix();
    grade.colorMatrix.saturate(0.18);
    grade.colorMatrix.brightness(1.03, true);
    // En la vineta de Phaser el oscurecimiento crece casi en linea desde el centro: fuerza baja o apaga la escena.
    filters.addVignette(0.5, 0.55, 0.75, 0.07, 0x10240f);
  }

  /** Al continuar una partida, vuelve a pintar plantas, minas, gusanos y balas donde estaban. */
  private restoreEntities(): void {
    this.match.plants.forEach((lane, laneIndex) =>
      lane.forEach((sown, col) => {
        if (sown?.kind === 'shooter') this.addPlantView({ lane: laneIndex, col }, sown, false);
        if (sown?.kind === 'mine') this.addMineView({ lane: laneIndex, col }, sown, false);
      }),
    );
    this.match.enemies.forEach((enemy) => this.addWormView(enemy, false));
    this.match.bullets.forEach((bullet) => this.bulletViews.set(bullet.id, new BulletView(this, this.fx, bullet, false)));
    this.match.spits.forEach((spit) => this.spitViews.set(spit.id, new SpitView(this, this.fx, spit, false)));
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
  }

  private bindPointer(): void {
    this.input.mouse?.disableContextMenu();

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (this.drag) {
        if (pointer.id === this.drag.pointerId) this.moveDrag(pointer);
        return;
      }
      const press = this.press;
      if (press && pointer.id === press.pointerId) {
        if (!pointer.isDown) {
          this.press = null;
        } else if (
          this.canDragPlants() &&
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
      if (!this.drag) this.hover(null);
    });

    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (pointer.rightButtonDown()) {
          this.cancelDrag();
          this.select(null);
          this.pickPlant(null);
          return;
        }
        // Un clic sobre una moneda la recoge; no debe sembrar en la casilla de debajo.
        if (over.length > 0 || this.drag) return;
        // Sin carta elegida, pulsar una planta la prepara para arrastrarla (T-006) o, si se suelta sin moverla,
        // para seleccionarla (T-003). Cada gesto, solo si su ronda ya lo desbloqueo (T-007).
        const plantCell =
          this.canDragPlants() || this.canPickPlants() ? this.plantCellAtScreen(pointer.worldX, pointer.worldY) : null;
        if (plantCell) {
          this.press = { cell: plantCell, pointerId: pointer.id, x: pointer.worldX, y: pointer.worldY };
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
        // Pulsar y soltar una planta sin arrastrarla la selecciona (otra vez, la deselecciona).
        if (inside && this.canPickPlants() && plantAt(this.match, press.cell)) {
          this.pickPlant(sameCell(this.picked, press.cell) ? null : press.cell);
        }
      }
      if (this.drag?.pointerId === pointer.id) this.dropDrag(pointer);
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
      this.select(card);
    };
    const onCancelled = () => {
      this.select(null);
      this.pickPlant(null);
    };
    const onLevelUp = () => running() && this.tryLevelUp();
    const onAttack = () => {
      if (!running()) return;
      this.match = startAttack(this.match);
      this.emitRound();
    };
    const onDragged = (point: PagePoint) => running() && this.hover(this.cardCellAtPage(point));
    const onDropped = (point: PagePoint) => {
      if (!running()) return;
      const cell = this.cardCellAtPage(point);
      // Soltar fuera del tablero (o un simple clic en la carta) no cobra ni siembra: la carta sigue elegida.
      if (cell) this.tryPlay(cell);
    };
    const onStateRequested = () => this.emitState();
    const onPause = (paused: boolean) => this.applyPause(paused);
    // Partida nueva desde cero: no continua la anterior (sin `resume`) y arranca sin pausa.
    const onRestart = () => this.scene.restart({ quality: this.level } satisfies BoardSceneData);

    EventBus.on(GameEvents.cardPicked, onPicked);
    EventBus.on(GameEvents.selectionCancelled, onCancelled);
    EventBus.on(GameEvents.levelUpRequested, onLevelUp);
    EventBus.on(GameEvents.attackRequested, onAttack);
    EventBus.on(GameEvents.cardDragged, onDragged);
    EventBus.on(GameEvents.cardDropped, onDropped);
    EventBus.on(GameEvents.stateRequested, onStateRequested);
    EventBus.on(GameEvents.pauseChanged, onPause);
    EventBus.on(GameEvents.restartRequested, onRestart);

    const unbind = () => {
      EventBus.off(GameEvents.cardPicked, onPicked);
      EventBus.off(GameEvents.selectionCancelled, onCancelled);
      EventBus.off(GameEvents.levelUpRequested, onLevelUp);
      EventBus.off(GameEvents.attackRequested, onAttack);
      EventBus.off(GameEvents.cardDragged, onDragged);
      EventBus.off(GameEvents.cardDropped, onDropped);
      EventBus.off(GameEvents.stateRequested, onStateRequested);
      EventBus.off(GameEvents.pauseChanged, onPause);
      EventBus.off(GameEvents.restartRequested, onRestart);
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
  }

  /** Pasa a la preparacion de la ronda siguiente sin esperar; los enemigos que hubiera siguen ahi. */
  private skipRound(): void {
    const next = this.match.round.index + 1;
    if (this.defeated || this.won || next >= ROUND_COUNT) return;
    this.match = { ...this.match, round: createRound(next) };
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
   * Avanza la partida: la ronda cuenta su preparacion y saca sus enemigos (T-007), se mueve el combate, se animan
   * los eventos y se recolocan las vistas.
   */
  private advance(delta: number): void {
    const round = stepRound(this.match, delta, SCENERY.holeX);
    this.match = round.state;
    this.showSpawned(round.spawned);
    round.events.forEach((event) => this.showRoundEvent(event));

    const livesBefore = this.match.lives;
    const { state, events } = stepCombat(this.match, delta);
    this.match = state;
    events.forEach((event) => this.showEvent(event));

    for (const enemy of this.match.enemies) this.wormViews.get(enemy.id)?.sync(enemy);
    for (const bullet of this.match.bullets) this.bulletViews.get(bullet.id)?.sync(bullet);
    for (const spit of this.match.spits) this.spitViews.get(spit.id)?.sync(spit);
    this.mineViews.forEach((view, key) => {
      const mine = mineAt(this.match, keyCell(key));
      if (mine) view.sync(mine);
    });
    if (this.match.lives !== livesBefore) this.emitLives();
    this.syncOmen(true);
    this.emitRound();
    this.emitBoss();
    if (isDefeated(this.match)) this.enterDefeat(LOOK.defeatDelayMs);
  }

  /**
   * Enemigos que acaban de salir por su agujero. El Creeper (T-008) salta desde donde se preparaba y sale del suelo al
   * caer; a los acelerados de las rondas 8 y 9 les llega un chispazo suyo.
   */
  private showSpawned(spawned: readonly Enemy[]): void {
    for (const enemy of spawned) {
      if (enemy.kind === 'creeper' && this.omen) {
        this.omen.leapTo({ x: enemy.x, y: enemy.lane + 0.64 });
        this.omen = null;
        this.addWormView(enemy, true, OMEN_LEAP_MS);
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
    if (wanted && !this.omen) this.omen = new CreeperOmen(this, this.fx, bossLoadProgress(this.match), animate);
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
        if (event.index + 1 < ROUND_COUNT) this.celebrate(`¡Ronda ${event.index + 1} superada!`);
        break;
      case 'won':
        this.enterVictory(LOOK.victoryDelayMs);
        break;
      case 'roundStarted':
        // Lo recien desbloqueado puede cambiar lo que pasa al soltar la carta elegida (infundir).
        this.refreshHighlight();
        break;
    }
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
    this.fx.floatText('¡Ahí vienen!', at.x, at.y, LOOK.attackText);
  }

  /** Ronda superada: las plantas dan un saltito una tras otra, con destellos, y sale el texto en el centro. */
  private celebrate(text: string): void {
    this.plantViews.forEach((view, key) => {
      const { col } = keyCell(key);
      // Si muere antes de su turno, ya no salta.
      this.time.delayedCall(col * 70, () => this.plantViews.get(key) === view && view.beckon());
    });
    const center = perspective.toScreen({ x: BOARD.columns / 2, y: BOARD.lanes / 2 });
    this.fx.floatText(text, center.x, center.y, LOOK.clearedText);
    this.fx.sparkles(center.x, center.y, 18);
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
      case 'plantDestroyed': {
        const key = cellKey(event.cell);
        // Una disparadora o una mina (que asi no explota).
        this.plantViews.get(key)?.die();
        this.plantViews.delete(key);
        this.mineViews.get(key)?.die();
        this.mineViews.delete(key);
        // La casilla vuelve a estar libre: si hay una carta elegida, el resaltado cambia.
        this.refreshHighlight();
        this.plantLostDuringDrag(event.cell);
        // Si era la seleccionada, su panel se cierra.
        if (sameCell(this.picked, event.cell)) this.pickPlant(null);
        break;
      }
      case 'mineArmed':
        this.mineViews.get(cellKey(event.cell))?.arm();
        break;
      case 'mineExploded': {
        const key = cellKey(event.cell);
        this.mineViews.get(key)?.explode();
        this.mineViews.delete(key);
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
        if (view instanceof CreeperView) this.cameras.main.shake(380, 0.008);
        this.rewardKill(event.at);
        break;
      }
      case 'enemyEscaped':
        this.wormViews.get(event.enemyId)?.escape();
        this.wormViews.delete(event.enemyId);
        if (event.kind === 'creeper') this.showBossEscaped(event.lane);
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
    }
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

  /** El Creeper cruzo el jardin (T-008): la partida se pierde en el acto, con un temblor fuerte. */
  private showBossEscaped(lane: number): void {
    this.lostToBoss = true;
    const at = perspective.toScreen({ x: LOOK.lifeLostX, y: lane + 0.5 });
    this.fx.floatText('¡Se escapó!', at.x + 40, at.y - perspective.cellWidthAt({ x: LOOK.lifeLostX, y: lane + 0.5 }) * 0.8, LOOK.bossEscapedText);
    this.cameras.main.shake(420, 0.008);
  }

  /** Una planta o una mina pierde vida (mordisco o escupitajo): se encoge y destella; la planta amarillea. */
  private sownHurt(cell: Cell): void {
    const sown = sownAt(this.match, cell);
    this.plantViews.get(cellKey(cell))?.bitten(sown ? sown.hp / sownMaxHp(sown) : 0);
    this.mineViews.get(cellKey(cell))?.bitten();
  }

  private addWormView(enemy: Enemy, emerge: boolean, emergeDelayMs = 0): void {
    const view =
      enemy.kind === 'creeper'
        ? new CreeperView(this, this.fx, enemy, emerge, emergeDelayMs)
        : new WormView(this, this.fx, enemy, emerge, emergeDelayMs);
    this.wormViews.set(enemy.id, view);
  }

  private addPlantView(cell: Cell, plant: Plant, sprout: boolean): void {
    const view = new PlantView(this, this.fx, cell, plant.shooter, plant.hp / plantMaxHp(plant.shooter), sprout);
    this.plantViews.set(cellKey(cell), view);
  }

  private addMineView(cell: Cell, mine: Mine, sprout: boolean): void {
    this.mineViews.set(cellKey(cell), new MineView(this, this.fx, mine.element, cell, mine, sprout));
  }

  /** Un gusano se colo: aviso en el camino y un temblor corto. React quita el corazon. */
  private showLifeLost(lane: number): void {
    const at = perspective.toScreen({ x: LOOK.lifeLostX, y: lane + 0.5 });
    this.fx.floatText('−1 ♥', at.x, at.y - perspective.cellWidthAt({ x: LOOK.lifeLostX, y: lane + 0.5 }) * 0.6, LOOK.lifeLostText);
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
    this.press = null;
    this.setCursor('default');
    this.select(null);
    this.pickPlant(null);
    this.passiveIncome?.remove();
    this.clearProjectiles();
    this.wormViews.forEach((worm) => worm.cheer());
    const loss: LossInfo = { byBoss: this.lostToBoss };
    this.time.delayedCall(delayMs, () => EventBus.emit(GameEvents.matchLost, loss));
  }

  /**
   * Superada la ultima ronda (T-007): el combate y el goteo se detienen, las plantas celebran en oleada con hojas y
   * destellos por el cesped, y al cabo de `delayMs` React muestra la victoria (provisional hasta el jefe, T-008).
   */
  private enterVictory(delayMs: number): void {
    if (this.won) return;
    this.won = true;
    this.cancelDrag();
    this.press = null;
    this.setCursor('default');
    this.select(null);
    this.pickPlant(null);
    this.passiveIncome?.remove();
    this.clearProjectiles();
    this.omen?.vanish();
    this.omen = null;
    this.emitRound();
    this.emitBoss();
    if (delayMs > 0) {
      this.celebrate(isBossRound(this.match.round.index) ? LOOK.bossDownText : '¡Jardín a salvo!');
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(180 + i * 190, () => {
          const at = perspective.toScreen({ x: Phaser.Math.FloatBetween(1, BOARD.columns - 1), y: Phaser.Math.FloatBetween(0.5, BOARD.lanes - 0.5) });
          this.fx.sparkles(at.x, at.y, 10);
          this.fx.leaves(at.x, at.y, 6);
        });
      }
    }
    this.time.delayedCall(delayMs, () => EventBus.emit(GameEvents.matchWon));
  }

  /** Balas y escupitajos en vuelo se apagan (la partida acabo y ya no se mueven). */
  private clearProjectiles(): void {
    this.bulletViews.forEach((bullet) => bullet.vanish());
    this.bulletViews.clear();
    this.spitViews.forEach((spit) => spit.vanish());
    this.spitViews.clear();
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
   * - Sembrar: casilla clara con la planta o la mina fantasma (la mina, con el alcance de su explosion).
   * - Infundir: casilla del color del elemento y rotulo con el precio ("Infundir: x3 = 225"); el HUD muestra el mismo precio (D-04).
   * - No se puede: casilla roja, y sobre una disparadora, el motivo.
   */
  private refreshHighlight(): void {
    const card = this.selected;
    const cell = this.hoverCell;
    this.highlight.clear();
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
      if (element) drawArea(this.highlight, cellCenter(cell), MINE.blastRadius, mineAreaColor(element), 0.1, 2);
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
    const unlocksAt = element ? unlockRound(infuseFeature(element)) : null;
    const lines: LabelLine[] =
      play.blocker === 'locked'
        ? [{ text: unlocksAt === null ? 'No se puede infundir' : `Infundir: desde la ronda ${unlocksAt + 1}`, tone: 'blocked' }]
        : play.blocker === 'has-element'
          ? [{ text: `Ya tiene ${plant.shooter.element === 'fire' ? 'fuego' : 'hielo'}`, tone: 'blocked' }]
          : play.blocker === 'insufficient-funds'
            ? [
                { text: `Infundir: ${price}`, tone: 'blocked' },
                { text: 'No alcanza la moneda', tone: 'blocked' },
              ]
            : [{ text: `Infundir: ${price}`, tone: 'ok' }];
    const foot = view.foot();
    const { cellWidth } = plantPlacement(cell);
    this.cardLabel.show(`${cellKey(cell)}:${lines.map((l) => l.text).join('|')}`, lines, foot.x, foot.y - cellWidth * 1.12, cellWidth);
    this.emitPreview(
      play.blocker === 'has-element' || play.blocker === 'locked'
        ? null
        : { card, multiplier: play.multiplier, cost: play.cost, affordable: play.blocker !== 'insufficient-funds' },
    );
  }

  /** Planta o mina fantasma: donde quedara lo que se siembra con `card`. */
  private showGhost(cell: Cell, card: CardId): void {
    const { screen, scale, cellWidth } = plantPlacement(cell);
    const element = cardElement(card);
    if (element) {
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

  /** Juega la carta elegida en la casilla si se puede (sembrar o infundir), cobra y suelta la carta. */
  private tryPlay(cell: Cell | null): void {
    const card = this.selected;
    if (this.defeated || this.won || !card || !cell) return;
    const { action, blocker } = cardPlay(this.match, card, cell);
    if (blocker) return;
    this.match = playCard(this.match, card, cell);
    const element = cardElement(card);
    const sown = sownAt(this.match, cell);
    if (action === 'infuse' && element) {
      this.plantViews.get(cellKey(cell))?.infuse(element);
    } else if (sown?.kind === 'mine') {
      this.addMineView(cell, sown, true);
    } else if (sown?.kind === 'shooter') {
      this.addPlantView(cell, sown, true);
    }
    this.select(null);
    this.emitBalance();
  }

  // -------------------------------------------------------------------------
  // Fusionar por arrastre (T-006). Las reglas son de core (fusionBlocker, fusionTargets, fusePlants);
  // aqui se lleva el puntero y se anima.

  /** Las plantas se tocan (para arrastrarlas o seleccionarlas) sin carta elegida y con la partida en juego. */
  private canTouchPlants(): boolean {
    return !this.selected && !this.defeated && !this.won && this.sys.isActive();
  }

  /** Arrastrar para fusionar, desde la ronda que lo desbloquea (T-007). */
  private canDragPlants(): boolean {
    return this.canTouchPlants() && isUnlocked(this.match, 'fuse');
  }

  /** Seleccionar para subir de nivel, desde la ronda que lo desbloquea (T-007). */
  private canPickPlants(): boolean {
    return this.canTouchPlants() && isUnlocked(this.match, 'levelUp');
  }

  /** Cursor sobre una planta: mano para arrastrarla, o dedo si solo se puede seleccionar. */
  private plantCursor(x: number, y: number): string {
    const canDrag = this.canDragPlants();
    if (!canDrag && !this.canPickPlants()) return 'default';
    if (!this.plantCellAtScreen(x, y)) return 'default';
    return canDrag ? 'grab' : 'pointer';
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

  /** Empieza el arrastre: la planta sale a la mano, sus destinos se marcan en verde y el resto se atenua. */
  private startDrag(pointer: Phaser.Input.Pointer): void {
    const press = this.press;
    this.press = null;
    if (!press) return;
    const plant = plantAt(this.match, press.cell);
    const view = this.plantViews.get(cellKey(press.cell));
    if (!plant || !view) return;
    // Arrastrar cierra el panel de nivel (de esta o de otra planta).
    this.pickPlant(null);

    const { cellWidth } = plantPlacement(press.cell);
    const foot = view.foot();
    const grab = { x: (foot.x - press.x) / cellWidth, y: (foot.y - press.y) / cellWidth };
    const targets = fusionTargets(this.match, press.cell);
    const dragView = new FusionDragView(this, this.fx, plant.shooter, foot, cellWidth);
    this.drag = { from: press.cell, pointerId: pointer.id, grab, view: dragView, targets, over: null, cellWidth };
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
    const blocker = fusionBlocker(this.match, drag.from, to);
    if (blocker === null) {
      const source = plantAt(this.match, drag.from) as Plant;
      const target = plantAt(this.match, to) as Plant;
      const result = fusedPlant(source, target).shooter;
      const lines: LabelLine[] = [{ text: `Fusionar: ${result.cannons} cañones`, tone: 'ok' }];
      // Aviso de perdida de nivel: el resultado se queda con el nivel mas bajo de las dos.
      if (source.shooter.level !== target.shooter.level) lines.push({ text: `Quedará en nivel ${result.level}`, tone: 'warn' });
      drag.view.hover(to, 'ok', lines, toView.foot());
    } else if (blocker === 'variant') {
      drag.view.hover(to, 'blocked', [{ text: 'Otra variante', tone: 'blocked' }], toView.foot());
    } else if (blocker === 'max-cannons') {
      drag.view.hover(to, 'blocked', [{ text: `Máximo ${LIMITS.maxCannons} cañones`, tone: 'blocked' }], toView.foot());
    } else {
      // Su propia casilla: soltar ahi no hace nada.
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
    this.fx.floatText('¡Fusión!', foot.x, foot.y - cellWidth * 1.05, LOOK.fusedText);
    this.refreshHighlight();
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

  /** La planta de la mano vuelve volando a su casilla y la de la casilla recupera su aspecto. */
  private returnDrag(drag: PlantDrag): void {
    const key = cellKey(drag.from);
    const view = this.plantViews.get(key);
    if (!view) {
      drag.view.poof();
      return;
    }
    drag.view.returnTo(view.foot(), plantPlacement(drag.from).cellWidth, () => {
      // Si mientras volaba murio o se empezo a arrastrar otra vez, no hay nada que devolver.
      if (this.plantViews.get(key) === view && !sameCell(this.drag?.from ?? null, drag.from)) view.setLifted(false);
    });
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
    drag.targets = fusionTargets(this.match, drag.from);
    drag.view.showTargets(drag.targets);
    this.refreshDragHover();
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
    }
    this.emitPlantPanel();
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
  }

  /** Avisa al HUD de como esta el panel de la planta seleccionada (o de que se cerro), solo si cambia. */
  private emitPlantPanel(): void {
    const cell = this.picked;
    const offer = cell ? levelUpOffer(this.match, cell) : null;
    const view = cell ? this.plantViews.get(cellKey(cell)) : undefined;
    let panel: PlantPanel | null = null;
    if (cell && offer && view) {
      const foot = view.foot();
      const { cellWidth } = plantPlacement(cell);
      panel = {
        id: cellKey(cell),
        level: offer.level,
        cost: offer.cost,
        multiplier: offer.multiplier,
        affordable: offer.blocker === null,
        medalTier: showsMedal(offer.level) ? medalTier(offer.level) : null,
        above: this.worldToPage(foot.x, foot.y - cellWidth * LOOK.panelAbove),
        below: this.worldToPage(foot.x, foot.y + cellWidth * LOOK.panelBelow),
      };
    }
    const key = panel ? JSON.stringify(panel) : '';
    if (key === this.panelKey) return;
    this.panelKey = key;
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
  // Monedas

  /** Moneda en el suelo: se cobra (con el extra ya incluido en `amount`) solo si el jugador hace clic. */
  private spawnDroppedCoin(at: BoardPoint, amount: number): void {
    const cellWidth = perspective.cellWidthAt(at);
    const ground = perspective.toScreen(at);
    const size = cellWidth * LOOK.coinSize;
    const hover = cellWidth * LOOK.coinHover;
    const landX = ground.x + Phaser.Math.FloatBetween(-0.25, 0.25) * cellWidth;
    const restY = ground.y - hover;
    const depth = entityDepth(ground.y) + 0.6;

    const shadow = this.add
      .image(landX, ground.y, TEX.shadow)
      .setDisplaySize(size * 1.2, size * 0.38)
      .setAlpha(0)
      .setDepth(depth - 0.5);
    const glow = this.add
      .image(landX, restY, TEX.glow)
      .setDisplaySize(size * 2.4, size * 2.4)
      .setTint(0xffe27a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setVisible(this.quality.glows)
      .setDepth(depth - 0.2);
    const coin = this.add.image(ground.x, restY, TEX.coin).setDisplaySize(size, size).setDepth(depth);
    const label = this.add
      .text(landX, restY - size * 0.95, `+${amount}`, this.fx.textStyle({ fontSize: Math.round(size * 0.5) }))
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(depth + 0.1);
    // La moneda gira estrechandose; el clic lo recibe una zona fija y algo mas grande para que sea facil acertar.
    const hit = this.add.zone(landX, restY, size * 1.6, size * 1.6).setDepth(depth + 0.2);
    const parts = [shadow, glow, coin, label, hit];
    const coinScale = coin.scaleX;

    let collected = false;
    const startIdle = () => {
      if (collected) return;
      hit.setInteractive({ useHandCursor: true });
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
      blink.remove();
      expire.remove();
      this.tweens.killTweensOf(parts);
      [shadow, glow, label, hit].forEach((part) => part.destroy());
      coin.setScale(coinScale);
      this.credit(amount);
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
    this.emitBalance();
    // Si hay una carta elegida, el saldo nuevo puede cambiar el color del resaltado.
    this.refreshHighlight();
    if (at) {
      const ground = perspective.toScreen(at);
      this.fx.floatText(`+${amount}`, ground.x, ground.y - perspective.cellWidthAt(at) * 0.8);
      this.spawnAutoCoin(at);
    }
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
    const { round } = this.match;
    const bossRound = bossRoundIndex();
    const info: RoundInfo = {
      number: round.index + 1,
      total: ROUND_COUNT,
      bossRound: bossRound === null ? null : bossRound + 1,
      phase: round.phase,
      prepSeconds: round.phase === 'prep' ? Math.ceil(round.prepMs / 1000) : null,
      cards: availableCards(this.match),
      infusable: infusableElements(this.match),
      notice: roundScript(round.index).notice,
    };
    const key = JSON.stringify(info);
    if (key === this.roundKey) return;
    this.roundKey = key;
    EventBus.emit(GameEvents.roundChanged, info);
  }

  /**
   * Avisa al HUD de la vida y la fase del Creeper (T-008), solo si cambian. Derrotado, la barra se queda a 0 hasta la
   * victoria; si se escapo, se queda como estaba.
   */
  private emitBoss(): void {
    const boss = this.match.enemies.find((enemy) => enemy.kind === 'creeper');
    let info: BossInfo | null = this.lastBoss;
    if (boss) {
      info = {
        name: 'Creeper',
        hp: Math.max(0, Math.ceil(boss.hp)),
        maxHp: ENEMIES.creeper.hp,
        enraged: isEnraged(boss),
        jumpAt: [...CREEPER.jumpAt],
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

  private emitState(): void {
    this.emitBalance();
    this.emitLives();
    this.roundKey = '';
    this.emitRound();
    this.bossKey = '';
    this.emitBoss();
    EventBus.emit(GameEvents.selectionChanged, this.selected);
    // El precio de infusion que tuviera el HUD era de la escena anterior (por ejemplo, al cambiar la calidad).
    this.previewKey = '';
    EventBus.emit(GameEvents.cardPreview, null);
    this.panelKey = 'stale';
    this.emitPlantPanel();
  }
}
