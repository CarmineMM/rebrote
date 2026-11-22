import { afterEach, describe, expect, it } from 'vitest';
import { CLONE, CREEPER, ELK_CLONER, ENEMIES, MINE, SHIELD, SHOOTER } from '../config/balance';
import { enemyMaxHp, spawnEnemy, type Enemy } from '../core/combat';
import { createMatch, createMine, createPlant } from '../core/match';
import { createShooter, type Shooter } from '../core/plants';
import { setLanguage } from '../../i18n';
import { enemyInfo, formatNumber, mineInfo, shooterInfo, wallInfo } from './entityInfo';

const cell = { lane: 2, col: 3 };
const shooter = (over: Partial<Shooter> = {}): Shooter => ({ ...createShooter(), ...over });
const enemy = (kind: Enemy['kind'], level = 1, haste = 1): Enemy => spawnEnemy(createMatch(), kind, 1, 6, undefined, haste, level).enemies[0];
const stat = (info: { stats: { label: string; value: string; note?: string }[] }, label: string) => info.stats.find((s) => s.label === label);

describe('numeros de la ficha (T-010)', () => {
  it('coma decimal, sin ceros de sobra', () => {
    expect(formatNumber(57.5)).toBe('57,5');
    expect(formatNumber(115)).toBe('115');
    expect(formatNumber(135.125)).toBe('135,1');
    expect(formatNumber(0.2875, 2)).toBe('0,29');
    expect(formatNumber(1.25, 2)).toBe('1,25');
    expect(formatNumber(-0.01)).toBe('0');
  });
});

describe('ficha de una disparadora', () => {
  it('la de siempre: nombre, nivel con su tope, vida, dano, cadencia y alcance', () => {
    const info = shooterInfo(createPlant(), cell, 5);
    expect(info).toMatchObject({
      id: 'planta:2:3',
      tone: 'plant',
      title: 'Disparadora',
      subtitle: 'Un cañón',
      level: { value: 1, medalTier: null, note: 'Tope 5' },
      hp: { current: 300, max: 300 },
      tags: [],
    });
    expect(stat(info, 'Daño')).toEqual({ label: 'Daño', value: '20 por disparo', note: undefined });
    expect(stat(info, 'Cadencia')).toMatchObject({ value: 'Cada 1,4 s', note: '0,71 disparos por segundo' });
    expect(stat(info, 'Daño por segundo')?.value).toBe('14,3');
    expect(stat(info, 'Alcance')).toBeDefined();
  });

  it('antes de poder subir de nivel no dice el tope', () => {
    expect(shooterInfo(createPlant(), cell, null).level?.note).toBeNull();
  });

  it('una fusionada de fuego de nivel 5: dano del disparo entero, semillas, quemadura y medallita de plata', () => {
    const plant = { ...createPlant(shooter({ element: 'fire', cannons: 3, level: 5 })), hp: 412.4 };
    const info = shooterInfo(plant, cell, 5);
    expect(info).toMatchObject({ tone: 'fire', title: 'Disparadora de fuego', subtitle: '3 cañones fusionados', level: { value: 5, medalTier: 1 } });
    // 20 x 3,5 (tres canones) x 1,71 (nivel 5, con su premio: 1,125^3 x 1,2, T-035) = 119,6, en tres semillas.
    expect(stat(info, 'Daño')).toMatchObject({ value: '119,6 por disparo', note: '3 semillas de 39,9' });
    expect(stat(info, 'Quemadura')).toMatchObject({ value: '47,8 por segundo', note: 'durante 3 s' });
    expect(info.hp).toEqual({ current: 413, max: 1125 });
  });

  it('la de hielo dice cuanto frena', () => {
    const info = shooterInfo(createPlant(shooter({ element: 'ice', cannons: 2 })), cell, 5);
    expect(stat(info, 'Frena')).toMatchObject({ value: 'Un 40 %', note: 'durante 2,5 s' });
  });
});

