import { BOARD, CREEPER, ENEMIES, MINE } from '../config/balance';
import type { Cell } from '../core/board';
import {
  bulletDamage,
  bulletEffect,
  enemyDamage,
  enemyMaxHp,
  enemyTierBonus,
  fireIntervalMs,
  isEnraged,
  mineBlast,
  slamDamage,
  type Enemy,
} from '../core/combat';
import type { Mine, Plant } from '../core/match';
import { FIRST_OUTBREAK, outbreakNumber, outbreakOfBoss } from '../core/outbreaks';
import { plantMaxHp } from '../core/plants';
import type { EntityInfo, InfoStat, InfoTag } from '../EventBus';
import { formatNumber, formatPercent, formatSeconds, text } from '../../i18n';
import { medalTier, showsMedal } from './levelMedal';

/**
 * Ficha de informacion (T-010): nombre, nivel, vida, datos y como funciona una disparadora, una mina o un enemigo, con
 * los numeros de las reglas de core. Sin Phaser: la escena le anade la foto (`portrait.ts`) y la manda a React. Los
 * textos salen del idioma en curso (`src/i18n/`, T-011).
 */
export type EntityInfoData = Omit<EntityInfo, 'portrait'>;

/** Numero con el separador decimal del idioma (57,5 en espanol; 57.5 en ingles). Ver `formatNumber` de `src/i18n/`. */
export { formatNumber };

/** Vida en enteros: la que queda (sin pasar de la llena, y 1 si aun vive) y la llena. */
function hpOf(current: number, max: number): EntityInfo['hp'] {
  const full = Math.round(max);
  return { current: Math.min(full, Math.max(0, Math.ceil(current))), max: full };
}

/**
 * Ficha de la disparadora de `cell`. `levelCap` es el tope de nivel de la ronda, o null si aun no se puede subir de
 * nivel (no se dice).
 */
export function shooterInfo(plant: Plant, cell: Cell, levelCap: number | null): EntityInfoData {
  const t = text().info;
  const { shooter } = plant;
  const { element, cannons, level } = shooter;
  const shot = bulletDamage(shooter) * cannons;
  const intervalMs = fireIntervalMs(shooter);
  const stats: InfoStat[] = [
    {
      label: t.stats.damage,
      value: t.stats.perShot(formatNumber(shot)),
      note: cannons > 1 ? t.stats.seeds(cannons, formatNumber(bulletDamage(shooter))) : undefined,
    },
    { label: t.stats.rate, value: t.stats.every(formatSeconds(intervalMs)), note: t.stats.shotsPerSecond(formatNumber(1000 / intervalMs, 2)) },
    { label: t.stats.dps, value: formatNumber((shot * 1000) / intervalMs) },
  ];
  const effect = bulletEffect(shooter);
  if (effect?.element === 'fire') {
    stats.push({ label: t.stats.burn, value: t.stats.perSecond(formatNumber(effect.burn.dps)), note: t.stats.during(formatSeconds(effect.burn.ms)) });
  } else if (effect?.element === 'ice') {
    stats.push({ label: t.stats.slows, value: t.stats.slowBy(formatPercent(effect.slow.amount)), note: t.stats.during(formatSeconds(effect.slow.ms)) });
  }
  stats.push({ label: t.stats.range, value: t.stats.rangeValue });
  return {
    id: `planta:${cell.lane}:${cell.col}`,
    tone: element ?? 'plant',
    title: t.shooter.title[element ?? 'plain'],
    subtitle: cannons === 1 ? t.shooter.oneCannon : t.shooter.fused(cannons),
    level: { value: level, medalTier: showsMedal(level) ? medalTier(level) : null, note: levelCap === null ? null : t.shooter.cap(levelCap) },
    hp: hpOf(plant.hp, plantMaxHp(shooter)),
    stats,
    tags: [],
    about: t.shooter.about[element ?? 'plain'],
    lore: null,
  };
}

/** Ficha de la mina de `cell`. */
export function mineInfo(mine: Mine, cell: Cell): EntityInfoData {
  const t = text().info;
  const blast = mineBlast(mine.element);
  const stats: InfoStat[] = [
    { label: t.stats.detects, value: t.stats.detectsValue(formatNumber(MINE.detectRadius)) },
    { label: t.stats.explodes, value: t.stats.explodesValue(formatSeconds(MINE.countdownMs)), note: t.stats.reaches(formatNumber(MINE.blastRadius)) },
  ];
  if (blast.slow) {
    stats.push({ label: t.stats.slows, value: t.stats.slowBy(formatPercent(blast.slow.amount)), note: t.stats.during(formatSeconds(blast.slow.ms)) });
  } else {
    stats.push({ label: t.stats.damage, value: t.stats.damageEach(formatNumber(blast.damage)) });
  }
  const tags: InfoTag[] =
    mine.fuseMs === null ? [{ text: t.tags.waiting, tone: 'calm' }] : [{ text: t.tags.explodesIn(formatSeconds(mine.fuseMs)), tone: 'alert' }];
  return {
    id: `mina:${cell.lane}:${cell.col}`,
    tone: mine.element,
    title: t.mine.title[mine.element],
    subtitle: t.mine.subtitle[mine.element],
    level: null,
    hp: hpOf(mine.hp, MINE.hp),
    stats,
    tags,
    about: t.mine.about[mine.element](formatSeconds(MINE.countdownMs)),
    lore: null,
  };
}

