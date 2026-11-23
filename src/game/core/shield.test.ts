import { describe, expect, it } from 'vitest';
import { COSTS, ENEMIES, SHIELD, SHOOTER } from '../config/balance';
import { decodeSave, encodeSave, SAVE_VERSION } from '../save';
import type { Cell } from './board';
import { bulletDamage, bulletEffect, hopLanding, isShield, spawnEnemy, stepCombat, waveReach, type CombatEvent } from './combat';
import {
  cardPlay,
  createMatch,
  createMine,
  createPlant,
  createWall,
  elementDragBlocker,
  elementInfusion,
  elementInfusionTargets,
  fusePlants,
  fusionBlocker,
  infuseWithElement,
  plantAt,
  playCard,
  sownAt,
  sownElement,
  sownMaxHp,
  wallAt,
  type MatchState,
  type Sown,
} from './match';
import { isOutbreakOpen, isOutbreakReady, outbreakFromParam, outbreakScript, roundCount } from './outbreaks';
import { createShooter, plantMaxHp, type Shooter } from './plants';
import {
  availableCards,
  carriedFeatures,
  infusableElements,
  isUnlocked,
  newFeaturesAt,
  roundScript,
  roundUnlocks,
  unlockPresenter,
  unlockRound,
  unlockedAt,
} from './rounds';
import { currentOutbreak, routeStops } from './route';

/**
 * Escudo (T-024; E-01 a E-06 decididas el 21 nov 2026). Solo, un muro; infundido, una disparadora con el doble de vida.
 * Los dos paran lo que va por su carril hacia lo de detras. Desde T-037 llega en dos pasos: el muro en la ronda 2 del brote
 * 2 (Elk Cloner) y la infusion en la ronda 2 del brote 3 (Brain).
 */

const BROTE2 = 'elkCloner' as const;
const BROTE3 = 'brain' as const;
/** Ronda (desde 0) del brote 2 que trae el muro. */
const SHIELD_ROUND = 1;
/** Ronda (desde 0) del brote 3 que trae infundir el escudo (T-037). */
const INFUSE_ROUND = 1;

/** Partida del brote 2 en la preparacion de la ronda del escudo, con `balance` de saldo. */
const shieldMatch = (balance = 2000): MatchState => createMatch(balance, SHIELD_ROUND, BROTE2);
/** Partida del brote 3 en la preparacion de la ronda que trae infundir el escudo (T-037). */
const infuseMatch = (balance = 2000): MatchState => createMatch(balance, INFUSE_ROUND, BROTE3);

function put(state: MatchState, cell: Cell, sown: Sown): MatchState {
  return { ...state, plants: state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? sown : p))) };
}

const shooter = (over: Partial<Shooter> = {}): Shooter => ({ ...createShooter(), ...over });
const ofType = <T extends CombatEvent['type']>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

describe('desbloqueo', () => {
  it('en el brote 1 la carta de escudo no existe en ninguna ronda', () => {
    for (let index = 0; index < roundCount('creeper'); index++) {
      expect(availableCards(createMatch(0, index)), `ronda ${index + 1}`).not.toContain('shield');
    }
    expect(unlockRound('creeper', 'shield')).toBeNull();
  });

  it('el muro llega en la ronda 2 del brote 2, con su aviso, y lo presenta Patty; infundirlo, no (T-037)', () => {
    expect(unlockRound(BROTE2, 'shield')).toBe(SHIELD_ROUND);
    expect(availableCards(createMatch(0, 0, BROTE2))).not.toContain('shield');
    expect(availableCards(shieldMatch())).toEqual(['shooter', 'fire', 'ice', 'shield']);
    expect(newFeaturesAt(BROTE2, SHIELD_ROUND)).toEqual(['shield']);
    expect(roundUnlocks(BROTE2, SHIELD_ROUND)).toEqual([{ kind: 'feature', feature: 'shield' }]);
    expect(unlockPresenter(BROTE2, SHIELD_ROUND)).toBe('patty');
    expect(infusableElements(shieldMatch())).toEqual(['fire', 'ice']);
    expect(unlockRound(BROTE2, 'shieldInfuse')).toBeNull();
    for (let index = 0; index < roundCount(BROTE2); index++) {
      expect(isUnlocked(createMatch(0, index, BROTE2), 'shieldInfuse'), `ronda ${index + 1}`).toBe(false);
    }
  });

  it('el brote 2 empieza con lo aprendido en el brote 1 y su ronda 1 no desbloquea nada: el tope sigue en 5 (T-035)', () => {
    expect(availableCards(createMatch(0, 0, BROTE2))).toEqual(['shooter', 'fire', 'ice']);
    expect(roundUnlocks(BROTE2, 0)).toEqual([]);
  });
});

