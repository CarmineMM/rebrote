import * as Phaser from 'phaser';
import { combatCues, mineTicks } from '../audio/cues';
import { sfx } from '../audio/sfx';
import { panAt } from '../audio/voices';
import { BOARD, ENEMIES, MINE } from '../config/balance';
import type { Cell } from '../core/board';
import { enemyMaxHp, spawnEnemy, stepCombat, type CombatEvent, type Enemy, type EnemyKind } from '../core/combat';
import { createMatch, createMine, createPlant, sownAt, sownMaxHp, type MatchState, type Sown } from '../core/match';
import type { CannonCount, ElementType } from '../core/plants';
import { text } from '../../i18n';
import { BulletView } from './bulletView';
import { CreeperView } from './creeperView';
import type { Effects } from './effects';
import { MineView } from './mineView';
import { PlantView } from './plantView';
import { SHOOTER, type ShooterDesign } from './shooterShape';
import { SpitView } from './spitView';
import { WormView, type EnemyView } from './wormView';

/**
 * Portada del menu de inicio (T-011, I-01 e I-12): Creeper, algunos gusanos y plantas en plena batalla sobre el cesped,
 * a la izquierda, bajo el titulo. Todo se mueve como en el juego pero nadie se desplaza.
 *
 * Es el combate de verdad (`stepCombat`, ADR-0008) con un reparto fijo: las plantas disparan, las semillas dan, el
 * gusano muerde, el escupidor escupe, el fuego quema y el hielo frena. Tras cada paso cada enemigo vuelve a su sitio y
 * todos recuperan la vida: nadie avanza, nadie muere y nada se rompe. Los que "andan" ondulan en su sitio, como en una
 * cinta (`stride` de `WormView.sync`). Responde al clic: la planta dispara, el gusano se queja, Creeper habla y la mina
 * explota y vuelve a brotar.
 */

/** Aspecto y ritmo de la portada. No son numeros de balance: los del combate salen de `balance.ts`. */
export const COVER_LOOK = {
  /** Creeper se presenta al salir (su frase de entrada) y despues suelta otra cada tanto. */
  tauntEveryMs: 9000,
  tauntLifeMs: 2800,
  /** Lo que tarda en volver a brotar una mina que exploto. */
  mineRegrowMs: 3500,
  /** "¡Ay!" del gusano al que se le hace clic. */
  ouchText: { color: '#ffe3f0', stroke: '#4a2a7a', fontSize: 30 },
} as const;

export interface PlantSpot {
  cell: Cell;
  cannons: CannonCount;
  element: ElementType | null;
  level: number;
  /** Forma con la que se pinta (T-016): la del juego si no se dice. Solo la cambia la galeria de propuestas. */
  design?: ShooterDesign;
}

export interface EnemySpot {
  kind: EnemyKind;
  lane: number;
  /** Donde se queda, en casillas. Los que muerden o escupen, a su distancia de la planta (ver `engagedX`). */
  x: number;
  level?: number;
  haste?: number;
}

/**
 * Donde se para un enemigo que ataca a lo sembrado en `col`: el que muerde, a su alcance; el escupidor, a su distancia.
 * Un pelo mas cerca para que la regla lo de por enganchado.
 */
export function engagedX(kind: EnemyKind, col: number): number {
  const stats = ENEMIES[kind];
  const reach = stats.attack === 'spit' ? stats.range : stats.reach;
  return col + 0.5 + reach - 0.05;
}

/** Reparto de una batalla de portada: plantas, minas y enemigos, cada uno en su sitio. */
export interface CoverCast {
  plants: PlantSpot[];
  mines: Array<{ cell: Cell; element: ElementType }>;
  enemies: EnemySpot[];
}

/**
 * Reparto: una disparadora por carril (de hielo, normal de 2 canones, de fuego de 3, normal y de hielo de 2), una mina de
 * fuego delante y, enfrente, el escupidor, un gusano acelerado, Creeper, un gusano que muerde y un acorazado. Las minas
 * quedan lejos de los enemigos para que no se armen solas.
 */
