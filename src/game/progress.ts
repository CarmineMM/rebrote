import { profiles } from './profiles';
import type { SaveStore } from './storage';

/**
 * Progreso permanente (T-017, ADR-0014): lo que el jugador no pierde al acabar una partida. Hoy, los brotes cuyo jefe ya
 * vencio; despues, la moneda secundaria (T-020), las compras (T-022) y las mejoras (T-023).
 *
 * Es de cada jugador (T-034, ADR-0018): va en el hueco `progreso` de su perfil, aparte de la partida guardada
 * (`save.ts`). Ganar, perder o empezar una partida nueva no lo toca; se pierde al borrar el jugador.
 *
 * Mientras el juego este en desarrollo no hay migraciones (ADR-0014, regla 11 de `CLAUDE.md`): si cambia la forma de
 * `Progress`, se sube `PROGRESS_VERSION` y lo guardado con otra version se descarta.
 */
export const PROGRESS_KEY = 'progreso';

/** Sube cuando cambia la forma de `Progress` (un campo nuevo, otro significado). Lo de otra version se descarta. */
export const PROGRESS_VERSION = 1;

export interface Progress {
  /**
   * Brotes cuyo jefe se vencio al menos una vez, en el orden en que se vencieron por primera vez, por su nombre (`id` en
   * `OUTBREAKS`, T-018: el de su jefe).
   */
  readonly defeated: readonly string[];
}

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

/** El progreso guardado. Null si no hay, si no se entiende o si es de otra version (se descarta, sin migrar). */
export function decodeProgress(raw: string | null): Progress | null {
  const data = parse(raw);
  if (!data || data.version !== PROGRESS_VERSION) return null;
  return sanitize(data);
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

/** Se queda con lo que entiende de un progreso de esta version: lo que este roto se pierde, lo demas no. */
function sanitize(data: Record<string, unknown>): Progress {
  const listed: unknown[] = Array.isArray(data.defeated) ? data.defeated : [];
  return { defeated: [...new Set(listed.filter(isOutbreakName))] };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
/** Se guardan tambien los brotes que este juego no conoce: el guion de brotes cambia mientras se desarrolla. */
const isOutbreakName = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 64;

// ---------------------------------------------------------------------------
// Almacenamiento

/**
 * Lee y escribe el progreso en el almacen de un jugador; por defecto, el del jugador activo (`profiles.store()`). Ese
 * almacen nunca falla: sin almacenamiento (ventana privada, lleno, bloqueado) el progreso dura lo que dure la pestana.
 */
export class ProgressKeeper {
  constructor(private readonly store: () => SaveStore = () => profiles.store()) {}

  /** El progreso, o uno vacio si no hay, no se entiende o es de otra version. Nunca falla. */
  read(): Progress {
    try {
      return decodeProgress(this.store().getItem(PROGRESS_KEY)) ?? emptyProgress();
    } catch {
      return emptyProgress();
    }
  }

  write(progress: Progress): void {
    try {
      this.store().setItem(PROGRESS_KEY, encodeProgress(progress));
    } catch {
      // El almacen del perfil ya guarda en memoria lo que no cabe; con uno de otro tipo, el juego sigue igual.
    }
  }

  /** Apunta el jefe del brote `id` como vencido. Ya apuntado, no escribe nada. */
  recordDefeat(id: string): Progress {
    const before = this.read();
    const after = recordDefeat(before, id);
    if (after !== before) this.write(after);
    return after;
  }
}

/** El progreso del jugador activo. Lo usan la escena (al vencer a un jefe) y el menu de inicio. */
export const playerProgress = new ProgressKeeper();
