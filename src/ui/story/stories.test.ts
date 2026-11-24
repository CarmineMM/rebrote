import { describe, expect, it } from 'vitest';
import { LANGUAGES, text } from '../../i18n';
import { NICKNAME } from '../../game/playerName';
import {
  STORIES,
  STORY_ORDER,
  STORY_PROMPTS,
  asksName,
  loreOutbreak,
  loreStory,
  nameAfterStory,
  replayableStories,
  stepText,
  storiesAt,
  storyScript,
  storySteps,
  storyTitle,
  type StoryId,
} from './stories';
import { glyphs, revealTimes, typedLength, typingDuration, TYPEWRITER } from './typewriter';

describe('cuando salen las viñetas (T-031)', () => {
  it('la apertura sale al empezar el brote 1, en la preparacion de la ronda 1, si no se vio', () => {
    expect(storiesAt({ kind: 'match', outbreak: 'creeper', round: 0, phase: 'prep' }, [])).toEqual(['opening']);
    expect(storiesAt({ kind: 'match', outbreak: 'creeper', round: 0, phase: 'prep' }, ['opening'])).toEqual([]);
  });

  it('una partida cargada en otra ronda o en pleno ataque no la saca', () => {
    expect(storiesAt({ kind: 'match', outbreak: 'creeper', round: 3, phase: 'prep' }, [])).toEqual([]);
    expect(storiesAt({ kind: 'match', outbreak: 'creeper', round: 0, phase: 'attack' }, [])).toEqual([]);
  });

  it('al vencer a Creeper por primera vez, Boxer cuenta lo que pasa; la segunda vez, nada', () => {
    expect(storiesAt({ kind: 'victory', outbreak: 'creeper' }, ['opening'])).toEqual(['creeperDown']);
    expect(storiesAt({ kind: 'victory', outbreak: 'creeper' }, ['opening', 'creeperDown', 'pattyGreenhouse'])).toEqual([]);
  });

  it('en el Invernadero sale Patty la primera vez', () => {
    expect(storiesAt({ kind: 'greenhouse', defeated: ['creeper'] }, ['creeperDown'])).toEqual(['pattyGreenhouse']);
    expect(storiesAt({ kind: 'greenhouse', defeated: ['creeper'] }, ['creeperDown', 'pattyGreenhouse'])).toEqual([]);
  });

  it('quien vencio a Creeper sin ver lo de Boxer lo ve al entrar al Invernadero, antes de Patty (Y-06)', () => {
    expect(storiesAt({ kind: 'greenhouse', defeated: ['creeper'] }, [])).toEqual(['creeperDown', 'pattyGreenhouse']);
  });

  it('sin el Invernadero abierto no sale nada', () => {
    expect(storiesAt({ kind: 'greenhouse', defeated: [] }, [])).toEqual([]);
  });
});

describe('Boxer cuenta que fue cada jefe antes de su combate (T-032, VT-04)', () => {
  const at = (round: number, phase: 'prep' | 'attack' = 'prep') => ({ kind: 'match' as const, outbreak: 'creeper' as const, round, phase });

  it('sale en la preparacion de la ronda 7 del brote 1, cuando Creeper empieza a prepararse (la 8 hasta T-047)', () => {
    expect(storiesAt(at(6), ['opening'])).toEqual(['lore:creeper']);
    expect(storiesAt(at(6), ['opening', 'lore:creeper'])).toEqual([]);
  });

  it('antes no, en pleno ataque tampoco; si no se vio, en la preparacion de las siguientes hasta la del combate', () => {
    expect([0, 3, 5].flatMap((round) => storiesAt(at(round), ['opening']))).toEqual([]);
    expect(storiesAt(at(6, 'attack'), [])).toEqual([]);
    expect(storiesAt(at(7), [])).toEqual(['lore:creeper']);
    expect(storiesAt(at(8), [])).toEqual(['lore:creeper']);
  });

  it('es una sola viñeta de Boxer con su texto de cada brote, y se vuelve a ver antes de lo que cuenta al vencerlo', () => {
    expect(loreStory('creeper')).toBe('lore:creeper');
    expect(loreOutbreak('lore:creeper')).toBe('creeper');
    expect(loreOutbreak('creeperDown')).toBeNull();
    expect(loreOutbreak('lore:otro')).toBeNull();
    expect(storyScript('lore:creeper').map((step) => step.speaker)).toEqual(['boxer']);
    const order = [...STORY_ORDER];
    expect(order.indexOf('lore:creeper')).toBeGreaterThan(order.indexOf('opening'));
    expect(order.indexOf('lore:creeper')).toBeLessThan(order.indexOf('creeperDown'));
    expect(replayableStories(['creeperDown', 'lore:creeper'])).toEqual(['lore:creeper', 'creeperDown']);
  });

  it('su texto y su titulo salen de los textos de cada brote: anadir la de un jefe nuevo es anadir un texto', () => {
    const [step] = storyScript('lore:creeper');
    expect(stepText(text('es'), 'lore:creeper', step, null)).toBe(text('es').story.lore.creeper.line);
    expect(stepText(text('en'), 'lore:creeper', step, 'Ana')).toBe(text('en').story.lore.creeper.line);
    expect(storyTitle(text('es'), 'lore:creeper')).toBe('El Creeper de verdad');
    expect(storyTitle(text('en'), 'lore:creeper')).toBe('The real Creeper');
    expect(storyTitle(text('es'), 'creeperDown')).toBe('Lo que pasó');
  });
});

