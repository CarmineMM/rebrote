import { useCallback, useEffect, useRef, useState } from 'react';
import { parseVolume } from '../game/audio/voices';
import { AUDIO } from '../game/config/audio';
import { MUSIC } from '../game/config/music';
import { EventBus, GameEvents } from '../game/EventBus';
import { detectLanguage, parseLanguage, setLanguage, type Language } from '../i18n';
import {
  autoDowngrade,
  parseQualitySetting,
  suggestQuality,
  type DeviceInfo,
  type QualityLevel,
  type QualitySetting,
} from '../game/view/quality';

export interface Settings {
  quality: QualitySetting;
  showFps: boolean;
  /** Preferencia de pantalla completa (ADR-0007). Por defecto si. */
  fullscreen: boolean;
  /** Idioma del juego (T-011). Por defecto, el del navegador si es espanol o ingles; si no, ingles. */
  language: Language;
  /** Tours de ayuda (T-013): ensenan cada cosa nueva la primera vez. Por defecto si. */
  help: boolean;
  /** Volumen de los efectos de sonido (T-014), de 0 a 100. Con 0 no suena nada. Lo guardado antes de T-014 no lo trae. */
  sfxVolume: number;
  /** Volumen de la musica (T-015), de 0 a 100. Con 0 no se descarga ni suena ninguna pista. Lo guardado antes no lo trae. */
  musicVolume: number;
}

/** Idiomas preferidos del navegador, del mas al menos preferido. */
function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language ?? ''];
}

const defaults = (): Settings => ({
  quality: 'auto',
  showFps: false,
  fullscreen: true,
  language: detectLanguage(browserLanguages()),
  help: true,
  sfxVolume: AUDIO.defaultSfxVolume,
  musicVolume: MUSIC.defaultVolume,
});
const STORAGE_KEY = 'rebrote.ajustes';
/** Segundos que se ignoran tras crear el juego (carga de texturas) y segundos que se miden despues. */
const WARMUP_SAMPLES = 3;
const MEASURE_SAMPLES = 5;

/** Preferencias de este navegador; si el almacenamiento falla, se usan los valores por defecto. */
function load(): Settings {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>;
    return {
      quality: parseQualitySetting(data.quality),
      showFps: data.showFps === true,
      fullscreen: data.fullscreen !== false,
      language: parseLanguage(data.language) ?? detectLanguage(browserLanguages()),
      help: data.help !== false,
      sfxVolume: parseVolume(data.sfxVolume),
      musicVolume: parseVolume(data.musicVolume, MUSIC.defaultVolume),
    };
  } catch {
    return defaults();
  }
}

function save(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Sin almacenamiento (ventana privada, permisos): el ajuste dura solo esta sesion.
  }
}

function readDevice(): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    cores: nav.hardwareConcurrency || undefined,
    memoryGb: nav.deviceMemory,
    touch: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  };
}

/**
 * Ajustes del jugador. La calidad en modo automatico (ADR-0006) empieza segun el equipo y,
 * si tras la carga mide pocos fps, baja un nivel. Nunca sube sola. El idioma se aplica en el acto a todo el juego
 * (`setLanguage`), antes de que React vuelva a pintar y de que se recree el juego con los textos nuevos.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const loaded = load();
    setLanguage(loaded.language);
    return loaded;
  });
  const [autoLevel, setAutoLevel] = useState<QualityLevel>(() => suggestQuality(readDevice()));
  const [fps, setFps] = useState<number | null>(null);
  const samples = useRef<number[]>([]);
  const level: QualityLevel = settings.quality === 'auto' ? autoLevel : settings.quality;

  useEffect(() => save(settings), [settings]);

  // Lectores de pantalla y traductores del navegador: la pagina dice en que idioma esta.
  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  // Cada nivel nuevo recrea el juego: se vuelve a medir desde cero.
  useEffect(() => {
    samples.current = [];
  }, [level]);

  useEffect(() => {
    const onFps = (value: number) => {
      setFps(value);
      if (settings.quality !== 'auto') return;
      const list = samples.current;
      list.push(value);
      if (list.length !== WARMUP_SAMPLES + MEASURE_SAMPLES) return;
      const measured = list.slice(WARMUP_SAMPLES).sort((a, b) => a - b);
      const median = measured[Math.floor(measured.length / 2)];
      setAutoLevel((current) => autoDowngrade(current, median));
    };
    EventBus.on(GameEvents.fpsSampled, onFps);
    return () => {
      EventBus.off(GameEvents.fpsSampled, onFps);
    };
  }, [settings.quality]);

  const update = useCallback((change: Partial<Settings>) => {
    if (change.language) setLanguage(change.language);
    setSettings((current) => ({ ...current, ...change }));
  }, []);

  return { settings, update, level, autoLevel, fps };
}
