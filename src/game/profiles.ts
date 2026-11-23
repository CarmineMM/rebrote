import { cleanName, isValidName } from './playerName';
import { SessionStore, browserStore, type SaveStore } from './storage';

/**
 * Perfiles de jugador (T-034, ADR-0018): varios jugadores en el mismo navegador sin que se pisen. Cada perfil tiene su
 * progreso permanente (`progress.ts`), su partida a medias (`save.ts`) y sus tours vistos (`tourProgress.ts`). Los ajustes
 * (calidad, volumen, idioma, ayuda) son del aparato y no van en el perfil (PF-03).
 *
 * Lo guardado: la lista en `rebrote.perfiles` y lo de cada perfil en `rebrote.perfil.<id>.<hueco>` (`progreso`,
 * `partida`, `tours` y `beta`, el aviso de beta visto, T-044). Cada modulo lee y escribe su hueco en el almacen del perfil activo (`profiles.store()`) sin saber
 * de perfiles. Todo dato permanente nuevo va en un hueco del perfil (o dentro de `Progress`), nunca suelto.
 *
 * Perfiles locales no son cuentas: no se sincronizan ni se protegen. Lo que si dejan listo, pensando en enlazarlos algun
 * dia con una cuenta, es un identificador que no cambia y la fecha de su ultimo guardado.
 */
export const PROFILES_KEY = 'rebrote.perfiles';

/** Sube cuando cambia la forma de la lista: la de otra version se descarta, con lo de sus perfiles (ADR-0014). */
export const PROFILES_VERSION = 1;

/** Lo de cada perfil va bajo `rebrote.perfil.<id>.`. */
export const PROFILE_PREFIX = 'rebrote.perfil.';

/** Huecos de antes de los perfiles (T-011, T-013, T-017): se borran al arrancar, sin convertirlos (ADR-0014). */
export const LEGACY_KEYS: readonly string[] = ['rebrote.progreso', 'rebrote.partida', 'rebrote.tours'];

/** Cuantos jugadores caben (PF-01): la lista cabe en un movil en horizontal sin desplazarse. */
export const MAX_PROFILES = 3;

export interface Profile {
  /** Identificador estable: no cambia aunque cambie el nombre. Es el que algun dia lo enlazara con una cuenta. */
  readonly id: string;
  /**
   * Nombre que eligio el jugador (T-033, reglas en `playerName.ts`), o null mientras no elija: se le llama "Jugador N"
   * (PF-05). Se pueden repetir (PF-07).
   */
  readonly name: string | null;
  /** La N de "Jugador N": la menor libre al crearlo. */
  readonly number: number;
  /** Cuando se creo (milisegundos desde 1970). */
  readonly createdAt: number;
  /** Ultima vez que se escribio algo suyo (partida, progreso o tours): "la ultima vez que jugo". */
  readonly updatedAt: number;
}

export interface ProfileList {
  /** El perfil activo. En lo guardado, el de la ultima pestana que cambio de jugador: el que se recuerda al recargar. */
  readonly active: string;
  /** En el orden en que se crearon. Siempre hay al menos uno. */
  readonly profiles: readonly Profile[];
}

// ---------------------------------------------------------------------------
// Reglas

/** La N de "Jugador N" para uno nuevo: la menor que no lleva ningun otro. */
export function freeNumber(profiles: readonly Profile[]): number {
  let number = 1;
  while (profiles.some((profile) => profile.number === number)) number++;
  return number;
}

/** Un perfil vacio: sin nombre, sin progreso, sin partida y con los tours sin ver. */
export function newProfile(profiles: readonly Profile[], id: string, now: number): Profile {
  return { id, name: null, number: freeNumber(profiles), createdAt: now, updatedAt: now };
}

/** Un solo perfil, vacio y activo: el de un navegador sin datos (o con lo guardado roto o de otra version). */
export function firstList(id: string, now: number): ProfileList {
  return { active: id, profiles: [newProfile([], id, now)] };
}

export function findProfile(list: ProfileList, id: string): Profile | null {
  return list.profiles.find((profile) => profile.id === id) ?? null;
}