describe('el giro: la historia del brote 4 (T-043)', () => {
  const at = (round: number, phase: 'prep' | 'attack' = 'prep') => ({ kind: 'match' as const, outbreak: 'morris' as const, round, phase });

  it('la apertura sale al empezar el brote 4 y la de mitad en la preparacion de la ronda 5, si no se vieron', () => {
    expect(storiesAt(at(0), [])).toEqual(['morrisOpening']);
    expect(storiesAt(at(4), [])).toEqual(['morrisDebate']);
    expect(storiesAt(at(0), ['morrisOpening'])).toEqual([]);
    expect(storiesAt(at(4), ['morrisDebate'])).toEqual([]);
  });

  it('en el ataque o en otras rondas no salen: una partida cargada despues no las saca', () => {
    expect(storiesAt(at(0, 'attack'), [])).toEqual([]);
    expect(storiesAt(at(4, 'attack'), [])).toEqual([]);
    expect([1, 2, 3, 5].flatMap((round) => storiesAt(at(round), []))).toEqual([]);
  });

  it('lo que cuenta Boxer del Morris real sigue saliendo en la ronda 7, cuando se prepara, sin pisarse con las demas', () => {
    expect(storiesAt(at(6), ['morrisOpening', 'morrisDebate'])).toEqual(['lore:morris']);
  });

  it('al vencer a Morris por primera vez sale el final; la segunda vez, nada; si quedo sin ver, en el Invernadero', () => {
    expect(storiesAt({ kind: 'victory', outbreak: 'morris' }, [])).toEqual(['morrisDown']);
    expect(storiesAt({ kind: 'victory', outbreak: 'morris' }, ['morrisDown'])).toEqual([]);
    const seen = ['creeperDown', 'pattyGreenhouse'];
    expect(storiesAt({ kind: 'greenhouse', defeated: ['creeper', 'elkCloner', 'brain', 'morris'] }, seen)).toEqual(['morrisDown']);
    expect(storiesAt({ kind: 'greenhouse', defeated: ['creeper', 'elkCloner', 'brain'] }, seen)).toEqual([]);
  });

  it('se vuelven a ver en el orden de la historia, despues de las del brote 3', () => {
    const order = [...STORY_ORDER];
    expect(order.slice(-4)).toEqual(['morrisOpening', 'morrisDebate', 'lore:morris', 'morrisDown']);
    expect(order.indexOf('morrisOpening')).toBeGreaterThan(order.indexOf('lore:brain'));
    expect(order.slice(0, 4)).toEqual(['opening', 'lore:creeper', 'creeperDown', 'pattyGreenhouse']);
  });

  it('Boxer y Patty hablan en las tres; en la de mitad Patty duda', () => {
    expect(STORIES.morrisOpening.map((step) => step.speaker)).toEqual(['boxer', 'patty']);
    expect(STORIES.morrisDebate.map((step) => step.speaker)).toEqual(['boxer', 'patty', 'boxer']);
    expect(STORIES.morrisDebate.find((step) => step.speaker === 'patty')?.expression).toBe('doubtful');
    expect(STORIES.morrisDown.map((step) => step.speaker)).toEqual(['boxer', 'patty', 'patty']);
  });

  it('el final acaba con Patty: "Nos espera un largo viaje."', () => {
    const last = STORIES.morrisDown[STORIES.morrisDown.length - 1];
    expect(last.speaker).toBe('patty');
    expect(stepText(text('es'), 'morrisDown', last, 'Ana')).toBe('Nos espera un largo viaje.');
    expect(stepText(text('en'), 'morrisDown', last, 'Ana')).toBe('We have a long journey ahead.');
  });

  it('Boxer llama al jugador por su nombre al proponer salir; sin nombre, la frase se lee igual', () => {
    const [pots] = STORIES.morrisDown;
    expect(stepText(text('es'), 'morrisDown', pots, 'Carmine')).toContain('¡Coge las macetas, Carmine, que nos vamos de excursión!');
    expect(stepText(text('es'), 'morrisDown', pots, null)).toContain('¡Coge las macetas, que nos vamos de excursión!');
    expect(stepText(text('en'), 'morrisDown', pots, 'Carmine')).toContain('Grab the flowerpots, Carmine, ');
    expect(stepText(text('en'), 'morrisDown', pots, null)).toContain('Grab the flowerpots, we');
  });

  it('no preguntan nada', () => {
    expect((['morrisOpening', 'morrisDebate', 'morrisDown'] as const).some(asksName)).toBe(false);
  });
});