/** Como funciona cada enemigo, en el idioma en curso. */
function enemyAbout(kind: Enemy['kind']): string {
  const about = text().info.enemy.about;
  return kind === 'spitter' ? about.spitter(formatNumber(ENEMIES.spitter.range)) : about[kind];
}

/** "Jefe del brote 1" (T-018: el brote del que es jefe), y su fase. */
function bossSubtitle(enemy: Enemy): string {
  const { subtitle } = text().info.enemy;
  const number = outbreakNumber(outbreakOfBoss(enemy.kind) ?? FIRST_OUTBREAK);
  return isEnraged(enemy) ? subtitle.bossEnraged(number) : subtitle.boss(number);
}

/** Ficha de un enemigo: su nivel y su tramo (T-009 y T-010), lo que quita, lo rapido que va y lo que le pasa ahora. */
export function enemyInfo(enemy: Enemy): EntityInfoData {
  const t = text().info;
  const stats = ENEMIES[enemy.kind];
  const boss = enemy.kind === 'creeper';
  const damage = formatNumber(enemyDamage(enemy));
  const rows: InfoStat[] = [];
  if (stats.attack === 'spit') {
    rows.push({ label: t.stats.spit, value: damage, note: t.stats.spitNote(formatSeconds(stats.spitIntervalMs), formatNumber(stats.range)) });
  } else {
    rows.push({ label: t.stats.bite, value: damage, note: t.stats.biteNote(formatSeconds(stats.biteIntervalMs)) });
  }
  if (boss) rows.push({ label: t.stats.slam, value: formatNumber(slamDamage()), note: t.stats.slamNote });
  const speed = stats.speed * enemy.haste;
  rows.push({ label: t.stats.speed, value: t.stats.speedValue(formatNumber(speed, 2)), note: t.stats.crosses(Math.round(BOARD.columns / speed)) });
  if (boss) {
    const next = CREEPER.jumpAt[enemy.jumpsUsed];
    rows.push({ label: t.stats.nextJump, value: next === undefined ? t.stats.noMoreJumps : t.stats.jumpAt(formatPercent(next)) });
    rows.push({ label: t.stats.onDefeat, value: t.stats.youWin });
  } else {
    rows.push({ label: t.stats.reward, value: t.stats.rewardValue(stats.reward) });
  }

  const tags: InfoTag[] = [];
  if (boss && isEnraged(enemy)) tags.push({ text: t.tags.enraged, tone: 'alert' });
  if (enemy.jump) tags.push({ text: t.tags.jumping, tone: 'alert' });
  else if (enemy.attackMs !== null) tags.push({ text: stats.attack === 'spit' ? t.tags.spitting : t.tags.biting, tone: 'alert' });
  if (enemy.burn) tags.push({ text: t.tags.burning(formatNumber(enemy.burn.dps)), tone: 'fire' });
  if (enemy.slow) tags.push({ text: t.tags.slowed(formatPercent(enemy.slow.amount)), tone: 'ice' });
  if (enemy.haste > 1) tags.push({ text: t.tags.hasted(formatPercent(enemy.haste - 1)), tone: 'haste' });

  const tier = enemyTierBonus(enemy.level);
  const subtitle = t.enemy.subtitle;
  return {
    id: `enemigo:${enemy.id}`,
    tone: enemy.kind,
    title: t.enemy.names[enemy.kind],
    subtitle: enemy.kind === 'creeper' ? bossSubtitle(enemy) : subtitle[enemy.kind],
    level: boss
      ? null
      : {
          value: enemy.level,
          medalTier: showsMedal(enemy.level) ? medalTier(enemy.level) : null,
          note: tier > 0 ? t.enemy.tier(formatPercent(tier)) : null,
        },
    hp: hpOf(enemy.hp, enemyMaxHp(enemy.kind, enemy.level)),
    stats: rows,
    tags,
    about: enemyAbout(enemy.kind),
    lore: bossLore(enemy.kind),
  };
}

/** Lo que cuenta Boxer del virus de verdad (T-032, VT-04), completo: solo si es el jefe de un brote. */
function bossLore(kind: Enemy['kind']): string | null {
  const outbreak = outbreakOfBoss(kind);
  return outbreak ? text().story.lore[outbreak].card : null;
}