describe('brote 2 abierto (T-026: ya tiene a su jefe)', () => {
  it('se juega al vencer a Creeper, y no antes', () => {
    expect(isOutbreakReady(BROTE2)).toBe(true);
    expect(isOutbreakOpen(BROTE2, [])).toBe(false);
    expect(isOutbreakOpen(BROTE2, ['creeper'])).toBe(true);
    expect(currentOutbreak(['creeper'])).toBe(BROTE2);
  });

  it('la ruta lo da por el que toca al vencer a Creeper y por superado al vencerlo; desde T-042, luego vienen los brotes 3 y 4', () => {
    expect(routeStops(['creeper'])).toEqual([
      { kind: 'outbreak', id: 'creeper', standing: 'defeated', current: false },
      { kind: 'outbreak', id: BROTE2, standing: 'open', current: true },
      { kind: 'outbreak', id: BROTE3, standing: 'locked', current: false },
      { kind: 'final' },
    ]);
    expect(routeStops(['creeper', BROTE2])).toEqual([
      { kind: 'outbreak', id: 'creeper', standing: 'defeated', current: false },
      { kind: 'outbreak', id: BROTE2, standing: 'defeated', current: false },
      { kind: 'outbreak', id: BROTE3, standing: 'open', current: true },
      { kind: 'outbreak', id: 'morris', standing: 'locked', current: false },
      { kind: 'final' },
    ]);
  });

  it('su jefe es Elk Cloner, en la ultima ronda', () => {
    expect(outbreakScript(BROTE2).boss).toBe('elkCloner');
    expect(roundScript(BROTE2, roundCount(BROTE2) - 1).groups.some((group) => group.kind === 'elkCloner')).toBe(true);
  });

  it('en desarrollo se pide por la direccion, por numero o por nombre', () => {
    expect(outbreakFromParam('2')).toBe(BROTE2);
    expect(outbreakFromParam('elkCloner')).toBe(BROTE2);
    expect(outbreakFromParam('1')).toBe('creeper');
    expect(outbreakFromParam('3')).toBe(BROTE3);
    // T-041: el brote 4 (Morris), en preparacion, tambien se pide asi; el 5 aun no existe.
    expect(outbreakFromParam('4')).toBe('morris');
    expect(outbreakFromParam('5')).toBeNull();
    expect(outbreakFromParam('0')).toBeNull();
    expect(outbreakFromParam('')).toBeNull();
    expect(outbreakFromParam(null)).toBeNull();
  });
});

