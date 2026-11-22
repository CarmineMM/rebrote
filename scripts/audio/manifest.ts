import type { SfxId } from '../../src/game/config/audio.ts';
import type { RecipeName } from './sfxr.ts';

/**
 * De donde sale cada efecto de sonido (T-014, S-01 y S-02). `npm run audio` lo lee y escribe los archivos:
 * - `pick` es el elegido: va a `public/audio/` (una entrada por variante, como dice `variants` en `SFX`).
 * - `alternatives` son otras opciones para oir en la pagina de prueba (`/sonidos.html`, solo en desarrollo). Para
 *   cambiar el elegido, se mueve una alternativa a `pick` y se vuelve a pasar `npm run audio`.
 *
 * Una fuente es una capa o varias mezcladas. Las medidas de cada candidato (duracion, volumen, brillo y melodia) se
 * tomaron con ffmpeg el 20 nov 2026 para elegir sin oirlos; la ultima palabra es de Carmine, de oido.
 */

/** Paquetes de Kenney (CC0), en `audio-lab/kenney/<paquete>.zip`. */
export const KENNEY_PACKS = {
  'interface-sounds': 'Interface Sounds',
  'impact-sounds': 'Impact Sounds',
  'rpg-audio': 'RPG Audio',
  'music-jingles': 'Music Jingles',
  'sci-fi-sounds': 'Sci-Fi Sounds',
  'digital-audio': 'Digital Audio',
} as const;

export type KenneyPack = keyof typeof KENNEY_PACKS;

interface LayerOptions {
  /** Ganancia de la capa en la mezcla, en dB. */
  readonly gainDb?: number;
  /** Retraso de la capa, en ms. */
  readonly delayMs?: number;
  /** Recorte: desde donde y cuanto, en ms. */
  readonly startMs?: number;
  readonly lengthMs?: number;
  /** Fundidos de la capa, en ms (al recortar un sonido largo, para que no acabe de golpe). */
  readonly fadeInMs?: number;
  readonly fadeOutMs?: number;
  /** Velocidad: mas de 1 sube el tono y lo acorta; menos de 1 lo baja y lo alarga. */
  readonly rate?: number;
  /** Quita los agudos por encima de esta frecuencia, en Hz: suena menos chillon. */
  readonly lowpassHz?: number;
  /** Eco corto: dos rebotes, a estos ms y al doble, cada vez mas flojos. */
  readonly echoMs?: number;
}

export type Layer = ({ readonly kenney: KenneyPack; readonly file: string } | { readonly sfxr: RecipeName }) & LayerOptions;

/** Una capa sola o varias que suenan a la vez. */
export type Source = Layer | readonly Layer[];

export interface SoundEntry {
  /** Que es, para la pagina de prueba. */
  readonly about: string;
  /** El elegido: una fuente, o una por variante. */
  readonly pick: Source | readonly Source[];
  readonly alternatives: readonly Source[];
}

const ui = (file: string, options: LayerOptions = {}): Layer => ({ kenney: 'interface-sounds', file, ...options });
const impact = (file: string, options: LayerOptions = {}): Layer => ({ kenney: 'impact-sounds', file, ...options });
const rpg = (file: string, options: LayerOptions = {}): Layer => ({ kenney: 'rpg-audio', file, ...options });
const jingle = (file: string, options: LayerOptions = {}): Layer => ({ kenney: 'music-jingles', file, ...options });
const scifi = (file: string, options: LayerOptions = {}): Layer => ({ kenney: 'sci-fi-sounds', file, ...options });
const digital = (file: string, options: LayerOptions = {}): Layer => ({ kenney: 'digital-audio', file, ...options });
const sfxr = (recipe: RecipeName, options: LayerOptions = {}): Layer => ({ sfxr: recipe, ...options });

/** Varias variantes del mismo archivo de Kenney (`impactGlass_light_000`, `_001`...). */
const variants = (make: (file: string) => Layer, base: string, count: number): Layer[] =>
  Array.from({ length: count }, (_, i) => make(`${base}_${String(i).padStart(3, '0')}`));

/** Un trozo de un sonido largo de ciencia ficcion: el siseo de un propulsor. */
const hiss = (startMs: number, lengthMs: number, gainDb: number): Layer =>
  scifi('thrusterFire_000', { startMs, lengthMs, fadeInMs: 10, fadeOutMs: Math.round(lengthMs * 0.6), gainDb });

