/**
 * Efectos de sonido (T-014, ADR-0013): cada efecto, su volumen y cuanto puede repetirse. El modulo de audio
 * (`src/game/audio/`) los reproduce; de donde sale cada archivo esta en `scripts/audio/manifest.ts` y en
 * `public/audio/LICENCIAS.md`. Los numeros de mezcla van aqui, no en `balance.ts`: no cambian el juego, solo como suena.
 */

/** Por donde suena: lo del jardin se calla con la pausa; lo de los menus no. */
export type SfxBus = 'world' | 'ui';

export type SfxId =
  // Plantas y lo que hace el jugador
  | 'sow'
  | 'shot'
  | 'shotFire'
  | 'shotIce'
  | 'infuseFire'
  | 'infuseIce'
  // Escudo (T-024): sembrar el muro, infundirlo, lo que le da y el muro que se rompe
  | 'sowWall'
  | 'infuseShield'
  | 'wallHit'
  | 'wallBreak'
  | 'fuse'
  | 'levelUp'
  | 'plantDestroyed'
  | 'coin'
  // Combate
  | 'hit'
  | 'hitFire'
  | 'hitIce'
  | 'hitArmor'
  | 'bite'
  | 'spit'
  | 'spitHit'
  | 'enemyKilled'
  | 'enemyEscaped'
  // Minas
  | 'mineTick'
  | 'fireExplosion'
  | 'iceExplosion'
  // Creeper (T-008)
  | 'creeperWarn'
  | 'creeperTakeoff'
  | 'creeperLand'
  | 'creeperTalk'
  | 'creeperRage'
  | 'creeperDefeated'
  // Tropas del brote 2 (T-025): el juglar toma aire, suelta su verso y el verso da a lo sembrado; un copion deja su copia
  | 'minstrelInhale'
  | 'verse'
  | 'verseHit'
  | 'clone'
  // Tropas del brote 3 (T-038): el Skipper salta y un Lurker oculto se descubre
  | 'hop'
  | 'reveal'
  // Elk Cloner (T-026): su voz en el bocadillo, el aviso del poema entero, el poema y su derrota
  | 'elkClonerTalk'
  | 'poemWarn'
  | 'poem'
  | 'elkClonerDefeated'
  // Poderes (T-021): recolocar; la granada que se lanza, cae y explota; el muro de hielo que brota, lo que le da, el bloque
  // que se rompe y el que se derrite
  | 'relocate'
  | 'grenadeThrow'
  | 'grenadeLand'
  | 'grenadeBoom'
  | 'iceWallRise'
  | 'iceHit'
  | 'iceBreak'
  | 'iceMelt'
  // Tienda (T-022): comprar un poder y mejorarlo
  | 'purchase'
  | 'powerUpgrade'
  // Rondas y partida
  | 'attackStarted'
  | 'roundCleared'
  | 'unlock'
  | 'defeat'
  | 'victory'
  // Viñetas de la historia (T-031)
  | 'voiceBoxer'
  | 'voicePatty'
  // Tours (T-013): el teclado que suena mientras sale la frase del bocadillo
  | 'keystroke'
  // Menus
  | 'button';

export interface SfxSpec {
  readonly bus: SfxBus;
  /** Volumen propio, de 0 a 1, antes del volumen de efectos del jugador. Los archivos ya vienen igualados (ADR-0013). */
  readonly volume: number;
  /** Cuantos pueden sonar a la vez. Si ya suenan todos, el nuevo no suena (nunca se corta uno que suena). */
  readonly maxVoices: number;
  /** Separacion minima entre dos arranques, en ms. */
  readonly minGapMs: number;
  /**
   * Cuantos mas pueden sonar escalonados (cada uno `minGapMs` despues del anterior) si se piden a la vez: diez plantas
   * que disparan en el mismo instante suenan como una rafaga corta de unas pocas voces, no como diez iguales (T-014).
   * Lo que llega cuando ya no cabe, no suena. Con 0, el que llega antes de la separacion minima no suena.
   */
  readonly burst: number;
  /** Variacion de tono al azar en cada repeticion, en semitonos hacia arriba o hacia abajo. */
  readonly pitchJitter: number;
  /** Archivos distintos del mismo efecto (`<id>-1`, `<id>-2`...): cada vez suena uno, sin repetir el ultimo. */
  readonly variants: number;
}

