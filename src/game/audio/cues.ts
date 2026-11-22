import type { SfxId } from '../config/audio';
import { BOARD } from '../config/balance';
import { isBoss, isShield, type BulletEffect, type CombatEvent } from '../core/combat';
import type { MatchState } from '../core/match';
import { isMilestoneLevel, type ElementType } from '../core/plants';
import type { RoundEvent } from '../core/rounds';
import type { PowerId } from '../core/powers';
import type { PlayerAction } from '../EventBus';
import type { CharacterId } from '../view/characters/design';
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

/** El disparo y el impacto suenan segun lo que deja la semilla: la de escudo (T-024) dispara como una normal. */
type SeedSound = 'none' | BulletEffect['element'];
const SHOT_OF: Record<SeedSound, SfxId> = { none: 'shot', fire: 'shotFire', ice: 'shotIce' };
const HIT_OF: Record<SeedSound, SfxId> = { none: 'hit', fire: 'hitFire', ice: 'hitIce' };
const INFUSE_OF: Record<ElementType, SfxId> = { fire: 'infuseFire', ice: 'infuseIce', shield: 'infuseShield' };
/** Usar cada poder (T-021): recolocar, lanzar la granada y poner el muro de hielo. */
const POWER_OF: Record<PowerId, SfxId> = { relocate: 'relocate', grenade: 'grenadeThrow', iceWall: 'iceWallRise' };

/**
 * Lo que suena con los eventos de un paso del combate. `before` es el estado de antes del paso: ahi siguen las balas que
 * impactaron y los enemigos que cayeron.
 * - Una planta de N canones dispara N balas a la vez: suena un solo disparo, el del canon de arriba.
 * - Fuego y hielo suenan distinto al disparar y al impactar; la semilla que da a un acorazado suena a metal.
 * - Los enemigos que caen en una explosion de mina no suenan aparte: suena la explosion.
 * - Si cae un jefe, suena su derrota (la de Creeper o la de Elk Cloner) y no la de los que caen con el.
 * - Un mordisco o un escupitajo que da a un escudo (muro o disparadora con escudo, T-024) suena a madera, y el muro que se
 *   rompe, a madera que se parte.
 * - El juglar (T-025) toma aire y suelta su verso; el verso suena bajito en cada planta o mina que cruza y, en el escudo
 *   que lo para, a madera. Un copion que deja su copia suena a copiarse. El acorazado copion suena a metal, como el otro.
 * - Elk Cloner (T-026) toma aire y suelta sus versos como el juglar; el aviso del poema entero suena al empezar (una
 *   nota que se hincha) y el poema, al soltarlo (un acorde grande), desde donde esta.
 * - La granada del poder (T-021) suena al caer y al explotar; los que caen en su explosion no suenan aparte. Lo que da al
 *   muro de hielo suena a cristal (no a madera, como el escudo), el bloque que se rompe estalla y el que se derrite chapotea.
 */
