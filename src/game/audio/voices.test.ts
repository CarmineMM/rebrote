import { describe, expect, it } from 'vitest';
import { AUDIO, SFX, sfxFiles, type SfxId, type SfxSpec } from '../config/audio';
import { VoiceGate, jitteredVolume, panAt, parseVolume, pickFormat, pickVariant, pitchRate, volumeGain } from './voices';

/** Un generador fijo para que los tests no dependan del azar. */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

const specs = (changes: Partial<Record<SfxId, Partial<SfxSpec>>>) =>
  Object.fromEntries(Object.entries(SFX).map(([id, spec]) => [id, { ...spec, ...changes[id as SfxId] }])) as Record<SfxId, SfxSpec>;

describe('VoiceGate', () => {
  it('no deja sonar mas voces de las de su efecto a la vez, y deja cuando una acaba', () => {
    const gate = new VoiceGate(specs({ shot: { maxVoices: 2, minGapMs: 0 } }));
    expect(gate.allows('shot', 0)).toBe(true);
    gate.started('shot', 0, 100);
    gate.started('shot', 0, 100);
    expect(gate.allows('shot', 50)).toBe(false);
    expect(gate.allows('shot', 100)).toBe(true);
  });

  it('respeta la separacion minima entre dos arranques del mismo efecto', () => {
    const gate = new VoiceGate(specs({ hit: { maxVoices: 10, minGapMs: 50 } }));
    gate.started('hit', 1000, 20);
    expect(gate.allows('hit', 1049)).toBe(false);
    expect(gate.allows('hit', 1050)).toBe(true);
    // Otro efecto no espera por este.
    expect(gate.allows('bite', 1001)).toBe(true);
  });

  it('limita las voces del jardin entre todos los efectos, pero no las de los menus', () => {
    const gate = new VoiceGate(specs({ shot: { maxVoices: 10, minGapMs: 0 }, hit: { maxVoices: 10, minGapMs: 0 } }), 3);
    gate.started('shot', 0, 500);
    gate.started('shot', 0, 500);
    gate.started('hit', 0, 500);
    expect(gate.allows('hit', 10)).toBe(false);
    expect(gate.allows('button', 10)).toBe(true);
  });

  it('al callar un canal, sus voces dejan de contar y las del otro siguen', () => {
    const gate = new VoiceGate(specs({ mineTick: { maxVoices: 1, minGapMs: 0 }, button: { maxVoices: 1, minGapMs: 0 } }));
    gate.started('mineTick', 0, 1000);
    gate.started('button', 0, 1000);
    gate.clear('world');
    expect(gate.allows('mineTick', 10)).toBe(true);
    expect(gate.allows('button', 10)).toBe(false);
  });

  it('varios pedidos a la vez se escalonan en una rafaga corta, y lo que no cabe no suena', () => {
    const gate = new VoiceGate(specs({ shot: { maxVoices: 10, minGapMs: 40, burst: 2 } }));
    const delays: Array<number | null> = [];
    for (let i = 0; i < 5; i++) {
      const delay = gate.delay('shot', 0);
      delays.push(delay);
      if (delay !== null) gate.started('shot', delay, 100);
    }
    expect(delays).toEqual([0, 40, 80, null, null]);
  });

  it('sin rafaga, el que llega antes de la separacion minima no suena', () => {
    const gate = new VoiceGate(specs({ button: { maxVoices: 2, minGapMs: 40, burst: 0 } }));
    gate.started('button', 0, 30);
    expect(gate.delay('button', 5)).toBeNull();
    expect(gate.delay('button', 40)).toBe(0);
  });

  it('con 15 disparadoras de 3 canones disparando a la vez, suenan unas pocas voces', () => {
    // Una planta de N canones manda un solo sonido (cues.ts): 15 disparos en el mismo fotograma.
    const gate = new VoiceGate();
    let sounded = 0;
    for (let plant = 0; plant < 15; plant++) {
      const delay = gate.delay('shot', 0);
      if (delay === null) continue;
      gate.started('shot', delay, 120);
      sounded++;
    }
    expect(sounded).toBe(SFX.shot.burst + 1);
    // En un segundo de disparos repartidos, nunca pasa de su maximo de voces.
    for (let t = 0; t < 1000; t += 16) {
      for (let plant = 0; plant < 2; plant++) {
        const delay = gate.delay('shot', t);
        if (delay !== null) gate.started('shot', t + delay, 120);
      }
      expect(gate.voices('shot', t)).toBeLessThanOrEqual(SFX.shot.maxVoices);
    }
  });
});

