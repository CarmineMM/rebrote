import { describe, expect, it } from 'vitest';
import { createMatch } from './core/match';
import { OUTBREAK_ID } from './core/rounds';
import {
  MIGRATIONS,
  PROGRESS_KEY,
  PROGRESS_VERSION,
  ProgressKeeper,
  decodeProgress,
  emptyProgress,
  encodeProgress,
  hasProgress,
  isNewerProgress,
  isOutbreakDefeated,
  migrate,
  recordDefeat,
  type Migration,
} from './progress';
import { SAVE_KEY, clearSave, readSave, writeSave, type SaveStore } from './save';

/** Almacenamiento de mentira, como el `localStorage` del navegador; cuenta las escrituras. */
function memoryStore(entries: Record<string, string> = {}): SaveStore & { data: Map<string, string>; writes: number } {
  const data = new Map(Object.entries(entries));
  const store = {
    data,
    writes: 0,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.writes++;
      data.set(key, value);
    },
    removeItem: (key: string) => void data.delete(key),
  };
  return store;
}

/** Un almacenamiento que lee pero no deja escribir: almacenamiento lleno. */
function fullStore(entries: Record<string, string> = {}): SaveStore & { data: Map<string, string> } {
  const store = memoryStore(entries);
  return {
    ...store,
    setItem: () => {
      throw new DOMException('lleno', 'QuotaExceededError');
    },
  };
}

/** Un almacenamiento que no deja ni mirar (algunos navegadores con las cookies bloqueadas). */
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

const keeperOn = (store: SaveStore | null) => new ProgressKeeper(() => store);

describe('progreso permanente: reglas (T-017)', () => {
  it('empieza sin nada vencido', () => {
    expect(emptyProgress()).toEqual({ defeated: [] });
    expect(hasProgress(emptyProgress())).toBe(false);
  });

  it('apunta un jefe vencido una sola vez, en el orden en que se vencen', () => {
    const once = recordDefeat(emptyProgress(), 'creeper');
    expect(isOutbreakDefeated(once, 'creeper')).toBe(true);
    expect(hasProgress(once)).toBe(true);
    expect(recordDefeat(once, 'creeper')).toBe(once);
    expect(recordDefeat(once, 'blaster').defeated).toEqual(['creeper', 'blaster']);
  });

  it('el brote de hoy tiene nombre propio', () => {
    expect(OUTBREAK_ID).toBe('creeper');
  });
});

describe('progreso permanente: guardar y recargar (T-017)', () => {
  it('vencer a un jefe queda escrito y sigue ahi al recargar la pagina', () => {
    const store = memoryStore();
    keeperOn(store).recordDefeat(OUTBREAK_ID);
    // Otra pagina: otro guardian con el mismo navegador.
    expect(isOutbreakDefeated(keeperOn(store).read(), OUTBREAK_ID)).toBe(true);
    expect(JSON.parse(store.data.get(PROGRESS_KEY) ?? '')).toEqual({ version: PROGRESS_VERSION, defeated: ['creeper'] });
  });

  it('volver a vencer al mismo jefe no vuelve a escribir', () => {
    const store = memoryStore();
    const keeper = keeperOn(store);
    keeper.recordDefeat(OUTBREAK_ID);
    keeper.recordDefeat(OUTBREAK_ID);
    expect(store.writes).toBe(1);
    expect(keeper.read().defeated).toEqual(['creeper']);
  });

  it('ganar, perder o empezar otra partida no lo toca: solo se borra la partida guardada', () => {
    const store = memoryStore();
    const keeper = keeperOn(store);
    keeper.recordDefeat(OUTBREAK_ID);
    expect(writeSave(createMatch(), null, store, 1)).toBe(true);
    // Perder o ganar borra la partida guardada (I-04).
    clearSave(store);
    expect(readSave(store)).toBeNull();
    // Una partida acabada tampoco se guarda.
    writeSave({ ...createMatch(), lives: 0 }, null, store, 2);
    // Una partida nueva pisa la guardada.
    writeSave(createMatch(), null, store, 3);
    expect(isOutbreakDefeated(keeperOn(store).read(), OUTBREAK_ID)).toBe(true);
  });
});