const world = (volume: number, maxVoices: number, minGapMs: number, pitchJitter: number, variants = 1, burst = 2): SfxSpec => ({
  bus: 'world',
  volume,
  maxVoices,
  minGapMs,
  burst,
  pitchJitter,
  variants,
});

/** Los de los menus no se escalonan: un clic que llega dos veces (etiqueta y casilla) suena una. */
const ui = (volume: number, maxVoices = 1, minGapMs = 0): SfxSpec => ({ bus: 'ui', volume, maxVoices, minGapMs, burst: 0, pitchJitter: 0, variants: 1 });

/**
 * Voz de un personaje en las viñetas (T-031): suena con el juego en pausa detras (va por el canal de los menus), corta,
 * de una en una y con algo de variacion de tono para que parezca que habla.
 */
const voice = (volume: number): SfxSpec => ({ bus: 'ui', volume, maxVoices: 1, minGapMs: 70, burst: 0, pitchJitter: 1.5, variants: 1 });

/**
 * Tecla del teclado mientras sale la frase de un tour: muy baja, como de fondo, y con un poco de variacion de tono para que
 * no suene a metralleta. Va por el canal de los menus (el tour para el juego) y de una en una.
 */
const keys = (volume: number): SfxSpec => ({ bus: 'ui', volume, maxVoices: 2, minGapMs: 55, burst: 0, pitchJitter: 1, variants: 3 });

/**
 * Lo que mas se repite (disparos e impactos) va bajo, corto y con pocas voces; lo que pasa de vez en cuando (explosiones,
 * Creeper, rondas) va mas alto. El enemigo eliminado suena mas bajo que el disparo (S-06).
 */
export const SFX: Readonly<Record<SfxId, SfxSpec>> = {
  sow: world(0.7, 2, 60, 1),
  shot: world(0.34, 4, 45, 1.2),
  shotFire: world(0.36, 4, 45, 1.2),
  shotIce: world(0.32, 4, 45, 1.2),
  infuseFire: world(0.75, 2, 80, 0.5),
  infuseIce: world(0.7, 2, 80, 0.5),
  sowWall: world(0.75, 2, 60, 1),
  infuseShield: world(0.75, 2, 80, 0.5),
  wallHit: world(0.4, 2, 120, 1, 3),
  wallBreak: world(0.7, 2, 120, 0.8),
  fuse: world(0.8, 2, 0, 0),
  levelUp: world(0.7, 2, 0, 0),
  plantDestroyed: world(0.6, 2, 120, 1),
  coin: world(0.7, 3, 50, 0.6),
  hit: world(0.3, 3, 50, 1.5, 3),
  hitFire: world(0.28, 3, 60, 1.5),
  hitIce: world(0.3, 3, 60, 1.5, 3),
  hitArmor: world(0.32, 2, 80, 1.5, 3),
  bite: world(0.45, 2, 120, 1, 3),
  spit: world(0.45, 2, 100, 1),
  spitHit: world(0.42, 2, 100, 1),
  enemyKilled: world(0.28, 2, 90, 1.5),
  enemyEscaped: world(0.75, 1, 200, 0, 1, 0),
  mineTick: world(0.55, 3, 0, 0),
  fireExplosion: world(0.85, 2, 80, 0.8),
  iceExplosion: world(0.8, 2, 80, 0.8),
  creeperWarn: world(0.6, 1, 0, 0),
  creeperTakeoff: world(0.65, 1, 0, 0),
  creeperLand: world(0.85, 1, 0, 0),
  creeperTalk: world(0.45, 1, 300, 0.5, 1, 0),
  creeperRage: world(0.8, 1, 0, 0),
  creeperDefeated: world(0.9, 1, 0, 0),
  // Un verso cruza varias plantas seguidas: su golpe va bajo, corto y con pocas voces.
  minstrelInhale: world(0.45, 2, 150, 0.8),
  verse: world(0.55, 2, 150, 1),
  verseHit: world(0.3, 3, 70, 1.5),
  clone: world(0.45, 2, 90, 1.2),
  // El Skipper salta cada poco: bajo, con pocas voces y con variacion de tono para que no canse.
  hop: world(0.3, 2, 110, 2),
  reveal: world(0.5, 2, 140, 1),
  elkClonerTalk: world(0.45, 1, 300, 0.5, 1, 0),
  poemWarn: world(0.7, 1, 0, 0),
  poem: world(0.85, 1, 0, 0),
  elkClonerDefeated: world(0.9, 1, 0, 0),
  relocate: world(0.75, 1, 0, 0.5),
  grenadeThrow: world(0.6, 1, 0, 0.8),
  grenadeLand: world(0.6, 1, 0, 0.5),
  grenadeBoom: world(0.95, 1, 0, 0.5),
  iceWallRise: world(0.75, 1, 0, 0.3),
  iceHit: world(0.4, 2, 120, 1, 3),
  iceBreak: world(0.7, 2, 120, 0.8),
  iceMelt: world(0.45, 2, 120, 1),
  attackStarted: world(0.55, 1, 0, 0),
  roundCleared: world(0.6, 1, 0, 0),
  unlock: ui(0.6),
  defeat: ui(0.7),
  victory: ui(0.7),
  voiceBoxer: voice(0.4),
  voicePatty: voice(0.36),
  keystroke: keys(0.16),
  button: ui(0.45, 2, 40),
  purchase: ui(0.65, 1, 120),
  powerUpgrade: ui(0.6, 1, 120),
};

