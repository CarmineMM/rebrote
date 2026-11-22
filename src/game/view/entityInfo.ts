import { BOARD, CLONE, CREEPER, ELK_CLONER, ENEMIES, HOP, ICE_WALL, MINE, SHIELD, STEALTH } from '../config/balance';
import type { Cell } from '../core/board';
import {
  bulletDamage,
  bulletEffect,
  enemyDamage,
  enemyMaxHp,
  enemyReward,
  fireIntervalMs,
  isBoss,
  isEnraged,
  isHidden,
  leavesClone,
  mineBlast,
  poemDamage,
  poemWarning,
  slamDamage,
  verseDamage,
  type Enemy,
} from '../core/combat';
import type { IceBlock, Mine, Plant, Wall } from '../core/match';
import { FIRST_OUTBREAK, outbreakNumber, outbreakOfBoss } from '../core/outbreaks';
import { plantMaxHp } from '../core/plants';
import type { EntityInfo, InfoStat, InfoTag } from '../EventBus';
import { formatNumber, formatPercent, formatSeconds, text } from '../../i18n';
import { medalTier, showsMedal } from './levelMedal';
import { iceWear } from './powerArt';
import { wallWear } from './wallArt';

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
 * nivel (no se dice). `baseLevel`, el de su partida (T-023): si se compro, una pastilla lo dice.
 */