export function activeProfile(list: ProfileList): Profile {
  return findProfile(list, list.active) ?? list.profiles[0];
}

/** Aun cabe otro jugador. */
export function canAddProfile(list: ProfileList): boolean {
  return list.profiles.length < MAX_PROFILES;
}

/** Crea un perfil vacio y lo deja activo. Con el maximo de jugadores, devuelve la misma lista. */
export function addProfile(list: ProfileList, id: string, now: number): ProfileList {
  if (!canAddProfile(list) || findProfile(list, id)) return list;
  return { active: id, profiles: [...list.profiles, newProfile(list.profiles, id, now)] };
}

/** Cambia de jugador. Uno que no esta en la lista no cambia nada. */
export function selectProfile(list: ProfileList, id: string): ProfileList {
  return list.active === id || !findProfile(list, id) ? list : { ...list, active: id };
}

/**
 * Borra un perfil; los demas no cambian. Si era el activo, pasa a serlo el de los que quedan que jugo por ultima vez; si
 * era el ultimo, queda uno nuevo y vacio (`freshId`).
 */
export function removeProfile(list: ProfileList, id: string, freshId: string, now: number): ProfileList {
  if (!findProfile(list, id)) return list;
  const profiles = list.profiles.filter((profile) => profile.id !== id);
  if (profiles.length === 0) return firstList(freshId, now);
  if (list.active !== id) return { ...list, profiles };
  const latest = profiles.reduce((best, profile) => (profile.updatedAt > best.updatedAt ? profile : best));
  return { active: latest.id, profiles };
}

/**
 * Le pone nombre a un jugador (T-033): el que escribio, sin los espacios de los lados, o el apodo de Boxer. Un nombre que
 * no vale, un jugador que no esta o el mismo nombre devuelven la misma lista. Cuenta como un cambio suyo: apunta la fecha.
 */
export function renameProfile(list: ProfileList, id: string, name: string, now: number): ProfileList {
  const profile = findProfile(list, id);
  if (!profile || !isValidName(name)) return list;
  const clean = cleanName(name);
  if (profile.name === clean) return list;
  const renamed: Profile = { ...profile, name: clean, updatedAt: Math.max(profile.updatedAt, now) };
  return { ...list, profiles: list.profiles.map((item) => (item.id === id ? renamed : item)) };
}

/** Apunta que el perfil se acaba de guardar. Si no esta o ya tiene esa fecha, devuelve la misma lista. */
export function touchProfile(list: ProfileList, id: string, now: number): ProfileList {
  const profile = findProfile(list, id);
  if (!profile || profile.updatedAt >= now) return list;
  return { ...list, profiles: list.profiles.map((item) => (item.id === id ? { ...item, updatedAt: now } : item)) };
}

/** Clave de un hueco del perfil en el navegador: `rebrote.perfil.<id>.<hueco>`. */
export function profileKey(id: string, slot: string): string {
  return `${PROFILE_PREFIX}${id}.${slot}`;
}

