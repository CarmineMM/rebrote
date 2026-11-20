import { BOARD, CREEPER, ENEMIES, FIRE, ICE, MINE, SHOOTER } from '../config/balance';
import type { BoardPoint, Cell } from './board';
import type { MatchState, Mine, Sown } from './match';
import { damageMultiplier, fireRateMultiplier, type ElementType, type Shooter } from './plants';

/**
 * Combate como simulacion pura por pasos (ADR-0008). `stepCombat` avanza la partida un trozo de tiempo
 * y cuenta lo que paso; la escena solo pinta el estado y anima los eventos. Todo en casillas y milisegundos.
 */

export type EnemyKind = keyof typeof ENEMIES;

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
  /** Salto de carril en curso (solo el Creeper, T-008), o null. */
  readonly jump: Jump | null;
  /** Umbrales de vida de `CREEPER.jumpAt` ya gastados en saltos (solo cuenta en el Creeper). */
  readonly jumpsUsed: number;
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
  /** Un enemigo se quedo sin vida. Al caer el Creeper (T-008) caen tambien los demas: sus copias se desconectan. */
  | { readonly type: 'enemyKilled'; readonly enemyId: number; readonly at: BoardPoint }
  /** Cruzo el borde izquierdo: resta una vida. Si es el Creeper (T-008), se pierde la partida. */
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
  | { readonly type: 'mineExploded'; readonly cell: Cell; readonly element: ElementType; readonly enemyIds: readonly number[] };

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
export function mineBlast(element: ElementType): { readonly damage: number; readonly slow: Slow | null } {
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

/** Hocico del enemigo: lo primero que encuentra una bala. */
export function enemyFront(enemy: Enemy): number {
  return enemy.x - ENEMIES[enemy.kind].halfLength;
}

/** Se pierde al quedarse sin vidas (D-07, provisional). Sin vidas, el combate no avanza. */
export function isDefeated(state: MatchState): boolean {
  return state.lives <= 0;
}

/** Enemigo recien salido: avanza, sin efectos ni salto. */
function newEnemy(id: number, kind: EnemyKind, lane: number, x: number, hp: number, haste: number): Enemy {
  return { id, kind, lane, x, hp, attackMs: null, burn: null, slow: null, haste, jump: null, jumpsUsed: 0 };
}

/**
 * Pone un enemigo con la vida llena en `x` de su carril. Queda el ultimo de `enemies`.
 * `hp` solo cambia en pruebas (por ejemplo, la prueba de rendimiento en desarrollo). `haste` es su velocidad respecto
 * a la de su tipo (las rondas 8 y 9 sacan enemigos acelerados, T-008).
 */
export function spawnEnemy(
  state: MatchState,
  kind: EnemyKind,
  lane: number,
  x: number,
  hp: number = ENEMIES[kind].hp,
  haste = 1,
): MatchState {
  if (!Number.isInteger(lane) || lane < 0 || lane >= BOARD.lanes) {
    throw new Error(`Carril invalido: ${lane}`);
  }
  const enemy = newEnemy(state.nextId, kind, lane, x, hp, haste);
  return { ...state, enemies: [...state.enemies, enemy], nextId: state.nextId + 1 };
}

/** En el aire, a mitad de un salto (Creeper, T-008): no le dan las balas ni las minas, y las plantas no le apuntan. */
export function isAirborne(enemy: Enemy): boolean {
  return enemy.jump?.stage === 'air';
}

/** Fraccion de la vida de su tipo que le queda. */
export function hpFraction(enemy: Enemy): number {
  return enemy.hp / ENEMIES[enemy.kind].hp;
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

/** Ya pisa el cesped: las plantas le pueden disparar (y el escupidor puede pararse a escupir). */
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
 * Un paso: primero arden, se mueven y atacan los enemigos (muerden o escupen, mas despacio si estan ralentizados; el
 * Creeper, ademas, salta de carril); luego vuelan los escupitajos; despues cuentan y explotan las minas, vuelan las
 * balas y al final disparan las plantas. Si el Creeper cae, caen con el los demas enemigos.
 */
function substep(state: MatchState, dtMs: number, events: CombatEvent[], random: () => number): MatchState {
  const plants = state.plants.map((lane) => [...lane]);
  let lives = state.lives;
  let nextId = state.nextId;
  const newId = () => nextId++;
  /** Copias que deja el Creeper al despegar: entran en juego despues de mover a los demas. */
  const copies: Enemy[] = [];
  let bossDown = false;

  // Enemigos: arden si tienen una quemadura, y atacan o avanzan, mas despacio si estan ralentizados. Los que muerden
  // atacan lo que tocan (planta o mina); el escupidor, lo primero sembrado en su carril a su distancia. Los que
  // cruzan el borde izquierdo restan una vida.
  const enemies: Array<Mutable<Enemy>> = [];
  const launched: Spit[] = [];
  for (const enemy of state.enemies) {
    const stats = ENEMIES[enemy.kind];
    const e: Mutable<Enemy> = { ...enemy };
    if (e.burn) {
      // Solo arde el tiempo que le queda a la quemadura, aunque el paso sea mas largo.
      e.hp -= (e.burn.dps * Math.min(dtMs, e.burn.ms)) / 1000;
      e.burn = e.burn.ms > dtMs ? { ...e.burn, ms: e.burn.ms - dtMs } : null;
      if (e.hp <= 0) {
        events.push({ type: 'enemyKilled', enemyId: e.id, at: { x: e.x, y: e.lane + 0.5 } });
        if (e.kind === 'creeper') bossDown = true;
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
        stepJump(e, dtMs, plants, copies, events, newId);
        enemies.push(e);
        continue;
      }
      if (e.jumpsUsed < CREEPER.jumpAt.length && hpFraction(e) <= CREEPER.jumpAt[e.jumpsUsed]) {
        startJump(e, random, events);
        enemies.push(e);
        continue;
      }
    }
    const lane = plants[e.lane];
    if (stats.attack === 'spit') {
      const col = spitColumn(lane, e, stats.range);
      if (col !== null) {
        e.attackMs = (e.attackMs ?? stats.firstSpitMs) - attackClockMs;
        if (e.attackMs <= 0) {
          e.attackMs += stats.spitIntervalMs;
          const spit: Spit = { id: nextId++, lane: e.lane, x: e.x, damage: stats.spitDamage };
          launched.push(spit);
          events.push({ type: 'spat', enemyId: e.id, spit });
        }
        enemies.push(e);
        continue;
      }
    } else {
      const col = bittenColumn(lane, e.x, stats.reach);
      if (col !== null) {
        e.attackMs = (e.attackMs ?? stats.firstBiteMs) - attackClockMs;
        if (e.attackMs <= 0) {
          e.attackMs += stats.biteIntervalMs;
          const cell = { lane: e.lane, col };
          events.push({ type: 'bite', enemyId: e.id, cell });
          damageSown(plants, cell, stats.biteDamage, events);
        }
        enemies.push(e);
        continue;
      }
    }
    e.attackMs = null;
    e.x -= (stats.speed * e.haste * walkMs) / 1000;
    if (e.x < 0) {
      // El Creeper que cruza gana la partida el solo.
      lives = e.kind === 'creeper' ? 0 : Math.max(0, lives - 1);
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
      explode(sown, cell, enemies, events);
    }),
  );

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
      if (target.hp <= 0) {
        events.push({ type: 'enemyKilled', enemyId: target.id, at: { x: target.x, y: target.lane + 0.5 } });
      }
    } else if (to > BOARD.columns) {
      events.push({ type: 'bulletGone', bulletId: bullet.id });
    } else {
      bullets.push({ ...bullet, x: to });
    }
  }
  // Sin el Creeper (T-008), sus copias y los demas se desconectan: la partida esta ganada.
  if (bossDown || enemies.some((e) => e.kind === 'creeper' && e.hp <= 0)) {
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      e.hp = 0;
      events.push({ type: 'enemyKilled', enemyId: e.id, at: { x: e.x, y: e.lane + 0.5 } });
    }
  }
  const alive = enemies.filter((e) => e.hp > 0);

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

  return { ...state, lives, plants, enemies: alive, bullets, spits: [...spits, ...launched], nextId };
}

