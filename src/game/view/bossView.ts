import type * as Phaser from 'phaser';
import type { BoardPoint } from '../core/board';
import type { BossKind, Enemy } from '../core/combat';
import { CreeperOmen, CreeperView } from './creeperView';
import type { Effects } from './effects';
import { ElkClonerOmen, ElkClonerView } from './elkClonerView';
import { WormView, type EnemyView } from './wormView';
import { text } from '../../i18n';

/**
 * Lo que la escena le pide al jefe que se prepara a la derecha (T-008 y T-026): `CreeperOmen` o `ElkClonerOmen`. Se ve
 * en las rondas que lo dicen (`bossPreparing`) y en la del combate hasta que sale.
 */
export interface BossOmen {
  /** Lo que lleva preparado (0 a 1): la barra de Creeper, el poema de Elk Cloner. */
  setProgress(progress: number): void;
  /** Acelera a un enemigo que sale por el agujero de `lane`. */
  zap(lane: number): void;
  /** Grita al mandar a su escolta. */
  command(text: string): void;
  /** Empieza el combate: salta al agujero de su carril. */
  leapTo(foot: BoardPoint): void;
  /** Deja de verse sin combate. */
  vanish(): void;
}

/** El jefe que se prepara de cada brote. */
export function createBossOmen(boss: BossKind, scene: Phaser.Scene, fx: Effects, progress: number, appear: boolean): BossOmen {
  return boss === 'elkCloner' ? new ElkClonerOmen(scene, fx, progress, appear) : new CreeperOmen(scene, fx, progress, appear);
}

/** La vista de un enemigo: la del jefe si lo es (Creeper o Elk Cloner, que envuelven un `WormView`) o la de un gusano. */
export function createEnemyView(scene: Phaser.Scene, fx: Effects, enemy: Enemy, emerge: boolean, emergeDelayMs = 0): EnemyView {
  if (enemy.kind === 'creeper') return new CreeperView(scene, fx, enemy, emerge, emergeDelayMs);
  if (enemy.kind === 'elkCloner') return new ElkClonerView(scene, fx, enemy, emerge, emergeDelayMs);
  return new WormView(scene, fx, enemy, emerge, emergeDelayMs);
}

/** Lo que dice cada jefe en su bocadillo (`creeper` y `elkCloner` de `src/i18n/`): sus gritos, sus frases... */
export function bossLines(boss: BossKind) {
  return boss === 'elkCloner' ? text().elkCloner : text().creeper;
}
