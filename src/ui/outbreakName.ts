import { isOutbreakId, outbreakNumber, outbreakScript, type OutbreakId } from '../game/core/outbreaks';
import type { Dictionary } from '../i18n';

/** Nombre del jefe del brote, en el idioma de `t`. */
function bossOf(t: Dictionary, id: OutbreakId): string {
  return t.info.enemy.names[outbreakScript(id).boss];
}

/** "Brote 1: Creeper" (T-018): el numero del brote y su jefe, que se nombra siempre, tambien antes de llegar a el (B-03). */
export function outbreakTitle(t: Dictionary, id: OutbreakId): string {
  return t.outbreak.title(outbreakNumber(id), bossOf(t, id));
}

/**
 * Jefe de un brote del progreso permanente ("Jefes vencidos: Creeper"). Uno que este juego no conoce (de una version mas
 * nueva) sale con su nombre guardado.
 */
export function defeatedBossName(t: Dictionary, id: string): string {
  return isOutbreakId(id) ? bossOf(t, id) : id;
}