/** Distancia del centro del enemigo al centro de la casilla, en casillas. Cuenta tambien en otros carriles. */
export function distanceToCell(enemy: Enemy, cell: Cell): number {
  return Math.hypot(enemy.x - (cell.col + 0.5), enemy.lane - cell.lane);
}

/**
 * La mina explota: alcanza a todos los enemigos vivos de su radio, en cualquier carril, con lo que hace la de su
 * elemento (`mineBlast`): la de fuego dana y la de hielo frena.
 */
function explode(mine: Mine, cell: Cell, enemies: Array<Mutable<Enemy>>, events: CombatEvent[]): void {
  const hit = enemies.filter((e) => e.hp > 0 && !isAirborne(e) && distanceToCell(e, cell) <= MINE.blastRadius);
  const { damage, slow } = mineBlast(mine.element);
  events.push({ type: 'mineExploded', cell, element: mine.element, enemyIds: hit.map((e) => e.id) });
  for (const e of hit) {
    e.hp -= damage;
    if (slow) e.slow = refreshSlow(e.slow, slow);
    if (e.hp <= 0) events.push({ type: 'enemyKilled', enemyId: e.id, at: { x: e.x, y: e.lane + 0.5 } });
  }
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
 * Avanza el salto del Creeper. Al acabar el aviso despega: pasa al carril de destino y deja sus copias (gusanos
 * acelerados) en el que abandona. Al acabar el vuelo aterriza y golpea lo primero sembrado que tiene delante; los
 * umbrales que cruzo mientras saltaba se gastan, asi que no encadena dos saltos seguidos.
 */
function stepJump(
  e: Mutable<Enemy>,
  dtMs: number,
  plants: Array<Array<Sown | null>>,
  copies: Enemy[],
  events: CombatEvent[],
  newId: () => number,
): void {
  const jump = e.jump as Jump;
  const ms = jump.ms - dtMs;
  if (ms > 0) {
    e.jump = { ...jump, ms };
    return;
  }
  if (jump.stage === 'crouch') {
    const count = isEnraged(e) ? CREEPER.copies.enraged : CREEPER.copies.calm;
    const kind = CREEPER.copyKind;
    const left = Array.from({ length: count }, (_, i) =>
      newEnemy(newId(), kind, jump.from, e.x + i * CREEPER.copyGap, ENEMIES[kind].hp, CREEPER.copyHaste),
    );
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
  if (cell) damageSown(plants, cell, CREEPER.slamDamage, events);
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

/** Quita vida a lo sembrado en `cell` (planta o mina). Si se queda sin vida, deja la casilla libre. */
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
 * Columna de lo sembrado (planta o mina) a la que escupe el escupidor: lo primero que tiene delante en su carril,
 * a `range` casillas o menos de su centro. Null si no hay nada a su alcance o aun no pisa el cesped.
 */
function spitColumn(lane: ReadonlyArray<Sown | null>, enemy: Enemy, range: number): number | null {
  if (!onLawn(enemy)) return null;
  for (let col = lane.length - 1; col >= 0; col--) {
    const gap = enemy.x - (col + 0.5);
    if (!lane[col] || gap < 0) continue;
    return gap <= range ? col : null;
  }
  return null;
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