describe('escudo en dos pasos (T-037)', () => {
  const cell = { lane: 2, col: 3 };
  const wall = { lane: 2, col: 6 };

  it('el brote 3 tiene su jefe desde T-039 (Brain), su saldo y quien presenta; se abre al vencer a Elk Cloner', () => {
    expect(outbreakScript(BROTE3)).toMatchObject({ boss: 'brain', startingBalance: 300, presenter: 'patty' });
    expect(isOutbreakReady(BROTE3)).toBe(true);
    expect(isOutbreakOpen(BROTE3, ['creeper'])).toBe(false);
    expect(isOutbreakOpen(BROTE3, ['creeper', BROTE2])).toBe(true);
    expect(currentOutbreak(['creeper', BROTE2])).toBe(BROTE3);
  });

  it('el brote 3 trae el muro desde la ronda 1 y la infusion desde la 2, con su aviso, que presenta Patty', () => {
    const first = createMatch(0, 0, BROTE3);
    expect(availableCards(first)).toEqual(['shooter', 'fire', 'ice', 'shield']);
    expect(isUnlocked(first, 'shield')).toBe(true);
    expect(infusableElements(first)).toEqual(['fire', 'ice']);
    expect(roundUnlocks(BROTE3, 0)).toEqual([]);
    expect(unlockRound(BROTE3, 'shieldInfuse')).toBe(INFUSE_ROUND);
    expect(roundUnlocks(BROTE3, INFUSE_ROUND)).toEqual([{ kind: 'feature', feature: 'shieldInfuse' }]);
    expect(unlockPresenter(BROTE3, INFUSE_ROUND)).toBe('patty');
    expect(infusableElements(infuseMatch())).toEqual(['fire', 'ice', 'shield']);
  });

  it('brote 2: la carta sobre una disparadora no infunde, y su precio no sale multiplicado', () => {
    const state = put(shieldMatch(), cell, createPlant(shooter({ cannons: 2 })));
    expect(cardPlay(state, 'shield', cell)).toMatchObject({ action: 'infuse', blocker: 'locked' });
    expect(() => playCard(state, 'shield', cell)).toThrow();
    // En una casilla vacia sigue sembrando el muro.
    expect(cardPlay(state, 'shield', { lane: 0, col: 0 })).toEqual({ action: 'sow', cost: COSTS.shield, multiplier: 1, blocker: null });
  });

  it('brote 2: el muro se levanta igual, pero sobre una disparadora dice que aun no (ES-02)', () => {
    const state = put(put(shieldMatch(), wall, createWall()), cell, createPlant());
    expect(elementDragBlocker(state, wall)).toBeNull();
    expect(elementInfusion(state, wall, cell).blocker).toBe('locked');
    expect(elementInfusionTargets(state, wall)).toEqual([]);
    expect(() => infuseWithElement(state, wall, cell)).toThrow();
  });

  it('la mina, en cambio, no se levanta antes de poder infundir su elemento (como siempre, T-009)', () => {
    const mine = { lane: 0, col: 5 };
    const early = put(createMatch(0, 2), mine, createMine('fire'));
    expect(elementDragBlocker(early, mine)).toBe('locked');
  });

  it('brote 3, ronda 1: ni con la carta ni con el muro; desde la ronda 2, con los dos', () => {
    const before = put(put(createMatch(2000, 0, BROTE3), wall, createWall()), cell, createPlant());
    expect(cardPlay(before, 'shield', cell).blocker).toBe('locked');
    expect(elementInfusion(before, wall, cell).blocker).toBe('locked');
    const after = put(put(infuseMatch(), wall, createWall()), cell, createPlant(shooter({ cannons: 2 })));
    expect(cardPlay(after, 'shield', cell)).toEqual({ action: 'infuse', cost: COSTS.shield * 2, multiplier: 2, blocker: null });
    expect(elementInfusion(after, wall, cell)).toEqual({ cost: COSTS.shield, multiplier: 1, blocker: null });
  });
});

