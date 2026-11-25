import { describe, expect, it } from 'vitest';
import { OUTBREAKS } from '../config/balance';
import { MUSIC, MUSIC_STAGES, MUSIC_TRACKS, MUSIC_TRACK_IDS, STORY_MUSIC } from '../config/music';
import { hasMusicStage, musicFor, musicStage, type MusicRound, type MusicSituation } from './musicCues';

const board = (round: MusicRound | null, extra: Partial<MusicSituation> = {}): MusicSituation => ({
  screen: 'board',
  round,
  halted: false,
  over: false,
  ...extra,
});
const creeper = (number: number): MusicRound => ({ outbreak: 'creeper', number, bossRound: 10 });

describe('musica de fondo (T-015)', () => {
  it('en la portada y los menus suena la del menu, y se prepara la de ronda', () => {
    expect(musicFor({ screen: 'title', round: null, halted: false, over: false })).toEqual({ track: 'menu', next: 'round', level: 1 });
  });

  it('al empezar una partida suena la de ronda; en la ronda del jefe, la del jefe', () => {
    expect(musicFor(board(creeper(1))).track).toBe('round');
    expect(musicFor(board(creeper(3))).track).toBe('round');
    expect(musicFor(board(creeper(9))).track).toBe('round');
    expect(musicFor(board(creeper(10))).track).toBe('boss');
  });

  it('la del jefe se prepara una ronda antes de la suya, no antes', () => {
    expect(musicFor(board(creeper(8))).next).toBeNull();
    expect(musicFor(board(creeper(10 - MUSIC.prepareBossRounds))).next).toBe('boss');
    expect(musicFor(board(creeper(10))).next).toBeNull();
  });

  it('un brote sin jefe se queda en la de ronda', () => {
    const cue = musicFor(board({ outbreak: 'creeper', number: 10, bossRound: null }));
    expect(cue).toMatchObject({ track: 'round', next: null });
  });

  it('mientras el tablero carga y aun no hay ronda, sigue la que sonaba', () => {
    expect(musicFor(board(null), 'menu').track).toBe('menu');
    expect(musicFor(board(null), null).track).toBeNull();
  });

  it('en pausa baja sin callarse (U-03); al acabar la partida baja mas', () => {
    expect(musicFor(board(creeper(3), { halted: true })).level).toBe(MUSIC.haltedLevel);
    expect(musicFor(board(creeper(10), { over: true })).level).toBe(MUSIC.overLevel);
    expect(musicFor(board(creeper(10), { over: true, halted: true })).level).toBe(Math.min(MUSIC.haltedLevel, MUSIC.overLevel));
    expect(MUSIC.haltedLevel).toBeGreaterThan(0);
    expect(MUSIC.haltedLevel).toBeLessThan(1);
    expect(MUSIC.overLevel).toBeLessThan(1);
  });

  it('una viñeta en la portada baja la del menu', () => {
    expect(musicFor({ screen: 'title', round: null, halted: true, over: false }).level).toBe(MUSIC.haltedLevel);
  });

  it('los cuatro primeros brotes (la defensa del refugio) comparten la de ronda y la del jefe', () => {
    expect(MUSIC_STAGES[0]).toMatchObject({ outbreaks: 4, round: 'round', boss: 'boss' });
    expect(musicStage('creeper')).toBe(MUSIC_STAGES[0]);
    expect(musicStage('elkCloner')).toBe(MUSIC_STAGES[0]);
    expect(musicFor(board({ outbreak: 'elkCloner', number: 10, bossRound: 10 })).track).toBe('boss');
  });

  it('el quinto brote ya no es de la defensa: un tramo sin pistas propias usa las del ultimo', () => {
    const stages = [
      { name: 'a', outbreaks: 1, round: 'menu', boss: 'menu' },
      { name: 'b', outbreaks: 1, round: 'round', boss: 'boss' },
    ] as const;
    expect(musicStage('creeper', stages).name).toBe('a');
    expect(musicStage('elkCloner', stages).name).toBe('b');
    expect(musicStage('elkCloner', stages.slice(0, 1)).name).toBe('a');
    expect(hasMusicStage('elkCloner', stages.slice(0, 1))).toBe(false);
  });

  it('cada brote del juego tiene tramo de musica: al anadir el quinto hay que decidir la suya', () => {
    for (const outbreak of OUTBREAKS) expect(hasMusicStage(outbreak.id), outbreak.id).toBe(true);
  });

  it('cada tramo usa pistas que existen, y cada pista tiene su credito', () => {
    for (const stage of MUSIC_STAGES) {
      expect(MUSIC_TRACK_IDS).toContain(stage.round);
      expect(MUSIC_TRACK_IDS).toContain(stage.boss);
    }
    for (const id of MUSIC_TRACK_IDS) {
      const track = MUSIC_TRACKS[id];
      expect(track.title.length, id).toBeGreaterThan(0);
      expect(track.author.length, id).toBeGreaterThan(0);
      expect(track.url, id).toMatch(/^https:\/\//);
      expect(track.loopSeconds, id).toBeGreaterThan(MUSIC.crossfadeMs / 1000);
      expect(track.volume, id).toBeGreaterThan(0);
      expect(track.volume, id).toBeLessThanOrEqual(1);
    }
  });
});

describe('la musica de la historia (T-049)', () => {
  const heroic = (covered = false) => ({ track: 'heroic' as const, covered });

  it('con la cinematica en pantalla suena la heroica a volumen normal, aunque la partida acabo y el juego espera', () => {
    expect(musicFor(board(creeper(10), { over: true, halted: true, story: heroic() }))).toEqual({ track: 'heroic', next: null, level: 1 });
    expect(musicFor({ screen: 'title', round: null, halted: false, over: false, story: heroic() })).toEqual({ track: 'heroic', next: null, level: 1 });
  });

  it('tapada por la pausa o el aviso de girar, baja como en pausa', () => {
    expect(musicFor(board(creeper(10), { over: true, story: heroic(true) })).level).toBe(MUSIC.haltedLevel);
  });

  it('se prepara en la ronda del jefe si su secuencia puede salir al vencerlo; si no, nada', () => {
    expect(musicFor(board(creeper(10), { storyAhead: 'heroic' }))).toMatchObject({ track: 'boss', next: 'heroic' });
    expect(musicFor(board(creeper(10))).next).toBeNull();
  });

  it('en la portada, si toca verla al entrar al Invernadero, se prepara ella en vez de la de ronda', () => {
    expect(musicFor({ screen: 'title', round: null, halted: false, over: false, storyAhead: 'heroic' }).next).toBe('heroic');
  });

  it('la heroica es de la cinematica de la rebelion y de las viñetas que la siguen, y tiene sus creditos', () => {
    expect(STORY_MUSIC).toEqual({ rebellion: 'heroic', creeperDown: 'heroic' });
    expect(MUSIC_TRACK_IDS).toContain('heroic');
    expect(MUSIC_TRACKS.heroic.license).toMatch(/^CC/);
  });
});
