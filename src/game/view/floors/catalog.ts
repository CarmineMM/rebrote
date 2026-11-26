import { BEDS_FLOOR } from './beds';
import type { FloorDesign } from './design';
import { LEGACY_FLOOR } from './legacy';
import { PATIO_FLOOR } from './patio';
import { ROOTS_FLOOR } from './roots';

/**
 * Todos los suelos del tablero (T-050): el de siempre y las tres propuestas. Solo lo usan la galeria de desarrollo
 * (`/proposals/suelo.html`) y los tests: el juego importa solo el suyo (`FLOOR` en `boardFloor.ts`), asi que los demas no
 * entran en `npm run build`.
 */
export const FLOOR_DESIGNS: readonly FloorDesign[] = [LEGACY_FLOOR, BEDS_FLOOR, PATIO_FLOOR, ROOTS_FLOOR];

/** Nombre corto y letra de cada suelo en la galeria, y la idea en una frase. */
export const FLOOR_NAMES: Record<string, { letter: string; name: string; idea: string }> = {
  legacy: {
    letter: 'Hoy',
    name: 'Césped a cuadros',
    idea: 'El de siempre, guardado tal cual (`floors/legacy.ts`): damero de dos verdes, brillo por casilla, briznas, florecillas y rejilla fina.',
  },
  beds: {
    letter: 'A',
    name: 'Bancales',
    idea: 'Cada carril es un bancal de tierra labrada con surcos a lo largo y su tabla delante; entre bancales, un pasillo de hierba. Estaquillas en las columnas.',
  },
  patio: {
    letter: 'B',
    name: 'Patio',
    idea: 'Losas de piedra clara de tamaños distintos con musgo en las juntas, bordillos entre carriles y un alcorque de tierra en cada casilla.',
  },
  roots: {
    letter: 'C',
    name: 'Raíces',
    idea: 'Tierra lisa con la red de raíces de las plantas de Patty: una raíz por cada línea entre carriles, que se para antes de los circuitos, y un nudo en cada columna.',
  },
};