describe('lo desbloqueado vale hacia atras (norma ES-03, T-037)', () => {
  const cell = { lane: 1, col: 2 };

  it('rejugar el brote 2 con el brote 3 vencido trae la infusion del escudo desde la ronda 1', () => {
    const carried = carriedFeatures(BROTE2, ['creeper', BROTE2, BROTE3]);
    expect(carried).toEqual(['shieldInfuse']);
    const replay = createMatch(2000, 0, BROTE2, true, undefined, undefined, carried);
    expect(isUnlocked(replay, 'shieldInfuse')).toBe(true);
    expect(infusableElements(replay)).toEqual(['fire', 'ice', 'shield']);
    // La carta sale ya para infundir; el muro sigue llegando en su ronda, con su aviso.
    expect(availableCards(replay)).toContain('shield');
    expect(cardPlay(replay, 'shield', { lane: 0, col: 0 }).blocker).toBe('locked');
    expect(cardPlay(put(replay, cell, createPlant()), 'shield', cell).blocker).toBeNull();
    expect(roundUnlocks(BROTE2, SHIELD_ROUND)).toEqual([{ kind: 'feature', feature: 'shield' }]);
  });

  it('sin el brote 3 vencido no hay nada que traer', () => {
    expect(carriedFeatures(BROTE2, ['creeper', BROTE2])).toEqual([]);
    expect(carriedFeatures(BROTE2, [])).toEqual([]);
  });

  it('rejugar el brote 1 con el 2 vencido trae el muro; con el 3, tambien la infusion', () => {
    expect(carriedFeatures('creeper', ['creeper', BROTE2])).toEqual(['shield']);
    expect(carriedFeatures('creeper', ['creeper', BROTE2, BROTE3]).sort()).toEqual(['shield', 'shieldInfuse']);
    const replay = createMatch(2000, 0, 'creeper', true, undefined, undefined, ['shield']);
    expect(availableCards(replay)).toEqual(['shooter', 'shield']);
    expect(cardPlay(replay, 'shield', cell).blocker).toBeNull();
    // Lo que el brote 1 ensena sigue llegando en su ronda.
    expect(isUnlocked(replay, 'fireMine')).toBe(false);
  });

  it('lo que el propio brote ensena no se trae: llega en su ronda', () => {
    expect(carriedFeatures(BROTE3, ['creeper', BROTE2, BROTE3])).toEqual([]);
    expect(unlockedAt(BROTE2, 0, carriedFeatures(BROTE2, ['creeper', BROTE2, BROTE3])).has('shield')).toBe(false);
  });

  it('va con la partida guardada', () => {
    const replay = createMatch(2000, 0, BROTE2, true, undefined, undefined, ['shieldInfuse']);
    expect(decodeSave(encodeSave(replay, null, 1))?.match.carried).toEqual(['shieldInfuse']);
    expect(decodeSave(encodeSave({ ...replay, carried: ['poder' as never] }, null, 1))).toBeNull();
  });
});

describe('muro (escudo solo)', () => {
  const cell = { lane: 2, col: 3 };

  it('soltar la carta en una casilla vacia siembra un muro con su vida y cobra su precio', () => {
    const play = cardPlay(shieldMatch(), 'shield', cell);
    expect(play).toEqual({ action: 'sow', cost: COSTS.shield, multiplier: 1, blocker: null });
    const after = playCard(shieldMatch(), 'shield', cell);
    expect(wallAt(after, cell)).toEqual({ kind: 'wall', hp: SHIELD.wallHp });
    expect(sownMaxHp(createWall())).toBe(SHIELD.wallHp);
    expect(after.balance).toBe(2000 - COSTS.shield);
  });

  it('aguanta mucho mas que una disparadora', () => {
    expect(SHIELD.wallHp).toBeGreaterThan(SHOOTER.hp * 3);
  });

  it('antes de su ronda esta bloqueado, y sin saldo no se siembra', () => {
    expect(cardPlay(createMatch(2000, 0, BROTE2), 'shield', cell).blocker).toBe('locked');
    expect(cardPlay(shieldMatch(COSTS.shield - 1), 'shield', cell).blocker).toBe('insufficient-funds');
  });

  it('no se siembra sobre algo sembrado', () => {
    const state = put(shieldMatch(), cell, createWall());
    expect(cardPlay(state, 'shield', cell).blocker).toBe('occupied');
    expect(cardPlay(state, 'shooter', cell).blocker).toBe('occupied');
    expect(cardPlay(state, 'fire', cell).blocker).toBe('occupied');
  });

  it('no dispara ni explota: los gusanos lo muerden hasta romperlo', () => {
    let state = spawnEnemy(put(shieldMatch(), cell, createWall()), 'worm', 2, cell.col + 0.5 + ENEMIES.worm.reach - 0.01);
    const events: CombatEvent[] = [];
    for (let t = 0; t < 120_000 && sownAt(state, cell); t += 50) {
      const step = stepCombat(state, 50);
      state = step.state;
      events.push(...step.events);
    }
    expect(ofType(events, 'shot')).toEqual([]);
    expect(ofType(events, 'mineExploded')).toEqual([]);
    expect(ofType(events, 'bite').length).toBeGreaterThan(10);
    expect(ofType(events, 'plantDestroyed')).toEqual([{ type: 'plantDestroyed', cell }]);
  });
});