/** El perfil de una clave del navegador, o null si no es de ningun perfil. */
export function profileOfKey(key: string): string | null {
  if (!key.startsWith(PROFILE_PREFIX)) return null;
  const id = key.slice(PROFILE_PREFIX.length).split('.')[0];
  return id.length > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Formato

export function encodeProfiles(list: ProfileList): string {
  return JSON.stringify({ version: PROFILES_VERSION, active: list.active, profiles: list.profiles });
}

/**
 * La lista guardada. Null si no hay, si no se entiende, si es de otra version o si no le queda ningun perfil valido. De
 * una que se entiende a medias se queda con los perfiles que valen (hasta el maximo); un perfil roto no impide usar los
 * demas.
 */
export function decodeProfiles(raw: string | null): ProfileList | null {
  const data = parse(raw);
  if (!data || data.version !== PROFILES_VERSION) return null;
  const listed: unknown[] = Array.isArray(data.profiles) ? data.profiles : [];
  const profiles: Profile[] = [];
  for (const item of listed) {
    if (profiles.length >= MAX_PROFILES) break;
    const profile = sanitizeProfile(item, profiles);
    if (profile) profiles.push(profile);
  }
  if (profiles.length === 0) return null;
  const active = typeof data.active === 'string' && profiles.some((profile) => profile.id === data.active) ? data.active : profiles[0].id;
  return { active, profiles };
}

function sanitizeProfile(value: unknown, taken: readonly Profile[]): Profile | null {
  if (!isRecord(value) || !isProfileId(value.id) || taken.some((profile) => profile.id === value.id)) return null;
  const createdAt = isTime(value.createdAt) ? value.createdAt : 0;
  const updatedAt = isTime(value.updatedAt) ? Math.max(value.updatedAt, createdAt) : createdAt;
  const number = Number.isInteger(value.number) && (value.number as number) >= 1 && !taken.some((profile) => profile.number === value.number) ? (value.number as number) : freeNumber(taken);
  const name = typeof value.name === 'string' && isValidName(value.name) ? cleanName(value.name) : null;
  return { id: value.id, name, number, createdAt, updatedAt };
}

function parse(raw: string | null): Record<string, unknown> | null {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return isRecord(data) ? data : null;
  } catch {
    return null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
/** Va dentro de las claves del navegador: sin puntos, que separan el perfil de su hueco. */
export const isProfileId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);

/** Identificador nuevo al azar. `randomUUID` solo existe en https y localhost: en la red de casa (http) se hace a mano. */
export function randomId(): string {
  const api = globalThis.crypto;
  if (typeof api?.randomUUID === 'function') return api.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof api?.getRandomValues === 'function') api.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Almacenamiento

/**
 * Lleva los perfiles en el navegador. La primera vez que se usa arranca: borra los huecos de antes de los perfiles (sin
 * convertirlos), barre lo que quedo de perfiles que ya no estan y, en un navegador sin datos, crea el primer perfil solo,
 * sin ensenar ninguna pantalla.
 *
 * Cada pestana tiene su perfil activo y escribe en el suyo; el que se recuerda al recargar es el de la ultima pestana que
 * cambio de jugador. Lo que cambie otra pestana en la lista (un jugador nuevo, uno borrado) se respeta: cada cambio parte
 * de lo guardado. Si el navegador no deja guardar, todo sigue igual y dura lo que dure la pestana (`SessionStore`).
 */
export class ProfileKeeper {
  private readonly storage: SessionStore;
  /** Perfil activo en esta pestana; null hasta arrancar. */
  private activeId: string | null = null;
  /** Copia del perfil activo: si otra pestana lo borra mientras se juega, esta lo sigue usando hasta cambiar de jugador. */
  private activeCopy: Profile | null = null;

  constructor(
    base: () => SaveStore | null = browserStore,
    private readonly now: () => number = Date.now,
    private readonly makeId: () => string = randomId,
  ) {
    this.storage = new SessionStore(base);
  }

  /** Los jugadores, con el activo de esta pestana. Nunca falla. */
  read(): ProfileList {
    const active = this.activeId ?? this.boot();
    const profiles = this.stored()?.profiles ?? [];
    const mine = profiles.find((profile) => profile.id === active);
    if (mine) {
      this.activeCopy = mine;
      return { active, profiles };
    }
    return { active, profiles: this.activeCopy ? [...profiles, this.activeCopy] : profiles };
  }

  /** El jugador activo. */
  active(): Profile {
    return activeProfile(this.read());
  }

  /** El almacen del jugador activo: donde guardan su hueco la partida, el progreso y los tours. */
  store(): SaveStore {
    return this.storeOf(this.activeId ?? this.boot());
  }

  /**
   * El almacen de un jugador, para leer lo suyo (la pantalla de jugadores). Escribir o borrar algo que cambia apunta la
   * fecha de su ultimo guardado; escribir lo mismo que ya habia no la cambia (los tours se escriben al abrir el juego).
   */
  storeOf(id: string): SaveStore {
    return {
      getItem: (slot) => this.storage.getItem(profileKey(id, slot)),
      setItem: (slot, value) => {
        const key = profileKey(id, slot);
        if (this.storage.getItem(key) === value) return;
        this.storage.setItem(key, value);
        this.touch(id);
      },
      removeItem: (slot) => {
        const key = profileKey(id, slot);
        if (this.storage.getItem(key) === null) return;
        this.storage.removeItem(key);
        this.touch(id);
      },
    };
  }

  /** Crea un jugador vacio y lo deja activo. Con el maximo, no hace nada. */
  create(): ProfileList {
    const list = this.read();
    const next = addProfile(list, this.freshId(list.profiles), this.now());
    return next === list ? list : this.commit(next);
  }

  /**
   * Le pone nombre a un jugador (T-033): desde la viñeta en la que Boxer lo pregunta o desde Opciones. Se escribe sobre lo
   * guardado, como la fecha del ultimo guardado: el activo que se recuerda no cambia.
   */
  rename(id: string, name: string): ProfileList {
    const list = this.read();
    const next = renameProfile(list, id, name, this.now());
    if (next === list) return list;
    const stored = this.stored();
    const renamed = stored ? renameProfile(stored, id, name, this.now()) : null;
    if (stored && renamed && renamed !== stored) this.storage.setItem(PROFILES_KEY, encodeProfiles(renamed));
    // Si otra pestana lo borro mientras se jugaba, sigue con su copia, ya con el nombre nuevo.
    if (this.activeCopy?.id === id) this.activeCopy = findProfile(next, id);
    return this.read();
  }

  /** Cambia de jugador (solo desde la portada: nunca en mitad de una partida). */
  select(id: string): ProfileList {
    const list = this.read();
    const next = selectProfile(list, id);
    return next === list ? list : this.commit(next);
  }

  /** Borra un jugador con todo lo suyo (PF-06). Si era el activo pasa a serlo otro; si era el ultimo, queda uno vacio. */
  remove(id: string): ProfileList {
    const list = this.read();
    const next = removeProfile(list, id, this.freshId(list.profiles), this.now());
    if (next === list) return list;
    // Primero la lista: si la pestana se cierra en medio, lo que quede suelto se barre al arrancar.
    this.commit(next);
    this.clear(id);
    return next;
  }

  private boot(): string {
    for (const key of LEGACY_KEYS) this.storage.removeItem(key);
    const list = this.stored() ?? firstList(this.freshId([]), this.now());
    this.commit(list);
    this.sweep(list);
    return list.active;
  }

  private stored(): ProfileList | null {
    return decodeProfiles(this.storage.getItem(PROFILES_KEY));
  }

  private commit(list: ProfileList): ProfileList {
    this.storage.setItem(PROFILES_KEY, encodeProfiles(list));
    this.activeId = list.active;
    this.activeCopy = activeProfile(list);
    return list;
  }

  /** La fecha del ultimo guardado, sobre lo guardado: el activo que se recuerda no cambia. */
  private touch(id: string): void {
    const stored = this.stored();
    if (!stored) return;
    const next = touchProfile(stored, id, this.now());
    if (next !== stored) this.storage.setItem(PROFILES_KEY, encodeProfiles(next));
  }

  /** Borra todo lo de un perfil. */
  private clear(id: string): void {
    for (const key of this.storage.keys()) if (profileOfKey(key) === id) this.storage.removeItem(key);
  }

  /** Borra lo de los perfiles que ya no estan en la lista (borrados en otra pestana, o de una lista descartada). */
  private sweep(list: ProfileList): void {
    for (const key of this.storage.keys()) {
      const id = profileOfKey(key);
      if (id !== null && !findProfile(list, id)) this.storage.removeItem(key);
    }
  }

  private freshId(profiles: readonly Profile[]): string {
    const free = (id: string) => isProfileId(id) && !profiles.some((profile) => profile.id === id);
    for (let i = 0; i < 8; i++) {
      const id = this.makeId();
      if (free(id)) return id;
    }
    let n = profiles.length;
    while (!free(`perfil-${n}`)) n++;
    return `perfil-${n}`;
  }
}

/** Los jugadores de este navegador. Los usan la escena (al guardar) y el menu de inicio, sin pasar por `EventBus`. */
export const profiles = new ProfileKeeper();
