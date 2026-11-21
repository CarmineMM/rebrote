/**
 * Almacenamiento del navegador (T-011, T-017, T-034). Lo de cada jugador (partida, progreso y tours vistos) pasa por el
 * almacen de su perfil (`profiles.ts`, ADR-0018), que se apoya en `SessionStore`. Los ajustes del aparato
 * (`rebrote.ajustes`, `useSettings`) van aparte, fuera de los perfiles.
 */

/** Lo que hace falta del almacenamiento del navegador; en los tests, uno de mentira. */
export type SaveStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** El `localStorage` del navegador, o null si no hay o no deja usarlo (ventana privada, permisos). */
export function browserStore(): SaveStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Las claves guardadas, si el almacenamiento deja verlas (`localStorage` si: `key` y `length`). Nunca falla. */
export function storedKeys(store: SaveStore | null): string[] {
  const listing = store as (SaveStore & Partial<Pick<Storage, 'key' | 'length'>>) | null;
  if (!listing || typeof listing.key !== 'function') return [];
  try {
    const keys: string[] = [];
    const count = listing.length ?? 0;
    for (let i = 0; i < count; i++) {
      const key = listing.key(i);
      if (key !== null) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * Almacen que nunca falla. Escribe en el del navegador y, si no puede (ventana privada, lleno, bloqueado), lo que no se
 * pudo escribir o borrar se queda en memoria y manda sobre lo guardado mientras dure la pestana: el juego sigue igual y lo
 * del jugador dura lo que dure la sesion. En cuanto el navegador vuelve a dejar escribir una clave, se escribe.
 */
export class SessionStore implements SaveStore {
  /** Lo que no se pudo escribir, por clave; null, lo que no se pudo borrar. */
  private readonly pending = new Map<string, string | null>();

  constructor(private readonly base: () => SaveStore | null = browserStore) {}

  getItem(key: string): string | null {
    if (this.pending.has(key)) return this.pending.get(key) ?? null;
    try {
      return this.base()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      const base = this.base();
      if (!base) throw new Error('sin almacenamiento');
      base.setItem(key, value);
      this.pending.delete(key);
    } catch {
      this.pending.set(key, value);
    }
  }

  removeItem(key: string): void {
    try {
      const base = this.base();
      if (!base) throw new Error('sin almacenamiento');
      base.removeItem(key);
      this.pending.delete(key);
    } catch {
      this.pending.set(key, null);
    }
  }

  /** Las claves que hay: las del navegador, con lo que esta en memoria encima. */
  keys(): string[] {
    const keys = new Set(storedKeys(this.base()));
    for (const [key, value] of this.pending) {
      if (value === null) keys.delete(key);
      else keys.add(key);
    }
    return [...keys];
  }
}
