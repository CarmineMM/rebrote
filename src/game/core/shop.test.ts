import { describe, expect, it } from 'vitest';
import { POWER_LEVELS, POWERS, SEEDS, SHOP } from '../config/balance';
import { POWER_IDS } from './powers';
import { FIRST_OUTBREAK } from './outbreaks';
import {
  buyBlocker,
  buyPower,
  carriedLoadout,
  carryBlocker,
  isShopOpen,
  nextPowerPrice,
  nextUpgrade,
  opensShop,
  ownedLevel,
  ownedPowers,
  shopTotal,
  toggleCarried,
  upgradeBlocker,
  upgradeCost,
  upgradePower,
  type Wallet,
} from './shop';

/**
 * Tienda (T-022; T-01 a T-04 decididas el 22 nov 2026): los poderes se compran para siempre (1000, 1500 y 2000 segun el
 * orden), se mejoran hasta el nivel 10 y nada se devuelve. Antes del brote se eligen hasta dos.
 */

const wallet = (seeds: number, powers: Wallet['powers'] = {}, carried: Wallet['carried'] = []): Wallet => ({ seeds, powers, carried });

describe('abrir la tienda', () => {
  it('se abre al vencer a Creeper, como el Invernadero', () => {
    expect(isShopOpen([])).toBe(false);
    expect(isShopOpen([FIRST_OUTBREAK])).toBe(true);
  });

  it('la victoria lo avisa solo la primera vez que cae Creeper', () => {
    expect(opensShop(FIRST_OUTBREAK, false)).toBe(true);
    expect(opensShop(FIRST_OUTBREAK, true)).toBe(false);
    expect(opensShop('elkCloner', false)).toBe(false);
  });
});

describe('comprar un poder (T-01, T-02)', () => {
  it('el primero cuesta 1000 sea cual sea; el segundo, 1500, y el tercero, 2000', () => {
    expect(SHOP.powerPrices).toEqual([1000, 1500, 2000]);
    expect(nextPowerPrice(wallet(0))).toBe(1000);
    expect(nextPowerPrice(wallet(0, { iceWall: 3 }))).toBe(1500);
    expect(nextPowerPrice(wallet(0, { iceWall: 1, relocate: 1 }))).toBe(2000);
    expect(nextPowerPrice(wallet(0, { iceWall: 1, relocate: 1, grenade: 1 }))).toBeNull();
  });

  it('1089 semillas, compra la granada: quedan 89 y es suya, en el nivel 1', () => {
    const after = buyPower(wallet(1089), 'grenade');
    expect(after.seeds).toBe(89);
    expect(ownedLevel(after, 'grenade')).toBe(1);
    expect(ownedPowers(after)).toEqual(['grenade']);
  });

  it('sin semillas suficientes no se compra y el saldo no cambia', () => {
    const poor = wallet(89, { grenade: 1 }, ['grenade']);
    expect(buyBlocker(poor, 'iceWall')).toBe('seeds');
    expect(buyPower(poor, 'iceWall')).toBe(poor);
    // Con lo justo, si.
    expect(buyPower(wallet(1500, { grenade: 1 }), 'iceWall').seeds).toBe(0);
  });

  it('no se compra dos veces lo mismo', () => {
    const owned = wallet(5000, { relocate: 4 });
    expect(buyBlocker(owned, 'relocate')).toBe('owned');
    expect(buyPower(owned, 'relocate')).toBe(owned);
  });

  it('lo comprado va a lo que se lleva si cabe; si no, se queda fuera', () => {
    const first = buyPower(wallet(5000), 'iceWall');
    expect(first.carried).toEqual(['iceWall']);
    const second = buyPower(first, 'relocate');
    // En el orden del panel.
    expect(second.carried).toEqual(['relocate', 'iceWall']);
    expect(buyPower(second, 'grenade').carried).toEqual(['relocate', 'iceWall']);
  });

  it('el saldo nunca queda negativo, por muchas veces que se intente', () => {
    let state = wallet(2600);
    for (let i = 0; i < 10; i++) {
      for (const id of POWER_IDS) state = upgradePower(buyPower(state, id), id);
    }
    expect(state.seeds).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(state.seeds)).toBe(true);
  });
});

describe('mejorar un poder (T-01)', () => {
  it('subir al nivel N cuesta 200 x N, y el doble en el 5 y el 10', () => {
    expect(Array.from({ length: 9 }, (_, i) => upgradeCost(i + 2))).toEqual([400, 600, 800, 2000, 1200, 1400, 1600, 1800, 4000]);
  });

  it('descuenta el precio del nivel nuevo y lo sube uno', () => {
    const after = upgradePower(wallet(2500, { grenade: 4 }, ['grenade']), 'grenade');
    expect(ownedLevel(after, 'grenade')).toBe(5);
    expect(after.seeds).toBe(500);
    expect(after.carried).toEqual(['grenade']);
  });

  it('solo se mejora lo que se tiene, con semillas, y hasta el nivel 10', () => {
    expect(upgradeBlocker(wallet(9999), 'grenade')).toBe('not-owned');
    expect(upgradeBlocker(wallet(399, { grenade: 1 }), 'grenade')).toBe('seeds');
    expect(upgradeBlocker(wallet(400, { grenade: 1 }), 'grenade')).toBeNull();
    const top = wallet(99_999, { grenade: POWER_LEVELS.max });
    expect(upgradeBlocker(top, 'grenade')).toBe('max-level');
    expect(nextUpgrade(top, 'grenade')).toBeNull();
    expect(upgradePower(top, 'grenade')).toBe(top);
    expect(nextUpgrade(wallet(0, { relocate: 9 }), 'relocate')).toEqual({ level: 10, cost: 4000 });
  });

  it('la tienda entera cuesta mas de lo que dan las primeras victorias de toda la ruta (unas 45.000)', () => {
    expect(shopTotal()).toBe(1000 + 1500 + 2000 + 3 * 13_800);
    expect(shopTotal()).toBeGreaterThan(45_000);
    expect(shopTotal()).toBeLessThan(SEEDS.maxBalance);
  });
});

describe('lo que se lleva al brote (T-04, O-02)', () => {
  const three = wallet(0, { relocate: 2, grenade: 7, iceWall: 1 }, ['grenade']);

  it('se lleva o se deja cada poder comprado, como mucho dos', () => {
    const two = toggleCarried(three, 'relocate');
    expect(two.carried).toEqual(['relocate', 'grenade']);
    expect(carryBlocker(two, 'iceWall')).toBe('full');
    expect(toggleCarried(two, 'iceWall')).toBe(two);
    expect(toggleCarried(two, 'grenade').carried).toEqual(['relocate']);
    expect(POWERS.maxCarried).toBe(2);
  });

  it('lo que no se tiene no se lleva', () => {
    const none = wallet(0);
    expect(carryBlocker(none, 'grenade')).toBe('not-owned');
    expect(toggleCarried(none, 'grenade')).toBe(none);
  });

  it('la partida trae los elegidos con su nivel, en el orden del panel; sin elegir, ninguno', () => {
    expect(carriedLoadout(toggleCarried(three, 'iceWall'))).toEqual([
      { id: 'grenade', level: 7 },
      { id: 'iceWall', level: 1 },
    ]);
    expect(carriedLoadout(wallet(0, { grenade: 3 }))).toEqual([]);
    // Uno que ya no se tiene (lo guardado estaba roto) no viaja.
    expect(carriedLoadout(wallet(0, {}, ['grenade']))).toEqual([]);
  });
});
