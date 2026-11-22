/**
 * Recetas de jsfxr (T-014, S-01): lo digital de los virus y de Creeper. Cada receta cambia solo lo que se aparta de los
 * valores de `new Params()` de jsfxr. Para afinarla de oido: `npm run audio` escribe en `public/audio/LICENCIAS.md` un
 * enlace a sfxr.me con cada una; alli se cambia, se pulsa "serialize" y se copian aqui los valores que cambien.
 *
 * Que hace cada valor (todos van de 0 a 1, salvo los marcados con ±, que van de -1 a 1):
 * - `wave_type`: 0 cuadrada, 1 diente de sierra, 2 senoidal, 3 ruido.
 * - `p_env_attack`, `p_env_sustain`, `p_env_decay`: duracion de cada tramo (al cuadrado: 0,3 son unos 0,2 s).
 *   `p_env_punch`: golpe al empezar el tramo sostenido.
 * - `p_base_freq`: tono de partida (0,3 son unos 320 Hz; 0,5, unos 880 Hz). `p_freq_ramp` (±): sube o baja el tono.
 * - `p_arp_mod` (±) y `p_arp_speed`: salto de tono a mitad del sonido. `p_repeat_speed`: lo repite (0 no repite).
 * - `p_vib_strength`, `p_vib_speed`: vibrato. `p_duty`: forma de la cuadrada.
 * - `p_lpf_freq` (1 es sin filtro) y `p_hpf_freq` (0 es sin filtro): quitan agudos o graves.
 */

export interface SfxrRecipe {
  readonly about: string;
  readonly params: Readonly<Record<string, number>>;
}

