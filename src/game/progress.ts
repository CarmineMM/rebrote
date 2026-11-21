import { SEEDS } from './config/balance';
import { addSeeds } from './core/seeds';
import { profiles } from './profiles';
import type { SaveStore } from './storage';

/**
 * Progreso permanente (T-017, ADR-0014): lo que el jugador no pierde al acabar una partida. Hoy, los brotes cuyo jefe ya
 * vencio, las secuencias de la historia que ya vio (T-031) y sus semillas (T-020); despues, las compras (T-022) y las
 * mejoras (T-023).
 *
 * Es de cada jugador (T-034, ADR-0018): va en el hueco `progreso` de su perfil, aparte de la partida guardada
 * (`save.ts`). Ganar, perder o empezar una partida nueva no lo toca; se pierde al borrar el jugador.
 *
 * Mientras el juego este en desarrollo no hay migraciones (ADR-0014, regla 11 de `CLAUDE.md`): si cambia la forma de
 * `Progress`, se sube `PROGRESS_VERSION` y lo guardado con otra version se descarta.
 */
export const PROGRESS_KEY = 'progreso';

/**
 * Sube cuando cambia la forma de `Progress` (un campo nuevo, otro significado). Lo de otra version se descarta.
 * 2 (T-031): las secuencias de la historia vistas (`story`).
 * 3 (T-020): las semillas (`seeds`).
 */
export const PROGRESS_VERSION = 3;

export interface Progress {
  /**
   * Brotes cuyo jefe se vencio al menos una vez, en el orden en que se vencieron por primera vez, por su nombre (`id` en
   * `OUTBREAKS`, T-018: el de su jefe).
   */
  readonly defeated: readonly string[];
  /**
   * Secuencias de viñetas de la historia que ya vio, acabadas o saltadas (T-031, ADR-0019), por su nombre (`StoryId` de
   * `src/ui/story/stories.ts`), en el orden en que se vieron. Una vista no vuelve a salir sola.
   */
  readonly story: readonly string[];
  /** Semillas (T-020): lo cobrado al acabar cada partida, menos lo gastado. Entero, de 0 a `SEEDS.maxBalance`. */
  readonly seeds: number;
}

export const emptyProgress = (): Progress => ({ defeated: [], story: [], seeds: 0 });

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

/** Ya vio la secuencia `id` de la historia (T-031). */
export function hasSeenStory(progress: Progress, id: string): boolean {
  return progress.story.includes(id);
}

/** Apunta la secuencia `id` de la historia como vista. Si ya lo estaba, devuelve el mismo progreso. */
export function recordStory(progress: Progress, id: string): Progress {
  return hasSeenStory(progress, id) ? progress : { ...progress, story: [...progress.story, id] };
}

/**
 * Apunta como acaba una partida (T-020): suma las semillas cobradas y, si gano, el jefe de su brote (`won`, su `id`).
 * Sin nada que apuntar devuelve el mismo progreso.
 */
export function recordMatchEnd(progress: Progress, won: string | null, seeds: number): Progress {
  const defeated = won === null ? progress : recordDefeat(progress, won);
  const balance = addSeeds(defeated.seeds, seeds);
  return balance === defeated.seeds ? defeated : { ...defeated, seeds: balance };
}

/** Hay algo que perder si se borra. */
export function hasProgress(progress: Progress): boolean {
  return progress.defeated.length > 0 || progress.story.length > 0 || progress.seeds > 0;
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
  return { defeated: names(data.defeated), story: names(data.story), seeds: seedBalance(data.seeds) };
}

/** Un saldo de semillas: un entero de 0 al maximo. Lo que no lo es cuenta como 0; lo que pasa del maximo, como el maximo. */
function seedBalance(value: unknown): number {
  return Number.isInteger(value) && (value as number) > 0 ? Math.min(SEEDS.maxBalance, value as number) : 0;
}

/** Lista de nombres sin repetir; lo que no es un nombre se pierde. */
function names(value: unknown): string[] {
  const listed: unknown[] = Array.isArray(value) ? value : [];
  return [...new Set(listed.filter(isName))];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
/**
 * Se guardan tambien los brotes y las secuencias que este juego no conoce: el guion de brotes y la historia cambian mientras
 * se desarrolla.
 */
const isName = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 64;

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
    return this.change((progress) => recordDefeat(progress, id));
  }

  /** Apunta la secuencia `id` de la historia como vista (T-031). Ya apuntada, no escribe nada. */
  recordStory(id: string): Progress {
    return this.change((progress) => recordStory(progress, id));
  }

  /**
   * Apunta como acabo una partida (T-020) en una sola escritura: las semillas cobradas y, si gano, el jefe vencido. Sin
   * nada que apuntar, no escribe nada.
   */
  recordMatchEnd(won: string | null, seeds: number): Progress {
    return this.change((progress) => recordMatchEnd(progress, won, seeds));
  }

  private change(rule: (progress: Progress) => Progress): Progress {
    const before = this.read();
    const after = rule(before);
    if (after !== before) this.write(after);
    return after;
  }
}

/** El progreso del jugador activo. Lo usan la escena (al acabar una partida) y el menu de inicio. */
export const playerProgress = new ProgressKeeper();
