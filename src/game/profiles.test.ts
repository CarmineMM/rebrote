import { describe, expect, it } from 'vitest';
import { createMatch } from './core/match';
import {
  LEGACY_KEYS,
  MAX_PROFILES,
  PROFILES_KEY,
  PROFILES_VERSION,
  ProfileKeeper,
  addProfile,
  canAddProfile,
  decodeProfiles,
  encodeProfiles,
  firstList,
  freeNumber,
  isProfileId,
  profileKey,
  profileOfKey,
  randomId,
  removeProfile,
  selectProfile,
  touchProfile,
  type ProfileList,
} from './profiles';
import { PROGRESS_KEY, ProgressKeeper, encodeProgress, recordDefeat, emptyProgress } from './progress';
import { SAVE_KEY, readSave, writeSave } from './save';
import { SessionStore, storedKeys, type SaveStore } from './storage';

/** `localStorage` de mentira: con `key` y `length` para poder barrer, y la cuenta de escrituras. */
function memoryStore(entries: Record<string, string> = {}) {
  const data = new Map(Object.entries(entries));
  const store = {
    data,
    writes: 0,
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.writes++;
      data.set(key, value);
    },
    removeItem: (key: string) => void data.delete(key),
  };
  return store;
}

/** Lee pero no deja escribir: almacenamiento lleno. */
function fullStore(entries: Record<string, string> = {}) {
  const store = memoryStore(entries);
  return Object.assign(store, {
    setItem: () => {
      throw new DOMException('lleno', 'QuotaExceededError');
    },
    removeItem: () => {
      throw new DOMException('lleno', 'QuotaExceededError');
    },
  });
}