describe('infusion (escudo sobre una disparadora, desde T-037 en el brote 3)', () => {
  const cell = { lane: 1, col: 2 };

  it('convierte una disparadora sin elemento en una con escudo, con el doble de vida (E-05)', () => {
    const after = playCard(put(infuseMatch(), cell, createPlant()), 'shield', cell);
    const plant = plantAt(after, cell);
    expect(plant?.shooter).toEqual(shooter({ element: 'shield' }));
    expect(plant?.hp).toBe(SHOOTER.hp * SHIELD.hpMultiplier);
    expect(plantMaxHp(shooter({ element: 'shield', cannons: 3 }))).toBe(SHOOTER.hp * 3 * SHIELD.hpMultiplier);
    expect(after.balance).toBe(2000 - COSTS.shield);
  });

  it('en una de N canones cuesta N escudos (E-04)', () => {
    const state = put(infuseMatch(), cell, createPlant(shooter({ cannons: 3 })));
    expect(cardPlay(state, 'shield', cell)).toEqual({ action: 'infuse', cost: COSTS.shield * 3, multiplier: 3, blocker: null });
  });

  it('conserva en proporcion la vida que le faltaba', () => {
    const hurt = { ...createPlant(), hp: SHOOTER.hp / 2 };
    const after = playCard(put(infuseMatch(), cell, hurt), 'shield', cell);
    expect(plantAt(after, cell)?.hp).toBe((SHOOTER.hp * SHIELD.hpMultiplier) / 2);
  });

  it('el fuego y el hielo no cambian la vida al infundir', () => {
    const hurt = { ...createPlant(), hp: 123.25 };
    expect(plantAt(playCard(put(infuseMatch(), cell, hurt), 'fire', cell), cell)?.hp).toBe(123.25);
  });

  it('no hay mezclas: con fuego o hielo no admite escudo, y con escudo no admite fuego ni hielo', () => {
    for (const element of ['fire', 'ice'] as const) {
      const elemental = put(infuseMatch(), cell, createPlant(shooter({ element })));
      expect(cardPlay(elemental, 'shield', cell).blocker, element).toBe('has-element');
    }
    const shielded = put(infuseMatch(), cell, createPlant(shooter({ element: 'shield' })));
    expect(cardPlay(shielded, 'fire', cell).blocker).toBe('has-element');
    expect(cardPlay(shielded, 'ice', cell).blocker).toBe('has-element');
    expect(cardPlay(shielded, 'shield', cell).blocker).toBe('has-element');
  });

  it('dispara igual que una normal', () => {
    const plain = shooter({ level: 4, cannons: 2 });
    const shielded = { ...plain, element: 'shield' as const };
    expect(bulletDamage(shielded)).toBe(bulletDamage(plain));
    expect(bulletEffect(shielded)).toBeNull();
    const state = spawnEnemy(put(infuseMatch(), cell, createPlant(shielded)), 'worm', 1, 7);
    expect(ofType(stepCombat(state, 50).events, 'shot')).toHaveLength(2);
  });
});

