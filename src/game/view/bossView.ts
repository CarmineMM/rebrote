import type * as Phaser from 'phaser';
import type { BoardPoint } from '../core/board';
import type { BossKind, Enemy } from '../core/combat';
import { CreeperOmen, CreeperView } from './creeperView';
import type { Effects } from './effects';
import { ElkClonerOmen, ElkClonerView } from './elkClonerView';
import { BugView, isBugKind } from './bugView';
import { BrainOmen, BrainView } from './brainView';
import { MorrisOmen, MorrisView } from './morrisView';
import { WormView, type EnemyView } from './wormView';
import type { TroopTint } from './troopTint';
import { text } from '../../i18n';

/**
 * Lo que la escena le pide al jefe que se prepara a la derecha (T-008, T-026, T-039 y T-042): `CreeperOmen`, `ElkClonerOmen`,
 * `BrainOmen` o `MorrisOmen`. Se ve en las rondas que lo dicen (`bossPreparing`) y en la del combate hasta que sale.
 */
export interface BossOmen {
  /** Lo que lleva preparado (0 a 1): la barra de Creeper, el poema de Elk Cloner, los sectores que marca Brain, las maquinas que cuenta Morris. */
  setProgress(progress: number): void;
  /** Acelera a un enemigo que sale por el agujero de `lane`. */
  zap(lane: number): void;
  /** Grita al mandar a su escolta. */
  command(text: string): void;
  /**
   * Empieza el combate: salta al agujero de su carril. Tarda `durationMs` (sin el, `OMEN_LEAP_MS`): menos a mas velocidad
   * del juego (T-048), para que caiga donde ya va el jefe.
   */
  leapTo(foot: BoardPoint, durationMs?: number): void;
  /** Deja de verse sin combate. */
  vanish(): void;
}

/** El jefe que se prepara de cada brote. */
export function createBossOmen(boss: BossKind, scene: Phaser.Scene, fx: Effects, progress: number, appear: boolean): BossOmen {
  if (boss === 'brain') return new BrainOmen(scene, fx, progress, appear);
  if (boss === 'morris') return new MorrisOmen(scene, fx, progress, appear);
  return boss === 'elkCloner' ? new ElkClonerOmen(scene, fx, progress, appear) : new CreeperOmen(scene, fx, progress, appear);
}

/**
 * La vista de un enemigo: la del jefe si lo es (Creeper o Elk Cloner, que envuelven un `WormView`; Brain, T-039, y Morris,
 * T-042, la suya), la de un bicho del brote 3 (T-038, `BugView`) o la de un gusano.
 */
export function createEnemyView(scene: Phaser.Scene, fx: Effects, enemy: Enemy, emerge: boolean, emergeDelayMs = 0, tint: TroopTint | null = null): EnemyView {
  if (enemy.kind === 'creeper') return new CreeperView(scene, fx, enemy, emerge, emergeDelayMs);
  if (enemy.kind === 'elkCloner') return new ElkClonerView(scene, fx, enemy, emerge, emergeDelayMs);
  if (enemy.kind === 'brain') return new BrainView(scene, fx, enemy, emerge, emergeDelayMs);
  if (enemy.kind === 'morris') return new MorrisView(scene, fx, enemy, emerge, emergeDelayMs);
  // `tint`: otro tinte que el de la variante de la tropa (T-041), solo para la galeria `/proposals/variantes.html`.
  if (isBugKind(enemy.kind)) return new BugView(scene, fx, enemy, emerge, emergeDelayMs, undefined, tint);
  return new WormView(scene, fx, enemy, emerge, emergeDelayMs, undefined, tint);
}

/** Lo que grita cada jefe al mandar a su escolta (`shouts` de `creeper`, `elkCloner`, `brain` y `morris` en `src/i18n/`). */
export function bossShouts(boss: BossKind) {
  if (boss === 'morris') return text().morris.shouts;
  return boss === 'brain' ? text().brain.shouts : boss === 'elkCloner' ? text().elkCloner.shouts : text().creeper.shouts;
}
