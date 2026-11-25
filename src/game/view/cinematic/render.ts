import type { ArtEnv, CinematicArt, CinematicLook } from './art';
import { clamp, lerp } from './geometry';
import { CINEMATIC_ART } from './rebellion';
import { type Cinematic, type LayerSpec, STAGE, type Transition, cameraAt, ease, parallax, poseAt } from './shots';

/**
 * El que junta una cinematica en un lienzo (T-049, ADR-0027): pinta una vez las capas fijas de cada plano (a la
 * resolucion de la pantalla) y en cada fotograma las coloca con la camara, su paralaje y su pose, pinta las vivas y hace
 * la transicion entre planos. Canvas 2D sin Phaser: lo usa React (`CinematicOverlay`) y la galeria.
 */

export interface Viewport {
  /** Tamano del lienzo en pixeles CSS. */
  readonly width: number;
  readonly height: number;
  /** Pixeles del lienzo por pixel CSS. */
  readonly pixelRatio: number;
}

/** Como cabe el diseno (1600 x 900) en la pantalla: entero y centrado. Lo que sobra a los lados lo cubre el margen pintado. */
export function stageFit(width: number, height: number): { scale: number; x: number; y: number } {
  const scale = Math.max(0.01, Math.min(width / STAGE.width, height / STAGE.height));
  return { scale, x: (width - STAGE.width * scale) / 2, y: (height - STAGE.height * scale) / 2 };
}

/**
 * Resolucion de las capas pintadas (pixeles por unidad de diseno): la de la pantalla, sin pasar de 1,5 ni bajar de 0,5,
 * y algo menos en la calidad baja (`detail` < 1).
 */
export function layerResolution(fitScale: number, pixelRatio: number, detail = 1): number {
  return Math.round(clamp(fitScale * pixelRatio, 0.5, 1.5) * detail * 100) / 100;
}

/** Si una capa no se pinta en este nivel grafico (es un adorno que el nivel no tiene). */
export function layerHidden(layer: LayerSpec, look: CinematicLook): boolean {
  if (layer.decor === 'particles') return look.particles <= 0;
  if (layer.decor === 'glows') return !look.glows;
  if (layer.decor === 'life') return look.life <= 0;
  return false;
}

/** Lo que hay que pintar en un fotograma: el plano, su tiempo y, si aun se esta entrando en el, de donde se viene. */
export interface CinematicFrame {
  readonly index: number;
  readonly t: number;
  readonly transition: Transition;
  /** Progreso de la transicion, de 0 a 1 (1: ya se ve solo el plano). */
  readonly mix: number;
  readonly previous: { readonly index: number; readonly t: number } | null;
}

export class CinematicRenderer {
  private readonly layers = new Map<string, HTMLCanvasElement>();
  private buffer: HTMLCanvasElement | null = null;

  constructor(
    private readonly cinematic: Cinematic,
    private readonly art: Readonly<Record<string, CinematicArt>> = CINEMATIC_ART,
  ) {}

  private key(index: number, layer: LayerSpec, env: ArtEnv, resolution: number): string {
    return `${index}:${layer.id}:${resolution}:${env.ai.id}:${env.look.glows ? 1 : 0}:${env.look.life}`;
  }

