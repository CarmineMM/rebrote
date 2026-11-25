/**
 * Musica de fondo (T-015): las pistas, sus creditos y como se mezclan. El motor (`src/game/audio/music.ts`) las
 * reproduce en bucle y la regla de `musicCues.ts` decide cual toca. De donde sale cada archivo y como se recorta esta en
 * `scripts/audio/manifest.ts` (`MUSIC_MANIFEST`) y en `public/audio/musica/LICENCIAS.md`. Como los efectos (ADR-0013),
 * estos numeros no van en `balance.ts`: no cambian el juego, solo como suena.
 */

/**
 * Las pistas: una por ambiente del primer tramo (menu, ronda y jefe) y la heroica de la historia (T-049), que suena con la
 * cinematica de la rebelion. Un tramo nuevo de la historia traera las suyas.
 */
export type MusicTrackId = 'menu' | 'round' | 'boss' | 'heroic';

/** Licencias que se aceptan (U-01): sin "compartir igual" ni "no comercial", para poder monetizar. */
export type MusicLicense = 'CC0 1.0' | 'CC BY 3.0' | 'CC BY 4.0';

export const LICENSE_URLS: Readonly<Record<MusicLicense, string>> = {
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
};

export interface MusicTrack {
  /** Titulo de la obra, tal cual (es un nombre propio: no se traduce). */
  readonly title: string;
  /** Autor, como pide que se le cite. */
  readonly author: string;
  readonly license: MusicLicense;
  /** Pagina de la obra. */
  readonly url: string;
  /** Volumen propio, de 0 a 1, antes del volumen de musica del jugador. Los archivos ya vienen igualados. */
  readonly volume: number;
  /**
   * Lo que dura el bucle, en segundos: el archivo trae ademas `MUSIC.padSeconds` por cada lado (el final del bucle antes
   * del principio y el principio despues del final). `npm run audio` comprueba que cuadra con el recorte del manifiesto.
   */
  readonly loopSeconds: number;
}

/**
 * Las elegidas (U-01 y U-02, 22 nov 2026). Cambiar una es cambiar su original en `MUSIC_MANIFEST` y copiar aqui su
 * titulo, autor, licencia, pagina y duracion del bucle (`npm run audio` avisa si no cuadran).
 */
export const MUSIC_TRACKS: Readonly<Record<MusicTrackId, MusicTrack>> = {
  menu: {
    title: 'Cozy Puzzle In-Game 3',
    author: 'mintodog',
    license: 'CC0 1.0',
    url: 'https://opengameart.org/content/cozy-puzzle-in-game-3',
    volume: 0.9,
    loopSeconds: 124.444444,
  },
  round: {
    title: 'Krakatoa',
    author: 'Kistol',
    license: 'CC0 1.0',
    url: 'https://opengameart.org/content/krakatoa',
    volume: 0.85,
    loopSeconds: 72,
  },
  boss: {
    title: 'Chipped urgency (combat)',
    author: 'centurionofwar',
    license: 'CC0 1.0',
    url: 'https://opengameart.org/content/chipped-urgencycombat',
    volume: 0.85,
    loopSeconds: 32,
  },
  // T-049 (MC-08, MC-10): la de la historia. La recomendada mientras Carmine no elija otra de oido en /tests/musica.html.
  heroic: {
    title: 'Our Story Begins',
    author: 'Kevin MacLeod (incompetech.com)',
    license: 'CC BY 4.0',
    url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100856',
    volume: 0.85,
    loopSeconds: 54.418617,
  },
};

export const MUSIC_TRACK_IDS = Object.keys(MUSIC_TRACKS) as MusicTrackId[];

/** Un tramo de la historia (`04-historia.md`) y su musica: cuantos brotes seguidos abarca y sus pistas de ronda y jefe. */
export interface MusicStage {
  readonly name: string;
  readonly outbreaks: number;
  readonly round: MusicTrackId;
  readonly boss: MusicTrackId;
}

/**
 * Tramos, en orden. El primero es la defensa del refugio: los cuatro primeros brotes (Creeper, Elk Cloner, Brain y
 * Morris) comparten la musica de ronda y la del jefe. Tras el cuarto, la historia pasa al ataque y cambia el escenario:
 * ese tramo traera sus pistas (un test avisa cuando haya un brote sin tramo).
 */
export const MUSIC_STAGES: readonly MusicStage[] = [{ name: 'defense', outbreaks: 4, round: 'round', boss: 'boss' }];

/**
 * Secuencias de la historia con musica propia (T-049, MC-09): mientras se ven suena su pista a volumen normal, y en la
 * victoria sigue sonando hasta salir del tablero. La heroica, en la cinematica de la rebelion y en las viñetas del nombre
 * y del Invernadero que la siguen. Las claves son `StoryId` (`src/ui/story/stories.ts`; un test lo comprueba).
 */
export const STORY_MUSIC: Readonly<Partial<Record<string, MusicTrackId>>> = { rebellion: 'heroic', creeperDown: 'heroic' };

/** Mezcla de la musica. */
export const MUSIC = {
  /** Volumen de musica al empezar, de 0 a 100 (Opciones y Ajustes): por debajo de los efectos, de fondo. */
  defaultVolume: 50,
  /** Ganancia de la musica antes del compresor final (el mismo que los efectos), con el control al maximo. */
  gain: 0.55,
  /** Fundido entre dos pistas, en ms: la que se va baja mientras la nueva sube. */
  crossfadeMs: 1800,
  /** Fundido al callarla (volumen a 0, ninguna pista), en ms. */
  fadeOutMs: 700,
  /** Lo que tarda en bajar o subir con la pausa o al acabar la partida (constante de tiempo, en ms). */
  levelMs: 180,
  /** Fraccion del volumen con el juego esperando (menu de pausa, aviso, ficha o viñeta, U-03): baja, no se calla. */
  haltedLevel: 0.4,
  /** Fraccion del volumen con la partida acabada: deja oir la derrota o la victoria. */
  overLevel: 0.3,
  /** La pista del jefe se descarga y se prepara desde estas rondas antes de la suya. */
  prepareBossRounds: 1,
  /** Relleno de cada extremo del archivo, en s: asi el bucle empalma igual aunque el decodificador meta retraso (MP3). */
  padSeconds: 0.5,
  /** Muestras por segundo de los archivos. */
  sampleRate: 44100,
  /**
   * Version de como se fabrican los archivos (`scripts/audio/music.ts`). Va en su huella (`musicFileKey`): si cambia como
   * se fabrican sin cambiar la obra ni el bucle (otro volumen, otra calidad), se sube y quien tenga la musica guardada
   * para jugar sin conexion la vuelve a bajar.
   */
  fileVersion: 1,
  /** Carpeta de los archivos, dentro de `public/`. Va aparte de los efectos: se guarda al oirla, no al instalar (V-05). */
  folder: 'audio/musica/',
  /** Espera tras la portada antes de empezar a descargar la pista, en ms (si el navegador no avisa de que esta libre). */
  idleDelayMs: 2500,
} as const;
