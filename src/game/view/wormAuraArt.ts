import { isBoss, type EnemyKind } from '../core/combat';
import type { Ctx } from './canvasKit';
import { MEDAL_TIERS, medalTier } from './levelMedal';

/**
 * Aura de los gusanos de nivel alto (T-030): una luz muy suave del color de su medallita que sube del suelo por detras
 * del gusano en velos que se elevan y se apagan un poco por encima de su cabeza, con un halo tenue a los pies, alguna
 * mota que sube y un velo casi invisible por delante. La eligio Carmine en la galeria `/gusanos.html` (21 nov 2026).
 *
 * Decidido (Z-01 a Z-04): sale desde el nivel 5, donde empieza el salto de fuerza de `ENEMY_POWER.levelTiers`; la
 * llevan todas las tropas con nivel (tambien las copias de Creeper), pero no Creeper; sale en el tablero, la portada y
 * la foto de la ficha; en Bajo no se ve y en Medio va sin motas ni velo delantero (`QualityProfile.auras`).
 *
 * Aqui va lo que no necesita Phaser (el tramo, las medidas y el pintor del velo); lo anima `wormAura.ts`.
 */

/** Tramos con aura, como la medallita: 1 plata (5 a 9), 2 oro (10 a 14), 3 rubi (15 a 19) y 4 cristal (20). */
export const AURA_TIERS = 4;

/** Tramo del aura de un enemigo: 0 sin aura (un jefe, Creeper o Elk Cloner, o por debajo del nivel 5). */
export function auraTier(kind: EnemyKind, level: number): number {
  if (isBoss(kind) || level < 5) return 0;
  return medalTier(level);
}

/** Medidas en anchos de casilla (`w`) y ritmo. Los colores son los de la medallita (`MEDAL_TIERS`). */
export const AURA_LOOK = {
  /** Tamano de la textura del velo, en pixeles de diseno. */
  veil: { width: 120, height: 240 },
  /** Alto y ancho del velo: base y lo que suma cada tramo. */
  height: { base: 1.05, perTier: 0.08 },
  width: { base: 0.95, perTier: 0.06 },
  /** Cuanto sube un velo mientras se enciende y se apaga, y lo que tarda. */
  riseCells: 0.28,
  veilMs: 2800,
  /** Opacidad maxima de un velo: base y lo que suma cada tramo; la del velo de delante, en proporcion. */
  strength: { base: 0.3, perTier: 0.06, front: 0.35 },
  /** Velos de detras: 2 en plata y oro, 3 en rubi y cristal. */
  veilsBehind: (tier: number) => (tier >= 3 ? 3 : 2),
  /** Halo a los pies, tumbado. */
  halo: { width: 1.15, height: 0.3, alpha: [0.22, 0.4] as const, pulseMs: 1500 },
  /** Motas que suben: cada cuanto (en Alto, menos cuanto mas tramo) y hasta donde. */
  moteEveryMs: (tier: number) => Math.max(140, 300 - tier * 40),
  moteRise: { base: 1.0, perTier: 0.08, spread: 0.25 },
  /** El de cristal recorre el arcoiris en este tiempo. */
  rainbowMs: 4200,
  /** Lo que tarda en aparecer (despues de salir el gusano del suelo) y en apagarse al morir. */
  appearDelayMs: 250,
  appearMs: 520,
} as const;

/** Tamano del velo para un tramo, en anchos de casilla. */
export function veilSize(tier: number): { width: number; height: number } {
  return {
    width: AURA_LOOK.width.base + tier * AURA_LOOK.width.perTier,
    height: AURA_LOOK.height.base + tier * AURA_LOOK.height.perTier,
  };
}

/** Opacidad maxima de un velo del tramo `tier`. */
export function veilStrength(tier: number): number {
  return AURA_LOOK.strength.base + tier * AURA_LOOK.strength.perTier;
}

/** Donde va un velo en su ciclo (`t` de 0 a 1): cuanto sube, como se estira y cuanto se ve (0 al salir y al apagarse). */
export function veilPhase(t: number): { lift: number; scaleX: number; scaleY: number; alpha: number } {
  const p = ((t % 1) + 1) % 1;
  return { lift: p * AURA_LOOK.riseCells, scaleX: 1 - p * 0.18, scaleY: 0.82 + p * 0.3, alpha: Math.sin(Math.PI * p) };
}

function rgba(color: string, alpha: number): string {
  const n = Number.parseInt(color.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Velo del aura: una columna de luz con forma de llama muy alargada, ancha y viva abajo, que se estrecha y se apaga
 * hacia arriba, con los bordes difuminados. Desde el oro lleva hebras de luz verticales. Se pinta clara: la vista la
 * pone con poca opacidad y con transparencia normal (la luz aditiva sobre el cesped verde cambiaria el color del tramo).
 */
export function paintAuraVeil(ctx: Ctx, tier: number): void {
  const p = MEDAL_TIERS[tier];
  const { width: w, height: h } = AURA_LOOK.veil;
  const cx = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.46, h);
  ctx.bezierCurveTo(cx - w * 0.5, h * 0.55, cx - w * 0.2, h * 0.25, cx, 0);
  ctx.bezierCurveTo(cx + w * 0.2, h * 0.25, cx + w * 0.5, h * 0.55, cx + w * 0.46, h);
  ctx.closePath();
  const rise = ctx.createLinearGradient(0, h, 0, 0);
  rise.addColorStop(0, rgba(p.light, 0.95));
  rise.addColorStop(0.35, rgba(p.mid, 0.6));
  rise.addColorStop(0.75, rgba(p.mid, 0.18));
  rise.addColorStop(1, rgba(p.mid, 0));
  ctx.fillStyle = rise;
  ctx.fill();
  if (tier >= 2) {
    ctx.lineCap = 'round';
    for (let i = 0; i < tier + 1; i++) {
      const x = cx + (i - tier / 2) * (w * 0.14);
      const top = h * (0.18 + (i % 2) * 0.12);
      const streak = ctx.createLinearGradient(0, h, 0, top);
      streak.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      streak.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = streak;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.quadraticCurveTo(x + (i % 2 ? 5 : -5), (h + top) / 2, x, top);
      ctx.stroke();
    }
  }
  // Bordes difuminados: se queda solo el centro.
  ctx.globalCompositeOperation = 'destination-in';
  const soft = ctx.createLinearGradient(0, 0, w, 0);
  soft.addColorStop(0, 'rgba(0, 0, 0, 0)');
  soft.addColorStop(0.3, 'rgba(0, 0, 0, 1)');
  soft.addColorStop(0.7, 'rgba(0, 0, 0, 1)');
  soft.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = soft;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}