/** No deja ni mirar (cookies bloqueadas). */
const blockedStore: SaveStore = {
  getItem: () => {
    throw new DOMException('bloqueado', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('bloqueado', 'SecurityError');
  },
  removeItem: () => {
    throw new DOMException('bloqueado', 'SecurityError');
  },
};

/** Un reloj que se puede adelantar y unos identificadores en orden, para que los tests sean repetibles. */
function keeperOn(store: SaveStore | null) {
  const clock = { now: 1000 };
  let next = 0;
  const keeper = new ProfileKeeper(
    () => store,
    () => clock.now,
    () => `id${++next}`,
  );
  return { keeper, clock };
}

const progressOf = (keeper: ProfileKeeper, id?: string) => new ProgressKeeper(() => (id ? keeper.storeOf(id) : keeper.store())).read();
const names = (list: ProfileList) => list.profiles.map((profile) => profile.number);

describe('perfiles: reglas (T-034)', () => {
  it('un navegador sin datos empieza con un jugador vacio y activo, el 1', () => {
    const list = firstList('a', 5);
    expect(list).toEqual({ active: 'a', profiles: [{ id: 'a', name: null, number: 1, createdAt: 5, updatedAt: 5 }] });
  });

  it('cada jugador nuevo queda activo y lleva el menor numero libre (PF-05)', () => {
    let list = addProfile(firstList('a', 0), 'b', 1);
    expect(list.active).toBe('b');
    expect(names(list)).toEqual([1, 2]);
    list = removeProfile(list, 'a', 'x', 2);
    expect(freeNumber(list.profiles)).toBe(1);
    expect(names(addProfile(list, 'c', 3))).toEqual([2, 1]);
  });

  it(`no caben mas de ${MAX_PROFILES} (PF-01)`, () => {
    let list = firstList('a', 0);
    for (let i = 1; i < MAX_PROFILES; i++) list = addProfile(list, `p${i}`, i);
    expect(list.profiles).toHaveLength(MAX_PROFILES);
    expect(canAddProfile(list)).toBe(false);
    expect(addProfile(list, 'otro', 9)).toBe(list);
  });

  it('cambiar de jugador solo cambia el activo; a uno que no existe, nada', () => {
    const list = addProfile(firstList('a', 0), 'b', 1);
    expect(selectProfile(list, 'a')).toEqual({ ...list, active: 'a' });
    expect(selectProfile(list, 'b')).toBe(list);
    expect(selectProfile(list, 'nadie')).toBe(list);
  });

  it('borrar a uno no cambia a los demas; si era el activo, pasa a serlo el que jugo por ultima vez', () => {
    let list = addProfile(addProfile(firstList('a', 0), 'b', 1), 'c', 2);
    list = touchProfile(list, 'a', 50);
    const withoutB = removeProfile(selectProfile(list, 'a'), 'b', 'x', 60);
    expect(withoutB.active).toBe('a');
    expect(withoutB.profiles).toEqual([list.profiles[0], list.profiles[2]]);
    // "c" es el activo; de los que quedan, "a" jugo despues que "b".
    expect(removeProfile(list, 'c', 'x', 60).active).toBe('a');
  });

  it('si se borra el ultimo, queda uno nuevo y vacio', () => {
    expect(removeProfile(firstList('a', 0), 'a', 'b', 7)).toEqual(firstList('b', 7));
  });

  it('el ultimo guardado solo avanza', () => {
    const list = firstList('a', 10);
    expect(touchProfile(list, 'a', 20).profiles[0].updatedAt).toBe(20);
    expect(touchProfile(list, 'a', 10)).toBe(list);
    expect(touchProfile(list, 'nadie', 20)).toBe(list);
  });

  it('lo de cada jugador va bajo su identificador, no bajo su nombre ni su numero', () => {
    expect(profileKey('abc', 'progreso')).toBe('rebrote.perfil.abc.progreso');
    expect(profileOfKey('rebrote.perfil.abc.partida')).toBe('abc');
    expect(profileOfKey('rebrote.perfiles')).toBeNull();
    expect(profileOfKey('rebrote.ajustes')).toBeNull();
  });

  it('los identificadores al azar valen para las claves y no se repiten', () => {
    const ids = new Set(Array.from({ length: 50 }, randomId));
    expect(ids.size).toBe(50);
    expect([...ids].every(isProfileId)).toBe(true);
    expect(isProfileId('con.punto')).toBe(false);
  });
});

describe('perfiles: formato (T-034)', () => {
  it('lo que se escribe se lee igual', () => {
    const list = touchProfile(addProfile(firstList('a', 1), 'b', 2), 'a', 9);
    expect(decodeProfiles(encodeProfiles(list))).toEqual(list);
    expect(JSON.parse(encodeProfiles(list)).version).toBe(PROFILES_VERSION);
  });

  it.each([
    ['vacio', null],
    ['texto corrupto', '{"version":1,"profiles":['],
    ['otra version', JSON.stringify({ version: PROFILES_VERSION + 1, active: 'a', profiles: [{ id: 'a', number: 1, createdAt: 0, updatedAt: 0 }] })],
    ['sin perfiles', JSON.stringify({ version: PROFILES_VERSION, active: 'a', profiles: [] })],
    ['una lista', '[]'],
  ])('%s: no hay lista', (_, raw) => {
    expect(decodeProfiles(raw)).toBeNull();
  });

  it('un perfil roto no impide usar los demas', () => {
    const raw = JSON.stringify({
      version: PROFILES_VERSION,
      active: 'roto',
      profiles: [
        { id: 'con.punto', number: 1 },
        { id: 'b', name: 7, number: 2, createdAt: 'ayer', updatedAt: 5 },
        'nada',
        { id: 'b', number: 3 },
        { id: 'c', name: 'Ana', number: 2, createdAt: 3, updatedAt: 1 },
      ],
    });
    expect(decodeProfiles(raw)).toEqual({
      active: 'b',
      profiles: [
        { id: 'b', name: null, number: 2, createdAt: 0, updatedAt: 5 },
        // Su numero ya lo lleva "b": toma el menor libre. Nunca se guardo antes de crearse.
        { id: 'c', name: 'Ana', number: 1, createdAt: 3, updatedAt: 3 },
      ],
    });
  });

  it(`de una lista con mas de ${MAX_PROFILES}, se queda con los primeros`, () => {
    const profiles = Array.from({ length: MAX_PROFILES + 2 }, (_, i) => ({ id: `p${i}`, name: null, number: i + 1, createdAt: 0, updatedAt: 0 }));
    expect(decodeProfiles(JSON.stringify({ version: PROFILES_VERSION, active: 'p0', profiles }))?.profiles).toHaveLength(MAX_PROFILES);
  });
});

describe('perfiles: arranque (T-034)', () => {
  it('un navegador sin datos crea su primer jugador solo, y lo recuerda al recargar', () => {
    const store = memoryStore();
    const { keeper } = keeperOn(store);
    const list = keeper.read();
    expect(list.profiles).toHaveLength(1);
    expect(list.profiles[0]).toMatchObject({ id: 'id1', name: null, number: 1 });
    expect(decodeProfiles(store.data.get(PROFILES_KEY) ?? null)).toEqual(list);
    expect(keeperOn(store).keeper.read()).toEqual(list);
  });

  it('lo guardado antes de los perfiles se ignora y se borra; los ajustes se conservan', () => {
    const settings = '{"quality":"high","language":"en","help":false,"sfxVolume":40}';
    const store = memoryStore({
      'rebrote.progreso': JSON.stringify({ version: 1, defeated: ['creeper'] }),
      'rebrote.partida': JSON.stringify({ version: 2, savedAt: 1, match: createMatch(), pendingUnlock: null }),
      'rebrote.tours': '{"done":["basics"]}',
      'rebrote.ajustes': settings,
    });
    const { keeper } = keeperOn(store);
    expect(progressOf(keeper)).toEqual(emptyProgress());
    expect(readSave(keeper.store())).toBeNull();
    for (const key of LEGACY_KEYS) expect(store.data.has(key)).toBe(false);
    expect(store.data.get('rebrote.ajustes')).toBe(settings);
  });

  it('una lista de otra version se descarta con lo de sus jugadores', () => {
    const store = memoryStore({
      [PROFILES_KEY]: JSON.stringify({ version: PROFILES_VERSION + 1, active: 'viejo', profiles: [{ id: 'viejo' }] }),
      [profileKey('viejo', PROGRESS_KEY)]: encodeProgress(recordDefeat(emptyProgress(), 'creeper')),
    });
    const { keeper } = keeperOn(store);
    expect(keeper.read().profiles.map((profile) => profile.id)).toEqual(['id1']);
    expect(progressOf(keeper)).toEqual(emptyProgress());
    expect(store.data.has(profileKey('viejo', PROGRESS_KEY))).toBe(false);
  });

  it('barre lo que quedo de jugadores que ya no estan (borrados en otra pestana)', () => {
    const list = firstList('a', 0);
    const store = memoryStore({
      [PROFILES_KEY]: encodeProfiles(list),
      [profileKey('a', PROGRESS_KEY)]: encodeProgress(emptyProgress()),
      [profileKey('suelto', SAVE_KEY)]: '{}',
    });
    keeperOn(store).keeper.read();
    expect(store.data.has(profileKey('a', PROGRESS_KEY))).toBe(true);
    expect(store.data.has(profileKey('suelto', SAVE_KEY))).toBe(false);
  });
});

describe('perfiles: cada jugador con lo suyo (T-034)', () => {
  it('un jugador nuevo empieza sin progreso, sin partida y con los tours sin ver; volver al otro recupera lo suyo', () => {
    const store = memoryStore();
    const { keeper } = keeperOn(store);
    const first = keeper.read().active;
    new ProgressKeeper(() => keeper.store()).recordDefeat('creeper');
    writeSave(createMatch(), null, keeper.store(), 5);
    keeper.store().setItem('tours', '{"done":["basics"]}');

    const second = keeper.create().active;
    expect(second).not.toBe(first);
    expect(progressOf(keeper)).toEqual(emptyProgress());
    expect(readSave(keeper.store())).toBeNull();
    expect(keeper.store().getItem('tours')).toBeNull();

    keeper.select(first);
    expect(progressOf(keeper).defeated).toEqual(['creeper']);
    expect(readSave(keeper.store())?.savedAt).toBe(5);
    expect(keeper.store().getItem('tours')).toBe('{"done":["basics"]}');
  });

  it('el jugador activo se recuerda al recargar', () => {
    const store = memoryStore();
    const { keeper } = keeperOn(store);
    const first = keeper.read().active;
    keeper.create();
    keeper.select(first);
    expect(keeperOn(store).keeper.read().active).toBe(first);
  });

  it(`con ${MAX_PROFILES} jugadores no se crea otro`, () => {
    const { keeper } = keeperOn(memoryStore());
    for (let i = 1; i < MAX_PROFILES; i++) keeper.create();
    const full = keeper.read();
    expect(keeper.create()).toEqual(full);
    expect(keeper.read().profiles).toHaveLength(MAX_PROFILES);
  });

  it('guardar algo apunta la fecha; guardar lo mismo que habia, no', () => {
    const store = memoryStore();
    const { keeper, clock } = keeperOn(store);
    const id = keeper.read().active;
    clock.now = 2000;
    keeper.store().setItem('tours', '{"done":[]}');
    expect(keeper.active().updatedAt).toBe(2000);
    clock.now = 3000;
    keeper.store().setItem('tours', '{"done":[]}');
    keeper.store().removeItem('partida');
    expect(keeper.active().updatedAt).toBe(2000);
    keeper.store().removeItem('tours');
    expect(keeper.active()).toMatchObject({ id, createdAt: 1000, updatedAt: 3000 });
  });

  it('el identificador no cambia aunque cambie como se le llama', () => {
    const store = memoryStore();
    const { keeper } = keeperOn(store);
    const id = keeper.read().active;
    // T-033 le pondra nombre: lo suyo sigue bajo el mismo identificador.
    const named: ProfileList = { active: id, profiles: [{ ...keeper.active(), name: 'Carmine' }] };
    store.setItem(PROFILES_KEY, encodeProfiles(named));
    expect(keeperOn(store).keeper.active()).toMatchObject({ id, name: 'Carmine' });
  });
});

describe('perfiles: borrar (T-034, PF-06)', () => {
  it('borra al jugador con todo lo suyo y no toca a los demas ni los ajustes', () => {
    const store = memoryStore({ 'rebrote.ajustes': '{"language":"en"}' });
    const { keeper } = keeperOn(store);
    const first = keeper.read().active;
    new ProgressKeeper(() => keeper.store()).recordDefeat('creeper');
    const second = keeper.create().active;
    writeSave(createMatch(), null, keeper.store(), 5);
    keeper.store().setItem('tours', '{"done":["basics"]}');
    keeper.select(first);

    const after = keeper.remove(second);
    expect(after.active).toBe(first);
    expect(after.profiles.map((profile) => profile.id)).toEqual([first]);
    expect(storedKeys(store).filter((key) => profileOfKey(key) === second)).toEqual([]);
    expect(progressOf(keeper).defeated).toEqual(['creeper']);
    expect(store.data.get('rebrote.ajustes')).toBe('{"language":"en"}');
  });

  it('si se borra el activo pasa a estarlo otro; si era el ultimo, queda uno vacio', () => {
    const { keeper } = keeperOn(memoryStore());
    const first = keeper.read().active;
    new ProgressKeeper(() => keeper.store()).recordDefeat('creeper');
    const second = keeper.create().active;
    expect(keeper.remove(second).active).toBe(first);
    const fresh = keeper.remove(first);
    expect(fresh.profiles).toHaveLength(1);
    expect(fresh.active).not.toBe(first);
    expect(progressOf(keeper)).toEqual(emptyProgress());
  });

  it('borrar a uno que no esta no hace nada', () => {
    const { keeper } = keeperOn(memoryStore());
    const list = keeper.read();
    expect(keeper.remove('nadie')).toEqual(list);
  });

  it('un jugador con datos rotos se lee vacio, no impide usar a los demas y se puede borrar', () => {
    const store = memoryStore();
    const { keeper } = keeperOn(store);
    const first = keeper.read().active;
    new ProgressKeeper(() => keeper.store()).recordDefeat('creeper');
    const second = keeper.create().active;
    store.setItem(profileKey(second, PROGRESS_KEY), 'no es JSON');
    store.setItem(profileKey(second, SAVE_KEY), '{"version":2');
    expect(progressOf(keeper, second)).toEqual(emptyProgress());
    expect(readSave(keeper.storeOf(second))).toBeNull();
    expect(progressOf(keeper, first).defeated).toEqual(['creeper']);
    keeper.remove(second);
    expect(store.data.has(profileKey(second, PROGRESS_KEY))).toBe(false);
  });
});

describe('perfiles: dos pestanas (T-034)', () => {
  it('cada pestana escribe en su jugador y respeta lo que cambie la otra', () => {
    const store = memoryStore();
    const a = keeperOn(store);
    const first = a.keeper.read().active;
    // Otra pestana, con sus propios identificadores, como al azar.
    const tabB = new ProfileKeeper(() => store, () => 1500, () => 'deB');
    const second = tabB.create().active;
    expect(second).toBe('deB');
    // La pestana A sigue con su jugador y, al guardar, no se pierde el que creo la B.
    a.clock.now = 4000;
    writeSave(createMatch(), null, a.keeper.store(), 4000);
    expect(readSave(a.keeper.storeOf(first))).not.toBeNull();
    expect(readSave(tabB.store())).toBeNull();
    const stored = decodeProfiles(store.data.get(PROFILES_KEY) ?? null);
    expect(stored?.profiles.map((profile) => profile.id)).toEqual([first, second]);
    // Se recuerda el de la ultima pestana que cambio de jugador: guardar no lo cambia.
    expect(stored?.active).toBe(second);
  });

  it('si otra pestana borra al jugador que se esta usando, esta lo sigue usando hasta cambiar de jugador', () => {
    const store = memoryStore();
    const a = keeperOn(store).keeper;
    const first = a.read().active;
    const tabB = new ProfileKeeper(() => store, () => 1500, () => 'deB');
    tabB.remove(first);
    expect(a.read().active).toBe(first);
    expect(a.read().profiles.map((profile) => profile.id)).toContain(first);
    expect(() => writeSave(createMatch(), null, a.store(), 1)).not.toThrow();
  });
});

describe('perfiles: sin almacenamiento (T-034)', () => {
  it.each([
    ['ninguno (ventana privada)', () => null],
    ['bloqueado', () => blockedStore],
    ['lleno', () => fullStore()],
  ])('%s: crear, cambiar y borrar jugadores funciona mientras dure la sesion', (_, make) => {
    const { keeper } = keeperOn(make());
    const first = keeper.read().active;
    new ProgressKeeper(() => keeper.store()).recordDefeat('creeper');
    const second = keeper.create().active;
    expect(progressOf(keeper)).toEqual(emptyProgress());
    keeper.select(first);
    expect(progressOf(keeper).defeated).toEqual(['creeper']);
    expect(keeper.remove(first).active).toBe(second);
    expect(progressOf(keeper)).toEqual(emptyProgress());
  });

  it('con el almacenamiento lleno, lo guardado antes sigue ahi y lo nuevo manda en la sesion', () => {
    const list = firstList('a', 0);
    const store = fullStore({ [PROFILES_KEY]: encodeProfiles(list), [profileKey('a', PROGRESS_KEY)]: encodeProgress(recordDefeat(emptyProgress(), 'creeper')) });
    const { keeper } = keeperOn(store);
    expect(progressOf(keeper).defeated).toEqual(['creeper']);
    keeper.create();
    expect(progressOf(keeper)).toEqual(emptyProgress());
    expect(decodeProfiles(store.data.get(PROFILES_KEY) ?? null)).toEqual(list);
  });
});

describe('almacen de la sesion (T-034)', () => {
  it('lo que no se pudo borrar tampoco se ve', () => {
    const base = fullStore({ x: '1' });
    const session = new SessionStore(() => base);
    session.removeItem('x');
    expect(session.getItem('x')).toBeNull();
    expect(session.keys()).toEqual([]);
    session.setItem('y', '2');
    expect(session.keys()).toEqual(['y']);
  });
});
