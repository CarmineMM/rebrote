import { describe, expect, it } from 'vitest';
import { OUTBREAKS } from './config/balance';
import { createMatch } from './core/match';
import type { OutbreakId } from './core/outbreaks';
import {
  PROGRESS_KEY,
  PROGRESS_VERSION,
  ProgressKeeper,
  decodeProgress,
  emptyProgress,
  encodeProgress,
  hasProgress,
  hasSeenStory,
  isOutbreakDefeated,
  recordDefeat,
  recordStory,
} from './progress';
import { clearSave, readSave, writeSave } from './save';
import { SessionStore, type SaveStore } from './storage';

/** El brote 1 (T-018). */
const CREEPER: OutbreakId = 'creeper';

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

const keeperOn = (store: SaveStore) => new ProgressKeeper(() => store);
/** Como en el juego: el almacen del perfil, que nunca falla (`SessionStore`). */
const sessionKeeperOn = (store: SaveStore | null) => keeperOn(new SessionStore(() => store));

describe('progreso permanente: reglas (T-017)', () => {
  it('empieza sin nada vencido', () => {
    expect(emptyProgress()).toEqual({ defeated: [], story: [] });
    expect(hasProgress(emptyProgress())).toBe(false);
  });

  it('apunta un jefe vencido una sola vez, en el orden en que se vencen', () => {
    const once = recordDefeat(emptyProgress(), 'creeper');
    expect(isOutbreakDefeated(once, 'creeper')).toBe(true);
    expect(hasProgress(once)).toBe(true);
    expect(recordDefeat(once, 'creeper')).toBe(once);
    expect(recordDefeat(once, 'elk-cloner').defeated).toEqual(['creeper', 'elk-cloner']);
  });

  it('el progreso apunta cada brote por su nombre, el de su jefe (T-018)', () => {
    expect(OUTBREAKS[0].id).toBe('creeper');
  });
});

describe('progreso permanente: guardar y recargar (T-017)', () => {
  it('vencer a un jefe queda escrito y sigue ahi al recargar la pagina', () => {
    const store = memoryStore();
    keeperOn(store).recordDefeat(CREEPER);
    // Otra pagina: otro guardian con el mismo almacen.
    expect(isOutbreakDefeated(keeperOn(store).read(), CREEPER)).toBe(true);
    expect(JSON.parse(store.data.get(PROGRESS_KEY) ?? '')).toEqual({ version: PROGRESS_VERSION, defeated: ['creeper'], story: [] });
  });

  it('volver a vencer al mismo jefe no vuelve a escribir', () => {
    const store = memoryStore();
    const keeper = keeperOn(store);
    keeper.recordDefeat(CREEPER);
    keeper.recordDefeat(CREEPER);
    expect(store.writes).toBe(1);
    expect(keeper.read().defeated).toEqual(['creeper']);
  });

  it('ganar, perder o empezar otra partida no lo toca: solo se borra la partida guardada', () => {
    const store = memoryStore();
    const keeper = keeperOn(store);
    keeper.recordDefeat(CREEPER);
    expect(writeSave(createMatch(), null, store, 1)).toBe(true);
    // Perder o ganar borra la partida guardada (I-04).
    clearSave(store);
    expect(readSave(store)).toBeNull();
    // Una partida acabada tampoco se guarda.
    writeSave({ ...createMatch(), lives: 0 }, null, store, 2);
    // Una partida nueva pisa la guardada.
    writeSave(createMatch(), null, store, 3);
    expect(isOutbreakDefeated(keeperOn(store).read(), CREEPER)).toBe(true);
  });

  it('lo que escribe esta version se lee igual', () => {
    const progress = recordDefeat(recordDefeat(emptyProgress(), 'creeper'), 'elk-cloner');
    expect(decodeProgress(encodeProgress(progress))).toEqual(progress);
  });
});

describe('progreso permanente: la historia vista (T-031)', () => {
  it('una secuencia vista queda apuntada una vez, en el orden en que se vio', () => {
    const seen = recordStory(recordStory(emptyProgress(), 'opening'), 'creeperDown');
    expect(hasSeenStory(seen, 'opening')).toBe(true);
    expect(hasSeenStory(seen, 'pattyGreenhouse')).toBe(false);
    expect(recordStory(seen, 'opening')).toBe(seen);
    expect(seen.story).toEqual(['opening', 'creeperDown']);
  });

  it('haber visto la historia cuenta como algo que se pierde al borrar el jugador', () => {
    expect(hasProgress(emptyProgress())).toBe(false);
    expect(hasProgress(recordStory(emptyProgress(), 'opening'))).toBe(true);
  });

  it('se guarda junto a los jefes vencidos, sin tocarlos, y se lee igual tras recargar', () => {
    const store = memoryStore();
    keeperOn(store).recordDefeat(CREEPER);
    keeperOn(store).recordStory('creeperDown');
    expect(keeperOn(store).read()).toEqual({ defeated: ['creeper'], story: ['creeperDown'] });
  });
});