describe('arrastrar el muro sobre una disparadora (como una mina, T-009; desde T-037, en el brote 3)', () => {
  const wall = { lane: 2, col: 5 };
  const target = { lane: 2, col: 3 };

  it('la infunde con escudo, el muro deja su casilla y en una de un canon es gratis', () => {
    const state = put(put(infuseMatch(), wall, createWall()), target, createPlant());
    expect(elementDragBlocker(state, wall)).toBeNull();
    expect(elementInfusion(state, wall, target)).toEqual({ cost: 0, multiplier: 0, blocker: null });
    expect(elementInfusionTargets(state, wall)).toEqual([target]);
    const after = infuseWithElement(state, wall, target);
    expect(sownAt(after, wall)).toBeNull();
    expect(plantAt(after, target)?.shooter.element).toBe('shield');
    expect(plantAt(after, target)?.hp).toBe(SHOOTER.hp * SHIELD.hpMultiplier);
    expect(after.balance).toBe(state.balance);
  });

  it('en una de N canones paga los N - 1 escudos que faltan', () => {
    const state = put(put(infuseMatch(), wall, createWall()), target, createPlant(shooter({ cannons: 3 })));
    expect(elementInfusion(state, wall, target)).toEqual({ cost: COSTS.shield * 2, multiplier: 2, blocker: null });
  });

  it('un muro mordido tambien vale; la vida que le faltaba no pasa a la planta', () => {
    const state = put(put(infuseMatch(), wall, { kind: 'wall', hp: 40 }), target, createPlant());
    expect(elementDragBlocker(state, wall)).toBeNull();
    expect(plantAt(infuseWithElement(state, wall, target), target)?.hp).toBe(SHOOTER.hp * SHIELD.hpMultiplier);
  });

  it('no sirve sobre una disparadora con elemento', () => {
    const state = put(put(infuseMatch(), wall, createWall()), target, createPlant(shooter({ element: 'ice' })));
    expect(elementInfusion(state, wall, target).blocker).toBe('has-element');
    expect(elementInfusionTargets(state, wall)).toEqual([]);
  });

  it('el elemento de lo sembrado: el de la mina, o escudo el muro', () => {
    expect(sownElement(createWall())).toBe('shield');
    expect(sownElement(createMine('ice'))).toBe('ice');
    expect(sownElement(createPlant())).toBeNull();
  });
});

describe('fusionar (E-03)', () => {
  const from = { lane: 0, col: 1 };
  const to = { lane: 0, col: 4 };

  it('dos disparadoras con escudo se fusionan y suman su vida', () => {
    const one = { ...createPlant(shooter({ element: 'shield' })), hp: 500 };
    const other = createPlant(shooter({ element: 'shield' }));
    const state = put(put(shieldMatch(), from, one), to, other);
    expect(fusionBlocker(state, from, to)).toBeNull();
    const fused = plantAt(fusePlants(state, from, to), to);
    expect(fused?.shooter).toEqual(shooter({ element: 'shield', cannons: 2 }));
    expect(fused?.hp).toBe(500 + SHOOTER.hp * SHIELD.hpMultiplier);
  });

  it('una con escudo no se fusiona con una normal ni con un muro', () => {
    const state = put(put(shieldMatch(), from, createPlant(shooter({ element: 'shield' }))), to, createPlant());
    expect(fusionBlocker(state, from, to)).toBe('variant');
    expect(fusionBlocker(put(state, to, createWall()), from, to)).toBe('no-plant');
  });
});