describe('progreso permanente: borrar (T-017)', () => {
  it('borra el progreso y la partida guardada, y deja los ajustes y los tours vistos', () => {
    const store = memoryStore({ 'rebrote.ajustes': '{"language":"en"}', 'rebrote.tours': '{"done":["basics"]}' });
    const keeper = keeperOn(store);
    keeper.recordDefeat(OUTBREAK_ID);
    writeSave(createMatch(), null, store, 1);
    keeper.erase();
    expect(store.data.has(PROGRESS_KEY)).toBe(false);
    expect(store.data.has(SAVE_KEY)).toBe(false);
    expect(keeper.read()).toEqual(emptyProgress());
    expect(store.data.get('rebrote.ajustes')).toBe('{"language":"en"}');
    expect(store.data.get('rebrote.tours')).toBe('{"done":["basics"]}');
  });

  it('tambien borra lo que solo estaba en memoria', () => {
    const keeper = keeperOn(null);
    keeper.recordDefeat(OUTBREAK_ID);
    keeper.erase();
    expect(keeper.read()).toEqual(emptyProgress());
  });
});

describe('progreso permanente: migraciones (T-017)', () => {
  it('hay una migracion por cada version anterior a la actual', () => {
    for (let version = 1; version < PROGRESS_VERSION; version++) expect(MIGRATIONS[version], `falta la migracion de la version ${version}`).toBeTypeOf('function');
  });

  it('un progreso de la version 1 se sigue leyendo en la actual, con todo lo que tenia', () => {
    // Escrito a mano tal como lo guarda la version 1: este test no se cambia al subir la version.
    const v1 = JSON.stringify({ version: 1, defeated: ['creeper'] });
    const progress = decodeProgress(v1);
    expect(progress).not.toBeNull();
    expect(progress?.defeated).toEqual(['creeper']);
  });

  it('lo que escribe esta version se lee igual', () => {
    const progress = recordDefeat(recordDefeat(emptyProgress(), 'creeper'), 'blaster');
    expect(decodeProgress(encodeProgress(progress))).toEqual(progress);
  });

  it('un progreso viejo pasa por todas las migraciones, en orden, sin perder datos', () => {
    // Una historia de mentira: la 2 trae semillas y la 3 cambia la lista por un registro con la fecha.
    const steps: Record<number, Migration> = {
      1: (data) => ({ ...data, seeds: 0 }),
      2: ({ defeated, ...rest }) => ({ ...rest, outbreaks: Object.fromEntries((defeated as string[]).map((id) => [id, { defeatedAt: null }])) }),
    };
    expect(migrate({ defeated: ['creeper'] }, 1, 3, steps)).toEqual({ seeds: 0, outbreaks: { creeper: { defeatedAt: null } } });
    expect(migrate({ seeds: 40, defeated: [] }, 2, 3, steps)).toEqual({ seeds: 40, outbreaks: {} });
    expect(migrate({ seeds: 40 }, 3, 3, steps)).toEqual({ seeds: 40 });
  });

  it('si falta un paso o uno falla, no deja un progreso a medio migrar', () => {
    expect(migrate({}, 1, 3, { 1: (data) => data })).toBeNull();
    expect(
      migrate({}, 1, 2, {
        1: () => {
          throw new Error('roto');
        },
      }),
    ).toBeNull();
  });
});

