import type { MusicLicense, MusicTrackId } from '../../src/game/config/music.ts';
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
  relocate: {
    about: 'Recolocar una disparadora (T-021): sale de la tierra con un tirón y se vuelve a plantar con un bloop',
    pick: [impact('footstep_grass_002', { lengthMs: 240, fadeOutMs: 150, gainDb: -3 }), ui('drop_002', { delayMs: 140 })],
    alternatives: [[ui('pluck_002', { rate: 1.25 }), ui('drop_003', { delayMs: 110 })], ui('maximize_004')],
  },
  grenadeThrow: {
    about: 'Lanzar la granada (T-021): un zas de alguien que la tira y un silbido que sube',
    pick: [rpg('cloth3', { rate: 1.15 }), sfxr('jumpUp', { gainDb: -10, delayMs: 60 })],
    alternatives: [rpg('cloth1'), [rpg('clothBelt'), digital('phaserUp1', { gainDb: -8 })]],
  },
  grenadeLand: {
    about: 'Cae la granada y se enciende la mecha (T-021): golpe blando y siseo',
    pick: [impact('impactSoft_heavy_001', { gainDb: -2 }), hiss(120, 420, -7)],
    alternatives: [[impact('footstep_grass_003'), hiss(120, 420, -7)], impact('impactSoft_medium_002')],
  },
  grenadeBoom: {
    about: 'Explota la granada (T-021): más grande que la mina, con un chapoteo de granos',
    pick: [scifi('explosionCrunch_003'), scifi('lowFrequency_explosion_000', { lengthMs: 1000, fadeOutMs: 420, gainDb: -2 }), scifi('slime_001', { delayMs: 70, gainDb: -9 })],
    alternatives: [[scifi('explosionCrunch_004'), scifi('lowFrequency_explosion_001', { lengthMs: 900, fadeOutMs: 380, gainDb: -3 })], scifi('lowFrequency_explosion_000')],
  },
  iceWallRise: {
    about: 'Brota el muro de hielo (T-021): cristal que crece y cruje, con nieve',
    pick: [impact('impactGlass_medium_001', { gainDb: -2 }), ui('glass_003', { delayMs: 90, gainDb: -4 }), impact('footstep_snow_001', { gainDb: -6 })],
    alternatives: [[scifi('forceField_002', { lengthMs: 600, fadeOutMs: 300 }), impact('footstep_snow_002', { gainDb: -6 })], impact('impactGlass_heavy_001')],
  },
  iceHit: {
    about: 'Un mordisco, un escupitajo o un verso da al muro de hielo (T-021): toc de cristal (tres variantes)',
    pick: variants(impact, 'impactGlass_light', 3),
    alternatives: [impact('impactGlass_medium_002'), ui('glass_001')],
  },
  iceBreak: {
    about: 'Se rompe un bloque del muro de hielo (T-021): cristal que estalla',
    pick: [impact('impactGlass_heavy_003'), impact('impactMining_002', { gainDb: -7 })],
    alternatives: [impact('impactGlass_heavy_004'), [impact('impactGlass_heavy_000'), ui('glass_005', { delayMs: 60, gainDb: -6 })]],
  },
  iceMelt: {
    about: 'Se derrite un bloque del muro de hielo (T-021): chapoteo suave y nieve',
    pick: [scifi('slime_000', { rate: 1.3, gainDb: -6 }), impact('footstep_snow_003', { gainDb: -8 })],
    alternatives: [sfxr('fizz'), impact('footstep_snow_004')],
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
  minstrelInhale: {
    about: 'El juglar toma aire antes de su verso (T-025, F-04): un soplido que se hincha',
    pick: sfxr('inhale'),
    alternatives: [rpg('cloth1', { fadeInMs: 300, rate: 1.2, gainDb: -2 }), ui('maximize_003', { rate: 0.7, fadeInMs: 80 })],
  },
  verse: {
    about: 'El juglar suelta su verso (T-025): un punteo corto de cuerda, como un laúd',
    pick: jingle('jingles_PIZZI05'),
    alternatives: [jingle('jingles_PIZZI08'), jingle('jingles_SAX05', { gainDb: -2 })],
  },
  verseHit: {
    about: 'El verso pasa por una planta o una mina (T-025): un tintineo de cristal, bajito (si es un escudo, suena su toc de madera)',
    // Elegido de oido por Carmine (22 nov 2026).
    pick: ui('glass_001', { rate: 0.9, gainDb: -3 }),
    alternatives: [ui('pluck_002', { rate: 1.25, fadeOutMs: 60, lowpassHz: 3600 }), ui('pluck_001', { rate: 1.5 })],
  },
  clone: {
    about: 'Un copión cae y deja su copia (T-025, F-01): blip digital de copiarse',
    pick: digital('phaseJump2', { lengthMs: 320, fadeOutMs: 140 }),
    alternatives: [digital('pepSound2', { lengthMs: 320, fadeOutMs: 150 }), digital('powerUp2', { lengthMs: 320, fadeOutMs: 150, gainDb: -2 })],
  },
  hop: {
    about: 'El Skipper salta (T-038): un boing de muelle con un poco de hierba',
    pick: [sfxr('boing'), impact('footstep_grass_000', { lengthMs: 180, fadeOutMs: 120, gainDb: -8 })],
    alternatives: [digital('phaseJump1', { lengthMs: 260, fadeOutMs: 120, gainDb: -2 }), ui('maximize_006', { rate: 1.3, gainDb: -2 })],
  },
  reveal: {
    about: 'Un Lurker oculto se descubre (T-038): un destello digital que sube, con un chasquido de interferencia',
    pick: [sfxr('decloak'), ui('glitch_002', { gainDb: -8 })],
    alternatives: [scifi('forceField_001', { lengthMs: 450, fadeOutMs: 220, gainDb: -3 }), digital('phaserUp2', { lengthMs: 360, fadeOutMs: 160, gainDb: -3 })],
  },
  elkClonerTalk: {
    about: 'Elk Cloner suelta una rima en su bocadillo de pergamino (T-026): dos pitidos de Apple II',
    pick: sfxr('chirp'),
    alternatives: [jingle('jingles_PIZZI05', { lengthMs: 420, fadeOutMs: 160, gainDb: -2 }), ui('pluck_001', { rate: 0.8 })],
  },
  poemWarn: {
    about: 'Elk Cloner anuncia el poema entero (T-026, L-03): una nota que se hincha, para que se oiga venir',
    pick: [sfxr('swell'), jingle('jingles_SAX07', { rate: 0.8, gainDb: -6, fadeInMs: 300 })],
    alternatives: [sfxr('swell'), jingle('jingles_STEEL05', { rate: 0.75, fadeInMs: 200 })],
  },
  poem: {
    about: 'Elk Cloner recita el poema entero por los cinco carriles (T-026): un acorde grande de pizzicato',
    pick: [jingle('jingles_PIZZI16'), impact('impactBell_heavy_000', { gainDb: -8 })],
    alternatives: [jingle('jingles_HIT05'), jingle('jingles_PIZZI12')],
  },
  elkClonerDefeated: {
    about: 'Cae Elk Cloner (T-026): un apagón que baja y un libro que se cierra',
    pick: [digital('phaserDown3'), rpg('bookClose', { delayMs: 260, gainDb: -2 })],
    alternatives: [[digital('lowDown'), rpg('bookClose', { delayMs: 200 })], jingle('jingles_NES09')],
  },
  brainTalk: {
    about: 'Brain suelta una frase en su bocadillo de contestador (T-039): el pitido de un contestador automatico',
    pick: digital('twoTone2', { lengthMs: 420, fadeOutMs: 140, gainDb: -2 }),
    alternatives: [digital('tone1', { lengthMs: 360, fadeOutMs: 120 }), sfxr('chirp')],
  },
  brainHop: {
    about: 'Brain salta (T-039): un boing de muelle grave, mas grande que el del Skipper',
    pick: [sfxr('boing', { rate: 0.7 }), impact('footstep_concrete_000', { lengthMs: 200, fadeOutMs: 120, gainDb: -6 })],
    alternatives: [digital('phaseJump3', { rate: 0.8, lengthMs: 360, fadeOutMs: 140 }), sfxr('boing', { rate: 0.55 })],
  },
  brainLand: {
    about: 'Brain cae de un salto (T-039): un golpe de metal con un rebote de muelle',
    pick: [impact('impactMetal_light_002', { gainDb: -4 }), sfxr('boing', { rate: 1.2, gainDb: -10, delayMs: 60 })],
    alternatives: [impact('impactGeneric_light_001'), impact('impactMetal_heavy_000', { gainDb: -8 })],
  },
  brainDefeated: {
    about: 'Cae Brain (T-039): un disquete que se formatea, un apagón que baja y un chasquido de cristal',
    pick: [digital('phaserDown3'), digital('spaceTrash3', { delayMs: 180, gainDb: -4 }), impact('impactGlass_light_001', { delayMs: 320, gainDb: -6 })],
    alternatives: [[digital('lowDown'), digital('spaceTrash1', { delayMs: 150 })], sfxr('powerDown')],
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
  keystroke: {
    about: 'Una tecla mientras sale la frase de un tour (tres variantes): la pulsación de un interruptor, sin la suelta',
    // Cada interruptor de Kenney trae la pulsación (0-40 ms) y la suelta (a los 100 ms): con la pulsación sola suena a
    // tecla. Sin los agudos de arriba, para que quede de fondo.
    pick: ['switch_002', 'switch_005', 'switch_007'].map((file) => ui(file, { lengthMs: 60, fadeOutMs: 30, lowpassHz: 5000 })),
    alternatives: [ui('switch_004', { lengthMs: 60, fadeOutMs: 30 }), ui('switch_002'), ui('click_002', { lowpassHz: 5000 })],
  },
  button: {
    about: 'Botón de un menú',
    pick: ui('select_001'),
    alternatives: [ui('click_002'), ui('toggle_002')],
  },
  purchase: {
    about: 'Comprar un poder en la tienda (T-022): las semillas tintinean y suena un ta-da',
    pick: [rpg('handleCoins', { lengthMs: 520, fadeOutMs: 220, gainDb: -2 }), ui('confirmation_002', { delayMs: 160 })],
    alternatives: [[rpg('handleCoins2'), jingle('jingles_PIZZI00', { delayMs: 120, gainDb: -4 })], jingle('jingles_STEEL02')],
  },
  powerUpgrade: {
    about: 'Mejorar un poder en la tienda (T-022): arpegio que sube con un tintineo',
    pick: [ui('maximize_008'), rpg('handleCoins2', { gainDb: -8 })],
    alternatives: [ui('maximize_003'), [ui('confirmation_004'), digital('powerUp8', { gainDb: -6, delayMs: 80 })]],
  },
};

/**
 * Musica de fondo (T-015, U-01 y U-02): el original de cada pista, en `audio-lab/musica/`, y como se recorta. Licencias
 * aceptadas: CC0 o CC BY (Incompetech u OpenGameArt). `pick` va a `public/audio/musica/`; las alternativas cuyo original
 * este en `audio-lab/musica/` se oyen en `/musica.html`. Para cambiar la elegida, se mueve una alternativa a `pick`, se
 * copian su titulo, autor, licencia y `loopSeconds` a `MUSIC_TRACKS` y se pasa `npm run audio`.
 */
export interface MusicSource {
  /** Archivo original, dentro de `audio-lab/musica/`. */
  readonly file: string;
  readonly title: string;
  readonly author: string;
  readonly license: MusicLicense;
  /** Pagina de la obra, de donde se bajo. */
  readonly url: string;
  /** Instrumentos y animo, para la pagina de prueba. */
  readonly about: string;
  /** Recorte del bucle en el original, en s. Sin ellos, el archivo entero (ya es un bucle sin salto). */
  readonly loopStart?: number;
  readonly loopEnd?: number;
  /**
   * El original es una vuelta del bucle con algo detras: la cola de las ultimas notas o, en un MP3 sin datos de retraso,
   * el relleno del codificador. Lo que sigue a `loopEnd` se suma sobre el principio, como sonaria al repetirse. Asi
   * `loopEnd` es solo la duracion del bucle (compases enteros), contada desde el principio del archivo.
   */
  readonly fold?: boolean;
  /**
   * Empalme fundido, en ms: lo que sigue al final del bucle en el original baja mientras sube su principio. Para un
   * original que no es un bucle, recortado en dos puntos del mismo compas que suenan parecido.
   */
  readonly seamMs?: number;
}

export interface MusicEntry {
  /** Que ambiente es, para la pagina de prueba. */
  readonly about: string;
  readonly pick: MusicSource;
  readonly alternatives: readonly MusicSource[];
}

const KEVIN = 'Kevin MacLeod (incompetech.com)';
const incompetech = (isrc: string) => `https://incompetech.com/music/royalty-free/index.html?isrc=${isrc}`;
const oga = (page: string) => `https://opengameart.org/content/${page}`;

/**
 * Candidatas bajadas el 22 nov 2026 (15 en total: cuatro por ambiente y tres mas para la ronda; las propuso un agente por lo que dicen sus paginas,
 * sin oirlas). Los bucles se midieron con ffmpeg: el tempo de cada una (y el de Incompetech, `pieces.json`) da su
 * duracion en tiempos enteros, y en los MP3 sin datos de retraso lo que sobra se pliega sobre el principio (`fold`). Las
 * elegidas de partida son las que mejor empalman y suenan como un mismo juego; la ultima palabra es de Carmine, de oido.
 */
export const MUSIC_MANIFEST: Readonly<Record<MusicTrackId, MusicEntry>> = {
  menu: {
    about: 'Portada, Invernadero, ruta y tienda: tranquila, cálida y juguetona (marimba, madera o ukelele)',
    pick: {
      file: 'cozy-puzzle-in-game-3.ogg',
      title: 'Cozy Puzzle In-Game 3',
      author: 'mintodog',
      license: 'CC0 1.0',
      url: oga('cozy-puzzle-in-game-3'),
      about: 'Guitarra acústica, mazos y viento, a 108 BPM. Hermana de la de ronda. 56 compases justos: el archivo entero es el bucle',
    },
    alternatives: [
      {
        file: 'kalimba.ogg',
        title: 'Short kalimba loop',
        author: 'extenz',
        license: 'CC0 1.0',
        url: oga('short-kalimba-loop'),
        about: 'Kalimba, celesta y cuerdas, suave. Corta (47 s): se nota más la vuelta',
      },
      {
        file: 'carefree.mp3',
        title: 'Carefree',
        author: KEVIN,
        license: 'CC BY 4.0',
        url: incompetech('USUAN1400037'),
        about: 'Ukelele, guitarra, marimba y glockenspiel, a 96 BPM. No es un bucle: se recortan los compases 2 a 34, que se repiten',
        loopStart: 5.025057,
        loopEnd: 85.025057,
        seamMs: 250,
      },
      {
        file: 'bassa-island-game-loop.mp3',
        title: 'Bassa Island Game Loop',
        author: KEVIN,
        license: 'CC BY 4.0',
        url: incompetech('USUAN1100840'),
        about: 'Bajo, guitarra, marimba y percusión, a 125 BPM. 16 compases (31 s): muy corta',
        loopEnd: 30.72,
        fold: true,
      },
    ],
  },
  round: {
    about: 'Rondas: la misma paleta con más empuje y algo de tensión, sin cansar en 15 minutos',
    // Carmine eligio de oido Krakatoa (22 nov 2026), en vez de Cozy Puzzle In-Game 1.
    pick: {
      file: 'krakatoa.ogg',
      title: 'Krakatoa',
      author: 'Kistol',
      license: 'CC0 1.0',
      url: oga('krakatoa'),
      about: 'Marimba con percusión tribal, con empuje, a 120 BPM. 36 compases (72 s): el archivo entero es el bucle',
    },
    alternatives: [
      {
        file: 'cozy-puzzle-in-game-1.ogg',
        title: 'Cozy Puzzle In-Game 1',
        author: 'mintodog',
        license: 'CC0 1.0',
        url: oga('cozy-puzzle-in-game-1'),
        about: 'Mazos, flauta y saxo sobre un ritmo de bossa nova, a 118 BPM. 64 compases justos: el archivo entero es el bucle',
      },
      {
        file: 'happy-pixie-town.ogg',
        title: 'HitCtrl - Happy Pixie Town',
        author: 'HitCtrl',
        license: 'CC BY 3.0',
        url: oga('hitctrl-happy-pixie-town'),
        about: 'Marimba, flauta, oboe, flautín, bajo y batería con sonidos de Nintendo 64, soleada. 144 tiempos a 95 BPM',
        loopEnd: 90.94737,
        fold: true,
      },
      {
        file: 'monkeys-spinning-monkeys.mp3',
        title: 'Monkeys Spinning Monkeys',
        author: KEVIN,
        license: 'CC BY 4.0',
        url: incompetech('USUAN1400011'),
        about: 'Flautas y cuerdas en pizzicato, saltarina. Muy conocida: puede sonar a ya oída. 300 tiempos a 144 BPM',
        loopEnd: 125,
        fold: true,
      },
      // Tres mas, pedidas por Carmine el 22 nov 2026 para comparar con la elegida.
      {
        file: 'cozy-puzzle-in-game-2.ogg',
        title: 'Cozy Puzzle In-Game 2',
        author: 'mintodog',
        license: 'CC0 1.0',
        url: oga('cozy-puzzle-in-game-2'),
        about: 'Hermana de la elegida: metales, sintetizador y piano, a 90 BPM, tranquila. 48 compases justos: el archivo entero es el bucle',
      },
      {
        file: 'jaunty-gumption.mp3',
        title: 'Jaunty Gumption',
        author: KEVIN,
        license: 'CC BY 4.0',
        url: incompetech('USUAN1300017'),
        about: 'Marimba, órgano, flautas, sintetizadores y percusión, a 146 BPM: música de videojuego feliz de los 90. 288 tiempos: el archivo es un bucle',
        loopEnd: 118.356168,
        fold: true,
      },
      {
        file: 'glitter-blast.mp3',
        title: 'Glitter Blast',
        author: KEVIN,
        license: 'CC BY 4.0',
        url: incompetech('USUAN1900001'),
        about: 'Ukelele, flautas, glockenspiel y percusión, a 100 BPM. No es un bucle: se recortan los compases 35 a 67 (con su parte tranquila), que se repiten',
        loopStart: 84.165329,
        loopEnd: 160.965329,
        seamMs: 250,
      },
    ],
  },
  boss: {
    about: 'Jefes de la defensa del refugio (brotes 1 a 4): más tensa y digital, sin dejar de ser de dibujos',
    // Carmine eligio de oido la chiptune (22 nov 2026), en vez de Nano Hoedown.
    pick: {
      file: 'chipped-urgency-loop.ogg',
      title: 'Chipped urgency (combat)',
      author: 'centurionofwar',
      license: 'CC0 1.0',
      url: oga('chipped-urgencycombat'),
      about: 'Chiptune de sintetizador, urgente, a 90 BPM. 12 compases (32 s): el archivo entero es el bucle',
    },
    alternatives: [
      {
        file: 'nano-hoedown.mp3',
        title: 'Nano Hoedown',
        author: KEVIN,
        license: 'CC BY 4.0',
        url: incompetech('USUAN1500034'),
        about: 'Sintetizadores y percusión, a 150 BPM: «cuando los circuitos montan una fiesta». Intensa y con gracia. 384 tiempos',
        loopEnd: 153.6,
        fold: true,
      },
      {
        file: '8-bit-danger-strong-boss.mp3',
        title: '8-bit Danger!! Strong Boss',
        author: 'Hydrogene',
        license: 'CC0 1.0',
        url: oga('8-bit-danger-strong-boss'),
        about: '8 bits al estilo NES, de peligro. 352 tiempos a 158 BPM',
        loopEnd: 133.670884,
        fold: true,
      },
      {
        file: 'reformat.mp3',
        title: 'Reformat',
        author: KEVIN,
        license: 'CC BY 4.0',
        url: incompetech('USUAN1500020'),
        about: 'Sintetizadores con aire de fallo de vídeo de 8 bits: le pega a un virus. Larga (3:39). 512 tiempos a 140 BPM',
        loopEnd: 219.428571,
        fold: true,
      },
    ],
  },
};