const CAST: CoverCast = {
  plants: [
    { cell: { lane: 0, col: 0 }, cannons: 1, element: 'ice', level: 1 },
    { cell: { lane: 1, col: 1 }, cannons: 2, element: null, level: 5 },
    { cell: { lane: 2, col: 0 }, cannons: 3, element: 'fire', level: 10 },
    { cell: { lane: 3, col: 2 }, cannons: 1, element: null, level: 3 },
    { cell: { lane: 4, col: 0 }, cannons: 2, element: 'ice', level: 2 },
  ],
  mines: [{ cell: { lane: 4, col: 2 }, element: 'fire' }],
  enemies: [
    { kind: 'spitter', lane: 0, x: engagedX('spitter', 0), level: 3 },
    { kind: 'worm', lane: 1, x: 3.4, level: 2, haste: 1.25 },
    { kind: 'creeper', lane: 2, x: 4.9 },
    { kind: 'worm', lane: 3, x: engagedX('worm', 2), level: 4 },
    { kind: 'armored', lane: 4, x: 4.6, level: 7 },
  ],
};

const cellKey = (cell: Cell) => `${cell.lane}:${cell.col}`;

/** Lo que responde al clic en la portada: un enemigo o lo sembrado en una casilla. */
type CoverTarget = { kind: 'enemy'; id: number } | { kind: 'sown'; cell: Cell };

export class TitleCover {
  private state: MatchState;
  /** Donde se queda cada enemigo (por id). */
  private readonly anchors = new Map<number, number>();
  /** Lo que lleva "andado" cada enemigo sin moverse, para que ondule (por id). */
  private readonly strides = new Map<number, number>();
  private readonly enemyViews = new Map<number, EnemyView>();
  private readonly plantViews = new Map<string, PlantView>();
  private readonly mineViews = new Map<string, MineView>();
  private readonly bulletViews = new Map<number, BulletView>();
  private readonly spitViews = new Map<number, SpitView>();
  /** La primera frase de portada es la de entrada, que ya dice al salir: se empieza por la segunda. */
  private taunts = 1;
  /**
   * En la portada solo suena lo que el jugador pulsa (T-014, S-04): las plantas pulsadas hacen sonar su siguiente disparo,
   * y sus semillas, el impacto. Las minas solo se arman con un clic, asi que su cuenta atras y su explosion suenan.
   */
  private readonly voicedCells = new Set<string>();
  private readonly voicedBullets = new Set<number>();
  private cursor = 'default';
  /** Forma de cada disparadora del reparto (por casilla). */
  private readonly designs = new Map<string, ShooterDesign>();