describe('variacion', () => {
  it('el tono varia como mucho los semitonos del efecto, y sin variacion queda igual', () => {
    expect(pitchRate(0, Math.random)).toBe(1);
    expect(pitchRate(2, () => 1)).toBeCloseTo(2 ** (2 / 12));
    expect(pitchRate(2, () => 0)).toBeCloseTo(2 ** (-2 / 12));
    expect(pitchRate(2, () => 0.5)).toBeCloseTo(1);
  });

  it('el volumen varia alrededor del del efecto', () => {
    expect(jitteredVolume(0.5, 0.1, () => 1)).toBeCloseTo(0.55);
    expect(jitteredVolume(0.5, 0.1, () => 0)).toBeCloseTo(0.45);
  });

  it('nunca repite la misma variante dos veces seguidas', () => {
    const random = sequence(0, 0.3, 0.6, 0.99, 0.5, 0.1);
    let last: number | undefined;
    for (let i = 0; i < 30; i++) {
      const next = pickVariant(3, last, random);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(3);
      expect(next).not.toBe(last);
      last = next;
    }
    expect(pickVariant(1, 0, Math.random)).toBe(0);
  });
});

describe('volumen y paneo', () => {
  it('el control a 0 es silencio y a 100 es entero, con su curva', () => {
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(100)).toBe(1);
    expect(volumeGain(50, 2)).toBeCloseTo(0.25);
    expect(volumeGain(140)).toBe(1);
    expect(volumeGain(-5)).toBe(0);
  });

  it('lo de la izquierda del tablero suena a la izquierda, el centro en el centro', () => {
    expect(panAt(0, 9)).toBeCloseTo(-AUDIO.maxPan);
    expect(panAt(4.5, 9)).toBeCloseTo(0);
    expect(panAt(9, 9)).toBeCloseTo(AUDIO.maxPan);
    // Fuera del tablero (el camino, el suelo corrupto) no pasa del maximo.
    expect(panAt(-3, 9)).toBeCloseTo(-AUDIO.maxPan);
  });

  it('el volumen guardado se lee entero y dentro de 0 a 100; si no hay, el de por defecto', () => {
    expect(parseVolume(undefined)).toBe(AUDIO.defaultSfxVolume);
    expect(parseVolume('80')).toBe(AUDIO.defaultSfxVolume);
    expect(parseVolume(Number.NaN)).toBe(AUDIO.defaultSfxVolume);
    expect(parseVolume(0)).toBe(0);
    expect(parseVolume(33.6)).toBe(34);
    expect(parseVolume(250)).toBe(100);
  });
});

describe('formato y archivos', () => {
  it('OGG si el navegador lo reproduce, si no MP3', () => {
    expect(pickFormat(() => 'probably')).toBe('ogg');
    expect(pickFormat(() => 'maybe')).toBe('ogg');
    expect(pickFormat(() => '')).toBe('mp3');
  });

  it('cada efecto tiene sus archivos, con un nombre por variante', () => {
    for (const [id, spec] of Object.entries(SFX)) {
      const files = sfxFiles(id as SfxId);
      expect(files).toHaveLength(spec.variants);
      expect(new Set(files).size).toBe(files.length);
      expect(spec.volume).toBeGreaterThan(0);
      expect(spec.volume).toBeLessThanOrEqual(1);
      expect(spec.maxVoices).toBeGreaterThanOrEqual(1);
    }
  });

  it('el enemigo eliminado suena mas bajo que el disparo (S-06)', () => {
    expect(SFX.enemyKilled.volume).toBeLessThan(SFX.shot.volume);
  });
});
