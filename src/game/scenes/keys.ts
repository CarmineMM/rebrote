/** Claves de las escenas del juego (T-011): la portada del menu de inicio y el tablero. */
export const SCENES = {
  title: 'TitleScene',
  board: 'BoardScene',
} as const;

export type SceneKey = (typeof SCENES)[keyof typeof SCENES];