  /**
   * `cast` cambia el reparto: la galeria de propuestas de la disparadora (T-016) monta asi su batalla, con la forma de
   * cada planta en su `design`.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    cast: CoverCast = CAST,
  ) {
    let state = createMatch();
    const plants = state.plants.map((lane) => [...lane]);
    cast.plants.forEach(({ cell, cannons, element, level, design }, i) => {
      // Cada una empieza a disparar a su hora: que no vayan todas a la vez.
      const plant = createPlant({ cannons, element, level });
      plants[cell.lane][cell.col] = { ...plant, reloadMs: 250 + i * 330 };
      this.designs.set(cellKey(cell), design ?? SHOOTER);
    });
    cast.mines.forEach(({ cell, element }) => (plants[cell.lane][cell.col] = createMine(element)));
    state = { ...state, plants };
    for (const spot of cast.enemies) {
      state = spawnEnemy(state, spot.kind, spot.lane, spot.x, undefined, spot.haste ?? 1, spot.level ?? 1);
      const enemy = state.enemies[state.enemies.length - 1];
      this.anchors.set(enemy.id, enemy.x);
      this.strides.set(enemy.id, 0);
    }
    this.state = state;

    // Todo brota a la vez al abrir el menu, con un poco de desfase, como al empezar una partida.
    plants.forEach((lane, laneIndex) =>
      lane.forEach((sown, col) => {
        if (sown) this.addSown({ lane: laneIndex, col }, sown, true);
      }),
    );
    state.enemies.forEach((enemy, i) => this.addEnemy(enemy, i * 140));

    scene.time.addEvent({ delay: COVER_LOOK.tauntEveryMs, loop: true, callback: () => this.taunt() });
  }

  /** Avanza el combate, anima lo que paso y devuelve a todos a su sitio con la vida llena. */
  update(deltaMs: number): void {
    const before = this.state;
    const { state, events } = stepCombat(this.state, deltaMs);
    // Las reacciones (planta que amarillea al morderla) leen la vida antes de recuperarla.
    events.forEach((event) => this.show(event, state));
    sfx.playCues(combatCues(this.voicedEvents(events), before));
    sfx.playCues(mineTicks(before, state));
    this.state = this.pin(state, deltaMs);

    for (const enemy of this.state.enemies) this.enemyViews.get(enemy.id)?.sync(enemy, this.strides.get(enemy.id) ?? 0);
    for (const bullet of this.state.bullets) this.bulletViews.get(bullet.id)?.sync(bullet);
    for (const spit of this.state.spits) this.spitViews.get(spit.id)?.sync(spit);
    this.mineViews.forEach((view, key) => {
      const [lane, col] = key.split(':').map(Number);
      const sown = sownAt(this.state, { lane, col });
      if (sown?.kind === 'mine') view.sync(sown);
    });
  }

  /** Clic en la portada (coordenadas del mundo). */
  press(x: number, y: number): void {
    const target = this.targetAt(x, y);
    if (!target) return;
    if (target.kind === 'enemy') {
      const view = this.enemyViews.get(target.id);
      const enemy = this.state.enemies.find((e) => e.id === target.id);
      const pan = panAt(enemy?.x ?? BOARD.columns / 2, BOARD.columns);
      if (view instanceof CreeperView) {
        view.hit();
        sfx.play('hit', pan);
        this.taunt(true);
      } else if (view) {
        view.hit();
        sfx.play('hit', pan);
        const at = view.ground();
        this.fx.juice(at.x, at.y - at.cellWidth * 0.5, 6);
        this.fx.floatText(text().cover.wormOuch, at.x, at.y - at.cellWidth * 0.9, COVER_LOOK.ouchText);
      }
      return;
    }
    const sown = sownAt(this.state, target.cell);
    if (sown?.kind === 'shooter') {
      // Dispara en el acto (en el siguiente paso) y da un saltito.
      this.setSown(target.cell, { ...sown, reloadMs: 0 });
      this.voicedCells.add(cellKey(target.cell));
      this.plantViews.get(cellKey(target.cell))?.beckon();
    } else if (sown?.kind === 'mine' && sown.fuseMs === null) {
      // Se arma: cuenta como en el juego y explota (la regla de la mina hace el resto).
      this.setSown(target.cell, { ...sown, fuseMs: MINE.countdownMs });
      this.mineViews.get(cellKey(target.cell))?.arm();
    }
  }

  /** Mano sobre lo que responde al clic. */
  hover(x: number, y: number): void {
    const cursor = this.targetAt(x, y) ? 'pointer' : 'default';
    if (cursor === this.cursor) return;
    this.cursor = cursor;
    this.scene.input.setDefaultCursor(cursor);
  }

