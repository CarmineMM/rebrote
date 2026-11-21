import { describe, expect, it } from 'vitest';
import { LANGUAGES, text } from '../../i18n';
import { NICKNAME } from '../../game/playerName';
import { STORIES, STORY_ORDER, STORY_PROMPTS, asksName, nameAfterStory, replayableStories, stepText, storiesAt, storySteps, type StoryId } from './stories';
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
      expect(t.story.titles[id]).toBeTruthy();
      for (const step of STORIES[id]) expect(stepText(t, id, step, null).length, `${id}.${step.id}`).toBeGreaterThan(10);
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