describe('las viñetas de cada secuencia (T-031)', () => {
  it('el guion del arranque: Boxer abre y cuenta, y Patty se presenta en el Invernadero', () => {
    expect(STORIES.opening.map((step) => step.speaker)).toEqual(['boxer']);
    expect(STORIES.creeperDown.map((step) => step.speaker)).toEqual(['boxer', 'boxer', 'boxer', 'boxer', 'boxer']);
    expect(STORIES.pattyGreenhouse.map((step) => step.speaker)).toEqual(['patty']);
  });

  it('sin nadie que pida el nombre (T-033), la viñeta que lo pregunta se salta y la secuencia sigue', () => {
    expect(storySteps('creeperDown', []).map((step) => step.id)).toEqual(['creeper', 'ai', 'chips', 'onward']);
    expect(storySteps('creeperDown', ['name']).map((step) => step.id)).toEqual(['creeper', 'ai', 'chips', 'name', 'onward']);
  });

  it('en el Invernadero se pueden volver a ver las ya vistas, en el orden de la historia (Y-05)', () => {
    expect(replayableStories([])).toEqual([]);
    expect(replayableStories(['pattyGreenhouse', 'opening', 'otra'])).toEqual(['opening', 'pattyGreenhouse']);
    const all: StoryId[] = [...STORY_ORDER];
    expect(replayableStories(all)).toEqual(all);
  });
});

