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
  type EnemyKind,
} from '../core/combat';
import type { Mine, Plant } from '../core/match';
import { plantMaxHp, type ElementType } from '../core/plants';
import type { EntityInfo, InfoStat, InfoTag } from '../EventBus';
import { medalTier, showsMedal } from './levelMedal';

/**
 * Ficha de informacion (T-010): nombre, nivel, vida, datos y como funciona una disparadora, una mina o un enemigo, con
 * los numeros de las reglas de core. Sin Phaser: la escena le anade la foto (`portrait.ts`) y la manda a React.
 */
export type EntityInfoData = Omit<EntityInfo, 'portrait'>;

/** Numero en espanol: coma decimal y como mucho `decimals` decimales, sin ceros de sobra (57,5; 115; 0,29). */
export function formatNumber(value: number, decimals = 1): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return String(Object.is(rounded, -0) ? 0 : rounded).replace('.', ',');
}

const percent = (fraction: number) => Math.round(fraction * 100);
const seconds = (ms: number) => `${formatNumber(ms / 1000, 2)} s`;

/** Vida en enteros: la que queda (sin pasar de la llena, y 1 si aun vive) y la llena. */
function hpOf(current: number, max: number): EntityInfo['hp'] {
  const full = Math.round(max);
  return { current: Math.min(full, Math.max(0, Math.ceil(current))), max: full };
}

const ELEMENT_NAME: Record<ElementType, string> = { fire: 'de fuego', ice: 'de hielo' };

/**
 * Ficha de la disparadora de `cell`. `levelCap` es el tope de nivel de la ronda, o null si aun no se puede subir de
 * nivel (no se dice).
 */
export function shooterInfo(plant: Plant, cell: Cell, levelCap: number | null): EntityInfoData {
  const { shooter } = plant;
  const { element, cannons, level } = shooter;
  const shot = bulletDamage(shooter) * cannons;
  const intervalMs = fireIntervalMs(shooter);
  const stats: InfoStat[] = [
    { label: 'Daño', value: `${formatNumber(shot)} por disparo`, note: cannons > 1 ? `${cannons} semillas de ${formatNumber(bulletDamage(shooter))}` : undefined },
    { label: 'Cadencia', value: `Cada ${seconds(intervalMs)}`, note: `${formatNumber(1000 / intervalMs, 2)} disparos por segundo` },
    { label: 'Daño por segundo', value: formatNumber((shot * 1000) / intervalMs) },
  ];
  const effect = bulletEffect(shooter);
  if (effect?.element === 'fire') {
    stats.push({ label: 'Quemadura', value: `${formatNumber(effect.burn.dps)} por segundo`, note: `durante ${seconds(effect.burn.ms)}` });
  } else if (effect?.element === 'ice') {
    stats.push({ label: 'Frena', value: `Un ${percent(effect.slow.amount)} %`, note: `durante ${seconds(effect.slow.ms)}` });
  }
  stats.push({ label: 'Alcance', value: 'Su carril, hacia delante' });
  return {
    id: `planta:${cell.lane}:${cell.col}`,
    tone: element ?? 'plant',
    title: element ? `Disparadora ${ELEMENT_NAME[element]}` : 'Disparadora',
    subtitle: cannons === 1 ? 'Un cañón' : `${cannons} cañones fusionados`,
    level: { value: level, medalTier: showsMedal(level) ? medalTier(level) : null, note: levelCap === null ? null : `Tope ${levelCap}` },
    hp: hpOf(plant.hp, plantMaxHp(shooter)),
    stats,
    tags: [],
    about:
      element === 'fire'
        ? 'Sus semillas queman: el enemigo sigue perdiendo vida un rato después del impacto.'
        : element === 'ice'
          ? 'Sus semillas frenan: el enemigo avanza y muerde más despacio.'
          : 'Dispara semillas a los enemigos de su carril que tiene delante.',
  };
}

/** Ficha de la mina de `cell`. */
export function mineInfo(mine: Mine, cell: Cell): EntityInfoData {
  const blast = mineBlast(mine.element);
  const stats: InfoStat[] = [
    { label: 'Detecta', value: `A ${formatNumber(MINE.detectRadius)} casillas` },
    { label: 'Explota', value: `${seconds(MINE.countdownMs)} después`, note: `alcanza ${formatNumber(MINE.blastRadius)} casillas` },
  ];
  if (blast.slow) {
    stats.push({ label: 'Frena', value: `Un ${percent(blast.slow.amount)} %`, note: `durante ${seconds(blast.slow.ms)}` });
  } else {
    stats.push({ label: 'Daño', value: `${formatNumber(blast.damage)} a cada enemigo` });
  }
  const tags: InfoTag[] =
    mine.fuseMs === null ? [{ text: 'Esperando a un enemigo', tone: 'calm' }] : [{ text: `¡Explota en ${seconds(mine.fuseMs)}!`, tone: 'alert' }];
  return {
    id: `mina:${cell.lane}:${cell.col}`,
    tone: mine.element,
    title: `Mina ${ELEMENT_NAME[mine.element]}`,
    subtitle: mine.element === 'fire' ? 'Fuego sembrado solo' : 'Hielo sembrado solo',
    level: null,
    hp: hpOf(mine.hp, MINE.hp),
    stats,
    tags,
    about:
      mine.element === 'fire'
        ? `Cuando un enemigo se acerca, cuenta ${seconds(MINE.countdownMs)} y explota: daña a todos los de alrededor, también en los carriles de al lado.`
        : `Cuando un enemigo se acerca, cuenta ${seconds(MINE.countdownMs)} y explota: frena mucho a todos los de alrededor, también en los carriles de al lado. No hace daño.`,
  };
}

