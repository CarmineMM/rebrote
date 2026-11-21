import type { SfxId } from '../config/audio';
import { BOARD } from '../config/balance';
import type { CombatEvent } from '../core/combat';
import type { MatchState } from '../core/match';
import { isMilestoneLevel, type ElementType } from '../core/plants';
import type { RoundEvent } from '../core/rounds';
import type { PlayerAction } from '../EventBus';
import { panAt } from './voices';

/**
 * Que suena con cada cosa que pasa (T-014, ADR-0013), sin Phaser ni Web Audio: la escena le pasa los eventos de un paso
 * y reproduce lo que devuelve. Aqui se decide tambien lo que no suena, para que no sature (S-06).
 */

/** Un sonido que pedir: el efecto y de donde viene en el tablero (paneo estereo, de -1 a 1). */
export interface SfxCue {
  readonly id: SfxId;
  readonly pan: number;
}

const at = (id: SfxId, x: number): SfxCue => ({ id, pan: panAt(x, BOARD.columns) });
const centered = (id: SfxId): SfxCue => ({ id, pan: 0 });

const SHOT_OF: Record<'none' | ElementType, SfxId> = { none: 'shot', fire: 'shotFire', ice: 'shotIce' };
const HIT_OF: Record<'none' | ElementType, SfxId> = { none: 'hit', fire: 'hitFire', ice: 'hitIce' };
const INFUSE_OF: Record<ElementType, SfxId> = { fire: 'infuseFire', ice: 'infuseIce' };

/**
 * Lo que suena con los eventos de un paso del combate. `before` es el estado de antes del paso: ahi siguen las balas que
 * impactaron y los enemigos que cayeron.
 * - Una planta de N canones dispara N balas a la vez: suena un solo disparo, el del canon de arriba.
 * - Fuego y hielo suenan distinto al disparar y al impactar; la semilla que da a un acorazado suena a metal.
 * - Los enemigos que caen en una explosion de mina no suenan aparte: suena la explosion.
 * - Si cae el Creeper, suena su derrota y no la de sus copias, que caen con el.
 */
export function combatCues(events: readonly CombatEvent[], before: MatchState): SfxCue[] {
  const cues: SfxCue[] = [];
  const bulletElement = new Map<number, ElementType | null>();
  for (const bullet of before.bullets) bulletElement.set(bullet.id, bullet.effect?.element ?? null);
  for (const event of events) if (event.type === 'shot') bulletElement.set(event.bullet.id, event.bullet.effect?.element ?? null);
  const enemies = new Map(before.enemies.map((enemy) => [enemy.id, enemy]));
  const blasted = new Set(events.flatMap((event) => (event.type === 'mineExploded' ? event.enemyIds : [])));
  const bossDown = events.some((event) => event.type === 'enemyKilled' && event.kind === 'creeper');

  for (const event of events) {
    switch (event.type) {
      case 'shot':
        if (event.cannon === 0) cues.push(at(SHOT_OF[event.bullet.effect?.element ?? 'none'], event.cell.col + 0.5));
        break;
      case 'hit': {
        const element = bulletElement.get(event.bulletId) ?? null;
        const armored = enemies.get(event.enemyId)?.kind === 'armored';
        cues.push(at(element === null && armored ? 'hitArmor' : HIT_OF[element ?? 'none'], event.at.x));
        break;
      }
      case 'bite':
        cues.push(at('bite', event.cell.col + 0.5));
        break;
      case 'spat':
        cues.push(at('spit', event.spit.x));
        break;
      case 'spitHit':
        cues.push(at('spitHit', event.cell.col + 0.5));
        break;
      case 'plantDestroyed':
        cues.push(at('plantDestroyed', event.cell.col + 0.5));
        break;
      case 'enemyKilled':
        if (event.kind === 'creeper') cues.push(at('creeperDefeated', event.at.x));
        else if (!bossDown && !blasted.has(event.enemyId)) cues.push(at('enemyKilled', event.at.x));
        break;
      case 'enemyEscaped':
        cues.push(at('enemyEscaped', 0));
        break;
      case 'mineExploded':
        cues.push(at(event.element === 'fire' ? 'fireExplosion' : 'iceExplosion', event.cell.col + 0.5));
        break;
      case 'jumpWarned':
        cues.push(at('creeperWarn', enemies.get(event.enemyId)?.x ?? BOARD.columns / 2));
        break;
      case 'jumped':
        cues.push(at('creeperTakeoff', enemies.get(event.enemyId)?.x ?? BOARD.columns / 2));
        break;
      case 'landed':
        cues.push(at('creeperLand', event.cell ? event.cell.col + 0.5 : (enemies.get(event.enemyId)?.x ?? BOARD.columns / 2)));
        break;
      // La mina armada suena con su cuenta atras (`mineTicks`); lo que se apaga o sale del tablero, no suena.
      case 'mineArmed':
      case 'bulletGone':
      case 'spitGone':
        break;
    }
  }
  return cues;
}

/**
 * Lo que suena con las rondas: el inicio del ataque y la ronda superada. Tras la ultima ronda del brote (`rounds` son
 * las suyas, T-018) suena la victoria, que la pone la escena con su celebracion. El grito de Creeper suena con su
 * bocadillo.
 */
export function roundCues(events: readonly RoundEvent[], rounds: number): SfxCue[] {
  const cues: SfxCue[] = [];
  for (const event of events) {
    if (event.type === 'attackStarted') cues.push(centered('attackStarted'));
    else if (event.type === 'roundCleared' && event.index + 1 < rounds) cues.push(centered('roundCleared'));
  }
  return cues;
}

/**
 * Tic de la cuenta atras de las minas: uno al armarse (cuando sale el "2") y otro cada vez que baja el numero. Sale del
 * estado, como el numero que se pinta: con la pausa no cuenta, asi que tampoco suena, y sigue al reanudar.
 */
export function mineTicks(before: MatchState, after: MatchState): SfxCue[] {
  const cues: SfxCue[] = [];
  after.plants.forEach((lane, laneIndex) =>
    lane.forEach((sown, col) => {
      if (sown?.kind !== 'mine' || sown.fuseMs === null) return;
      const previous = before.plants[laneIndex]?.[col];
      const was = previous?.kind === 'mine' ? previous.fuseMs : null;
      const shown = Math.ceil(sown.fuseMs / 1000);
      if (shown > 0 && (was === null || Math.ceil(was / 1000) > shown)) cues.push(at('mineTick', col + 0.5));
    }),
  );
  return cues;
}

/** Lo que suena cuando el jugador hace algo en el tablero: sembrar, infundir, fusionar o subir de nivel. */
export function actionCue(action: PlayerAction, x: number): SfxCue | null {
  switch (action.type) {
    case 'sow':
      return at('sow', x);
    case 'infuse':
      return at(INFUSE_OF[action.element], x);
    case 'fuse':
      return at('fuse', x);
    case 'levelUp':
      // Llegar a un nivel con premio (5, 10, 15 y 20) suena a premio: el mismo "¡ya lo tienes!" del aviso de desbloqueo.
      return at(isMilestoneLevel(action.level) ? 'unlock' : 'levelUp', x);
    case 'pick':
      return null;
  }
}