  /** Lo que hay bajo el puntero: lo de delante (carril mas cercano) tapa a lo de atras. */
  private targetAt(x: number, y: number): CoverTarget | null {
    const found: Array<{ front: number; target: CoverTarget }> = [];
    for (const enemy of this.state.enemies) {
      if (this.enemyViews.get(enemy.id)?.contains(x, y)) found.push({ front: enemy.lane + 0.64, target: { kind: 'enemy', id: enemy.id } });
    }
    const sownViews: Array<[string, { contains(x: number, y: number): boolean }]> = [...this.plantViews, ...this.mineViews];
    for (const [key, view] of sownViews) {
      const cell = keyCell(key);
      if (view.contains(x, y)) found.push({ front: cell.lane + 0.62, target: { kind: 'sown', cell } });
    }
    found.sort((a, b) => b.front - a.front);
    return found[0]?.target ?? null;
  }

  /** Creeper suelta una de sus frases de portada, por turnos. Solo suena si es porque le hicieron clic. */
  private taunt(voiced = false): void {
    const creeper = [...this.enemyViews.values()].find((view): view is CreeperView => view instanceof CreeperView);
    const lines = text().cover.creeperLines;
    creeper?.taunt(lines[this.taunts++ % lines.length], COVER_LOOK.tauntLifeMs, voiced);
  }

  /** De los eventos de un paso, los que vienen de un clic: el disparo de una planta pulsada, sus impactos y las minas. */
  private voicedEvents(events: readonly CombatEvent[]): CombatEvent[] {
    const voiced: CombatEvent[] = [];
    const fired = new Set<string>();
    for (const event of events) {
      if (event.type === 'shot' && this.voicedCells.has(cellKey(event.cell))) {
        this.voicedBullets.add(event.bullet.id);
        fired.add(cellKey(event.cell));
        voiced.push(event);
      } else if (event.type === 'hit' && this.voicedBullets.delete(event.bulletId)) {
        voiced.push(event);
      } else if (event.type === 'bulletGone') {
        this.voicedBullets.delete(event.bulletId);
      } else if (event.type === 'mineExploded') {
        voiced.push(event);
      }
    }
    fired.forEach((key) => this.voicedCells.delete(key));
    return voiced;
  }

  /**
   * Cada enemigo vuelve a su sitio con la vida llena (y lo que "anduvo" se suma a su cinta); lo sembrado recupera la
   * vida. Asi el combate sigue sin fin.
   */
  private pin(state: MatchState, deltaMs: number): MatchState {
    const enemies = state.enemies.map((enemy): Enemy => {
      const anchor = this.anchors.get(enemy.id) ?? enemy.x;
      if (enemy.attackMs === null) {
        const slowed = enemy.slow ? 1 - enemy.slow.amount : 1;
        const walked = (ENEMIES[enemy.kind].speed * enemy.haste * slowed * deltaMs) / 1000;
        this.strides.set(enemy.id, (this.strides.get(enemy.id) ?? 0) + walked);
      }
      return { ...enemy, x: anchor, hp: enemyMaxHp(enemy.kind, enemy.level) };
    });
    const plants = state.plants.map((lane) => lane.map((sown): Sown | null => (sown ? { ...sown, hp: sownMaxHp(sown) } : null)));
    return { ...state, enemies, plants, lives: this.state.lives };
  }

  private setSown(cell: Cell, sown: Sown | null): void {
    const plants = this.state.plants.map((lane) => [...lane]);
    plants[cell.lane][cell.col] = sown;
    this.state = { ...this.state, plants };
  }

  private addSown(cell: Cell, sown: Sown, sprout: boolean): void {
    if (sown.kind === 'shooter') {
      const design = this.designs.get(cellKey(cell)) ?? SHOOTER;
      this.plantViews.set(cellKey(cell), new PlantView(this.scene, this.fx, cell, sown.shooter, 1, sprout, design));
    } else {
      this.mineViews.set(cellKey(cell), new MineView(this.scene, this.fx, sown.element, cell, sown, sprout));
    }
  }