const ENEMY_NAME: Record<EnemyKind, string> = {
  worm: 'Gusano',
  armored: 'Gusano acorazado',
  spitter: 'Gusano escupidor',
  creeper: 'Creeper',
};

const ENEMY_ABOUT: Record<EnemyKind, string> = {
  worm: 'Avanza por su carril y muerde lo primero que encuentra hasta destruirlo.',
  armored: 'Como el gusano, con cuatro veces su vida y más lento. Se le caen las placas al perder vida.',
  spitter: `Se para a ${formatNumber(ENEMIES.spitter.range)} casillas de lo primero sembrado y le escupe. Puede reventar una mina antes de que explote.`,
  creeper: 'Salta de carril al perder vida y deja copias suyas. Si cruza el jardín, se pierde la partida.',
};

/** Ficha de un enemigo: su nivel y su tramo (T-009 y T-010), lo que quita, lo rapido que va y lo que le pasa ahora. */
export function enemyInfo(enemy: Enemy): EntityInfoData {
  const stats = ENEMIES[enemy.kind];
  const boss = enemy.kind === 'creeper';
  const damage = formatNumber(enemyDamage(enemy));
  const rows: InfoStat[] = [];
  if (stats.attack === 'spit') {
    rows.push({ label: 'Escupitajo', value: damage, note: `cada ${seconds(stats.spitIntervalMs)}, a ${formatNumber(stats.range)} casillas` });
  } else {
    rows.push({ label: 'Mordisco', value: damage, note: `cada ${seconds(stats.biteIntervalMs)}` });
  }
  if (boss) rows.push({ label: 'Golpe al caer', value: formatNumber(slamDamage()), note: 'al aterrizar de un salto' });
  const speed = stats.speed * enemy.haste;
  rows.push({ label: 'Velocidad', value: `${formatNumber(speed, 2)} casillas/s`, note: `cruza el jardín en ${Math.round(BOARD.columns / speed)} s` });
  if (boss) {
    const next = CREEPER.jumpAt[enemy.jumpsUsed];
    rows.push({ label: 'Próximo salto', value: next === undefined ? 'Ya no salta más' : `Al bajar del ${percent(next)} % de vida` });
    rows.push({ label: 'Al caer', value: '¡Ganas la partida!' });
  } else {
    rows.push({ label: 'Recompensa', value: `${stats.reward} monedas` });
  }

  const tags: InfoTag[] = [];
  if (boss && isEnraged(enemy)) tags.push({ text: '¡Enfadado!', tone: 'alert' });
  if (enemy.jump) tags.push({ text: 'Saltando de carril', tone: 'alert' });
  else if (enemy.attackMs !== null) tags.push({ text: stats.attack === 'spit' ? 'Escupiendo' : 'Mordiendo', tone: 'alert' });
  if (enemy.burn) tags.push({ text: `Quemado: −${formatNumber(enemy.burn.dps)} por segundo`, tone: 'fire' });
  if (enemy.slow) tags.push({ text: `Frenado un ${percent(enemy.slow.amount)} %`, tone: 'ice' });
  if (enemy.haste > 1) tags.push({ text: `Acelerado +${percent(enemy.haste - 1)} %`, tone: 'haste' });

  const tier = enemyTierBonus(enemy.level);
  return {
    id: `enemigo:${enemy.id}`,
    tone: enemy.kind,
    title: ENEMY_NAME[enemy.kind],
    subtitle: boss ? (isEnraged(enemy) ? 'Jefe del mundo 1 · fase 2' : 'Jefe del mundo 1') : enemy.kind === 'armored' ? 'Con casco y placas de acero' : enemy.kind === 'spitter' ? 'Ataca desde lejos' : 'Gusano informático',
    level: boss
      ? null
      : {
          value: enemy.level,
          medalTier: showsMedal(enemy.level) ? medalTier(enemy.level) : null,
          note: tier > 0 ? `+${percent(tier)} % de fuerza por su tramo` : null,
        },
    hp: hpOf(enemy.hp, enemyMaxHp(enemy.kind, enemy.level)),
    stats: rows,
    tags,
    about: ENEMY_ABOUT[enemy.kind],
  };
}
