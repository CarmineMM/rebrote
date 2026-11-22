import { BOARD, CLONE, CREEPER, ELK_CLONER, ENEMIES, ENEMY_LEVELS, ENEMY_POWER, FIRE, GRENADE, ICE, ICE_WALL, MINE, SHIELD, SHOOTER, VERSE } from '../config/balance';
import type { BoardPoint, Cell } from './board';
import type { MatchState, Mine, Sown } from './match';
import { damageMultiplier, fireRateMultiplier, plantMaxHp, type MineElement, type Shooter } from './plants';

/**
 * Combate como simulacion pura por pasos (ADR-0008). `stepCombat` avanza la partida un trozo de tiempo
 * y cuenta lo que paso; la escena solo pinta el estado y anima los eventos. Todo en casillas y milisegundos.
 */

export type EnemyKind = keyof typeof ENEMIES;

/**
 * Jefes (T-008 y T-026): el de cada brote (`boss` en `OUTBREAKS`). No tienen nivel, si cruzan el jardin se pierde la
 * partida y, al caer, caen con ellos todos los demas, sin copias, y sus versos en vuelo se deshacen.
 */
export type BossKind = 'creeper' | 'elkCloner';

export const BOSS_KINDS: readonly BossKind[] = ['creeper', 'elkCloner'];

/** ¿Es el jefe de un brote? */
export function isBoss(kind: EnemyKind): kind is BossKind {
  return (BOSS_KINDS as readonly EnemyKind[]).includes(kind);
}

/** Quemadura (T-004): dano por segundo mientras le quede tiempo. */
export interface Burn {
  readonly dps: number;
  /** En una bala, lo que dura al impactar; en un enemigo, lo que le queda. */
  readonly ms: number;
}

/** Ralentizacion (T-005): parte de la velocidad que pierde mientras le quede tiempo. */
export interface Slow {
  /** De 0 a 1: 0,7 es un 70 % mas lento. */
  readonly amount: number;
  /** En una bala o una mina, lo que dura al alcanzar; en un enemigo, lo que le queda. */
  readonly ms: number;
}

/**
 * Salto de carril del Creeper (T-008). Primero se agacha en su carril (`crouch`: el aviso, con el destino marcado) y
 * luego vuela al carril de destino (`air`: ya esta en `to`, pero no le dan las balas ni las minas).
 */
export interface Jump {
  readonly stage: 'crouch' | 'air';
  readonly from: number;
  readonly to: number;
  /** Lo que le queda a la etapa. */
  readonly ms: number;
  /** Lo que dura la etapa entera: con `ms`, la vista sabe por donde va (agacharse, la curva del vuelo). */
  readonly stageMs: number;
}

/**
 * Recital de Elk Cloner (T-026): su reloj de versos, cuantos lleva desde el ultimo poema entero y, si esta anunciando el
 * poema entero (L-03), lo que le queda al aviso.
 */
export interface Recital {
  /** Lo que falta para su siguiente verso (o para empezar a anunciar el poema). Solo corre mientras pisa el cesped. */
  readonly ms: number;
  /** Versos de su carril desde el ultimo poema entero: con `ELK_CLONER.poemEvery`, lo siguiente es el poema. */
  readonly sung: number;
  /** Aviso del poema entero en curso: lo que le queda, o null si no lo esta anunciando. Mientras dura no avanza ni muerde. */
  readonly poemMs: number | null;
}

export interface Enemy {
  readonly id: number;
  readonly kind: EnemyKind;
  /** Carril en el que esta. Al despegar de un salto (Creeper), ya es el de destino. */
  readonly lane: number;
  /** Centro del cuerpo, en casillas. Avanza hacia la izquierda, hacia x = 0. */
  readonly x: number;
  readonly hp: number;
  /**
   * Mientras ataca (muerde lo que toca o, el escupidor, escupe a distancia): milisegundos hasta el siguiente
   * mordisco o escupitajo. Null si avanza.
   */
  readonly attackMs: number | null;
  /** Quemadura activa, o null si no arde. */
  readonly burn: Burn | null;
  /** Ralentizacion activa, o null si va a su velocidad. Convive con la quemadura. */
  readonly slow: Slow | null;
  /** Velocidad respecto a la de su tipo: mas de 1 si lo acelero Creeper (T-008, rondas 8 y 9 y sus copias). */
  readonly haste: number;
  /**
   * Nivel (T-009): cada uno suma `ENEMY_LEVELS.perLevel` a su vida y a su dano de nivel 1, y desde el 5 y el 10 lleva un
   * extra por tramo (T-010, `enemyPower`). El Creeper no tiene nivel (siempre 1: su vida y su mordisco son los suyos, con
   * la fuerza de todos).
   */
  readonly level: number;
  /** Salto de carril en curso (solo el Creeper, T-008), o null. */
  readonly jump: Jump | null;
  /** Umbrales de vida de `CREEPER.jumpAt` ya gastados en saltos (solo cuenta en el Creeper). */
  readonly jumpsUsed: number;
  /**
   * Copia que dejo un copion al caer (T-025, F-01): con `CLONE.hp` de la vida y `CLONE.damage` del dano de su tipo y nivel,
   * mas pequena (`CLONE.size`), da `CLONE.reward` y no deja otra copia.
   */
  readonly clone: boolean;
  /** Recital de Elk Cloner (T-026), o null en los demas. */
  readonly recital: Recital | null;
}

/** Lo que deja una bala infundida al impactar, ademas de su dano: la de fuego quema y la de hielo frena. */
export type BulletEffect = { readonly element: 'fire'; readonly burn: Burn } | { readonly element: 'ice'; readonly slow: Slow };

export interface Bullet {
  readonly id: number;
  readonly lane: number;
  /** Punta de la bala, en casillas. Avanza hacia la derecha. */
  readonly x: number;
  readonly damage: number;
  /** Efecto del elemento de la planta que la disparo, o null si es normal. */
  readonly effect: BulletEffect | null;
}

/**
 * Escupitajo de un escupidor (T-007). Sale del centro del escupidor y vuela hacia la izquierda por su carril hasta
 * lo primero sembrado (planta o mina) que encuentra, o hasta salir del tablero.
 */
export interface Spit {
  readonly id: number;
  readonly lane: number;
  /** En casillas. Avanza hacia la izquierda, hacia x = 0. */
  readonly x: number;
  readonly damage: number;
}

/**
 * Verso de un juglar (T-025) o de Elk Cloner (T-026): una onda que nace en el centro de quien recita y recorre su carril
 * hacia la izquierda por encima de las plantas (`VERSE.speed`). Quita `damage` a todo lo sembrado que cruza hasta el primer
 * escudo, que lo recibe y lo para (`waveReach`), o hasta salir del tablero.
 */
export interface Verse {
  readonly id: number;
  readonly lane: number;
  /** Frente de la onda, en casillas. Avanza hacia la izquierda, hacia x = 0. */
  readonly x: number;
  readonly damage: number;
  /** Quien lo recita: el Minstrel o Elk Cloner, que los suelta mas grandes. */
  readonly by: EnemyKind;
  /**
   * Un trozo del poema entero de Elk Cloner (T-026, L-03): uno por carril a la vez. No mata lo que tenia la vida entera
   * (L-04, `poemHit`).
   */
  readonly poem: boolean;
}