describe('progreso permanente: datos rotos (T-017)', () => {
  it.each([
    ['vacio', null],
    ['texto corrupto', '{"version":1,"defeated":['],
    ['otra cosa', '"creeper"'],
    ['una lista', '[1, 2]'],
    ['nulo', 'null'],
    ['sin version', '{"defeated":["creeper"]}'],
    ['version 0', '{"version":0,"defeated":["creeper"]}'],
    ['version en texto', '{"version":"1","defeated":["creeper"]}'],
    ['version con decimales', '{"version":1.5,"defeated":["creeper"]}'],
  ])('%s: se parte de cero sin error', (_, raw) => {
    expect(decodeProgress(raw)).toBeNull();
    const store = memoryStore(raw === null ? {} : { [PROGRESS_KEY]: raw });
    expect(keeperOn(store).read()).toEqual(emptyProgress());
  });

  it('de lo que se entiende a medias, se queda con lo que vale', () => {
    expect(decodeProgress('{"version":1,"defeated":"creeper"}')).toEqual(emptyProgress());
    expect(decodeProgress('{"version":1,"defeated":["creeper", 7, "", null, "creeper", "blaster"]}')).toEqual({ defeated: ['creeper', 'blaster'] });
  });

  it('un progreso ilegible no toca la partida en curso, y al vencer otro jefe se escribe de nuevo', () => {
    const store = memoryStore({ [PROGRESS_KEY]: 'no es JSON' });
    writeSave(createMatch(), null, store, 1);
    const keeper = keeperOn(store);
    expect(keeper.read()).toEqual(emptyProgress());
    expect(readSave(store)).not.toBeNull();
    keeper.recordDefeat(OUTBREAK_ID);
    expect(decodeProgress(store.data.get(PROGRESS_KEY) ?? null)?.defeated).toEqual(['creeper']);
  });

  it('uno de una version mas nueva se ignora pero no se pisa: al volver a esa version sigue ahi', () => {
    const newer = JSON.stringify({ version: PROGRESS_VERSION + 1, defeated: ['creeper', 'blaster'], seeds: 300 });
    expect(isNewerProgress(newer)).toBe(true);
    expect(decodeProgress(newer)).toBeNull();
    const store = memoryStore({ [PROGRESS_KEY]: newer });
    const keeper = keeperOn(store);
    expect(keeper.read()).toEqual(emptyProgress());
    keeper.recordDefeat(OUTBREAK_ID);
    expect(store.data.get(PROGRESS_KEY)).toBe(newer);
    // En esta sesion, el jefe vencido se recuerda igual.
    expect(isOutbreakDefeated(keeper.read(), OUTBREAK_ID)).toBe(true);
  });
});

describe('progreso permanente: sin almacenamiento (T-017)', () => {
  it('sin almacenamiento (ventana privada) el juego sigue y el progreso dura la sesion', () => {
    const keeper = keeperOn(null);
    expect(keeper.read()).toEqual(emptyProgress());
    keeper.recordDefeat(OUTBREAK_ID);
    expect(isOutbreakDefeated(keeper.read(), OUTBREAK_ID)).toBe(true);
    expect(keeper.write(keeper.read())).toBe(false);
  });

  it('con el almacenamiento bloqueado no falla nada', () => {
    const keeper = keeperOn(blockedStore);
    expect(keeper.read()).toEqual(emptyProgress());
    expect(() => keeper.recordDefeat(OUTBREAK_ID)).not.toThrow();
    expect(isOutbreakDefeated(keeper.read(), OUTBREAK_ID)).toBe(true);
    expect(() => keeper.erase()).not.toThrow();
    expect(keeper.read()).toEqual(emptyProgress());
  });

  it('con el almacenamiento lleno, lo que no cupo manda sobre lo guardado mientras dure la sesion', () => {
    const store = fullStore({ [PROGRESS_KEY]: encodeProgress(emptyProgress()) });
    const keeper = keeperOn(store);
    keeper.recordDefeat(OUTBREAK_ID);
    expect(isOutbreakDefeated(keeper.read(), OUTBREAK_ID)).toBe(true);
    expect(decodeProgress(store.data.get(PROGRESS_KEY) ?? null)).toEqual(emptyProgress());
  });

  it('cuando vuelve a haber sitio, lo que estaba en memoria se escribe', () => {
    let full = true;
    const store = memoryStore();
    const flaky: SaveStore = {
      ...store,
      setItem: (key, value) => {
        if (full) throw new DOMException('lleno', 'QuotaExceededError');
        store.setItem(key, value);
      },
    };
    const keeper = keeperOn(flaky);
    keeper.recordDefeat(OUTBREAK_ID);
    expect(store.data.has(PROGRESS_KEY)).toBe(false);
    full = false;
    keeper.recordDefeat('blaster');
    expect(decodeProgress(store.data.get(PROGRESS_KEY) ?? null)?.defeated).toEqual(['creeper', 'blaster']);
  });
});