describe('progreso permanente: sin migraciones mientras el juego esta en desarrollo (ADR-0014)', () => {
  it.each([
    ['una version anterior', PROGRESS_VERSION - 1],
    ['una version mas nueva', PROGRESS_VERSION + 1],
  ])('un progreso de %s se descarta: se empieza de cero', (_, version) => {
    const raw = JSON.stringify({ version, defeated: ['creeper'] });
    expect(decodeProgress(raw)).toBeNull();
    expect(keeperOn(memoryStore({ [PROGRESS_KEY]: raw })).read()).toEqual(emptyProgress());
  });

  it('lo descartado se pisa con el progreso de esta version al vencer a un jefe', () => {
    const store = memoryStore({ [PROGRESS_KEY]: JSON.stringify({ version: PROGRESS_VERSION + 1, defeated: ['creeper'], seeds: 300 }) });
    keeperOn(store).recordDefeat(CREEPER);
    expect(JSON.parse(store.data.get(PROGRESS_KEY) ?? '')).toEqual({ version: PROGRESS_VERSION, defeated: ['creeper'], story: [] });
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
    expect(decodeProgress(`{"version":${PROGRESS_VERSION},"defeated":"creeper"}`)).toEqual(emptyProgress());
    expect(decodeProgress(`{"version":${PROGRESS_VERSION},"defeated":["creeper"],"story":["opening", 3, "opening", ""]}`)).toEqual({
      defeated: ['creeper'],
      story: ['opening'],
    });
    expect(decodeProgress(`{"version":${PROGRESS_VERSION},"defeated":["creeper", 7, "", null, "creeper", "elk-cloner"]}`)).toEqual({ defeated: ['creeper', 'elk-cloner'], story: [] });
  });

  it('un progreso ilegible no toca la partida en curso, y al vencer otro jefe se escribe de nuevo', () => {
    const store = memoryStore({ [PROGRESS_KEY]: 'no es JSON' });
    writeSave(createMatch(), null, store, 1);
    const keeper = keeperOn(store);
    expect(keeper.read()).toEqual(emptyProgress());
    expect(readSave(store)).not.toBeNull();
    keeper.recordDefeat(CREEPER);
    expect(decodeProgress(store.data.get(PROGRESS_KEY) ?? null)?.defeated).toEqual(['creeper']);
  });
});

describe('progreso permanente: sin almacenamiento (T-017)', () => {
  it('sin almacenamiento (ventana privada) el juego sigue y el progreso dura la sesion', () => {
    const keeper = sessionKeeperOn(null);
    expect(keeper.read()).toEqual(emptyProgress());
    keeper.recordDefeat(CREEPER);
    expect(isOutbreakDefeated(keeper.read(), CREEPER)).toBe(true);
  });

  it('con el almacenamiento bloqueado no falla nada', () => {
    const keeper = sessionKeeperOn(blockedStore);
    expect(keeper.read()).toEqual(emptyProgress());
    expect(() => keeper.recordDefeat(CREEPER)).not.toThrow();
    expect(isOutbreakDefeated(keeper.read(), CREEPER)).toBe(true);
    // Sobre un almacen que falla y no guarda en memoria, tampoco.
    expect(() => keeperOn(blockedStore).recordDefeat(CREEPER)).not.toThrow();
    expect(keeperOn(blockedStore).read()).toEqual(emptyProgress());
  });

  it('con el almacenamiento lleno, lo que no cupo manda sobre lo guardado mientras dure la sesion', () => {
    const store = fullStore({ [PROGRESS_KEY]: encodeProgress(emptyProgress()) });
    const keeper = sessionKeeperOn(store);
    keeper.recordDefeat(CREEPER);
    expect(isOutbreakDefeated(keeper.read(), CREEPER)).toBe(true);
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
    const keeper = sessionKeeperOn(flaky);
    keeper.recordDefeat(CREEPER);
    expect(store.data.has(PROGRESS_KEY)).toBe(false);
    full = false;
    keeper.recordDefeat('elk-cloner');
    expect(decodeProgress(store.data.get(PROGRESS_KEY) ?? null)?.defeated).toEqual(['creeper', 'elk-cloner']);
  });
});