export const SFX_IDS = Object.keys(SFX) as SfxId[];

/** Mezcla general. */
export const AUDIO = {
  /** Volumen de efectos al empezar, de 0 a 100 (Opciones y Ajustes). */
  defaultSfxVolume: 70,
  /**
   * Curva del control de volumen: ganancia = (valor / 100) ^ curva. Con 2, el control a la mitad suena a la cuarta parte
   * de la potencia, que el oido oye mas o menos como "la mitad".
   */
  volumeCurve: 2,
  /** Voces del jardin sonando a la vez como mucho, entre todos los efectos. */
  maxWorldVoices: 14,
  /** Variacion de volumen al azar en cada repeticion (fraccion, hacia arriba o hacia abajo). */
  volumeJitter: 0.1,
  /**
   * Lo que puede esperar un sonido a que su archivo acabe de decodificarse, en ms. Pasa con el primer clic del jugador,
   * que crea el contexto de audio: el aviso de la ronda 1 llega enseguida y si no esperase no sonaria.
   */
  lateMs: 300,
  /** Fundido al callar el jardin (pausa) o al cortar una voz al salir, en ms: sin chasquidos. */
  fadeMs: 40,
  /** Paneo estereo maximo, de 0 a 1: el carril de la izquierda suena algo a la izquierda y el de la derecha, a la derecha. */
  maxPan: 0.45,
  /** Ganancia antes del compresor: deja margen a la suma de voces. */
  masterGain: 1,
  /** Compresor al final de la mezcla: muchas voces juntas no saturan ni chasquean. */
  compressor: { thresholdDb: -16, kneeDb: 10, ratio: 4, attackMs: 3, releaseMs: 180 },
  /** Carpeta de los archivos, dentro de `public/`. */
  folder: 'audio/',
} as const;

/** Nombre de archivo (sin extension) de cada variante de un efecto. */
export function sfxFiles(id: SfxId): string[] {
  const { variants } = SFX[id];
  return variants === 1 ? [id] : Array.from({ length: variants }, (_, i) => `${id}-${i + 1}`);
}