export function shooterInfo(plant: Plant, cell: Cell, levelCap: number | null, baseLevel = 1): EntityInfoData {
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
  // La de escudo (T-024, E-02) para lo que va hacia las de detras.
  if (element === 'shield') stats.push({ label: t.stats.blocks, value: t.stats.blocksValue });
  return {
    id: `planta:${cell.lane}:${cell.col}`,
    tone: element ?? 'plant',
    title: t.shooter.title[element ?? 'plain'],
    subtitle: cannons === 1 ? t.shooter.oneCannon : t.shooter.fused(cannons),
    level: { value: level, medalTier: showsMedal(level) ? medalTier(level) : null, note: levelCap === null ? null : t.shooter.cap(levelCap) },
    hp: hpOf(plant.hp, plantMaxHp(shooter)),
    stats,
    tags: baseLevel > 1 ? [{ text: t.shooter.baseLevel(baseLevel), tone: 'nursery' }] : [],
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

/**
 * Ficha del muro (T-024): el escudo sembrado solo. No ataca y para lo de detras. Que se puede llevar a una disparadora solo
 * lo dice si en la partida ya se puede infundir el escudo (`canInfuse`, T-037: no en el brote 2).
 */
export function wallInfo(wall: Wall, cell: Cell, canInfuse: boolean): EntityInfoData {
  const t = text().info;
  const stats: InfoStat[] = [
    { label: t.stats.attack, value: t.stats.noAttack },
    { label: t.stats.blocks, value: t.stats.blocksValue },
    ...(canInfuse ? [{ label: t.stats.drag, value: t.stats.dragValue }] : []),
  ];
  const wear = wallWear(wall.hp / SHIELD.wallHp);
  const tags: InfoTag[] = wear === 2 ? [{ text: t.tags.crumbling, tone: 'alert' }] : wear === 1 ? [{ text: t.tags.cracked, tone: 'calm' }] : [];
  return {
    id: `muro:${cell.lane}:${cell.col}`,
    tone: 'shield',
    title: t.wall.title,
    subtitle: t.wall.subtitle,
    level: null,
    hp: hpOf(wall.hp, SHIELD.wallHp),
    stats,
    tags,
    about: canInfuse ? `${t.wall.about} ${t.wall.aboutInfuse}` : t.wall.about,
    lore: null,
  };
}

/**
 * Ficha de un bloque del muro de hielo del poder (T-021): no ataca, para lo de detras (como el escudo, O-11) y cuando se
 * derrite. Con desgaste, agrietado o a punto de romperse; en sus ultimos segundos, derritiendose.
 */
export function iceInfo(block: IceBlock, cell: Cell): EntityInfoData {
  const t = text().info;
  const stats: InfoStat[] = [
    { label: t.stats.attack, value: t.stats.noAttack },
    { label: t.stats.blocks, value: t.stats.blocksValue },
    { label: t.stats.melts, value: t.stats.meltsIn(formatSeconds(Math.ceil(block.ms / 1000) * 1000)) },
  ];
  const wear = iceWear(block.hp / block.maxHp);
  const tags: InfoTag[] = [];
  if (block.ms <= ICE_WALL.durationMs * 0.3) tags.push({ text: t.tags.melting, tone: 'ice' });
  if (wear === 2) tags.push({ text: t.tags.crumbling, tone: 'alert' });
  else if (wear === 1) tags.push({ text: t.tags.cracked, tone: 'calm' });
  return {
    id: `hielo:${cell.lane}:${cell.col}`,
    tone: 'iceWall',
    title: t.iceWall.title,
    subtitle: t.iceWall.subtitle,
    level: null,
    hp: hpOf(block.hp, block.maxHp),
    stats,
    tags,
    about: t.iceWall.about(formatSeconds(ICE_WALL.durationMs)),
    lore: null,
  };
}

/** Como funciona cada enemigo, en el idioma en curso. Una copia (T-025) cuenta de donde sale y lo que tiene de su copion. */
function enemyAbout(enemy: Enemy): string {
  const about = text().info.enemy.about;
  if (enemy.clone) return about.clone(formatPercent(CLONE.hp), formatPercent(CLONE.damage));
  const { kind } = enemy;
  if (kind === 'spitter' || kind === 'copycatSpitter' || kind === 'minstrel') return about[kind](formatNumber(ENEMIES[kind].range));
  if (kind === 'elkCloner') return about.elkCloner(ELK_CLONER.poemEvery);
  // Tropas del brote 3 (T-038): a que distancia las ven las plantas y, el Skipper, cuanto salta.
  const seen = formatNumber(STEALTH.revealRadius);
  if (kind === 'lurker' || kind === 'lurkerArmored') return about[kind](seen);
  if (kind === 'lurkerSpitter') return about.lurkerSpitter(seen, formatNumber(ENEMIES.lurkerSpitter.range));
  if (kind === 'skipper') return about.skipper(formatNumber(HOP.length));
  return about[kind];
}

/** Nombre del enemigo: el de su tipo o, si es una copia (T-025), el de la copia de su copion. */
function enemyName(enemy: Enemy): string {
  const { names, cloneNames } = text().info.enemy;
  if (!enemy.clone) return names[enemy.kind];
  return (cloneNames as Partial<Record<Enemy['kind'], string>>)[enemy.kind] ?? names[enemy.kind];
}

/** "Jefe del brote 1" (T-018: el brote del que es jefe), y su fase; el de Elk Cloner (T-026), con su apodo. */
function bossSubtitle(enemy: Enemy): string {
  const { subtitle } = text().info.enemy;
  const number = outbreakNumber(outbreakOfBoss(enemy.kind) ?? FIRST_OUTBREAK);
  if (enemy.kind === 'elkCloner') return subtitle.poet(number);
  return isEnraged(enemy) ? subtitle.bossEnraged(number) : subtitle.boss(number);
}

/**
 * Ficha de un enemigo: su nivel y su tramo (T-009 y T-010), lo que quita, lo rapido que va y lo que le pasa ahora. Los
 * copiones (T-025) dicen que dejan copia; el juglar, su verso y si toma aire. Elk Cloner (T-026), su mordisco, su verso,
 * su poema entero y cuantos versos le faltan para el.
 */
export function enemyInfo(enemy: Enemy): EntityInfoData {
  const t = text().info;
  const stats = ENEMIES[enemy.kind];
  const boss = isBoss(enemy.kind);
  const damage = formatNumber(enemyDamage(enemy));
  const rows: InfoStat[] = [];
  if (stats.attack === 'spit') {
    rows.push({ label: t.stats.spit, value: damage, note: t.stats.spitNote(formatSeconds(stats.spitIntervalMs), formatNumber(stats.range)) });
  } else if (stats.attack === 'verse') {
    rows.push({ label: t.stats.verse, value: damage, note: t.stats.verseNote(formatSeconds(stats.verseIntervalMs), formatNumber(stats.range)) });
  } else {
    rows.push({ label: t.stats.bite, value: damage, note: t.stats.biteNote(formatSeconds(stats.biteIntervalMs)) });
  }
  if (stats.attack === 'recite') {
    rows.push({ label: t.stats.verse, value: formatNumber(verseDamage(enemy)), note: t.stats.bossVerseNote(formatSeconds(stats.verseIntervalMs)) });
    rows.push({ label: t.stats.poem, value: formatNumber(poemDamage()), note: t.stats.poemNote(ELK_CLONER.poemEvery, formatSeconds(ELK_CLONER.poemWarnMs)) });
  }
  if (enemy.kind === 'creeper') rows.push({ label: t.stats.slam, value: formatNumber(slamDamage()), note: t.stats.slamNote });
  // Skipper (T-038): cuanto salta y cuanto descansa; su velocidad es la media de los dos.
  if (enemy.hop) rows.push({ label: t.stats.hop, value: t.stats.hopValue(formatNumber(HOP.length)), note: t.stats.hopNote(formatSeconds(HOP.restMs)) });
  const speed = stats.speed * enemy.haste;
  rows.push({ label: t.stats.speed, value: t.stats.speedValue(formatNumber(speed, 2)), note: t.stats.crosses(Math.round(BOARD.columns / speed)) });
  // Lurker (T-038): a que distancia lo ven las plantas.
  if (enemy.revealMs !== null) rows.push({ label: t.stats.seen, value: t.stats.seenValue(formatNumber(STEALTH.revealRadius)), note: t.stats.seenNote });
  if (enemy.kind === 'creeper') {
    const next = CREEPER.jumpAt[enemy.jumpsUsed];
    rows.push({ label: t.stats.nextJump, value: next === undefined ? t.stats.noMoreJumps : t.stats.jumpAt(formatPercent(next)) });
  }
  if (enemy.recital) {
    const left = Math.max(0, ELK_CLONER.poemEvery - enemy.recital.sung);
    rows.push({ label: t.stats.nextPoem, value: poemWarning(enemy) !== null ? t.stats.poemNow : t.stats.poemIn(left) });
  }
  if (boss) {
    rows.push({ label: t.stats.onDefeat, value: t.stats.youWin });
  } else {
    if (leavesClone(enemy)) rows.push({ label: t.stats.onDefeat, value: t.stats.leavesClone });
    rows.push({ label: t.stats.reward, value: t.stats.rewardValue(enemyReward(enemy)) });
  }

  const tags: InfoTag[] = [];
  // Tropas del brote 3 (T-038): si esta oculta, y el Skipper, si esta en el aire o a punto de saltar.
  if (enemy.revealMs !== null) tags.push(isHidden(enemy) ? { text: t.tags.hidden, tone: 'calm' } : { text: t.tags.revealed, tone: 'alert' });
  if (enemy.hop?.stage === 'air') tags.push({ text: t.tags.airborne, tone: 'alert' });
  else if (enemy.hop && enemy.attackMs === null && enemy.hop.ms <= HOP.crouchMs) tags.push({ text: t.tags.crouching, tone: 'alert' });
  if (boss && isEnraged(enemy)) tags.push({ text: t.tags.enraged, tone: 'alert' });
  if (enemy.jump) tags.push({ text: t.tags.jumping, tone: 'alert' });
  else if (poemWarning(enemy) !== null) tags.push({ text: t.tags.poem, tone: 'alert' });
  else if (enemy.attackMs !== null && stats.attack === 'verse') {
    tags.push({ text: enemy.attackMs <= stats.warnMs ? t.tags.inhaling : t.tags.reciting, tone: 'alert' });
  } else if (enemy.attackMs !== null) tags.push({ text: stats.attack === 'spit' ? t.tags.spitting : t.tags.biting, tone: 'alert' });
  if (enemy.burn) tags.push({ text: t.tags.burning(formatNumber(enemy.burn.dps)), tone: 'fire' });
  if (enemy.slow) tags.push({ text: t.tags.slowed(formatPercent(enemy.slow.amount)), tone: 'ice' });
  if (enemy.haste > 1) tags.push({ text: t.tags.hasted(formatPercent(enemy.haste - 1)), tone: 'haste' });

  const subtitle = t.enemy.subtitle;
  return {
    id: `enemigo:${enemy.id}`,
    tone: enemy.kind,
    title: enemyName(enemy),
    subtitle: isBoss(enemy.kind) ? bossSubtitle(enemy) : enemy.clone ? subtitle.clone : subtitle[enemy.kind],
    level: boss
      ? null
      : {
          value: enemy.level,
          medalTier: showsMedal(enemy.level) ? medalTier(enemy.level) : null,
          note: null,
        },
    hp: hpOf(enemy.hp, enemyMaxHp(enemy.kind, enemy.level, enemy.clone)),
    stats: rows,
    tags,
    about: enemyAbout(enemy),
    lore: bossLore(enemy.kind),
  };
}

/** Lo que cuenta Boxer del virus de verdad (T-032, VT-04), completo: solo si es el jefe de un brote. */
function bossLore(kind: Enemy['kind']): string | null {
  const outbreak = outbreakOfBoss(kind);
  return outbreak ? text().story.lore[outbreak].card : null;
}