/**
 * Granada del poder (T-021, O-04): vuela `flightMs` hasta el centro de su casilla y, al caer, cuenta `fuseMs` y explota
 * (`GRENADE`). No ocupa la casilla ni tiene vida: los enemigos no la atacan.
 */
export interface Grenade {
  readonly id: number;
  readonly cell: Cell;
  /** Lo que le queda de vuelo; 0 en cuanto cae. */
  readonly flightMs: number;
  /** Lo que le queda para explotar desde que cae. */
  readonly fuseMs: number;
}

/** Lo que paso durante un paso. La vista lo anima; la regla ya esta aplicada en el estado. */
export type CombatEvent =
  /** Una planta de N canones dispara N balas a la vez, un evento por bala. `cannon` es el canon (0 es el de arriba). */
  | { readonly type: 'shot'; readonly cell: Cell; readonly bullet: Bullet; readonly cannon: number }
  | { readonly type: 'hit'; readonly bulletId: number; readonly enemyId: number; readonly at: BoardPoint }
  | { readonly type: 'bulletGone'; readonly bulletId: number }
  | { readonly type: 'bite'; readonly enemyId: number; readonly cell: Cell }
  /** Un escupidor escupe (T-007): el escupitajo nace en su centro. */
  | { readonly type: 'spat'; readonly enemyId: number; readonly spit: Spit }
  /** Un escupitajo dio a lo sembrado en `cell` (planta o mina) y le quito vida. */
  | { readonly type: 'spitHit'; readonly spitId: number; readonly cell: Cell }
  /** Un escupitajo salio del tablero por la izquierda sin dar a nada. */
  | { readonly type: 'spitGone'; readonly spitId: number }
  /** Una disparadora o una mina se quedo sin vida (a mordiscos o a escupitajos). Una mina destruida asi no explota. */
  | { readonly type: 'plantDestroyed'; readonly cell: Cell }
  /**
   * Un enemigo se quedo sin vida. Al caer un jefe (T-008, T-026) caen tambien los demas: sus copias se desconectan.
   * `kind` dice cuanta moneda da (`ENEMIES[kind].reward`, T-009); una copia (`clone`, T-025) da `CLONE.reward`
   * (`enemyReward`).
   */
  | { readonly type: 'enemyKilled'; readonly enemyId: number; readonly kind: EnemyKind; readonly clone: boolean; readonly at: BoardPoint }
  /** Un copion cayo y dejo su copia (T-025, F-01), ya en el estado, donde estaba el. Va despues de su `enemyKilled`. */
  | { readonly type: 'cloned'; readonly parentId: number; readonly clone: Enemy }
  /** El juglar toma aire (T-025, F-04): se hincha y suelta su verso dentro de `ENEMIES.minstrel.warnMs`. */
  | { readonly type: 'verseWarned'; readonly enemyId: number }
  /** El juglar (o Elk Cloner, T-026) suelta un verso: nace en su centro. */
  | { readonly type: 'sang'; readonly enemyId: number; readonly verse: Verse }
  /** Elk Cloner (T-026, L-03) empieza a anunciar el poema entero: lo suelta dentro de `warnMs`, quieto. */
  | { readonly type: 'poemWarned'; readonly enemyId: number; readonly warnMs: number }
  /** Elk Cloner recita el poema entero: una onda por cada carril (`verses`, ya en el estado), todas desde su centro. */
  | { readonly type: 'poemRecited'; readonly enemyId: number; readonly verses: readonly Verse[] }
  /**
   * Un verso cruzo lo sembrado en `cell` y le quito vida (si lo destruyo, sigue `plantDestroyed`). Si era un escudo,
   * `blocked`: el verso se acaba ahi.
   */
  | { readonly type: 'verseHit'; readonly verseId: number; readonly cell: Cell; readonly blocked: boolean }
  /** Un verso salio del tablero por la izquierda, o se deshizo porque cayo el jefe (T-026). */
  | { readonly type: 'verseGone'; readonly verseId: number }
  /** Cruzo el borde izquierdo: resta una vida. Si es un jefe (T-008, T-026), se pierde la partida. */
  | { readonly type: 'enemyEscaped'; readonly enemyId: number; readonly lane: number; readonly kind: EnemyKind }
  /** El Creeper (T-008) cruzo un umbral de vida: se agacha para saltar y marca el carril de destino durante `warnMs`. */
  | { readonly type: 'jumpWarned'; readonly enemyId: number; readonly from: number; readonly to: number; readonly warnMs: number }
  /** El Creeper despega hacia `to` y deja sus copias (ya en el estado) en el carril que abandona. */
  | { readonly type: 'jumped'; readonly enemyId: number; readonly from: number; readonly to: number; readonly copies: readonly Enemy[] }
  /** El Creeper aterriza en `lane`. Si golpeo algo sembrado, `cell` dice donde (y si lo destruyo, sigue `plantDestroyed`). */
  | { readonly type: 'landed'; readonly enemyId: number; readonly lane: number; readonly cell: Cell | null }
  /** Un enemigo entro en el radio de la mina: empieza su conteo. */
  | { readonly type: 'mineArmed'; readonly cell: Cell }
  /** La mina exploto y dejo su casilla. `enemyIds` son los enemigos alcanzados; los que mueren llevan su `enemyKilled`. */
  | { readonly type: 'mineExploded'; readonly cell: Cell; readonly element: MineElement; readonly enemyIds: readonly number[] }
  /** La granada del poder (T-021) acabo su vuelo y cayo en su casilla: empieza a contar. */
  | { readonly type: 'grenadeLanded'; readonly grenadeId: number; readonly cell: Cell }
  /** La granada exploto. `enemyIds` son los alcanzados; los que mueren llevan su `enemyKilled`. Las plantas no reciben nada. */
  | { readonly type: 'grenadeExploded'; readonly grenadeId: number; readonly cell: Cell; readonly enemyIds: readonly number[] }
  /** Un bloque del muro de hielo (T-021) acabo su tiempo y se derritio: deja la casilla libre. */
  | { readonly type: 'iceMelted'; readonly cell: Cell };

export interface CombatStep {
  readonly state: MatchState;
  readonly events: readonly CombatEvent[];
}

/** Un fotograma lento se simula en pasos de como mucho este tamano, para que nada se salte una regla. */
export const MAX_STEP_MS = 50;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Dano de cada bala. El disparo entero (una bala por canon) hace el dano base de la disparadora por lo que
 * suman canones y nivel (`damageMultiplier`), repartido a partes iguales entre sus balas.
 */
export function bulletDamage(shooter: Shooter): number {
  return (SHOOTER.damage * damageMultiplier(shooter)) / shooter.cannons;
}

/**
 * Lo que deja cada bala al impactar segun el elemento de la planta. Cada semilla lleva la quemadura del disparo
 * entero (`damageMultiplier`): asi una de 3 canones, que costo 3 fuegos, quema en proporcion. Como no se acumula,
 * que las tres semillas la lleven solo importa si la primera mata y la siguiente da a otro enemigo.
 * La de hielo frena segun los canones (`ICE.bulletSlowByCannons`), siempre menos que la mina.
 */
export function bulletEffect(shooter: Shooter): BulletEffect | null {
  if (shooter.element === 'fire') {
    return { element: 'fire', burn: { dps: FIRE.burnDps * damageMultiplier(shooter), ms: FIRE.burnMs } };
  }
  if (shooter.element === 'ice') {
    return { element: 'ice', slow: { amount: ICE.bulletSlowByCannons[shooter.cannons], ms: ICE.bulletSlowMs } };
  }
  return null;
}