  private addEnemy(enemy: Enemy, delayMs: number): void {
    const view =
      enemy.kind === 'creeper' ? new CreeperView(this.scene, this.fx, enemy, true, delayMs) : new WormView(this.scene, this.fx, enemy, true, delayMs);
    // Sus frases de portada van calladas: solo suena la que suelta al hacerle clic (S-04).
    if (view instanceof CreeperView) view.voiced = false;
    this.enemyViews.set(enemy.id, view);
  }

  /** Lo sembrado que recibe un mordisco o un escupitajo: se encoge, destella y amarillea segun la vida que le queda. */
  private hurt(cell: Cell, state: MatchState): void {
    const sown = sownAt(state, cell);
    this.plantViews.get(cellKey(cell))?.bitten(sown ? sown.hp / sownMaxHp(sown) : 1);
    this.mineViews.get(cellKey(cell))?.bitten();
  }

  /** Lo mismo que anima el tablero para cada evento del combate (sin monedas, vidas ni derrota: aqui no pasan). */
  private show(event: CombatEvent, state: MatchState): void {
    switch (event.type) {
      case 'shot': {
        const plant = this.plantViews.get(cellKey(event.cell));
        plant?.recoil(event.cannon);
        this.bulletViews.set(event.bullet.id, new BulletView(this.scene, this.fx, event.bullet, true, plant?.muzzleOffset(event.cannon)));
        break;
      }
      case 'hit':
        this.bulletViews.get(event.bulletId)?.impact();
        this.bulletViews.delete(event.bulletId);
        this.enemyViews.get(event.enemyId)?.hit();
        break;
      case 'bulletGone':
        this.bulletViews.get(event.bulletId)?.vanish();
        this.bulletViews.delete(event.bulletId);
        break;
      case 'bite':
        this.enemyViews.get(event.enemyId)?.chomp();
        this.hurt(event.cell, state);
        break;
      case 'spat':
        this.enemyViews.get(event.enemyId)?.spat();
        this.spitViews.set(event.spit.id, new SpitView(this.scene, this.fx, event.spit, true));
        break;
      case 'spitHit':
        this.spitViews.get(event.spitId)?.impact();
        this.spitViews.delete(event.spitId);
        this.hurt(event.cell, state);
        break;
      case 'spitGone':
        this.spitViews.get(event.spitId)?.vanish();
        this.spitViews.delete(event.spitId);
        break;
      case 'mineArmed':
        this.mineViews.get(cellKey(event.cell))?.arm();
        break;
      case 'mineExploded': {
        const key = cellKey(event.cell);
        this.mineViews.get(key)?.explode();
        this.mineViews.delete(key);
        if (event.element === 'fire') {
          event.enemyIds.forEach((id) => this.enemyViews.get(id)?.blasted());
          this.scene.cameras.main.shake(180, 0.0035);
        } else {
          event.enemyIds.forEach((id) => this.enemyViews.get(id)?.frosted());
          this.scene.cameras.main.shake(120, 0.002);
        }
        this.regrow(event.cell, event.element);
        break;
      }
      case 'plantDestroyed': {
        // No deberia pasar (todos recuperan la vida), pero si pasa, vuelve a brotar.
        const key = cellKey(event.cell);
        const plant = this.plantViews.get(key);
        plant?.die();
        this.plantViews.delete(key);
        this.mineViews.get(key)?.die();
        this.mineViews.delete(key);
        break;
      }
      default:
        break;
    }
  }

  /** La mina que exploto vuelve a brotar en su casilla al cabo de un rato. */
  private regrow(cell: Cell, element: ElementType): void {
    this.scene.time.delayedCall(COVER_LOOK.mineRegrowMs, () => {
      if (sownAt(this.state, cell)) return;
      const mine = createMine(element);
      this.setSown(cell, mine);
      this.addSown(cell, mine, true);
    });
  }
}

function keyCell(key: string): Cell {
  const [lane, col] = key.split(':').map(Number);
  return { lane, col };
}
