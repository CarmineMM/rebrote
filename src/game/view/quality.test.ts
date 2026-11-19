import { describe, expect, it } from 'vitest';
import { AUTO_MIN_FPS, QUALITY_LEVELS, QUALITY_PROFILES, autoDowngrade, parseQualitySetting, suggestQuality } from './quality';

describe('niveles de calidad', () => {
  it('cada nivel pinta y anima al menos tanto como el anterior', () => {
    for (let i = 1; i < QUALITY_LEVELS.length; i++) {
      const lower = QUALITY_PROFILES[QUALITY_LEVELS[i - 1]];
      const higher = QUALITY_PROFILES[QUALITY_LEVELS[i]];
      expect(higher.renderScale).toBeGreaterThanOrEqual(lower.renderScale);
      expect(higher.particles).toBeGreaterThan(lower.particles);
      expect(higher.life).toBeGreaterThanOrEqual(lower.life);
      for (const flag of ['sunRays', 'wind', 'cloudShadows', 'glows', 'extras', 'postFx'] as const) {
        if (lower[flag]) expect(higher[flag]).toBe(true);
      }
    }
  });

  it('la resolucion de Ultra cabe en una textura WebGL de 4096', () => {
    expect(1600 * QUALITY_PROFILES.ultra.renderScale).toBeLessThanOrEqual(4096);
  });
});

describe('modo automatico', () => {
  it('elige segun el equipo y nunca propone Ultra', () => {
    expect(suggestQuality({ cores: 2, memoryGb: 8, touch: false })).toBe('low');
    expect(suggestQuality({ cores: 8, memoryGb: 2, touch: false })).toBe('low');
    expect(suggestQuality({ cores: 4, memoryGb: 8, touch: false })).toBe('medium');
    expect(suggestQuality({ cores: 8, memoryGb: 8, touch: true })).toBe('medium');
    expect(suggestQuality({ cores: 16, memoryGb: 32, touch: false })).toBe('high');
    expect(suggestQuality({ touch: false })).toBe('medium');
  });

  it('baja un nivel si va lento y nunca sube', () => {
    expect(autoDowngrade('high', AUTO_MIN_FPS - 1)).toBe('medium');
    expect(autoDowngrade('medium', 20)).toBe('low');
    expect(autoDowngrade('low', 10)).toBe('low');
    expect(autoDowngrade('medium', 120)).toBe('medium');
    expect(autoDowngrade('ultra', AUTO_MIN_FPS)).toBe('ultra');
  });

  it('un ajuste guardado desconocido vuelve a automatico', () => {
    expect(parseQualitySetting('ultra')).toBe('ultra');
    expect(parseQualitySetting('auto')).toBe('auto');
    expect(parseQualitySetting('maximo')).toBe('auto');
    expect(parseQualitySetting(null)).toBe('auto');
  });
});
