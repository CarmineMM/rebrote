import { ENEMIES, OUTBREAKS } from '../../game/config/balance';
import { BOSS_KINDS, isBoss, type BossKind, type EnemyKind } from '../../game/core/combat';
import type { OutbreakId } from '../../game/core/outbreaks';
import type { Presenter, RoundGroup, RoundScript } from '../../game/core/rounds';

/**
 * Quien sale en cada brote (T-040), sacado del guion de verdad (`OUTBREAKS` de `balance.ts`): las tropas de sus rondas, con
 * los niveles con que pueden salir en cada una, y su jefe con su escolta. Lo usan los catalogos de desarrollo
 * (`/catalogo/tropas.html` y `/catalogo/jefes.html`): una tropa o un jefe nuevo sale en ellos en cuanto esta en un guion.
 * Puro y sin Phaser.
 */

export type TroopKind = Exclude<EnemyKind, BossKind>;

/** Todas las tropas (lo que no es jefe), en el orden de `ENEMIES`. */
export const TROOP_KINDS: readonly TroopKind[] = (Object.keys(ENEMIES) as EnemyKind[]).filter((kind): kind is TroopKind => !isBoss(kind));

/** Tramo de rondas seguidas en que una tropa sale con los mismos niveles. */
export interface Appearance {
  /** Rondas, desde 1, en orden. */
  readonly rounds: readonly number[];
  /** Niveles con que puede salir, de menor a mayor. */
  readonly levels: readonly number[];
  /** Nivel fijo del grupo (la escolta de un jefe), no al azar con los pesos de la ronda. */
  readonly fixed: boolean;
  /** Sale con el grito del jefe: su escolta. */
  readonly escort: boolean;
}

export interface RosterTroop {
  readonly kind: TroopKind;
  readonly appearances: readonly Appearance[];
  /** Todos los niveles con que sale en el brote, de menor a mayor. */
  readonly levels: readonly number[];
  /** Cuantas salen en todo el brote (un enemigo por carril de cada grupo), sin contar refuerzos de mas. */
  readonly count: number;
}

export interface RosterOutbreak {
  readonly id: OutbreakId;
  /** Numero del brote, desde 1. */
  readonly number: number;
  readonly boss: BossKind | null;
  /** Ronda del jefe, desde 1, o null si su guion aun no lo saca. */
  readonly bossRound: number | null;
  readonly rounds: number;
  readonly presenter: Presenter | null;
  /** Tropas en el orden en que salen por primera vez. */
  readonly troops: readonly RosterTroop[];
}

/** Niveles de un grupo: el fijo, o los de la tabla de su ronda (sin tabla, el 1). */
function groupLevels(round: RoundScript, group: RoundGroup): number[] {
  if (group.level !== undefined) return [group.level];
  if (!round.levels) return [1];
  return Object.keys(round.levels)
    .map(Number)
    .filter((level) => (round.levels as Record<number, number>)[level] > 0)
    .sort((a, b) => a - b);
}

const sameLevels = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((level, i) => level === b[i]);

/** Quien sale en el brote `id`. */
export function outbreakRoster(id: OutbreakId): RosterOutbreak {
  const index = OUTBREAKS.findIndex((outbreak) => outbreak.id === id);
  if (index < 0) throw new Error(`Brote desconocido: ${id}`);
  const script = OUTBREAKS[index];
  const order: TroopKind[] = [];
  const counts = new Map<TroopKind, number>();
  // Por tropa, sus apariciones ronda a ronda, antes de juntar las seguidas.
  const raw = new Map<TroopKind, Array<{ round: number; levels: number[]; fixed: boolean; escort: boolean }>>();
  let bossRound: number | null = null;
  script.rounds.forEach((round, r) => {
    for (const group of round.groups) {
      if (isBoss(group.kind)) {
        if (group.kind === script.boss && bossRound === null) bossRound = r + 1;
        continue;
      }
      const kind = group.kind as TroopKind;
      if (!raw.has(kind)) {
        raw.set(kind, []);
        order.push(kind);
      }
      counts.set(kind, (counts.get(kind) ?? 0) + group.lanes.length);
      const entry = { round: r + 1, levels: groupLevels(round, group), fixed: group.level !== undefined, escort: group.shout === 'escort' };
      const list = raw.get(kind)!;
      // Una vez por ronda y tipo de grupo: los grupos al azar de una ronda comparten tabla.
      if (!list.some((e) => e.round === entry.round && e.fixed === entry.fixed && sameLevels(e.levels, entry.levels))) list.push(entry);
    }
  });
  const troops = order.map((kind): RosterTroop => {
    const entries = raw.get(kind)!;
    const appearances: Array<{ rounds: number[]; levels: number[]; fixed: boolean; escort: boolean }> = [];
    // Las fijas (escolta) aparte; las demas, juntando rondas seguidas con los mismos niveles.
    for (const entry of [...entries.filter((e) => !e.fixed), ...entries.filter((e) => e.fixed)]) {
      const last = appearances[appearances.length - 1];
      if (last && last.fixed === entry.fixed && last.escort === entry.escort && sameLevels(last.levels, entry.levels) && last.rounds[last.rounds.length - 1] === entry.round - 1) {
        last.rounds.push(entry.round);
      } else {
        appearances.push({ rounds: [entry.round], levels: entry.levels, fixed: entry.fixed, escort: entry.escort });
      }
    }
    const levels = [...new Set(entries.flatMap((e) => e.levels))].sort((a, b) => a - b);
    return { kind, appearances, levels, count: counts.get(kind) ?? 0 };
  });
  return {
    id,
    number: index + 1,
    boss: script.boss,
    bossRound,
    rounds: script.rounds.length,
    presenter: script.presenter ?? null,
    troops,
  };
}

/** Quien sale en cada brote, en el orden de la ruta. */
export function allRosters(): RosterOutbreak[] {
  return OUTBREAKS.map((outbreak) => outbreakRoster(outbreak.id));
}

/** Los jefes en el orden de sus brotes; los que aun no tienen brote, al final. */
export function bossesInOrder(): BossKind[] {
  const withOutbreak = OUTBREAKS.map((outbreak) => outbreak.boss).filter((boss): boss is BossKind => boss !== null);
  return [...withOutbreak, ...BOSS_KINDS.filter((boss) => !withOutbreak.includes(boss))];
}

/** "1", "1 y 2", "3 a 5": un tramo de rondas o de niveles seguidos; si no son seguidos, separados por comas. */
export function spanText(values: readonly number[]): string {
  if (values.length === 0) return '';
  if (values.length === 1) return String(values[0]);
  const consecutive = values.every((value, i) => i === 0 || value === values[i - 1] + 1);
  if (consecutive) return values.length === 2 ? `${values[0]} y ${values[1]}` : `${values[0]} a ${values[values.length - 1]}`;
  return `${values.slice(0, -1).join(', ')} y ${values[values.length - 1]}`;
}
