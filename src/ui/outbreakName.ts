import type { BossKind } from '../game/core/combat';
import { FIRST_OUTBREAK, isOutbreakId, outbreakNumber, outbreakScript, type OutbreakId } from '../game/core/outbreaks';
import type { Dictionary } from '../i18n';

/**
 * Nombre del jefe del brote, en el idioma de `t`: el del enemigo que es su jefe o, si el brote esta en preparacion y su
 * jefe aun no es un enemigo del juego (T-024), el de `outbreak.comingBoss`. Sin ninguno de los dos, el numero del brote.
 */
export function bossName(t: Dictionary, id: OutbreakId): string {
  const { boss } = outbreakScript(id);
  if (boss) return t.info.enemy.names[boss];
  return (t.outbreak.comingBoss as Partial<Record<OutbreakId, string>>)[id] ?? t.outbreak.number(outbreakNumber(id));
}

/**
 * Jefe del brote, para los textos que van con cada jefe (la victoria, la derrota, la barra). Uno en preparacion (T-024),
 * que aun no tiene, usa los del primero.
 */
export function outbreakBoss(id: OutbreakId): BossKind {
  return outbreakScript(id).boss ?? (outbreakScript(FIRST_OUTBREAK).boss as BossKind);
}

/** "Brote 1: Creeper" (T-018): el numero del brote y su jefe, que se nombra siempre, tambien antes de llegar a el (B-03). */
export function outbreakTitle(t: Dictionary, id: OutbreakId): string {
  return t.outbreak.title(outbreakNumber(id), bossName(t, id));
}

/**
 * Jefe de un brote del progreso permanente ("Jefes vencidos: Creeper"). Uno que este juego no conoce (de una version mas
 * nueva) sale con su nombre guardado.
 */
export function defeatedBossName(t: Dictionary, id: string): string {
  return isOutbreakId(id) ? bossName(t, id) : id;
}