/** Lo que hace la explosion de la mina de cada elemento a cada enemigo alcanzado: la de fuego dana y la de hielo frena. */
export function mineBlast(element: MineElement): { readonly damage: number; readonly slow: Slow | null } {
  return element === 'fire'
    ? { damage: FIRE.blastDamage, slow: null }
    : { damage: ICE.blastDamage, slow: { amount: ICE.blastSlow, ms: ICE.blastSlowMs } };
}

/**
 * Quemadura que queda tras un impacto que quema con `incoming`. No se acumula: se queda la mas fuerte
 * y la duracion vuelve a empezar.
 */
export function refreshBurn(current: Burn | null, incoming: Burn): Burn {
  return { dps: Math.max(current?.dps ?? 0, incoming.dps), ms: incoming.ms };
}

/**
 * Ralentizacion que queda tras recibir `incoming` (de una semilla o de una mina). No se acumula: se queda la mas
 * fuerte. Si la que llega es igual o mas fuerte, la duracion vuelve a empezar; si es mas debil, la que habia sigue
 * como estaba. Asi una semilla no acorta lo que frena una mina, ni la alarga sin fin disparando sin parar.
 */
export function refreshSlow(current: Slow | null, incoming: Slow): Slow {
  return current && current.amount > incoming.amount ? current : incoming;
}

/** Aplica a un enemigo lo que deja una bala infundida al impactar. */
function applyBulletEffect(enemy: Mutable<Enemy>, effect: BulletEffect | null): void {
  if (effect?.element === 'fire') enemy.burn = refreshBurn(enemy.burn, effect.burn);
  else if (effect?.element === 'ice') enemy.slow = refreshSlow(enemy.slow, effect.slow);
}

/** Tiempo entre disparos: el base de la disparadora, mas corto con cada nivel. */
export function fireIntervalMs(shooter: Shooter): number {
  return SHOOTER.fireIntervalMs / fireRateMultiplier(shooter);
}

/** Lo que mide una copia respecto a su tipo (T-025): su cuerpo y su alcance encogen con ella. */
const sizeOf = (enemy: Pick<Enemy, 'clone'>): number => (enemy.clone ? CLONE.size : 1);

/** Del centro del enemigo a su hocico: el de su tipo, o menos si es una copia (T-025). */
export function enemyHalfLength(enemy: Pick<Enemy, 'kind' | 'clone'>): number {
  return ENEMIES[enemy.kind].halfLength * sizeOf(enemy);
}

/** Hocico del enemigo: lo primero que encuentra una bala. */
export function enemyFront(enemy: Enemy): number {
  return enemy.x - enemyHalfLength(enemy);
}

/**
 * Distancia de su centro al de la planta a la que empieza a morder. La copia (T-025), mas corta, se acerca lo que le falta
 * de hocico: muerde con la boca donde la pondria su tipo.
 */
export function enemyReach(enemy: Pick<Enemy, 'kind' | 'clone'>): number {
  const stats = ENEMIES[enemy.kind];
  if (stats.attack !== 'bite' && stats.attack !== 'recite') return 0;
  return stats.reach - (stats.halfLength - enemyHalfLength(enemy));
}

/** ¿Deja una copia al caer (T-025, F-01)? Las tropas del brote 2, una sola vez: la copia ya no deja otra. */
export function leavesClone(enemy: Pick<Enemy, 'kind' | 'clone'>): boolean {
  return !enemy.clone && (CLONE.kinds as readonly EnemyKind[]).includes(enemy.kind);
}

/** Moneda que da al caer (T-009, P-03): la de su tipo, o la de una copia (T-025). */
export function enemyReward(enemy: Pick<Enemy, 'kind' | 'clone'>): number {
  return enemy.clone ? CLONE.reward : ENEMIES[enemy.kind].reward;
}

/** Se pierde al quedarse sin vidas (D-07, provisional). Sin vidas, el combate no avanza. */
export function isDefeated(state: MatchState): boolean {
  return state.lives <= 0;
}

/** Evento de un enemigo que se quedo sin vida. */
function killed(e: Enemy): CombatEvent {
  return { type: 'enemyKilled', enemyId: e.id, kind: e.kind, clone: e.clone, at: { x: e.x, y: e.lane + 0.5 } };
}

/**
 * Lo que multiplica el nivel a la vida y al dano de nivel 1 (T-009): +`ENEMY_LEVELS.perLevel` por nivel.
 * Nivel 1, por 1; nivel 10, por 2,35. Sin el tramo ni la fuerza (ver `enemyPower`).
 */
export function enemyLevelFactor(level: number): number {
  return 1 + (level - 1) * ENEMY_LEVELS.perLevel;
}

/**
 * Extra del tramo de nivel (T-010, `ENEMY_POWER.levelTiers`): el del tramo mas alto alcanzado, o 0 por debajo del
 * primero. Del 5 al 9, 0,2; desde el 10, 0,4. No se acumulan.
 */
export function enemyTierBonus(level: number): number {
  let best: { from: number; bonus: number } | null = null;
  for (const tier of ENEMY_POWER.levelTiers) {
    if (level >= tier.from && (!best || tier.from > best.from)) best = tier;
  }
  return best?.bonus ?? 0;
}

/**
 * Lo que multiplica la vida y el dano de la base de su tipo un enemigo de nivel `level` (T-009 y T-010): lo que suma el
 * nivel, el extra de su tramo y la fuerza de todos. Nivel 1, por 1,1; nivel 5, por 2,11; nivel 10, por 3,62.
 */
export function enemyPower(level: number): number {
  return enemyLevelFactor(level) * (1 + enemyTierBonus(level)) * ENEMY_POWER.base;
}

/** Nivel que cuenta para su fuerza: el suyo, o 1 un jefe (Creeper, Elk Cloner), que no tiene. */
function powerLevel(kind: EnemyKind, level: number): number {
  return isBoss(kind) ? 1 : level;
}

/**
 * Vida llena de un enemigo de `kind` y nivel `level`, con su fuerza. Un jefe no tiene nivel: la suya por la fuerza de
 * todos. Una copia (`clone`, T-025), `CLONE.hp` de la de su tipo y nivel.
 */
export function enemyMaxHp(kind: EnemyKind, level = 1, clone = false): number {
  return ENEMIES[kind].hp * enemyPower(powerLevel(kind, level)) * (clone ? CLONE.hp : 1);
}

/**
 * Dano de cada mordisco (los que muerden, tambien los jefes), escupitajo (el escupidor) o verso (el juglar, T-025), con
 * su fuerza. Una copia (T-025) quita `CLONE.damage` de lo de su tipo y nivel. De Elk Cloner (T-026), su mordisco: sus
 * versos, en `verseDamage`, y su poema, en `poemDamage`.
 */
export function enemyDamage(enemy: Pick<Enemy, 'kind' | 'level'> & { readonly clone?: boolean }): number {
  const stats = ENEMIES[enemy.kind];
  const base = stats.attack === 'spit' ? stats.spitDamage : stats.attack === 'verse' ? stats.verseDamage : stats.biteDamage;
  return base * enemyPower(powerLevel(enemy.kind, enemy.level)) * (enemy.clone ? CLONE.damage : 1);
}