describe('bloqueo', () => {
  /** Carril 2 con una disparadora en la columna 1, otra en la 2 y lo que se diga en la 4. */
  const lane = (front: Sown | null): Array<Sown | null> => [null, createPlant(), createPlant(), null, front, null, null, null, null];

  it('es escudo el muro y la disparadora con escudo (E-02); las demas plantas y las minas, no', () => {
    expect(isShield(createWall())).toBe(true);
    expect(isShield(createPlant(shooter({ element: 'shield' })))).toBe(true);
    expect(isShield(createPlant())).toBe(false);
    expect(isShield(createPlant(shooter({ element: 'fire' })))).toBe(false);
    expect(isShield(createMine('fire'))).toBe(false);
    expect(isShield(null)).toBe(false);
  });

  it('un ataque que cruza el carril se para en el primer escudo: lo de detras no recibe nada', () => {
    expect(waveReach(lane(createWall()), 9, 0)).toEqual({ cols: [4], blockedAt: 4 });
    expect(waveReach(lane(createPlant(shooter({ element: 'shield' }))), 9, 0)).toEqual({ cols: [4], blockedAt: 4 });
  });

  it('sin escudo atraviesa todo lo sembrado que cruza', () => {
    expect(waveReach(lane(createPlant()), 9, 0)).toEqual({ cols: [4, 2, 1], blockedAt: null });
    expect(waveReach(lane(createMine('ice')), 9, 0)).toEqual({ cols: [4, 2, 1], blockedAt: null });
    expect(waveReach(lane(null), 3, 1.6)).toEqual({ cols: [2], blockedAt: null });
  });

  it('un escudo entre medias deja pasar lo de delante y para lo de detras', () => {
    const between: Array<Sown | null> = [null, createPlant(), createWall(), null, createPlant(), null, null, null, null];
    expect(waveReach(between, 9, 0)).toEqual({ cols: [4, 2], blockedAt: 2 });
  });

  it('el escupitajo bloqueado lo recibe el muro (E-01): la disparadora de detras no pierde vida', () => {
    const wallCell = { lane: 2, col: 4 };
    const plantCell = { lane: 2, col: 1 };
    let state = put(put(shieldMatch(), wallCell, createWall()), plantCell, createPlant());
    state = spawnEnemy(state, 'spitter', 2, wallCell.col + 0.5 + ENEMIES.spitter.range - 0.05);
    const events: CombatEvent[] = [];
    for (let t = 0; t < 8000; t += 50) {
      const step = stepCombat(state, 50);
      state = { ...step.state, bullets: [] };
      events.push(...step.events);
    }
    const hits = ofType(events, 'spitHit');
    expect(hits.length).toBeGreaterThan(1);
    expect(hits.every((hit) => hit.cell.col === wallCell.col)).toBe(true);
    expect(wallAt(state, wallCell)?.hp).toBeLessThan(SHIELD.wallHp);
    expect(plantAt(state, plantCell)?.hp).toBe(SHOOTER.hp);
  });

  it('una unidad que salta no pasa por encima de un escudo: se queda delante, a su alcance', () => {
    const reach = 0.6;
    expect(hopLanding(lane(createWall()), 7, 0.5, reach)).toBe(4.5 + reach);
    expect(hopLanding(lane(createPlant(shooter({ element: 'shield' }))), 7, 0.5, reach)).toBe(4.5 + reach);
  });

  it('las demas plantas y las minas no la paran', () => {
    expect(hopLanding(lane(createPlant()), 7, 0.5, 0.6)).toBe(0.5);
    expect(hopLanding(lane(createMine('fire')), 7, 0.5, 0.6)).toBe(0.5);
  });

  it('si el salto acaba antes del escudo, o ya esta junto a el, no cambia nada', () => {
    expect(hopLanding(lane(createWall()), 8, 5.5, 0.6)).toBe(5.5);
    expect(hopLanding(lane(createWall()), 4.9, 0.5, 0.6)).toBe(4.9);
  });
});

describe('partida guardada', () => {
  it('acepta muros y disparadoras con escudo (desde la version 4)', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(4);
    let state = put(shieldMatch(), { lane: 0, col: 2 }, { kind: 'wall', hp: 700 });
    state = put(state, { lane: 1, col: 1 }, createPlant(shooter({ element: 'shield', cannons: 2 })));
    const loaded = decodeSave(encodeSave(state, null, 1));
    expect(loaded?.match).toEqual(state);
  });

  it('una con una mina de escudo no se entiende', () => {
    const state = put(shieldMatch(), { lane: 0, col: 2 }, { kind: 'mine', element: 'shield', hp: 50, fuseMs: null } as unknown as Sown);
    expect(decodeSave(encodeSave(state, null, 1))).toBeNull();
  });
});