export function combatCues(events: readonly CombatEvent[], before: MatchState): SfxCue[] {
  const cues: SfxCue[] = [];
  const sownKind = (cell: { lane: number; col: number }) => before.plants[cell.lane]?.[cell.col]?.kind;
  /** Lo que suena al dar a lo sembrado: cristal en el hielo (T-021), madera en un escudo (T-024) o lo de siempre. */
  const hitOn = (cell: { lane: number; col: number }, otherwise: SfxId): SfxId =>
    sownKind(cell) === 'ice' ? 'iceHit' : isShield(before.plants[cell.lane]?.[cell.col]) ? 'wallHit' : otherwise;
  const bulletElement = new Map<number, BulletEffect['element'] | null>();
  for (const bullet of before.bullets) bulletElement.set(bullet.id, bullet.effect?.element ?? null);
  for (const event of events) if (event.type === 'shot') bulletElement.set(event.bullet.id, event.bullet.effect?.element ?? null);
  const enemies = new Map(before.enemies.map((enemy) => [enemy.id, enemy]));
  const blasted = new Set(events.flatMap((event) => (event.type === 'mineExploded' || event.type === 'grenadeExploded' ? event.enemyIds : [])));
  const bossDown = events.some((event) => event.type === 'enemyKilled' && isBoss(event.kind));

  for (const event of events) {
    switch (event.type) {
      case 'shot':
        if (event.cannon === 0) cues.push(at(SHOT_OF[event.bullet.effect?.element ?? 'none'], event.cell.col + 0.5));
        break;
      case 'hit': {
        const element = bulletElement.get(event.bulletId) ?? null;
        const kind = enemies.get(event.enemyId)?.kind;
        const armored = kind === 'armored' || kind === 'copycatArmored';
        cues.push(at(element === null && armored ? 'hitArmor' : HIT_OF[element ?? 'none'], event.at.x));
        break;
      }
      case 'bite':
        cues.push(at(hitOn(event.cell, 'bite'), event.cell.col + 0.5));
        break;
      case 'spat':
        cues.push(at('spit', event.spit.x));
        break;
      case 'spitHit':
        cues.push(at(hitOn(event.cell, 'spitHit'), event.cell.col + 0.5));
        break;
      case 'plantDestroyed': {
        const kind = sownKind(event.cell);
        cues.push(at(kind === 'wall' ? 'wallBreak' : kind === 'ice' ? 'iceBreak' : 'plantDestroyed', event.cell.col + 0.5));
        break;
      }
      case 'grenadeLanded':
        cues.push(at('grenadeLand', event.cell.col + 0.5));
        break;
      case 'grenadeExploded':
        cues.push(at('grenadeBoom', event.cell.col + 0.5));
        break;
      case 'iceMelted':
        cues.push(at('iceMelt', event.cell.col + 0.5));
        break;
      case 'enemyKilled':
        if (event.kind === 'creeper') cues.push(at('creeperDefeated', event.at.x));
        else if (event.kind === 'elkCloner') cues.push(at('elkClonerDefeated', event.at.x));
        else if (!bossDown && !blasted.has(event.enemyId)) cues.push(at('enemyKilled', event.at.x));
        break;
      case 'enemyEscaped':
        cues.push(at('enemyEscaped', 0));
        break;
      case 'mineExploded':
        cues.push(at(event.element === 'fire' ? 'fireExplosion' : 'iceExplosion', event.cell.col + 0.5));
        break;
      case 'verseWarned':
        cues.push(at('minstrelInhale', enemies.get(event.enemyId)?.x ?? BOARD.columns / 2));
        break;
      case 'sang':
        cues.push(at('verse', event.verse.x));
        break;
      case 'verseHit':
        cues.push(at(event.blocked ? hitOn(event.cell, 'wallHit') : 'verseHit', event.cell.col + 0.5));
        break;
      case 'cloned':
        if (!bossDown) cues.push(at('clone', event.clone.x));
        break;
      case 'poemWarned':
        cues.push(at('poemWarn', enemies.get(event.enemyId)?.x ?? BOARD.columns / 2));
        break;
      case 'poemRecited':
        cues.push(at('poem', event.verses[0]?.x ?? BOARD.columns / 2));
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
      case 'verseGone':
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

/**
 * Tic de la cuenta atras de la granada del poder (T-021), como el de las minas: uno al caer (cuando sale el "2") y otro cada
 * vez que baja el numero. Sale del estado: con la pausa no cuenta.
 */
export function grenadeTicks(before: MatchState, after: MatchState): SfxCue[] {
  const was = new Map(before.grenades.map((grenade) => [grenade.id, grenade]));
  const cues: SfxCue[] = [];
  for (const grenade of after.grenades) {
    if (grenade.flightMs > 0) continue;
    const previous = was.get(grenade.id);
    const shown = Math.ceil(grenade.fuseMs / 1000);
    const landed = !previous || previous.flightMs > 0;
    if (shown > 0 && (landed || Math.ceil(previous.fuseMs / 1000) > shown)) cues.push(at('mineTick', grenade.cell.col + 0.5));
  }
  return cues;
}

/** Lo que suena cuando el jugador hace algo en el tablero: sembrar, infundir, fusionar, subir de nivel o usar un poder. */
export function actionCue(action: PlayerAction, x: number): SfxCue | null {
  switch (action.type) {
    case 'sow':
      return at(action.card === 'shield' ? 'sowWall' : 'sow', x);
    case 'infuse':
      return at(INFUSE_OF[action.element], x);
    case 'fuse':
      return at('fuse', x);
    case 'levelUp':
      // Llegar a un nivel con premio (5, 10, 15 y 20) suena a premio: el mismo "¡ya lo tienes!" del aviso de desbloqueo.
      return at(isMilestoneLevel(action.level) ? 'unlock' : 'levelUp', x);
    case 'power':
      return at(POWER_OF[action.power], x);
    case 'pick':
    case 'powerPicked':
      return null;
  }
}

/** Voz de cada personaje en las viñetas (T-031). */
const VOICE_OF: Record<CharacterId, SfxId> = { boxer: 'voiceBoxer', patty: 'voicePatty' };

/** Cada cuantas letras suena la voz mientras sale el texto de una viñeta. */
export const VOICE_EVERY = 3;

/**
 * Lo que suena mientras sale el texto de una viñeta (T-031): al aparecer las letras de `from` a `to` (sin incluir `to`),
 * la voz de quien habla si entre ellas hay una que toca: una de cada `VOICE_EVERY`, contando solo letras y numeros
 * (espacios y signos van callados). Como mucho una por llamada, asi que un salto grande no suena como una rafaga.
 */
export function voiceCue(speaker: CharacterId, text: string, from: number, to: number): SfxCue | null {
  let letters = 0;
  const chars = Array.from(text);
  for (let i = 0; i < Math.min(to, chars.length); i++) {
    if (!/[\p{L}\p{N}]/u.test(chars[i])) continue;
    if (i >= from && letters % VOICE_EVERY === 0) return centered(VOICE_OF[speaker]);
    letters++;
  }
  return null;
}
