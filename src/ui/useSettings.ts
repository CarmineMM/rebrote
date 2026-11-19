import { useCallback, useEffect, useRef, useState } from 'react';
import { EventBus, GameEvents } from '../game/EventBus';
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
}

const DEFAULTS: Settings = { quality: 'auto', showFps: false, fullscreen: true };
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
    };
  } catch {
    return DEFAULTS;
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
 * si tras la carga mide pocos fps, baja un nivel. Nunca sube sola.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);
  const [autoLevel, setAutoLevel] = useState<QualityLevel>(() => suggestQuality(readDevice()));
  const [fps, setFps] = useState<number | null>(null);
  const samples = useRef<number[]>([]);
  const level: QualityLevel = settings.quality === 'auto' ? autoLevel : settings.quality;

  useEffect(() => save(settings), [settings]);

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

  const update = useCallback((change: Partial<Settings>) => setSettings((current) => ({ ...current, ...change })), []);

  return { settings, update, level, autoLevel, fps };
}