  /** Pinta las capas fijas de un plano que aun no esten pintadas. Devuelve cuantas pinto. */
  prepare(index: number, env: ArtEnv, resolution: number): number {
    const shot = this.cinematic.shots[index];
    if (!shot || typeof document === 'undefined') return 0;
    let painted = 0;
    for (const layer of shot.layers) {
      const art = this.art[layer.art];
      if (!art || art.kind !== 'paint' || layerHidden(layer, env.look)) continue;
      const key = this.key(index, layer, env, resolution);
      if (this.layers.has(key)) continue;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(art.box.w * resolution));
      canvas.height = Math.max(1, Math.ceil(art.box.h * resolution));
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.scale(resolution, resolution);
      art.paint(ctx, env);
      this.layers.set(key, canvas);
      painted++;
    }
    return painted;
  }

  /** Suelta las capas de los planos que ya no hacen falta (cada una ocupa varios MB). */
  keep(indices: readonly number[]): void {
    for (const key of [...this.layers.keys()]) if (!indices.includes(Number(key.split(':')[0]))) this.layers.delete(key);
  }

  dispose(): void {
    this.layers.clear();
    this.buffer = null;
  }

  /** Pinta un fotograma entero en `ctx` (cuyo lienzo mide `view` por `pixelRatio`). */
  draw(ctx: CanvasRenderingContext2D, view: Viewport, frame: CinematicFrame, env: ArtEnv, resolution: number): void {
    const { canvas } = ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const mix = ease('inOut', frame.mix);
    const previous = frame.previous;
    if (mix >= 1 || !previous) {
      this.drawShot(ctx, view, frame.index, frame.t, env, resolution);
      if (frame.transition === 'open' && mix < 1) this.blackout(ctx, 1 - mix);
      return;
    }
    if (frame.transition === 'open') {
      this.drawShot(ctx, view, frame.index, frame.t, env, resolution);
      this.blackout(ctx, 1 - mix);
      return;
    }
    this.drawShot(ctx, view, previous.index, previous.t, env, resolution);
    if (frame.transition === 'fade') {
      const buffer = this.bufferFor(canvas);
      const bctx = buffer.getContext('2d');
      if (!bctx) return;
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.fillStyle = '#000';
      bctx.fillRect(0, 0, buffer.width, buffer.height);
      this.drawShot(bctx, view, frame.index, frame.t, env, resolution);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = mix;
      ctx.drawImage(buffer, 0, 0);
      ctx.globalAlpha = 1;
      return;
    }
    // Pasar pagina: el plano nuevo entra desde la derecha con un borde inclinado de papel, como en un tebeo.
    const w = canvas.width;
    const h = canvas.height;
    const slant = h * 0.18;
    const edge = lerp(w + slant, -slant, mix);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.moveTo(edge, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(edge - slant, h);
    ctx.closePath();
    ctx.clip();
    this.drawShot(ctx, view, frame.index, frame.t, env, resolution);
    ctx.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.moveTo(edge, 0);
    ctx.lineTo(edge - slant, h);
    ctx.lineWidth = Math.max(4, w * 0.008);
    ctx.strokeStyle = '#fff6df';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.restore();
  }

  private blackout(ctx: CanvasRenderingContext2D, alpha: number): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = clamp(alpha);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1;
  }

  private bufferFor(canvas: HTMLCanvasElement): HTMLCanvasElement {
    if (!this.buffer) this.buffer = document.createElement('canvas');
    if (this.buffer.width !== canvas.width || this.buffer.height !== canvas.height) {
      this.buffer.width = canvas.width;
      this.buffer.height = canvas.height;
    }
    return this.buffer;
  }

  private drawShot(ctx: CanvasRenderingContext2D, view: Viewport, index: number, t: number, env: ArtEnv, resolution: number): void {
    const shot = this.cinematic.shots[index];
    if (!shot) return;
    const fit = stageFit(view.width, view.height);
    const ratio = view.pixelRatio;
    const still = env.look.still;
    const camera = cameraAt(shot.camera, t, still);
    const center = { x: STAGE.width / 2, y: STAGE.height / 2 };
    for (const layer of shot.layers) {
      const art = this.art[layer.art];
      if (!art || layerHidden(layer, env.look)) continue;
      const pose = poseAt(layer, t, still);
      if (pose.alpha <= 0) continue;
      let image: HTMLCanvasElement | undefined;
      if (art.kind === 'paint') {
        image = this.layers.get(this.key(index, layer, env, resolution));
        if (!image) {
          this.prepare(index, env, resolution);
          image = this.layers.get(this.key(index, layer, env, resolution));
          if (!image) continue;
        }
      }
      ctx.save();
      ctx.setTransform(fit.scale * ratio, 0, 0, fit.scale * ratio, fit.x * ratio, fit.y * ratio);
      const view3 = parallax(camera, layer.depth);
      ctx.translate(center.x + view3.x, center.y + view3.y);
      ctx.scale(view3.zoom, view3.zoom);
      ctx.translate(-center.x, -center.y);
      const pivot = art.kind === 'paint' ? { x: art.box.x + art.box.w / 2, y: art.box.y + art.box.h / 2 } : center;
      ctx.translate(pivot.x + pose.x, pivot.y + pose.y);
      if (pose.rotate) ctx.rotate(pose.rotate);
      if (pose.scale !== 1) ctx.scale(pose.scale, pose.scale);
      ctx.translate(-pivot.x, -pivot.y);
      ctx.globalAlpha = clamp(pose.alpha);
      if (art.kind === 'paint' && image) ctx.drawImage(image, art.box.x, art.box.y, art.box.w, art.box.h);
      else if (art.kind === 'live') art.draw(ctx, t, env);
      ctx.restore();
    }
  }
}

/**
 * Una imagen tenida de un color (las entidades del juego en el fosforo de las pantallas): la misma figura, rellena del
 * color con algo de su dibujo debajo.
 */
export function tintedImage(source: HTMLImageElement | HTMLCanvasElement, color: string, strength = 0.82): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!width || !height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = strength;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}