/** Golpe del Creeper al aterrizar de un salto (J-05), con la fuerza de todos (T-010). */
export function slamDamage(): number {
  return CREEPER.slamDamage * enemyPower(1);
}

/** Lo que quita cada verso de quien recita, con su fuerza: el del Minstrel (T-025) o el de Elk Cloner (T-026). 0 si no recita. */
export function verseDamage(enemy: Pick<Enemy, 'kind' | 'level'> & { readonly clone?: boolean }): number {
  const stats = ENEMIES[enemy.kind];
  if (stats.attack !== 'verse' && stats.attack !== 'recite') return 0;
  return stats.verseDamage * enemyPower(powerLevel(enemy.kind, enemy.level)) * (enemy.clone ? CLONE.damage : 1);
}

/** Lo que quita el poema entero de Elk Cloner (T-026, L-04) a cada cosa que cruza, con la fuerza de todos (T-010). */
export function poemDamage(): number {
  return ELK_CLONER.poemDamage * enemyPower(1);
}

/** Vida entera de lo sembrado: la de la disparadora con sus canones y su variante, la de la mina, el muro o el hielo (T-021). */
function sownFullHp(sown: Sown): number {
  if (sown.kind === 'shooter') return plantMaxHp(sown.shooter);
  if (sown.kind === 'ice') return ICE_WALL.hp;
  return sown.kind === 'mine' ? MINE.hp : SHIELD.wallHp;
}

/**
 * Lo que quita un trozo del poema entero (T-026, L-04) a lo sembrado que cruza: su dano, salvo a lo que tenia la vida
 * entera, que se queda como poco con `ELK_CLONER.spareFraction` de ella. Castiga lo ya danado, pero no borra el tablero de
 * golpe.
 */
export function poemHit(sown: Sown, damage: number): number {
  const full = sownFullHp(sown);
  if (sown.hp < full - 1e-6) return damage;
  return Math.max(0, Math.min(damage, sown.hp - full * ELK_CLONER.spareFraction));
}

/**
 * Nivel al azar segun una tabla de pesos (`ENEMY_LEVELS.tables`, T-009): `random` en [0, 1), como Math.random.
 * Sin tabla, nivel 1.
 */
export function rollEnemyLevel(table: Readonly<Record<number, number>> | undefined, random: () => number = Math.random): number {
  if (!table) return 1;
  const entries = Object.entries(table).map(([level, weight]) => [Number(level), weight] as const);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [level, weight] of entries) {
    roll -= weight;
    if (roll < 0) return level;
  }
  return entries[entries.length - 1][0];
}

/** Enemigo recien salido: avanza, sin efectos ni salto. Elk Cloner (T-026) trae su recital, con el primer verso por llegar. */
function newEnemy(id: number, kind: EnemyKind, lane: number, x: number, hp: number, haste: number, level: number, clone = false): Enemy {
  const recital = kind === 'elkCloner' ? { ms: ENEMIES.elkCloner.firstVerseMs, sung: 0, poemMs: null } : null;
  return { id, kind, lane, x, hp, attackMs: null, burn: null, slow: null, haste, level, jump: null, jumpsUsed: 0, clone, recital };
}

/**
 * Copia que deja un copion al caer (T-025, F-01): de su tipo, nivel y paso, en su sitio, con la vida llena de una copia.
 * No hereda la quemadura ni el frio: es otra.
 */
function cloneOf(parent: Enemy, id: number): Enemy {
  return newEnemy(id, parent.kind, parent.lane, parent.x, enemyMaxHp(parent.kind, parent.level, true), parent.haste, parent.level, true);
}

/**
 * Pone un enemigo con la vida llena en `x` de su carril. Queda el ultimo de `enemies`.
 * `hp` solo cambia en pruebas (por ejemplo, la prueba de rendimiento en desarrollo); sin ella, la vida llena de su
 * nivel. `haste` es su velocidad respecto a la de su tipo (las rondas 8 y 9 sacan enemigos acelerados, T-008) y
 * `level`, su nivel (T-009; un jefe no tiene: siempre 1).
 */
