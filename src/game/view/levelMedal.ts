import { LIMITS } from '../config/balance';

/**
 * Medallita de nivel (T-003): una insignia redonda con el numero, prendida en la nuca de la disparadora
 * (arriba a la izquierda de la cabeza), lejos de los puntos del tallo. Cambia de color cada 5 niveles.
 * Medidas en pixeles de la textura de la disparadora (160 por casilla). Sin Phaser: la usan las texturas y los tests.
 */
export const MEDAL = {
  /** Lado de su textura. */
  size: 44,
  /** Radio del disco, sin las ondas del borde (que llegan a `radius + 3`). Grande para leerse en el carril del fondo. */
  radius: 16,
  /** Hacia donde queda desde el centro de la cabeza: arriba a la izquierda, en radianes (-140 grados). */
  angle: -2.44,
  /** Distancia al centro de la cabeza respecto a su radio: sobre el borde, medio fuera, como prendida. */
  onHead: 0.97,
} as const;

/**
 * Brote del Invernadero (T-023): dos hojitas prendidas en el borde de la medallita, arriba a la izquierda (fuera de la
 * cabeza, para leerse sobre el fondo), que dicen que la disparadora nacio con el nivel base comprado. Lo llevan todas las de una partida con nivel base mayor que 1 (tambien
 * las fusionadas, que nunca bajan de el). `dx`, `dy`: donde apoya su tallo respecto al centro de la medallita; `foot`, el
 * punto de apoyo dentro de su textura. Medidas en pixeles de la textura de la disparadora.
 */
export const MEDAL_SPROUT = {
  size: 28,
  dx: -6,
  dy: -12,
  foot: { x: 21, y: 24 },
} as const;

/** Colores de un tramo de la medallita: disco (luz, tono y sombra), contorno y borde del numero. */
export interface MedalPalette {
  readonly light: string;
  readonly mid: string;
  readonly dark: string;
  readonly outline: string;
}

/**
 * Bronce (2 a 4), plata (5 a 9), oro (10 a 14), rubi (15 a 19) y el nivel maximo, de cristal irisado.
 * Todas con contorno oscuro: se leen sobre la cabeza verde, la naranja y la azul muy clara del hielo.
 */
export const MEDAL_TIERS: readonly MedalPalette[] = [
  { light: '#ffe2c2', mid: '#e3965a', dark: '#a65a26', outline: '#4f250b' },
  { light: '#ffffff', mid: '#cdd6e2', dark: '#8592a6', outline: '#2f3846' },
  { light: '#fff6c0', mid: '#ffd23f', dark: '#d1920f', outline: '#6b4505' },
  { light: '#ffd3df', mid: '#ff5c80', dark: '#b3173e', outline: '#55061b' },
  { light: '#ffffff', mid: '#9fe9ff', dark: '#7a62ff', outline: '#24186b' },
];

/** La de nivel 1 no lleva medallita: asi se distinguen de un vistazo las que se han subido. */
export function showsMedal(level: number): boolean {
  return level > 1;
}

/** Lleva el brote del Invernadero (T-023): una partida con nivel base comprado y una planta con medallita. */
export function showsSprout(level: number, baseLevel: number): boolean {
  return baseLevel > 1 && showsMedal(level);
}

/** Tramo de color de la medallita: cambia en los niveles 5, 10 y 15, y el maximo tiene el suyo. */
export function medalTier(level: number): number {
  if (level >= LIMITS.maxLevel) return MEDAL_TIERS.length - 1;
  return Math.min(MEDAL_TIERS.length - 2, Math.max(0, Math.floor(level / 5)));
}

/** Centro de la medallita en la textura de una disparadora cuya cabeza esta en `head` con radio `head.r`. */
export function medalCenter(head: { x: number; y: number; r: number }): { x: number; y: number } {
  const distance = head.r * MEDAL.onHead;
  return { x: head.x + Math.cos(MEDAL.angle) * distance, y: head.y + Math.sin(MEDAL.angle) * distance };
}