describe('ficha de una mina', () => {
  it('esperando: alcance, conteo y lo que hace al explotar', () => {
    const info = mineInfo(createMine('fire'), cell);
    expect(info).toMatchObject({ id: 'mina:2:3', tone: 'fire', title: 'Mina de fuego', level: null, hp: { current: MINE.hp, max: MINE.hp } });
    expect(info.tags).toEqual([{ text: 'Esperando a un enemigo', tone: 'calm' }]);
    expect(stat(info, 'Daño')?.value).toBe('200 a cada enemigo');
  });

  it('contando, avisa de cuanto le falta; la de hielo frena', () => {
    const info = mineInfo({ ...createMine('ice'), fuseMs: 1240 }, cell);
    expect(info.tags).toEqual([{ text: '¡Explota en 1,24 s!', tone: 'alert' }]);
    expect(stat(info, 'Frena')).toMatchObject({ value: 'Un 70 %', note: 'durante 4 s' });
    expect(stat(info, 'Daño')).toBeUndefined();
  });
});

describe('escudo (T-024)', () => {
  it('la disparadora con escudo: su nombre, el doble de vida y que para lo de detras', () => {
    const info = shooterInfo(createPlant(shooter({ element: 'shield' })), cell, 5);
    expect(info).toMatchObject({ tone: 'shield', title: 'Disparadora con escudo', hp: { current: SHOOTER.hp * 2, max: SHOOTER.hp * 2 } });
    expect(stat(info, 'Para')?.value).toBe('Lo que disparan a lo de detrás');
    expect(stat(info, 'Daño')?.value).toBe('20 por disparo');
  });

  it('el muro: no ataca, para lo de detras, se arrastra a una disparadora y avisa de su desgaste', () => {
    const full = wallInfo({ kind: 'wall', hp: SHIELD.wallHp }, cell);
    expect(full).toMatchObject({ id: 'muro:2:3', tone: 'shield', title: 'Muro', level: null, hp: { current: SHIELD.wallHp, max: SHIELD.wallHp }, tags: [] });
    expect(stat(full, 'Ataque')?.value).toBe('No ataca');
    expect(stat(full, 'Para')).toBeDefined();
    expect(stat(full, 'Arrastrarlo')).toBeDefined();
    expect(wallInfo({ kind: 'wall', hp: SHIELD.wallHp * 0.5 }, cell).tags).toEqual([{ text: 'Agrietado', tone: 'calm' }]);
    expect(wallInfo({ kind: 'wall', hp: SHIELD.wallHp * 0.2 }, cell).tags).toEqual([{ text: '¡A punto de romperse!', tone: 'alert' }]);
  });
});

describe('ficha de un enemigo', () => {
  it('un gusano de nivel 1 con la fuerza de T-010 (+10 %)', () => {
    const info = enemyInfo(enemy('worm'));
    expect(info).toMatchObject({ tone: 'worm', title: 'Gusano', level: { value: 1, medalTier: null, note: null }, hp: { current: 110, max: 110 } });
    expect(stat(info, 'Mordisco')).toEqual({ label: 'Mordisco', value: '55', note: 'cada 1 s' });
    expect(stat(info, 'Velocidad')).toEqual({ label: 'Velocidad', value: '0,25 casillas/s', note: 'cruza el jardín en 36 s' });
    expect(stat(info, 'Recompensa')?.value).toBe(`${ENEMIES.worm.reward} monedas`);
  });

  it('su nivel (sin nota de tramo desde T-035) y lo que le pasa ahora: quemado, frenado y acelerado', () => {
    const armored = { ...enemy('armored', 10, 1.25), burn: { dps: 8, ms: 1000 }, slow: { amount: 0.3, ms: 500 }, attackMs: 200 };
    const info = enemyInfo(armored);
    expect(info.level).toEqual({ value: 10, medalTier: 2, note: null });
    expect(info.hp.max).toBe(Math.round(enemyMaxHp('armored', 10)));
    expect(info.tags.map((t) => t.tone)).toEqual(['alert', 'fire', 'ice', 'haste']);
    expect(info.tags.map((t) => t.text)).toEqual(['Mordiendo', 'Quemado: −8 por segundo', 'Frenado un 30 %', 'Acelerado +25 %']);
  });

  it('el escupidor dice su alcance', () => {
    expect(stat(enemyInfo(enemy('spitter')), 'Escupitajo')?.note).toBe('cada 1,8 s, a 2,6 casillas');
  });

  it('Creeper: sin nivel, con su golpe, su proximo salto y su fase', () => {
    const boss = enemy('creeper');
    const info = enemyInfo(boss);
    expect(info).toMatchObject({ tone: 'creeper', title: 'Creeper', subtitle: 'Jefe del brote 1', level: null, hp: { current: 4400, max: 4400 } });
    expect(stat(info, 'Mordisco')?.value).toBe('129,3');
    expect(stat(info, 'Golpe al caer')?.value).toBe('165');
    expect(stat(info, 'Próximo salto')?.value).toBe('Al bajar del 80 % de vida');
    expect(stat(info, 'Recompensa')).toBeUndefined();
    const angry = enemyInfo({ ...boss, hp: 1000, jumpsUsed: CREEPER.jumpAt.length });
    expect(angry.subtitle).toBe('Jefe del brote 1 · fase 2');
    expect(angry.tags[0]).toEqual({ text: '¡Enfadado!', tone: 'alert' });
    expect(stat(angry, 'Próximo salto')?.value).toBe('Ya no salta más');
  });

  it('la de un jefe acaba con lo que cuenta Boxer del virus de verdad; las demas no (T-032)', () => {
    expect(enemyInfo(enemy('creeper')).lore).toMatch(/^Creeper \(1971\) fue el primer gusano informático/);
    expect(enemyInfo(enemy('worm')).lore).toBeNull();
    expect(shooterInfo(createPlant(shooter()), cell, 5).lore).toBeNull();
    expect(mineInfo(createMine('ice'), cell).lore).toBeNull();
  });
});

