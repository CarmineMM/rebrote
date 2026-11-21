/**
 * Ajustes graficos (ADR-0006). Cada nivel decide cuanto se pinta y cuanto se anima.
 * Funciones puras, sin Phaser, para poder testearlas y usarlas desde React. El nombre y la descripcion de cada nivel, en
 * cada idioma, estan en `settings.levels` de `src/i18n/` (T-011).
 */
export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';
export type QualitySetting = QualityLevel | 'auto';

export const QUALITY_LEVELS: readonly QualityLevel[] = ['low', 'medium', 'high', 'ultra'];

export interface QualityProfile {
  /** Resolucion interna respecto al lienzo de diseno (1 = 1600 x 900). */
  renderScale: number;
  /** Multiplicador de particulas: polen, hojas, bits del suelo corrupto, chispas. */
  particles: number;
  /** Multiplicador de vida en el escenario: nubes, pajaros, mariposas, flores y matas. */
  life: number;
  /** Sol con halo y rayos girando. */
  sunRays: boolean;
  /** Rafagas de viento que barren el cesped. */
  wind: boolean;
  /** Sombras de nubes que pasan por el suelo. */
  cloudShadows: boolean;
  /** Brillos aditivos: agujeros, circuitos, monedas y luces de la ciudad. */
  glows: boolean;
  /** Extras: destellos de rocio en el cesped y haces de luz del sol. */
  extras: boolean;
  /** Filtros de camara: color mas vivo y vineta suave. */
  postFx: boolean;
  /**
   * Aura de los gusanos de nivel alto (T-030, Z-04): 0 sin aura, 1 solo los velos de detras y el halo (sin motas ni
   * velo delantero), 2 entera.
   */
  auras: 0 | 1 | 2;
}

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  low: {
    renderScale: 0.75,
    particles: 0.25,
    life: 0.5,
    sunRays: false,
    wind: false,
    cloudShadows: false,
    glows: false,
    extras: false,
    postFx: false,
    auras: 0,
  },
  medium: {
    renderScale: 1,
    particles: 0.6,
    life: 0.8,
    sunRays: true,
    wind: true,
    cloudShadows: false,
    glows: true,
    extras: false,
    postFx: false,
    auras: 1,
  },
  high: {
    renderScale: 1.25,
    particles: 1,
    life: 1,
    sunRays: true,
    wind: true,
    cloudShadows: true,
    glows: true,
    extras: true,
    postFx: false,
    auras: 2,
  },
  ultra: {
    renderScale: 2,
    particles: 1.6,
    life: 1.4,
    sunRays: true,
    wind: true,
    cloudShadows: true,
    glows: true,
    extras: true,
    postFx: true,
    auras: 2,
  },
};

export interface DeviceInfo {
  /** navigator.hardwareConcurrency; puede faltar. */
  cores?: number;
  /** navigator.deviceMemory en GB; solo en algunos navegadores. */
  memoryGb?: number;
  /** Pantalla tactil como puntero principal (movil o tableta). */
  touch: boolean;
}

/**
 * Nivel inicial del modo automatico. Nunca propone Ultra: ese se elige a mano.
 * Si luego el juego va lento, `autoDowngrade` baja un nivel.
 */
export function suggestQuality(device: DeviceInfo): QualityLevel {
  const cores = device.cores ?? 4;
  const memory = device.memoryGb ?? 8;
  if (cores <= 2 || memory <= 2) return 'low';
  if (device.touch || cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

/** Por debajo de estos fps medidos, el modo automatico baja un nivel. */
export const AUTO_MIN_FPS = 45;

/** Siguiente nivel en modo automatico tras medir los fps: solo baja, nunca sube, y no pasa de Bajo. */
export function autoDowngrade(current: QualityLevel, measuredFps: number): QualityLevel {
  if (measuredFps >= AUTO_MIN_FPS) return current;
  const index = QUALITY_LEVELS.indexOf(current);
  return QUALITY_LEVELS[Math.max(0, index - 1)];
}

/** Lee un ajuste guardado; cualquier cosa desconocida vuelve a automatico. */
export function parseQualitySetting(value: unknown): QualitySetting {
  return value === 'auto' || QUALITY_LEVELS.includes(value as QualityLevel) ? (value as QualitySetting) : 'auto';
}
