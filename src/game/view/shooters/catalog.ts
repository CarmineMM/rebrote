import { BULB_SHOOTER } from './bulb';
import { CACTUS_SHOOTER } from './cactus';
import type { ShooterDesign } from './design';
import { LEGACY_SHOOTER } from './legacy';
import { POD_SHOOTER } from './pod';

/**
 * Todas las formas de la disparadora (T-016): la de siempre y las tres propuestas. Solo lo usan la galeria de desarrollo
 * (`/proposals/disparadoras.html`) y los tests: el juego importa solo la activa (`SHOOTER` en `shooterShape.ts`), asi que las
 * demas no entran en `npm run build`.
 */
export const SHOOTER_DESIGNS: readonly ShooterDesign[] = [LEGACY_SHOOTER, BULB_SHOOTER, CACTUS_SHOOTER, POD_SHOOTER];

/** Las propuestas del rediseno (X-01): a) brote, b) cactus, c) vaina. */
export const SHOOTER_PROPOSALS: readonly ShooterDesign[] = [BULB_SHOOTER, CACTUS_SHOOTER, POD_SHOOTER];
