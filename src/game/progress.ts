import { browserStore, clearSave, type SaveStore } from './save';

/**
 * Progreso permanente (T-017, ADR-0014): lo que el jugador no pierde al acabar una partida. Hoy, los brotes cuyo jefe ya
 * vencio; despues, la moneda secundaria (T-020), las compras (T-022) y las mejoras (T-023).
 *
 * Va aparte de la partida guardada (`save.ts`): ganar, perder o empezar una partida nueva no lo toca. Solo se borra si el
 * jugador lo pide ("Borrar progreso" en Opciones). Al reves que la partida guardada, un progreso de una version anterior
 * nunca se descarta: se migra a la actual.
 */
export const PROGRESS_KEY = 'rebrote.progreso';

/**
 * Sube cuando cambia la forma de `Progress` (un campo nuevo, otro significado). Al subirla se escribe en `MIGRATIONS` la
 * que pasa de la version anterior a la nueva: el test falla si falta alguna.
 */
export const PROGRESS_VERSION = 1;

export interface Progress {
  /**
   * Brotes cuyo jefe se vencio al menos una vez, en el orden en que se vencieron por primera vez, por su nombre (`id` en
   * `OUTBREAKS`, T-018: el de su jefe). Puede haber alguno que este juego no conoce, de una version mas nueva.
   */
  readonly defeated: readonly string[];
}

/** Un progreso tal como se lee del navegador, antes de comprobarlo. */
export type ProgressData = Record<string, unknown>;

/** Pasa un progreso de la version N (su clave en `MIGRATIONS`) a la N + 1, sin perder nada de lo que ya tenia. */
export type Migration = (data: ProgressData) => ProgressData;

/**
 * Migraciones, por la version de la que parten. La version 1 es la primera: aun no hay ninguna. Al pasar a la 2 se
 * anade aqui `1: (data) => ({ ...data, campoNuevo: valorInicial })`, y asi con cada version.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export const emptyProgress = (): Progress => ({ defeated: [] });

// ---------------------------------------------------------------------------
// Reglas

/** El jefe del brote `id` ya se vencio alguna vez. */
export function isOutbreakDefeated(progress: Progress, id: string): boolean {
  return progress.defeated.includes(id);
}

/** Apunta el jefe del brote `id` como vencido. Si ya lo estaba, devuelve el mismo progreso. */
export function recordDefeat(progress: Progress, id: string): Progress {
  return isOutbreakDefeated(progress, id) ? progress : { ...progress, defeated: [...progress.defeated, id] };
}

/** Hay algo que perder si se borra. */
export function hasProgress(progress: Progress): boolean {
  return progress.defeated.length > 0;
}

// ---------------------------------------------------------------------------
// Formato

export function encodeProgress(progress: Progress): string {
  return JSON.stringify({ version: PROGRESS_VERSION, ...progress });
}

/**
 * Lleva `data`, de la version `from`, hasta la `to` paso a paso. Null si falta un paso o uno falla: no deberia pasar
 * (el test exige uno por version), pero un progreso a medio migrar seria peor que no tenerlo.
 */
export function migrate(data: ProgressData, from: number, to: number = PROGRESS_VERSION, migrations: Readonly<Record<number, Migration>> = MIGRATIONS): ProgressData | null {
  let current = data;
  for (let version = from; version < to; version++) {
    const step = migrations[version];
    if (!step) return null;
    try {
      current = step(current);
    } catch {
      return null;
    }
    if (!isRecord(current)) return null;
  }
  return current;
}

/**
 * El progreso guardado, migrado a esta version. Null si no hay, si no se entiende o si es de una version mas nueva que
 * este juego (se ignora, pero no se pisa: `ProgressKeeper.write`).
 */
export function decodeProgress(raw: string | null, migrations: Readonly<Record<number, Migration>> = MIGRATIONS): Progress | null {
  const data = parse(raw);
  if (!data) return null;
  const { version } = data;
  if (!isVersion(version) || version > PROGRESS_VERSION) return null;
  const current = migrate(data, version, PROGRESS_VERSION, migrations);
  return current ? sanitize(current) : null;
}

/** El texto guardado es de una version mas nueva que este juego (alguien volvio a una version anterior). */
export function isNewerProgress(raw: string | null): boolean {
  const version = parse(raw)?.version;
  return isVersion(version) && version > PROGRESS_VERSION;
}

function parse(raw: string | null): ProgressData | null {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return isRecord(data) ? data : null;
  } catch {
    return null;
  }
}

/** Se queda con lo que entiende de un progreso de esta version: lo que este roto se pierde, lo demas no. */
function sanitize(data: ProgressData): Progress {
  const listed: unknown[] = Array.isArray(data.defeated) ? data.defeated : [];
  return { defeated: [...new Set(listed.filter(isOutbreakName))] };
}

const isRecord = (value: unknown): value is ProgressData => typeof value === 'object' && value !== null && !Array.isArray(value);
const isVersion = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1;
/** Se guardan tambien los brotes que este juego no conoce: pueden ser de una version mas nueva. */
const isOutbreakName = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 64;

// ---------------------------------------------------------------------------
// Almacenamiento

/**
 * Lee y escribe el progreso en el navegador. Si no deja escribir (ventana privada, almacenamiento lleno, permisos), lo
 * que no se pudo escribir se queda en memoria y manda sobre lo guardado: el progreso dura lo que dure la sesion. Con dos
 * pestanas abiertas gana la ultima que escribe.
 */
export class ProgressKeeper {
  /** Lo ultimo que no se pudo escribir, o null si lo guardado esta al dia. */
  private unsaved: Progress | null = null;

  constructor(private readonly store: () => SaveStore | null = browserStore) {}

  /** El progreso, o uno vacio si no hay o no se entiende. Nunca falla. */
  read(): Progress {
    if (this.unsaved) return this.unsaved;
    try {
      return decodeProgress(this.store()?.getItem(PROGRESS_KEY) ?? null) ?? emptyProgress();
    } catch {
      return emptyProgress();
    }
  }

  /**
   * Guarda el progreso. Devuelve si quedo escrito en el navegador; si no, queda en memoria. Uno guardado por una version
   * mas nueva del juego no se pisa: al volver a esa version sigue ahi.
   */
  write(progress: Progress): boolean {
    try {
      const store = this.store();
      if (!store || isNewerProgress(store.getItem(PROGRESS_KEY))) throw new Error('no se puede escribir');
      store.setItem(PROGRESS_KEY, encodeProgress(progress));
      this.unsaved = null;
      return true;
    } catch {
      this.unsaved = progress;
      return false;
    }
  }

  /** Apunta el jefe del brote `id` como vencido. Ya apuntado, no escribe nada. */
  recordDefeat(id: string): Progress {
    const before = this.read();
    const after = recordDefeat(before, id);
    if (after !== before) this.write(after);
    return after;
  }

  /**
   * "Borrar progreso" (T-017): borra el progreso y la partida guardada, porque una partida a medias tambien es progreso.
   * Los ajustes (`rebrote.ajustes`) y los tours vistos (`rebrote.tours`) se conservan.
   */
  erase(): void {
    this.unsaved = null;
    const store = this.store();
    try {
      store?.removeItem(PROGRESS_KEY);
    } catch {
      // Sin almacenamiento: no habia nada escrito.
    }
    clearSave(store);
  }
}

/** El progreso del jugador en este navegador. Lo usan la escena (al vencer a un jefe) y el menu de inicio. */
export const playerProgress = new ProgressKeeper();