export const RECIPES = {
  pixelPop: {
    about: 'Pop corto de píxeles que baja de tono, con un saltito: un virus que se deshace',
    params: {
      wave_type: 0,
      p_env_attack: 0,
      p_env_sustain: 0.06,
      p_env_punch: 0.45,
      p_env_decay: 0.22,
      p_base_freq: 0.62,
      p_freq_ramp: -0.38,
      p_arp_mod: 0.45,
      p_arp_speed: 0.55,
      p_duty: 0.35,
      p_lpf_freq: 0.85,
      p_hpf_freq: 0.08,
    },
  },
  pixelCrunch: {
    about: 'Crujido digital de ruido, muy corto',
    params: { wave_type: 3, p_env_sustain: 0.05, p_env_punch: 0.5, p_env_decay: 0.18, p_base_freq: 0.55, p_freq_ramp: -0.3, p_lpf_freq: 0.75 },
  },
  fireShot: {
    about: 'Fsss corto de ruido calido: semilla de fuego',
    params: { wave_type: 3, p_env_sustain: 0.03, p_env_punch: 0.35, p_env_decay: 0.17, p_base_freq: 0.36, p_freq_ramp: -0.2, p_lpf_freq: 0.55, p_hpf_freq: 0.05 },
  },
  fizz: {
    about: 'Chisporroteo agudo: algo que se quema',
    params: { wave_type: 3, p_env_sustain: 0.06, p_env_punch: 0.2, p_env_decay: 0.2, p_base_freq: 0.78, p_freq_ramp: -0.05, p_hpf_freq: 0.3 },
  },
  hitThud: {
    about: 'Golpe corto y sordo de ruido',
    params: { wave_type: 3, p_env_sustain: 0.03, p_env_punch: 0.4, p_env_decay: 0.13, p_base_freq: 0.25, p_freq_ramp: -0.3, p_lpf_freq: 0.6 },
  },
  alarm: {
    about: 'Alarma digital que repite dos tonos: Creeper se prepara para saltar',
    params: {
      wave_type: 0,
      p_env_sustain: 0.45,
      p_env_decay: 0.25,
      p_base_freq: 0.48,
      p_arp_mod: 0.3,
      p_arp_speed: 0.7,
      p_repeat_speed: 0.45,
      p_duty: 0.5,
      p_lpf_freq: 0.8,
    },
  },
  alarmLow: {
    about: 'Sirena grave que sube: empieza el ataque',
    params: { wave_type: 1, p_env_attack: 0.1, p_env_sustain: 0.4, p_env_decay: 0.3, p_base_freq: 0.3, p_freq_ramp: 0.12, p_vib_strength: 0.3, p_vib_speed: 0.55, p_lpf_freq: 0.6 },
  },
  jumpUp: {
    about: 'Bwoop que sube: despegue',
    params: { wave_type: 0, p_env_sustain: 0.25, p_env_decay: 0.22, p_base_freq: 0.3, p_freq_ramp: 0.28, p_duty: 0.4, p_lpf_freq: 0.9 },
  },
  terminal: {
    about: 'Pitidos de terminal antiguo: Creeper habla',
    params: {
      wave_type: 0,
      p_env_sustain: 0.28,
      p_env_decay: 0.1,
      p_base_freq: 0.55,
      p_arp_mod: 0.5,
      p_arp_speed: 0.75,
      p_repeat_speed: 0.52,
      p_duty: 0.6,
      p_lpf_freq: 0.7,
      p_hpf_freq: 0.05,
    },
  },
  rage: {
    about: 'Gruñido digital que baja y vibra: Creeper se enfada',
    params: { wave_type: 1, p_env_sustain: 0.4, p_env_punch: 0.3, p_env_decay: 0.35, p_base_freq: 0.35, p_freq_ramp: -0.15, p_vib_strength: 0.5, p_vib_speed: 0.7, p_lpf_freq: 0.55 },
  },
  powerDown: {
    about: 'Apagón largo que baja: Creeper desconectado',
    params: { wave_type: 0, p_env_sustain: 0.4, p_env_decay: 0.5, p_base_freq: 0.6, p_freq_ramp: -0.25, p_vib_strength: 0.2, p_vib_speed: 0.4, p_pha_offset: 0.15, p_pha_ramp: -0.05, p_lpf_freq: 0.8 },
  },
  womp: {
    about: 'Womp triste que baja: se pierde una vida',
    params: { wave_type: 1, p_env_sustain: 0.3, p_env_decay: 0.3, p_base_freq: 0.3, p_freq_ramp: -0.25, p_lpf_freq: 0.5 },
  },
  coin: {
    about: 'La moneda de siempre de sfxr: dos notas que suben',
    params: { wave_type: 1, p_env_sustain: 0.05, p_env_punch: 0.45, p_env_decay: 0.3, p_base_freq: 0.6, p_arp_mod: 0.4, p_arp_speed: 0.6 },
  },
  spit: {
    about: 'Ptu de ruido que sube un poco',
    params: { wave_type: 3, p_env_sustain: 0.04, p_env_punch: 0.3, p_env_decay: 0.2, p_base_freq: 0.42, p_freq_ramp: 0.15, p_lpf_freq: 0.5 },
  },
  firePower: {
    about: 'Subida con soplido: algo prende',
    params: { wave_type: 3, p_env_attack: 0.12, p_env_sustain: 0.25, p_env_decay: 0.35, p_base_freq: 0.2, p_freq_ramp: 0.22, p_lpf_freq: 0.5, p_lpf_ramp: 0.15 },
  },
  inhale: {
    about: 'Soplido que se hincha de grave a agudo: el juglar toma aire antes del verso (T-025)',
    params: { wave_type: 3, p_env_attack: 0.38, p_env_sustain: 0.12, p_env_decay: 0.12, p_base_freq: 0.24, p_freq_ramp: 0.12, p_lpf_freq: 0.22, p_lpf_ramp: 0.2, p_hpf_freq: 0.06 },
  },
  voiceLow: {
    about: 'Bip corto y grave de cuadrada suave: una silaba de Boxer en las viñetas',
    params: { wave_type: 0, p_env_sustain: 0.05, p_env_punch: 0.2, p_env_decay: 0.09, p_base_freq: 0.26, p_freq_ramp: -0.05, p_duty: 0.45, p_lpf_freq: 0.5, p_hpf_freq: 0.04 },
  },
  voiceHigh: {
    about: 'Bip corto y agudo de cuadrada suave: una silaba de Patty en las viñetas',
    params: { wave_type: 0, p_env_sustain: 0.04, p_env_punch: 0.2, p_env_decay: 0.08, p_base_freq: 0.4, p_freq_ramp: 0.04, p_duty: 0.35, p_lpf_freq: 0.6, p_hpf_freq: 0.05 },
  },
} satisfies Record<string, SfxrRecipe>;

export type RecipeName = keyof typeof RECIPES;
