import { TOURS, toursOfRound, type HintId, type TourId } from './tours';

/**
 * Que tours de ayuda ya vio el jugador en este navegador (T-013, G-05). Va aparte de la partida guardada: no se borra al
 * perder ni con una partida nueva, asi un tour visto no vuelve a salir.
 */
export interface TourProgress {
  /** Tours vistos: acabados, saltados o cortados al empezar el ataque. */
  done: TourId[];
  /** Pistas sueltas: cuantas veces salieron y si ya se aprendieron. */
  hints: Partial<Record<HintId, { shown: number; done: boolean }>>;
}

export const TOUR_STORAGE_KEY = 'rebrote.tours';
/** Una pista que el jugador no sigue deja de salir tras estas veces (G-08). */
export const HINT_MAX_SHOWS = 3;

const TOUR_IDS = Object.keys(TOURS) as TourId[];
const HINT_IDS: readonly HintId[] = ['droppedCoin'];

export const emptyProgress = (): TourProgress => ({ done: [], hints: {} });

/** Lee lo guardado; lo que no se entiende se ignora (un tour de mas antes que un juego roto). */
export function parseTourProgress(raw: string | null): TourProgress {
  if (!raw) return emptyProgress();
  try {
    const data = JSON.parse(raw) as { done?: unknown; hints?: unknown };
    const listed: unknown[] = Array.isArray(data.done) ? data.done : [];
    const done = [...new Set(listed.filter((id): id is TourId => TOUR_IDS.includes(id as TourId)))];
    const hints: TourProgress['hints'] = {};
    if (typeof data.hints === 'object' && data.hints !== null) {
      for (const id of HINT_IDS) {
        const hint = (data.hints as Record<string, unknown>)[id] as { shown?: unknown; done?: unknown } | undefined;
        if (!hint || typeof hint !== 'object') continue;
        const shown = typeof hint.shown === 'number' && Number.isFinite(hint.shown) ? Math.max(0, Math.floor(hint.shown)) : 0;
        hints[id] = { shown, done: hint.done === true };
      }
    }
    return { done, hints };
  } catch {
    return emptyProgress();
  }
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStore(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readTourProgress(store: Store | null = defaultStore()): TourProgress {
  try {
    return parseTourProgress(store?.getItem(TOUR_STORAGE_KEY) ?? null);
  } catch {
    return emptyProgress();
  }
}

export function writeTourProgress(progress: TourProgress, store: Store | null = defaultStore()): void {
  try {
    store?.setItem(TOUR_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Sin almacenamiento (ventana privada, permisos): los tours vistos duran solo esta sesion.
  }
}

export function markTourDone(progress: TourProgress, id: TourId): TourProgress {
  return progress.done.includes(id) ? progress : { ...progress, done: [...progress.done, id] };
}

/** Tours de la ronda `index` (desde 0) que aun no se vieron. Con la ayuda apagada, ninguno. */
export function pendingTours(index: number, progress: TourProgress, help: boolean): TourId[] {
  if (!help) return [];
  return toursOfRound(index).filter((id) => !progress.done.includes(id));
}

/** La pista aun tiene que salir: no se aprendio y no salio ya todas sus veces. */
export function hintPending(progress: TourProgress, id: HintId): boolean {
  const hint = progress.hints[id];
  return !hint || (!hint.done && hint.shown < HINT_MAX_SHOWS);
}

/** La pista salio una vez mas. */
export function hintShown(progress: TourProgress, id: HintId): TourProgress {
  const hint = progress.hints[id] ?? { shown: 0, done: false };
  return { ...progress, hints: { ...progress.hints, [id]: { ...hint, shown: hint.shown + 1 } } };
}

/** El jugador hizo lo que ensenaba la pista: no vuelve a salir. */
export function hintDone(progress: TourProgress, id: HintId): TourProgress {
  const hint = progress.hints[id] ?? { shown: 0, done: false };
  return { ...progress, hints: { ...progress.hints, [id]: { ...hint, done: true } } };
}
