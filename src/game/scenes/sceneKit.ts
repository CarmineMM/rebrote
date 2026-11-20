import * as Phaser from 'phaser';
import { EventBus, GameEvents } from '../EventBus';
import { WORLD, viewFor, type ViewRect } from '../view/layout';
import type { QualityProfile } from '../view/quality';

/**
 * Lo que comparten las escenas que pintan el jardin: el tablero (`BoardScene`) y la portada del menu de inicio
 * (`TitleScene`, T-011).
 */

/**
 * Pantalla completa sin bandas (ADR-0007): el lienzo toma la proporcion de la pantalla y la camara muestra el diseno
 * entero mas el decorado extra que haga falta. Todo sigue en coordenadas de diseno. `shiftX` corre la camara a un lado
 * (la portada deja sitio al menu), sin salirse nunca del mundo pintado. Devuelve lo que se ve, o null si ha tenido que
 * cambiar el tamano del lienzo: Phaser vuelve a avisar con RESIZE y entonces se coloca la camara.
 */
export function fitCamera(scene: Phaser.Scene, renderScale: number, shiftX = 0): ViewRect | null {
  const { width: parentWidth, height: parentHeight } = scene.scale.parentSize;
  const view = viewFor(parentWidth / parentHeight);
  const width = Math.max(1, Math.round(view.width * renderScale));
  const height = Math.max(1, Math.round(view.height * renderScale));
  if (Math.abs(scene.scale.width - width) > 1 || Math.abs(scene.scale.height - height) > 1) {
    // Vuelve a emitir RESIZE; la segunda vez los tamanos ya coinciden y solo se recoloca la camara.
    scene.scale.setGameSize(width, height);
    return null;
  }
  const x = Phaser.Math.Clamp(view.x + shiftX, WORLD.left, WORLD.right - view.width);
  scene.cameras.main
    .setSize(scene.scale.width, scene.scale.height)
    .setZoom(renderScale)
    .centerOn(x + view.width / 2, view.y + view.height / 2);
  return { ...view, x };
}

/**
 * Ultra: color algo mas vivo y una vineta muy suave que centra la mirada en el cesped.
 * Ambos filtros leen un pixel por pixel. Se descarto el tilt-shift: 100 lecturas por pixel a doble resolucion.
 */
export function applyPostFx(scene: Phaser.Scene, quality: QualityProfile): void {
  if (!quality.postFx) return;
  const filters = scene.cameras.main.filters.external;
  const grade = filters.addColorMatrix();
  grade.colorMatrix.saturate(0.18);
  grade.colorMatrix.brightness(1.03, true);
  // En la vineta de Phaser el oscurecimiento crece casi en linea desde el centro: fuerza baja o apaga la escena.
  filters.addVignette(0.5, 0.55, 0.75, 0.07, 0x10240f);
}

/**
 * Cada segundo real avisa al HUD de los fps (contador y modo automatico de ADR-0006). Mide en tiempo real: el reloj del
 * juego se frena cuando va lento y no sirve para esto.
 */
export class FpsMeter {
  private windowStart = performance.now();
  private frames = 0;

  /** Empieza a contar de nuevo (al crear la escena o al salir de la pausa, que no cuenta como fotogramas lentos). */
  reset(): void {
    this.windowStart = performance.now();
    this.frames = 0;
  }

  tick(): void {
    this.frames++;
    const now = performance.now();
    const elapsed = now - this.windowStart;
    if (elapsed < 1000) return;
    EventBus.emit(GameEvents.fpsSampled, Math.round((this.frames * 1000) / elapsed));
    this.windowStart = now;
    this.frames = 0;
  }
}