export function spawnEnemy(
  state: MatchState,
  kind: EnemyKind,
  lane: number,
  x: number,
  hp?: number,
  haste = 1,
  level = 1,
): MatchState {
  if (!Number.isInteger(lane) || lane < 0 || lane >= BOARD.lanes) {
    throw new Error(`Carril invalido: ${lane}`);
  }
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Nivel invalido: ${level}`);
  }
  const ownLevel = isBoss(kind) ? 1 : level;
  const enemy = newEnemy(state.nextId, kind, lane, x, hp ?? enemyMaxHp(kind, ownLevel), haste, ownLevel);
  return { ...state, enemies: [...state.enemies, enemy], nextId: state.nextId + 1 };
}

/** En el aire, a mitad de un salto (Creeper, T-008): no le dan las balas ni las minas, y las plantas no le apuntan. */
export function isAirborne(enemy: Enemy): boolean {
  return enemy.jump?.stage === 'air';
}

/**
 * ¿Le alcanza la explosion de la granada (T-021)? Si esta vivo, en el suelo (a Creeper en el aire no, como a las minas) y a
 * `GRENADE.blastRadius` o menos del centro de su casilla, en cualquier carril.
 */
export function grenadeReaches(grenade: Pick<Grenade, 'cell'>, enemy: Enemy): boolean {
  return enemy.hp > 0 && !isAirborne(enemy) && distanceToCell(enemy, grenade.cell) <= GRENADE.blastRadius;
}

/** Fraccion de su vida llena (la de su tipo y nivel, y si es una copia) que le queda. */
export function hpFraction(enemy: Enemy): number {
  return enemy.hp / enemyMaxHp(enemy.kind, enemy.level, enemy.clone);
}

/** Fase 2 del Creeper (T-008): con la mitad de la vida o menos salta mas a menudo, avisa menos y deja mas copias. */
export function isEnraged(enemy: Enemy): boolean {
  return enemy.kind === 'creeper' && hpFraction(enemy) <= CREEPER.enragedBelow;
}

/** Umbrales de salto (`CREEPER.jumpAt`) que ya cruzo con la vida que le queda. */
export function jumpsCrossed(enemy: Enemy): number {
  const fraction = hpFraction(enemy);
  return CREEPER.jumpAt.filter((threshold) => fraction <= threshold).length;
}

/**
 * ¿Tiene la planta de la casilla a quien disparar? Un enemigo vivo de su carril, por delante de ella
 * y que ya pisa el tablero. A los que ya la pasaron no les dispara.
 */
export function hasTarget(enemies: readonly Enemy[], cell: Cell): boolean {
  const plantX = cell.col + 0.5;
  return enemies.some((e) => e.lane === cell.lane && e.hp > 0 && e.x > plantX && onLawn(e) && !isAirborne(e));
}

/** Ya pisa el cesped: las plantas le pueden disparar (y el escupidor y el juglar pueden pararse a atacar). */
export function onLawn(enemy: Enemy): boolean {
  return enemyFront(enemy) <= BOARD.columns;
}

/**
 * Avanza el combate `dtMs` milisegundos. No modifica el estado recibido. `random` (en [0, 1), como Math.random) elige
 * el carril al que salta el Creeper (T-008); se inyecta para poder testearlo.
 */
export function stepCombat(state: MatchState, dtMs: number, random: () => number = Math.random): CombatStep {
  const events: CombatEvent[] = [];
  let current = state;
  let remaining = dtMs;
  while (remaining > 0 && !isDefeated(current)) {
    const dt = Math.min(remaining, MAX_STEP_MS);
    current = substep(current, dt, events, random);
    remaining -= dt;
  }
  return { state: current, events };
}

/**
 * Un paso: primero arden, se mueven y atacan los enemigos (muerden, escupen o recitan, mas despacio si estan ralentizados;
 * el Creeper, ademas, salta de carril, y Elk Cloner recita sus versos y su poema entero); luego vuelan los escupitajos y los
 * versos; despues cuentan y explotan las minas, vuelan las balas, los copiones caidos dejan su copia y al final disparan
 * las plantas. Si cae un jefe, caen con el los demas enemigos, sin copias, y los versos en vuelo se deshacen (T-026).
 */
function substep(state: MatchState, dtMs: number, events: CombatEvent[], random: () => number): MatchState {
  const plants = state.plants.map((lane) => [...lane]);
  // Muro de hielo (T-021): cada bloque se derrite al acabar su tiempo y deja la casilla libre antes de que nadie lo muerda.
  meltIce(plants, dtMs, events);
  let lives = state.lives;
  let nextId = state.nextId;
  const newId = () => nextId++;
  /** Copias que deja el Creeper al despegar: entran en juego despues de mover a los demas. */
  const copies: Enemy[] = [];
  let bossDown = false;
  /** Copiones que cayeron en este paso (T-025): dejan su copia al final, si el jefe no cayo con ellos. */
  const fallen: Enemy[] = [];
  /** Un enemigo se queda sin vida. `mayClone`: si es un copion, deja su copia (en una explosion, solo los primeros). */
  const fall = (e: Enemy, mayClone = true) => {
    events.push(killed(e));
    if (isBoss(e.kind)) bossDown = true;
    if (mayClone && leavesClone(e)) fallen.push(e);
  };

  // Enemigos: arden si tienen una quemadura, y atacan o avanzan, mas despacio si estan ralentizados. Los que muerden
  // atacan lo que tocan (planta o mina); el escupidor, lo primero sembrado en su carril a su distancia. Los que
  // cruzan el borde izquierdo restan una vida.
  const enemies: Array<Mutable<Enemy>> = [];
  const launched: Spit[] = [];
  const sung: Verse[] = [];
  for (const enemy of state.enemies) {
    const stats = ENEMIES[enemy.kind];
    const e: Mutable<Enemy> = { ...enemy };
    if (e.burn) {
      // Solo arde el tiempo que le queda a la quemadura, aunque el paso sea mas largo.
      e.hp -= (e.burn.dps * Math.min(dtMs, e.burn.ms)) / 1000;
      e.burn = e.burn.ms > dtMs ? { ...e.burn, ms: e.burn.ms - dtMs } : null;
      if (e.hp <= 0) {
        fall(e);
        continue;
      }
    }
    // Ralentizado, su reloj de avanzar (y de atacar) va mas despacio, solo el tiempo que le queda al hielo.
    const walkMs = e.slow ? dtMs - e.slow.amount * Math.min(dtMs, e.slow.ms) : dtMs;
    if (e.slow) e.slow = e.slow.ms > dtMs ? { ...e.slow, ms: e.slow.ms - dtMs } : null;
    const attackClockMs = ICE.slowsAttacks ? walkMs : dtMs;
    // Creeper (T-008): al cruzar un umbral de vida se agacha para saltar y luego vuela a otro carril. Mientras tanto
    // no avanza ni muerde. El aviso y el vuelo no van mas lentos aunque este ralentizado: el aviso es una promesa.
    if (e.kind === 'creeper') {
      if (e.jump) {
        stepJump(e, dtMs, plants, copies, events, newId, random);
        enemies.push(e);
        continue;
      }
      if (e.jumpsUsed < CREEPER.jumpAt.length && hpFraction(e) <= CREEPER.jumpAt[e.jumpsUsed]) {
        startJump(e, random, events);
        enemies.push(e);
        continue;
      }
    }
    // Elk Cloner (T-026): recita mientras anda y muerde. Mientras anuncia el poema entero (L-03) se queda quieto.
    if (e.recital && recite(e, dtMs, attackClockMs, sung, events, newId)) {
      enemies.push(e);
      continue;
    }
    const lane = plants[e.lane];
    if (stats.attack === 'spit') {
      const col = rangedColumn(lane, e, stats.range);
      if (col !== null) {
        e.attackMs = (e.attackMs ?? stats.firstSpitMs) - attackClockMs;
        if (e.attackMs <= 0) {
          e.attackMs += stats.spitIntervalMs;
          const spit: Spit = { id: nextId++, lane: e.lane, x: e.x, damage: enemyDamage(e) };
          launched.push(spit);
          events.push({ type: 'spat', enemyId: e.id, spit });
        }
        enemies.push(e);
        continue;
      }
    } else if (stats.attack === 'verse') {
      // Juglar (T-025): se para a su distancia de lo primero sembrado, toma aire (el aviso, F-04) y suelta su verso.
      const col = rangedColumn(lane, e, stats.range);
      if (col !== null) {
        const before = e.attackMs ?? stats.firstVerseMs;
        e.attackMs = before - attackClockMs;
        if (before > stats.warnMs && e.attackMs <= stats.warnMs) events.push({ type: 'verseWarned', enemyId: e.id });
        if (e.attackMs <= 0) {
          e.attackMs += stats.verseIntervalMs;
          const verse: Verse = { id: nextId++, lane: e.lane, x: e.x, damage: verseDamage(e), by: e.kind, poem: false };
          sung.push(verse);
          events.push({ type: 'sang', enemyId: e.id, verse });
        }
        enemies.push(e);
        continue;
      }
    } else {
      const col = bittenColumn(lane, e.x, enemyReach(e));
      if (col !== null) {
        e.attackMs = (e.attackMs ?? stats.firstBiteMs) - attackClockMs;
        if (e.attackMs <= 0) {
          e.attackMs += stats.biteIntervalMs;
          const cell = { lane: e.lane, col };
          events.push({ type: 'bite', enemyId: e.id, cell });
          damageSown(plants, cell, enemyDamage(e), events);
        }
        enemies.push(e);
        continue;
      }
    }
    e.attackMs = null;
    e.x -= (stats.speed * e.haste * walkMs) / 1000;
    if (e.x < 0) {
      // Un jefe que cruza gana la partida el solo.
      lives = isBoss(e.kind) ? 0 : Math.max(0, lives - 1);
      events.push({ type: 'enemyEscaped', enemyId: e.id, lane: e.lane, kind: e.kind });
      continue;
    }
    enemies.push(e);
  }
  enemies.push(...copies.map((copy) => ({ ...copy })));

  // Escupitajos: dan a lo primero sembrado que encuentran en su carril (planta o mina) o desaparecen al salir
  // del tablero. Los que acaban de salir esperan al siguiente paso. Una mina destruida asi ya no explota.
  const spits: Spit[] = [];
  for (const spit of state.spits) {
    const from = spit.x;
    const to = from - (ENEMIES.spitter.spitSpeed * dtMs) / 1000;
    const col = firstSownInPath(plants[spit.lane], from, to);
    if (col !== null) {
      const cell = { lane: spit.lane, col };
      events.push({ type: 'spitHit', spitId: spit.id, cell });
      damageSown(plants, cell, spit.damage, events);
    } else if (to < 0) {
      events.push({ type: 'spitGone', spitId: spit.id });
    } else {
      spits.push({ ...spit, x: to });
    }
  }

  // Versos (T-025): cruzan el carril por encima de las plantas y quitan vida a todo lo sembrado que pasan, minas incluidas
  // (F-06), hasta el primer escudo, que lo recibe y los para (F-05). Una planta que muere al paso no los para. Los que
  // acaban de salir esperan al siguiente paso. Los del poema entero de Elk Cloner (T-026, L-04) no matan lo que tenia la
  // vida entera.
  const verses: Verse[] = [];
  for (const verse of state.verses) {
    const from = verse.x;
    const to = from - (VERSE.speed * dtMs) / 1000;
    const reach = waveReach(plants[verse.lane], from, to);
    for (const col of reach.cols) {
      const cell = { lane: verse.lane, col };
      events.push({ type: 'verseHit', verseId: verse.id, cell, blocked: col === reach.blockedAt });
      const sown = plants[cell.lane][cell.col] as Sown;
      damageSown(plants, cell, verse.poem ? poemHit(sown, verse.damage) : verse.damage, events);
    }
    if (reach.blockedAt !== null) continue;
    if (to < 0) events.push({ type: 'verseGone', verseId: verse.id });
    else verses.push({ ...verse, x: to });
  }

  // Minas: la que detecta a un enemigo empieza a contar; la que acaba el conteo explota y deja su casilla,
  // haya o no enemigos en su radio. Una mina destruida a mordiscos en este paso ya no esta.
  plants.forEach((lane, laneIndex) =>
    lane.forEach((sown, col) => {
      if (sown?.kind !== 'mine') return;
      const cell = { lane: laneIndex, col };
      if (sown.fuseMs === null) {
        if (enemies.some((e) => e.hp > 0 && !isAirborne(e) && distanceToCell(e, cell) <= MINE.detectRadius)) {
          lane[col] = { ...sown, fuseMs: MINE.countdownMs };
          events.push({ type: 'mineArmed', cell });
        }
        return;
      }
      const fuseMs = sown.fuseMs - dtMs;
      if (fuseMs > 0) {
        lane[col] = { ...sown, fuseMs };
        return;
      }
      lane[col] = null;
      explode(sown, cell, enemies, events, fall);
    }),
  );

  // Granadas (T-021): vuelan, caen, cuentan y explotan. El tiempo que sobra del vuelo cuenta para la mecha.
  const grenades: Grenade[] = [];
  for (const grenade of state.grenades) {
    let left = dtMs;
    if (grenade.flightMs > 0) {
      const flightMs = grenade.flightMs - left;
      if (flightMs > 0) {
        grenades.push({ ...grenade, flightMs });
        continue;
      }
      left = -flightMs;
      events.push({ type: 'grenadeLanded', grenadeId: grenade.id, cell: grenade.cell });
    }
    const fuseMs = grenade.fuseMs - left;
    if (fuseMs > 0) {
      grenades.push({ ...grenade, flightMs: 0, fuseMs });
      continue;
    }
    blastGrenade(grenade, enemies, events, fall);
  }

  // Balas: dan al primer enemigo que encuentran en su carril o desaparecen al salir del tablero.
  const bullets: Bullet[] = [];
  for (const bullet of state.bullets) {
    const from = bullet.x;
    const to = from + (SHOOTER.bulletSpeed * dtMs) / 1000;
    const target = firstInPath(enemies, bullet.lane, from, to);
    if (target) {
      target.hp -= bullet.damage;
      applyBulletEffect(target, bullet.effect);
      events.push({
        type: 'hit',
        bulletId: bullet.id,
        enemyId: target.id,
        at: { x: Math.max(from, enemyFront(target)), y: bullet.lane + 0.5 },
      });
      if (target.hp <= 0) fall(target);
    } else if (to > BOARD.columns) {
      events.push({ type: 'bulletGone', bulletId: bullet.id });
    } else {
      bullets.push({ ...bullet, x: to });
    }
  }
  // Sin su jefe (T-008, T-026), sus copias y los demas se desconectan: la partida esta ganada. Nadie deja copia, y los
  // versos en vuelo se deshacen.
  let flying: Verse[] = [...verses, ...sung];
  if (bossDown) {
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      e.hp = 0;
      events.push(killed(e));
    }
    for (const verse of flying) events.push({ type: 'verseGone', verseId: verse.id });
    flying = [];
  }
  const alive: Enemy[] = enemies.filter((e) => e.hp > 0);
  // Los copiones caidos dejan su copia donde estaban (T-025, F-01).
  if (!bossDown) {
    for (const parent of fallen) {
      const clone = cloneOf(parent, nextId++);
      alive.push(clone);
      events.push({ type: 'cloned', parentId: parent.id, clone });
    }
  }

  // Plantas: recargan y disparan si tienen a quien, una bala por canon. Si la recarga acaba a mitad de paso,
  // lo que sobra cuenta para el siguiente disparo; una planta que esperaba lista no acumula nada.
  plants.forEach((lane, laneIndex) =>
    lane.forEach((plant, col) => {
      if (plant?.kind !== 'shooter') return;
      const cell = { lane: laneIndex, col };
      let reloadMs = plant.reloadMs - dtMs;
      if (reloadMs <= 0) {
        if (hasTarget(alive, cell)) {
          const damage = bulletDamage(plant.shooter);
          const effect = bulletEffect(plant.shooter);
          for (let cannon = 0; cannon < plant.shooter.cannons; cannon++) {
            const bullet: Bullet = { id: nextId++, lane: laneIndex, x: col + 0.5, damage, effect };
            bullets.push(bullet);
            events.push({ type: 'shot', cell, bullet, cannon });
          }
          reloadMs = (plant.reloadMs > 0 ? reloadMs : 0) + fireIntervalMs(plant.shooter);
        } else {
          reloadMs = 0;
        }
      }
      if (reloadMs !== plant.reloadMs) lane[col] = { ...plant, reloadMs };
    }),
  );

  return { ...state, lives, plants, enemies: alive, bullets, spits: [...spits, ...launched], verses: flying, grenades, nextId };
}

/** Los bloques del muro de hielo (T-021) pierden `dtMs` de su tiempo; el que lo acaba se derrite y deja su casilla. */
function meltIce(plants: Array<Array<Sown | null>>, dtMs: number, events: CombatEvent[]): void {
  plants.forEach((lane, laneIndex) =>
    lane.forEach((sown, col) => {
      if (sown?.kind !== 'ice') return;
      const ms = sown.ms - dtMs;
      if (ms > 0) {
        lane[col] = { ...sown, ms };
        return;
      }
      lane[col] = null;
      events.push({ type: 'iceMelted', cell: { lane: laneIndex, col } });
    }),
  );
}

/**
 * La granada (T-021) explota: alcanza a todos los enemigos vivos de su radio (`grenadeReaches`), en cualquier carril y
 * tambien a los jefes (O-06), con el dano de la mina de fuego. Las plantas no reciben nada. De los copiones que tumba,
 * solo los primeros `CLONE.maxPerBlast` dejan copia, como con una mina.
 */
function blastGrenade(grenade: Grenade, enemies: Array<Mutable<Enemy>>, events: CombatEvent[], fall: (e: Enemy, mayClone: boolean) => void): void {
  const hit = enemies.filter((e) => grenadeReaches(grenade, e));
  events.push({ type: 'grenadeExploded', grenadeId: grenade.id, cell: grenade.cell, enemyIds: hit.map((e) => e.id) });
  let clones = 0;
  for (const e of hit) {
    e.hp -= GRENADE.damage;
    if (e.hp > 0) continue;
    const mayClone = leavesClone(e) && clones < CLONE.maxPerBlast;
    if (mayClone) clones++;
    fall(e, mayClone);
  }
}

/** Distancia del centro del enemigo al centro de la casilla, en casillas. Cuenta tambien en otros carriles. */
export function distanceToCell(enemy: Enemy, cell: Cell): number {
  return Math.hypot(enemy.x - (cell.col + 0.5), enemy.lane - cell.lane);
}

/**
 * La mina explota: alcanza a todos los enemigos vivos de su radio, en cualquier carril, con lo que hace la de su
 * elemento (`mineBlast`): la de fuego dana y la de hielo frena. De los copiones que tumba, solo los primeros
 * `CLONE.maxPerBlast` dejan copia (T-025): una mina no llena el carril de copias.
 */
function explode(mine: Mine, cell: Cell, enemies: Array<Mutable<Enemy>>, events: CombatEvent[], fall: (e: Enemy, mayClone: boolean) => void): void {
  const hit = enemies.filter((e) => e.hp > 0 && !isAirborne(e) && distanceToCell(e, cell) <= MINE.blastRadius);
  const { damage, slow } = mineBlast(mine.element);
  events.push({ type: 'mineExploded', cell, element: mine.element, enemyIds: hit.map((e) => e.id) });
  let clones = 0;
  for (const e of hit) {
    e.hp -= damage;
    if (slow) e.slow = refreshSlow(e.slow, slow);
    if (e.hp > 0) continue;
    const mayClone = leavesClone(e) && clones < CLONE.maxPerBlast;
    if (mayClone) clones++;
    fall(e, mayClone);
  }
}

/**
 * Recital de Elk Cloner (T-026). Mientras anuncia el poema entero (L-03) no avanza ni muerde, y el aviso no va mas lento
 * aunque este frenado: es una promesa, como el salto de Creeper. Al acabarlo suelta una onda por cada carril, desde su
 * centro, y vuelve a sus versos. Si no lo anuncia y pisa el cesped, su reloj de versos corre (`clockMs`: mas despacio si
 * esta frenado): toma aire como el Minstrel (`verseWarned`) y suelta un verso por su carril; tras `ELK_CLONER.poemEvery`
 * versos, lo siguiente es el poema entero. Devuelve si se queda quieto este paso (anunciando o soltando el poema).
 */
function recite(e: Mutable<Enemy>, dtMs: number, clockMs: number, sung: Verse[], events: CombatEvent[], newId: () => number): boolean {
  const recital = e.recital as Recital;
  const stats = ENEMIES.elkCloner;
  if (recital.poemMs !== null) {
    const poemMs = recital.poemMs - dtMs;
    if (poemMs > 0) {
      e.recital = { ...recital, poemMs };
      return true;
    }
    const damage = poemDamage();
    const waves = Array.from({ length: BOARD.lanes }, (_, lane): Verse => ({ id: newId(), lane, x: e.x, damage, by: e.kind, poem: true }));
    sung.push(...waves);
    events.push({ type: 'poemRecited', enemyId: e.id, verses: waves });
    e.recital = { ms: stats.verseIntervalMs, sung: 0, poemMs: null };
    return true;
  }
  if (!onLawn(e)) return false;
  const poemNext = recital.sung >= ELK_CLONER.poemEvery;
  const ms = recital.ms - clockMs;
  if (!poemNext && recital.ms > stats.warnMs && ms <= stats.warnMs) events.push({ type: 'verseWarned', enemyId: e.id });
  if (ms > 0) {
    e.recital = { ...recital, ms };
    return false;
  }
  if (poemNext) {
    e.attackMs = null;
    e.recital = { ms: 0, sung: recital.sung, poemMs: ELK_CLONER.poemWarnMs };
    events.push({ type: 'poemWarned', enemyId: e.id, warnMs: ELK_CLONER.poemWarnMs });
    return true;
  }
  const verse: Verse = { id: newId(), lane: e.lane, x: e.x, damage: verseDamage(e), by: e.kind, poem: false };
  sung.push(verse);
  events.push({ type: 'sang', enemyId: e.id, verse });
  e.recital = { ms: ms + stats.verseIntervalMs, sung: recital.sung + 1, poemMs: null };
  return false;
}

/** ¿Esta Elk Cloner (T-026) anunciando el poema entero? Lo que le queda, de 0 a 1 (1 al empezar), o null si no. */
export function poemWarning(enemy: Enemy): number | null {
  const poemMs = enemy.recital?.poemMs;
  return poemMs === null || poemMs === undefined ? null : Math.max(0, Math.min(1, poemMs / ELK_CLONER.poemWarnMs));
}

/**
 * El Creeper (T-008) cruzo un umbral de vida: se agacha y marca el carril de destino, uno al azar que no es el suyo.
 * Gasta los umbrales que ya cruzo (un golpe fuerte que cruza dos da un solo salto).
 */
function startJump(e: Mutable<Enemy>, random: () => number, events: CombatEvent[]): void {
  const others = Array.from({ length: BOARD.lanes }, (_, lane) => lane).filter((lane) => lane !== e.lane);
  const to = others[Math.min(others.length - 1, Math.floor(random() * others.length))];
  const warnMs = isEnraged(e) ? CREEPER.warnMs.enraged : CREEPER.warnMs.calm;
  e.jumpsUsed = jumpsCrossed(e);
  e.attackMs = null;
  e.jump = { stage: 'crouch', from: e.lane, to, ms: warnMs, stageMs: warnMs };
  events.push({ type: 'jumpWarned', enemyId: e.id, from: e.lane, to, warnMs });
}

/**
 * Tipo de una copia del Creeper (T-009, P-08): en la fase 1 un gusano; en la 2, al azar con los pesos de
 * `CREEPER.copyKinds.enraged`.
 */
export function rollCopyKind(enraged: boolean, random: () => number = Math.random): EnemyKind {
  const table: Readonly<Partial<Record<EnemyKind, number>>> = enraged ? CREEPER.copyKinds.enraged : CREEPER.copyKinds.calm;
  const entries = Object.entries(table) as Array<[EnemyKind, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [kind, weight] of entries) {
    roll -= weight;
    if (roll < 0) return kind;
  }
  return entries[entries.length - 1][0];
}

/**
 * Avanza el salto del Creeper. Al acabar el aviso despega: pasa al carril de destino y deja sus copias (aceleradas y
 * de nivel `CREEPER.copyLevel`; en la fase 2 pueden ser acorazados o escupidores) en el que abandona. Al acabar el
 * vuelo aterriza y golpea lo primero sembrado que tiene delante; los umbrales que cruzo mientras saltaba se gastan,
 * asi que no encadena dos saltos seguidos.
 */
function stepJump(
  e: Mutable<Enemy>,
  dtMs: number,
  plants: Array<Array<Sown | null>>,
  copies: Enemy[],
  events: CombatEvent[],
  newId: () => number,
  random: () => number,
): void {
  const jump = e.jump as Jump;
  const ms = jump.ms - dtMs;
  if (ms > 0) {
    e.jump = { ...jump, ms };
    return;
  }
  if (jump.stage === 'crouch') {
    const enraged = isEnraged(e);
    const count = enraged ? CREEPER.copies.enraged : CREEPER.copies.calm;
    const level = CREEPER.copyLevel;
    const left = Array.from({ length: count }, (_, i) => {
      const kind = rollCopyKind(enraged, random);
      return newEnemy(newId(), kind, jump.from, e.x + i * CREEPER.copyGap, enemyMaxHp(kind, level), CREEPER.copyHaste, level);
    });
    copies.push(...left);
    e.lane = jump.to;
    e.jump = { ...jump, stage: 'air', ms: CREEPER.airMs + ms, stageMs: CREEPER.airMs };
    events.push({ type: 'jumped', enemyId: e.id, from: jump.from, to: jump.to, copies: left });
    return;
  }
  e.jump = null;
  e.attackMs = null;
  e.jumpsUsed = jumpsCrossed(e);
  const col = slamColumn(plants[e.lane], e.x, ENEMIES.creeper.halfLength);
  const cell = col === null ? null : { lane: e.lane, col };
  events.push({ type: 'landed', enemyId: e.id, lane: e.lane, cell });
  if (cell) damageSown(plants, cell, slamDamage(), events);
}

/**
 * Columna de lo que golpea el Creeper al aterrizar en `x`: lo primero sembrado que tiene delante, contando lo que
 * queda bajo su cuerpo (hasta `behind` casillas por detras de su centro). Null si no tiene nada delante.
 */
function slamColumn(lane: ReadonlyArray<Sown | null>, x: number, behind: number): number | null {
  for (let col = lane.length - 1; col >= 0; col--) {
    if (lane[col] && col + 0.5 <= x + behind) return col;
  }
  return null;
}

/** Quita vida a lo sembrado en `cell` (planta, mina o muro). Si se queda sin vida, deja la casilla libre. */
function damageSown(plants: Array<Array<Sown | null>>, cell: Cell, damage: number, events: CombatEvent[]): void {
  const sown = plants[cell.lane][cell.col] as Sown;
  const hp = sown.hp - damage;
  if (hp > 0) {
    plants[cell.lane][cell.col] = { ...sown, hp };
  } else {
    plants[cell.lane][cell.col] = null;
    events.push({ type: 'plantDestroyed', cell });
  }
}

/**
 * Columna de lo sembrado (planta, mina o muro) a la que ataca desde lejos el escupidor (T-007) o el juglar (T-025): lo
 * primero que tiene delante en su carril, a `range` casillas o menos de su centro. Null si no hay nada a su alcance o aun
 * no pisa el cesped.
 */
function rangedColumn(lane: ReadonlyArray<Sown | null>, enemy: Enemy, range: number): number | null {
  if (!onLawn(enemy)) return null;
  for (let col = lane.length - 1; col >= 0; col--) {
    const gap = enemy.x - (col + 0.5);
    if (!lane[col] || gap < 0) continue;
    return gap <= range ? col : null;
  }
  return null;
}

/**
 * ¿Para lo sembrado lo que va por su carril hacia lo de detras (T-024)? El muro y la disparadora con escudo (E-02): ningun
 * disparo enemigo ni salto pasa por encima de ellos, y lo que paran les quita vida (E-01). Las demas plantas y las minas,
 * no: el escupitajo da a lo primero que encuentra, pero los ataques que cruzan el carril por encima de las plantas (los
 * versos del juglar, T-025, y de Elk Cloner, T-026) atraviesan todo lo que no es escudo.
 */
export function isShield(sown: Sown | null | undefined): boolean {
  if (!sown) return false;
  // El muro de hielo del poder (T-021, O-11) es un muro: para lo de detras como el escudo.
  return sown.kind === 'wall' || sown.kind === 'ice' || (sown.kind === 'shooter' && sown.shooter.element === 'shield');
}

/**
 * Lo que alcanza un ataque que cruza el carril por encima de las plantas al ir de `from` a `to` (hacia la izquierda), como
 * una onda (T-024; la usan los versos del juglar, T-025, y los de Elk Cloner, T-026): las columnas de todo lo sembrado cuyo
 * centro cruza, de derecha a izquierda, hasta el primer escudo, que lo recibe y lo para. Lo que hay detras de un escudo no
 * recibe nada. `blockedAt` es la columna del escudo que lo paro, o null si sigue. Cruza el centro que queda en (`to`,
 * `from`]: paso a paso, una onda nunca da dos veces a lo mismo.
 */
export function waveReach(lane: ReadonlyArray<Sown | null>, from: number, to: number): { readonly cols: number[]; readonly blockedAt: number | null } {
  const cols: number[] = [];
  for (let col = lane.length - 1; col >= 0; col--) {
    const center = col + 0.5;
    if (!lane[col] || center > from || center <= to) continue;
    cols.push(col);
    if (isShield(lane[col])) return { cols, blockedAt: col };
  }
  return { cols, blockedAt: null };
}

/**
 * Donde cae una unidad que salta por su carril por encima de lo sembrado, de `from` hacia `to` (hacia la izquierda; T-024,
 * para las que salten en el futuro): no puede pasar por encima de un escudo. Si hay uno entre medias (o justo donde iba a
 * caer), se queda delante de el, a `reach` de su centro, para morderlo; si ya estaba ahi, no se mueve. Las demas plantas
 * y las minas no la paran.
 */
export function hopLanding(lane: ReadonlyArray<Sown | null>, from: number, to: number, reach: number): number {
  for (let col = lane.length - 1; col >= 0; col--) {
    const center = col + 0.5;
    if (center >= from) continue;
    if (center < to) break;
    if (isShield(lane[col])) return Math.min(from, center + reach);
  }
  return to;
}

/** Columna de lo primero sembrado cuyo centro alcanza un escupitajo al ir de `from` a `to` (hacia la izquierda). */
function firstSownInPath(lane: ReadonlyArray<Sown | null>, from: number, to: number): number | null {
  for (let col = lane.length - 1; col >= 0; col--) {
    const center = col + 0.5;
    if (lane[col] && center <= from && center >= to) return col;
  }
  return null;
}

/** Columna de lo sembrado (planta o mina) que el enemigo en `x` tiene justo delante, a su alcance; null si no toca nada. */
function bittenColumn(lane: ReadonlyArray<Sown | null>, x: number, reach: number): number | null {
  for (let col = lane.length - 1; col >= 0; col--) {
    const gap = x - (col + 0.5);
    if (lane[col] && gap >= 0 && gap <= reach) return col;
  }
  return null;
}

/** Primer enemigo vivo del carril que la bala alcanza al ir de `from` a `to`. Los que ya quedaron atras no cuentan. */
function firstInPath(enemies: Array<Mutable<Enemy>>, lane: number, from: number, to: number): Mutable<Enemy> | null {
  let first: Mutable<Enemy> | null = null;
  for (const e of enemies) {
    if (e.lane !== lane || e.hp <= 0 || isAirborne(e) || e.x < from || enemyFront(e) > to) continue;
    if (!first || enemyFront(e) < enemyFront(first)) first = e;
  }
  return first;
}