export const MANIFEST: Readonly<Record<SfxId, SoundEntry>> = {
  sow: {
    about: 'Sembrar una disparadora o una mina: un bloop con un poco de tierra',
    pick: [ui('drop_003'), impact('footstep_grass_001', { lengthMs: 260, fadeOutMs: 160, gainDb: -6 })],
    alternatives: [[impact('impactSoft_medium_001'), impact('footstep_grass_000', { lengthMs: 300, fadeOutMs: 180, gainDb: -4 })], ui('drop_002')],
  },
  shot: {
    about: 'Disparo de una disparadora normal (uno por planta, aunque tenga 3 cañones)',
    // Carmine lo pidio mas grave dos veces (20 nov 2026): al 65 % de velocidad (unos 7,5 semitonos por debajo del
    // original) y sin los agudos de arriba, que lo hacian chillon.
    pick: ui('pluck_001', { rate: 0.65, lowpassHz: 2800 }),
    alternatives: [ui('pluck_001', { rate: 0.55, lowpassHz: 2400 }), ui('pluck_001', { rate: 0.65 }), ui('pluck_001', { rate: 0.8 })],
  },
  shotFire: {
    about: 'Disparo de una disparadora de fuego: el pluck con un siseo de brasa y un eco corto',
    // Con un pequeno eco (Carmine, 20 nov 2026): lo distingue del disparo normal.
    pick: [ui('pluck_002', { echoMs: 110 }), hiss(200, 150, -8)],
    alternatives: [[ui('pluck_002', { echoMs: 70 }), hiss(200, 150, -8)], [ui('pluck_002', { echoMs: 160 }), hiss(200, 150, -8)], [ui('pluck_002'), hiss(200, 150, -8)]],
  },
  shotIce: {
    about: 'Disparo de una disparadora de hielo: un tin de cristal',
    pick: ui('glass_006'),
    alternatives: [ui('glass_005'), ui('glass_002')],
  },
  infuseFire: {
    about: 'Infundir fuego en una disparadora: soplido de llama y un tono que sube',
    // Elegido de oido por Carmine (21 nov 2026).
    pick: sfxr('firePower'),
    alternatives: [[scifi('thrusterFire_001', { startMs: 300, lengthMs: 550, fadeInMs: 80, fadeOutMs: 260, gainDb: -2 }), ui('maximize_006', { gainDb: -3 })], scifi('thrusterFire_001', { startMs: 300, lengthMs: 600, fadeInMs: 80, fadeOutMs: 300 })],
  },
  infuseIce: {
    about: 'Infundir hielo en una disparadora: cristal y un brillo que se queda',
    pick: [impact('impactGlass_light_001', { gainDb: -4 }), ui('glass_004', { delayMs: 40 })],
    alternatives: [ui('glass_004'), scifi('forceField_000', { lengthMs: 500, fadeOutMs: 250 })],
  },
  sowWall: {
    about: 'Sembrar un muro (T-024): golpe gordo de madera y un poco de tierra',
    // Elegido de oido por Carmine (22 nov 2026).
    pick: rpg('doorClose_1'),
    alternatives: [[impact('impactPlank_medium_000'), impact('footstep_grass_000', { lengthMs: 300, fadeOutMs: 180, gainDb: -6 })], [impact('impactWood_heavy_000'), impact('footstep_grass_001', { lengthMs: 260, fadeOutMs: 160, gainDb: -6 })]],
  },
  infuseShield: {
    about: 'Infundir escudo en una disparadora (T-024): golpe de madera y un brillo que sube',
    pick: [impact('impactWood_medium_001', { gainDb: -3 }), ui('maximize_006', { delayMs: 60, gainDb: -4 })],
    alternatives: [[impact('impactPlank_medium_002', { gainDb: -3 }), ui('confirmation_002', { delayMs: 50, gainDb: -4 })], scifi('forceField_000', { rate: 0.8, lengthMs: 500, fadeOutMs: 250 })],
  },
  wallHit: {
    about: 'Un mordisco o un escupitajo da a un escudo (T-024): toc de madera (tres variantes)',
    pick: variants(impact, 'impactWood_light', 3),
    alternatives: [impact('impactPlank_medium_003'), impact('footstep_wood_000')],
  },
  wallBreak: {
    about: 'Se rompe un muro (T-024): madera que se parte',
    // Elegido de oido por Carmine (22 nov 2026).
    pick: [impact('impactPlank_medium_004'), impact('impactPunch_medium_000', { gainDb: -4 })],
    alternatives: [impact('impactMining_001'), [impact('impactWood_heavy_002'), rpg('creak1', { lengthMs: 400, fadeOutMs: 250, gainDb: -6 })]],
  },
  fuse: {
    about: 'Fusionar dos disparadoras: un golpe blando y unas notas que suben',
    pick: [ui('confirmation_004'), impact('impactSoft_medium_000', { gainDb: -6 })],
    alternatives: [ui('maximize_009'), ui('open_002')],
  },
  levelUp: {
    about: 'Subir de nivel: un arpegio brillante que sube',
    pick: ui('maximize_005'),
    alternatives: [ui('confirmation_001'), digital('powerUp8')],
  },
  plantDestroyed: {
    about: 'Una planta o una mina se rompen a mordiscos: golpe sordo y hojas',
    // Elegido de oido por Carmine (21 nov 2026).
    pick: impact('impactPunch_medium_000'),
    alternatives: [[impact('impactWood_light_000'), impact('footstep_grass_000', { lengthMs: 400, fadeOutMs: 250, gainDb: -4 })], [impact('impactSoft_heavy_001'), impact('footstep_grass_002', { lengthMs: 400, fadeOutMs: 250, gainDb: -4 })]],
  },
  coin: {
    about: 'Recoger la moneda del suelo (la que se cobra sola no suena, S-05)',
    pick: rpg('handleCoins2'),
    alternatives: [sfxr('coin'), ui('confirmation_003')],
  },
  hit: {
    about: 'Semilla normal que da a un gusano (tres variantes)',
    pick: variants(impact, 'impactGeneric_light', 3),
    alternatives: [impact('impactSoft_medium_002'), sfxr('hitThud')],
  },
  hitFire: {
    about: 'Semilla de fuego que da a un gusano: golpe con chisporroteo',
    pick: [impact('impactGeneric_light_003', { gainDb: -3 }), hiss(100, 160, -4)],
    alternatives: [sfxr('fizz'), [impact('impactGeneric_light_004', { gainDb: -3 }), sfxr('fizz', { gainDb: -6 })]],
  },
  hitIce: {
    about: 'Semilla de hielo que da a un gusano: cristalito (tres variantes)',
    pick: variants(impact, 'impactGlass_light', 3),
    alternatives: [ui('glass_003'), ui('glass_001')],
  },
  hitArmor: {
    about: 'Semilla normal que da a un acorazado: metal (tres variantes)',
    pick: variants(impact, 'impactMetal_light', 3),
    alternatives: [impact('impactTin_medium_000'), scifi('impactMetal_000', { lengthMs: 400, fadeOutMs: 250 })],
  },
  bite: {
    about: 'Mordisco de un gusano a una planta o una mina: crujido (tres variantes)',
    pick: variants(impact, 'footstep_snow', 3),
    alternatives: [impact('impactPunch_medium_001'), rpg('chop')],
  },
  spit: {
    about: 'El escupidor escupe: moco',
    pick: scifi('slime_000'),
    alternatives: [ui('drop_004', { rate: 0.8 }), sfxr('spit')],
  },
  spitHit: {
    about: 'El escupitajo da a una planta: plaf',
    pick: [scifi('slime_001', { lengthMs: 350, fadeOutMs: 180 }), impact('impactSoft_medium_002', { gainDb: -6 })],
    alternatives: [ui('drop_002', { rate: 0.85 }), impact('impactSoft_medium_002')],
  },
  enemyKilled: {
    about: 'Un enemigo eliminado: pop corto de píxeles, más bajo que el disparo (S-06)',
    pick: sfxr('pixelPop'),
    alternatives: [sfxr('pixelCrunch'), digital('pepSound3', { lengthMs: 260, fadeOutMs: 120 })],
  },
  enemyEscaped: {
    about: 'Un enemigo se cuela y se pierde una vida: tres notas que bajan ("oh, oh")',
    pick: ui('question_002'),
    alternatives: [ui('error_006'), sfxr('womp')],
  },
  mineTick: {
    about: 'Tic de la cuenta atrás de una mina (uno al armarse y otro por segundo)',
    pick: ui('tick_004'),
    alternatives: [ui('tick_002'), impact('impactTin_medium_000', { lengthMs: 120, fadeOutMs: 60 })],
  },
  fireExplosion: {
    about: 'Explota la mina de fuego: crujido con un golpe grave debajo',
    pick: [scifi('explosionCrunch_000'), scifi('lowFrequency_explosion_001', { lengthMs: 800, fadeOutMs: 350, gainDb: -4 })],
    alternatives: [scifi('explosionCrunch_002'), scifi('lowFrequency_explosion_001')],
  },
  iceExplosion: {
    about: 'Estalla la mina de hielo: cristal que se rompe y brillo',
    pick: [impact('impactGlass_heavy_000'), ui('glass_004', { delayMs: 60, gainDb: -5 })],
    alternatives: [impact('impactGlass_heavy_002'), scifi('forceField_001', { lengthMs: 600, fadeOutMs: 300 })],
  },
  creeperWarn: {
    about: 'Creeper se agacha para saltar de carril: alarma digital',
    pick: sfxr('alarm'),
    alternatives: [digital('twoTone1'), digital('threeTone1')],
  },
  creeperTakeoff: {
    about: 'Creeper despega: zumbido que sube',
    pick: digital('phaserUp3'),
    alternatives: [sfxr('jumpUp'), digital('phaseJump1')],
  },
  creeperLand: {
    about: 'Creeper aterriza: golpe fuerte con temblor grave',
    pick: [impact('impactPunch_heavy_000'), scifi('lowFrequency_explosion_001', { lengthMs: 600, fadeOutMs: 300, gainDb: -6 })],
    alternatives: [impact('impactMining_000'), impact('impactPunch_heavy_001')],
  },
  creeperTalk: {
    about: 'Creeper suelta una frase en su bocadillo de terminal',
    pick: sfxr('terminal'),
    alternatives: [scifi('computerNoise_000', { lengthMs: 350, fadeOutMs: 150, gainDb: -4 }), ui('glitch_004')],
  },
  creeperRage: {
    about: 'Creeper pasa a la fase 2: gruñido digital',
    // Elegido de oido por Carmine (21 nov 2026).
    pick: sfxr('rage'),
    alternatives: [digital('zapThreeToneDown'), digital('lowRandom')],
  },
  creeperDefeated: {
    about: 'Cae Creeper: apagón que baja con un crujido',
    pick: [digital('phaserDown3'), scifi('explosionCrunch_003', { gainDb: -6 })],
    alternatives: [digital('lowDown'), sfxr('powerDown')],
  },
  attackStarted: {
    about: 'Empieza el ataque ("¡Ahí vienen!"): trino de 8 bits',
    pick: jingle('jingles_NES13'),
    alternatives: [sfxr('alarmLow'), digital('threeTone1')],
  },
  roundCleared: {
    about: 'Ronda superada: ta-da corto de pizzicato que sube',
    pick: jingle('jingles_PIZZI04'),
    alternatives: [jingle('jingles_PIZZI10'), jingle('jingles_PIZZI16')],
  },
  unlock: {
    about: 'Aviso "¡YA LO TIENES!": escala mágica que sube',
    pick: jingle('jingles_PIZZI02'),
    alternatives: [jingle('jingles_STEEL02'), jingle('jingles_SAX02')],
  },
  defeat: {
    about: 'Derrota: cuatro notas que bajan',
    pick: jingle('jingles_PIZZI07'),
    alternatives: [jingle('jingles_STEEL07'), jingle('jingles_NES00')],
  },
  victory: {
    about: 'Victoria: notas que suben con steel drum',
    pick: jingle('jingles_STEEL10'),
    alternatives: [jingle('jingles_SAX10'), jingle('jingles_STEEL16')],
  },
  voiceBoxer: {
    about: 'Boxer habla en una viñeta (T-031): un pluc grave por cada pocas letras',
    pick: ui('pluck_001', { rate: 0.78, fadeOutMs: 40 }),
    alternatives: [sfxr('voiceLow'), ui('drop_001', { rate: 0.85, lengthMs: 110, fadeOutMs: 50 })],
  },
  voicePatty: {
    about: 'Patty habla en una viñeta (T-031): un pluc agudo por cada pocas letras',
    pick: ui('pluck_001', { rate: 1.22, fadeOutMs: 30 }),
    alternatives: [sfxr('voiceHigh'), ui('pluck_002', { rate: 1.3, lengthMs: 110, fadeOutMs: 50 })],
  },
  button: {
    about: 'Botón de un menú',
    pick: ui('select_001'),
    alternatives: [ui('click_002'), ui('toggle_002')],
  },
};