describe('Boxer pregunta el nombre (T-033)', () => {
  it('lo pregunta en la viñeta 4 de la caida de Creeper, despues de explicar el mundo (NJ-01)', () => {
    expect(storySteps('creeperDown', STORY_PROMPTS).map((step) => step.id)).toEqual(['creeper', 'ai', 'chips', 'name', 'onward']);
    expect(storySteps('creeperDown', STORY_PROMPTS).find((step) => step.prompt === 'name')?.id).toBe('name');
    expect(STORY_ORDER.filter(asksName)).toEqual(['creeperDown']);
  });

  it('al acabar o saltar esa secuencia sin nombre, Boxer le pone el apodo: nunca queda sin nombre (NJ-02)', () => {
    expect(nameAfterStory('creeperDown', null)).toBe(NICKNAME);
  });

  it('con nombre (escrito en la viñeta o en Opciones) no se cambia; las demas secuencias no tocan el nombre', () => {
    expect(nameAfterStory('creeperDown', 'Ana')).toBeNull();
    expect(nameAfterStory('opening', null)).toBeNull();
    expect(nameAfterStory('pattyGreenhouse', null)).toBeNull();
  });

  it('las viñetas siguientes le llaman por su nombre, tambien por el apodo', () => {
    const onward = STORIES.creeperDown.find((step) => step.id === 'onward');
    const hello = STORIES.pattyGreenhouse[0];
    if (!onward) throw new Error('falta la viñeta 5');
    expect(stepText(text('es'), 'creeperDown', onward, 'Carmine')).toMatch(/^Pues esto no ha terminado, Carmine\. /);
    expect(stepText(text('es'), 'creeperDown', onward, NICKNAME)).toMatch(/^Pues esto no ha terminado, Rookie\. /);
    expect(stepText(text('en'), 'creeperDown', onward, NICKNAME)).toMatch(/^Well, this isn't over, Rookie\. /);
    expect(stepText(text('es'), 'pattyGreenhouse', hello, 'Carmine')).toMatch(/^¿Así que tú eres quien ha parado a Creeper, Carmine\? Soy Patty\./);
    expect(stepText(text('en'), 'pattyGreenhouse', hello, 'Carmine')).toMatch(/^So you're the one who stopped Creeper, Carmine\? I'm Patty\./);
    expect(stepText(text('es'), 'pattyGreenhouse', hello, null)).toMatch(/^¿Así que tú eres quien ha parado a Creeper\? Soy Patty\./);
  });

  it('el nombre va como dato dentro de la frase: nada se interpreta', () => {
    const onward = STORIES.creeperDown.find((step) => step.id === 'onward');
    if (!onward) throw new Error('falta la viñeta 5');
    expect(stepText(text('es'), 'creeperDown', onward, '<b>$&</b>')).toContain(', <b>$&</b>. ');
  });
});

describe('los textos de las viñetas (T-031)', () => {
  it.each(LANGUAGES)('%s: cada viñeta tiene su texto, y cada secuencia su titulo', (language) => {
    const t = text(language);
    for (const id of STORY_ORDER) {
      expect(storyTitle(t, id)).toBeTruthy();
      for (const step of storyScript(id)) expect(stepText(t, id, step, null).length, `${id}.${step.id}`).toBeGreaterThan(10);
    }
  });

  it('sin nombre, Boxer sigue sin llamarle de ninguna forma; con nombre, lo usa', () => {
    const onward = STORIES.creeperDown.find((step) => step.id === 'onward');
    if (!onward) throw new Error('falta la viñeta 5');
    expect(stepText(text('es'), 'creeperDown', onward, null)).toMatch(/^Pues esto no ha terminado\. /);
    expect(stepText(text('es'), 'creeperDown', onward, 'Carmine')).toMatch(/^Pues esto no ha terminado, Carmine\. /);
    expect(stepText(text('en'), 'creeperDown', onward, null)).toMatch(/^Well, this isn't over\. /);
  });
});

describe('el texto sale letra a letra (T-031, Y-07)', () => {
  it('la primera letra sale enseguida y cada una tarda lo mismo', () => {
    expect(revealTimes('abc')).toEqual([0, TYPEWRITER.msPerChar, 2 * TYPEWRITER.msPerChar]);
    expect(typedLength('abc', 0)).toBe(1);
    expect(typedLength('abc', TYPEWRITER.msPerChar)).toBe(2);
    expect(typedLength('abc', 10_000)).toBe(3);
  });

  it('tras un punto o una coma seguidos de espacio hay una pausa; dentro de un numero no', () => {
    const times = revealTimes('Hola. Ya');
    expect(times[6] - times[5]).toBe(TYPEWRITER.msPerChar);
    expect(times[5] - times[4]).toBe(TYPEWRITER.msPerChar + TYPEWRITER.pauseMs['.']);
    const decimal = revealTimes('1.5');
    expect(decimal[2] - decimal[1]).toBe(TYPEWRITER.msPerChar);
  });

  it('las letras con tilde y los emojis cuentan como una', () => {
    expect(glyphs('ñandú 🌱')).toHaveLength(7);
    expect(typingDuration('🌱🌱')).toBe(TYPEWRITER.msPerChar);
    expect(typingDuration('')).toBe(0);
  });
});