describe('ficha de las tropas del brote 2 (T-025)', () => {
  it('los Copycat dicen que dejan una copia al caer', () => {
    for (const [kind, title] of [
      ['copycat', 'Copycat'],
      ['copycatArmored', 'Copycat acorazado'],
      ['copycatSpitter', 'Copycat escupidor'],
    ] as const) {
      const info = enemyInfo(enemy(kind));
      expect(info, kind).toMatchObject({ tone: kind, title });
      expect(stat(info, 'Al caer')?.value, kind).toBe('Deja una copia');
      expect(stat(info, 'Recompensa')?.value, kind).toBe(`${ENEMIES[kind].reward} monedas`);
      expect(info.about, kind).toMatch(/copia pequeña y débil, una sola vez/);
    }
    expect(stat(enemyInfo(enemy('copycatSpitter')), 'Escupitajo')?.note).toBe('cada 1,8 s, a 2,6 casillas');
  });

  it('la copia: su nombre, pequena y debil, con su vida y su moneda, y sin dejar otra', () => {
    const clone: Enemy = { ...enemy('copycatArmored', 4), clone: true, hp: enemyMaxHp('copycatArmored', 4, true) };
    const info = enemyInfo(clone);
    expect(info).toMatchObject({ tone: 'copycatArmored', title: 'Copia acorazada', subtitle: 'Pequeña y débil' });
    expect(info.hp.max).toBe(Math.round(enemyMaxHp('copycatArmored', 4) * CLONE.hp));
    expect(stat(info, 'Al caer')).toBeUndefined();
    expect(stat(info, 'Recompensa')?.value).toBe(`${CLONE.reward} monedas`);
    expect(info.about).toBe('Salió de un Copycat al caer. Ataca como él, con el 30 % de su vida y el 50 % de su fuerza, y ya no deja otra copia.');
  });

  it('el Minstrel: su verso, su distancia, y si recita o toma aire', () => {
    const Minstrel = enemy('minstrel');
    const info = enemyInfo(Minstrel);
    expect(info).toMatchObject({ tone: 'minstrel', title: 'Minstrel', subtitle: 'Recita versos', tags: [] });
    expect(stat(info, 'Verso')).toEqual({ label: 'Verso', value: '23,1', note: 'a cada cosa, cada 3,6 s, desde 3,5 casillas' });
    expect(info.about).toMatch(/^Se para a 3,5 casillas/);
    expect(info.about).toMatch(/Solo la para un escudo/);
    expect(enemyInfo({ ...Minstrel, attackMs: ENEMIES.minstrel.warnMs + 500 }).tags).toEqual([{ text: 'Recitando', tone: 'alert' }]);
    expect(enemyInfo({ ...Minstrel, attackMs: ENEMIES.minstrel.warnMs - 100 }).tags).toEqual([{ text: '¡Toma aire!', tone: 'alert' }]);
  });
});

describe('ficha de Elk Cloner (T-026)', () => {
  it('sin nivel, con su apodo, su mordisco, su verso, su poema entero y cuantos versos le faltan', () => {
    const boss = enemy('elkCloner');
    const info = enemyInfo(boss);
    expect(info).toMatchObject({ tone: 'elkCloner', title: 'Elk Cloner', subtitle: 'El Poeta · jefe del brote 2', level: null });
    expect(info.hp.max).toBe(Math.round(enemyMaxHp('elkCloner')));
    expect(stat(info, 'Mordisco')?.value).toBe(formatNumber(ENEMIES.elkCloner.biteDamage * 1.1));
    expect(stat(info, 'Verso')).toEqual({ label: 'Verso', value: formatNumber(ENEMIES.elkCloner.verseDamage * 1.1), note: 'a cada cosa de su carril, cada 3,5 s' });
    expect(stat(info, 'Poema entero')?.note).toBe(`por los cinco carriles, cada ${ELK_CLONER.poemEvery} versos, tras 5 s de aviso`);
    expect(stat(info, 'Próximo poema')?.value).toBe(`Dentro de ${ELK_CLONER.poemEvery} versos`);
    expect(stat(info, 'Al caer')?.value).toBe('¡Ganas la partida!');
    expect(stat(info, 'Recompensa')).toBeUndefined();
    expect(info.about).toMatch(/solo lo para un escudo/);
    expect(info.lore).toMatch(/^Elk Cloner \(1982\)/);
  });

  it('mientras anuncia el poema lo dice, y la siguiente vez que recite es el poema', () => {
    const boss = enemy('elkCloner');
    const warning = enemyInfo({ ...boss, recital: { ms: 0, sung: ELK_CLONER.poemEvery, poemMs: 2000 } });
    expect(warning.tags[0]).toEqual({ text: '¡Anuncia el poema entero!', tone: 'alert' });
    expect(stat(warning, 'Próximo poema')?.value).toBe('¡Ya lo está recitando!');
    expect(stat(enemyInfo({ ...boss, recital: { ms: 3000, sung: ELK_CLONER.poemEvery - 1, poemMs: null } }), 'Próximo poema')?.value).toBe('Tras el próximo verso');
  });
});

describe('ficha en ingles (T-011)', () => {
  afterEach(() => setLanguage('es'));

  it('mismos numeros, con punto decimal, "%" pegado y sus textos', () => {
    setLanguage('en');
    const fire = shooterInfo(createPlant(shooter({ element: 'fire', cannons: 3, level: 5 })), cell, 5);
    expect(fire).toMatchObject({ title: 'Fire shooter', subtitle: '3 fused barrels', level: { note: 'Cap 5' } });
    expect(stat(fire, 'Damage')).toMatchObject({ value: '119.6 per shot', note: '3 seeds of 39.9' });
    expect(stat(fire, 'Burn')).toMatchObject({ value: '47.8 per second', note: 'for 3 s' });
    const ice = shooterInfo(createPlant(shooter({ element: 'ice', cannons: 2 })), cell, 5);
    expect(stat(ice, 'Slows')).toMatchObject({ value: 'By 40%', note: 'for 2.5 s' });
    const mine = mineInfo({ ...createMine('fire'), fuseMs: 1240 }, cell);
    expect(mine.tags).toEqual([{ text: 'Explodes in 1.24 s!', tone: 'alert' }]);
    const armored = enemyInfo(enemy('armored', 10));
    expect(armored).toMatchObject({ title: 'Armored worm', level: { value: 10, note: null } });
    expect(enemyInfo(enemy('minstrel'))).toMatchObject({ title: 'Minstrel', subtitle: 'Recites verses' });
    expect(stat(enemyInfo(enemy('minstrel')), 'Verse')?.note).toBe('to each thing, every 3.6 s, from 3.5 tiles');
    expect(enemyInfo({ ...enemy('copycat'), clone: true })).toMatchObject({ title: 'Copycat copy', subtitle: 'Small and weak' });
  });
});
