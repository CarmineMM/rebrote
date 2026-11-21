import * as Phaser from 'phaser';
import type { Effects } from './effects';
import { MEDAL_TIERS } from './levelMedal';
import { TEX, artInv } from './textures';
import { AURA_LOOK, veilPhase, veilSize, veilStrength } from './wormAuraArt';

/** Lo que el aura necesita saber del gusano: sus pies en pantalla, el ancho de casilla ahi y su profundidad. */
export interface AuraHost {
  ground(): { x: number; y: number; cellWidth: number };
  depth(): number;
}

const hex = (color: string): number => Number.parseInt(color.slice(1), 16);

/** Color del arcoiris para `t` (el tramo de cristal). */
const rainbow = (t: number): number => Phaser.Display.Color.HSVToRGB(((t % 1) + 1) % 1, 0.45, 1).color;

/**
 * Aura de un gusano de nivel alto en pantalla (T-030; reglas y medidas en `wormAuraArt.ts`). La crea y la mueve su
 * `WormView`: cada fotograma, despues de colocar el cuerpo, `sync` con lo que paso desde el anterior. Asi se para con la
 * pausa (la escena deja de llamar) y sus motas y su halo usan el reloj y los tweens de la escena.
 *
 * Por nivel grafico (`QualityProfile.auras`, Z-04): en Bajo no se crea; en Medio, solo los velos de detras y el halo;
 * en Alto y Ultra, ademas el velo de delante y las motas. Los velos van con transparencia normal (la luz aditiva sobre
 * el cesped cambiaria el color del tramo); el halo y las motas, aditivos si hay brillos.
 */
export class WormAura {
  private readonly veils: Array<{ image: Phaser.GameObjects.Image; offset: number; front: boolean }> = [];
  private readonly halo: Phaser.GameObjects.Image;
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  /** Aparece despues de salir el gusano del suelo y se apaga al morir: multiplica tamano y opacidad. */
  private readonly shown = { v: 0 };
  private clock = Math.random() * AURA_LOOK.veilMs;
  private gone = false;
  private fading = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    private readonly tier: number,
    private readonly host: AuraHost,
    delayMs = 0,
  ) {
    const full = fx.quality.auras >= 2;
    const glowBlend = fx.quality.glows ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL;
    const mid = hex(MEDAL_TIERS[tier].mid);
    this.halo = scene.add.image(0, 0, TEX.glow).setTint(mid).setBlendMode(glowBlend).setAlpha(0);
    const behind = AURA_LOOK.veilsBehind(tier);
    for (let i = 0; i < behind; i++) {
      this.veils.push({ image: scene.add.image(0, 0, TEX.auraVeils[tier]).setOrigin(0.5, 1).setAlpha(0), offset: i / behind, front: false });
    }
    if (full) {
      this.veils.push({ image: scene.add.image(0, 0, TEX.auraVeils[tier]).setOrigin(0.5, 1).setAlpha(0), offset: 0.5 / behind, front: true });
      this.timers.push(scene.time.addEvent({ delay: fx.ambientDelay(AURA_LOOK.moteEveryMs(tier)), loop: true, callback: () => this.riseMote() }));
    }
    scene.tweens.add({ targets: this.shown, v: 1, delay: delayMs + AURA_LOOK.appearDelayMs, duration: AURA_LOOK.appearMs, ease: 'Sine.Out' });
  }

  /** Coloca los velos y el halo junto al gusano. `deltaMs`: lo que paso desde el fotograma anterior. */
  sync(deltaMs: number): void {
    if (this.gone || this.fading) return;
    this.clock += deltaMs;
    const { x, y, cellWidth: w } = this.host.ground();
    const body = this.host.depth();
    const k = this.shown.v;
    const size = veilSize(this.tier);
    const strength = veilStrength(this.tier) * k;
    const tint = this.tier === 4 ? rainbow(this.clock / AURA_LOOK.rainbowMs) : null;
    for (const veil of this.veils) {
      const phase = veilPhase(this.clock / AURA_LOOK.veilMs + veil.offset);
      veil.image
        .setPosition(x + w * 0.02, y + w * 0.02 - phase.lift * w)
        .setDisplaySize(w * size.width * phase.scaleX * k, w * size.height * phase.scaleY * k)
        .setAlpha(phase.alpha * strength * (veil.front ? AURA_LOOK.strength.front : 1))
        .setDepth(veil.front ? body + 0.03 : body - 0.03);
      if (tint !== null) veil.image.setTint(tint);
    }
    const { halo } = AURA_LOOK;
    const pulse = 0.5 + 0.5 * Math.sin((this.clock / halo.pulseMs) * Math.PI);
    this.halo
      .setPosition(x + w * 0.02, y + w * 0.01)
      .setDisplaySize(w * halo.width * k, w * halo.height * k)
      .setAlpha((halo.alpha[0] + (halo.alpha[1] - halo.alpha[0]) * pulse) * k)
      .setDepth(body - 0.6);
    if (tint !== null) this.halo.setTint(tint);
  }

  /** Se apaga donde esta (el gusano muere o se escapa) y desaparece. Desde ahi `sync` ya no lo mueve. */
  fadeOut(durationMs: number): void {
    if (this.gone || this.fading) return;
    this.fading = true;
    this.timers.forEach((timer) => timer.remove());
    this.scene.tweens.add({
      targets: [...this.veils.map((veil) => veil.image), this.halo],
      alpha: 0,
      duration: durationMs,
      ease: 'Sine.In',
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void {
    if (this.gone) return;
    this.gone = true;
    this.timers.forEach((timer) => timer.remove());
    this.scene.tweens.killTweensOf(this.shown);
    this.scene.tweens.killTweensOf([...this.veils.map((veil) => veil.image), this.halo]);
    this.veils.forEach((veil) => veil.image.destroy());
    this.halo.destroy();
  }

  /** Una mota del color del tramo que sube desde los pies y se apaga por encima de la cabeza (solo en Alto y Ultra). */
  private riseMote(): void {
    if (this.gone || this.shown.v < 0.5) return;
    const { x, y, cellWidth: w } = this.host.ground();
    const from = { x: x + (Math.random() - 0.5) * 0.8 * w, y: y - Math.random() * 0.08 * w };
    const front = Math.random() < 0.4;
    const mote = this.scene.add
      .image(from.x, from.y, TEX.dot)
      .setTint(this.tier === 4 ? rainbow(Math.random()) : hex(MEDAL_TIERS[this.tier].light))
      .setScale((w / 160) * (0.35 + Math.random() * 0.25) * artInv())
      .setAlpha(0)
      .setDepth(this.host.depth() + (front ? 0.04 : -0.04));
    if (this.fx.quality.glows) mote.setBlendMode(Phaser.BlendModes.ADD);
    const { moteRise } = AURA_LOOK;
    const top = from.y - w * (moteRise.base + this.tier * moteRise.perTier + Math.random() * moteRise.spread);
    this.scene.tweens.add({ targets: mote, y: top, x: from.x + (Math.random() - 0.5) * 0.15 * w, duration: 1900 + Math.random() * 700, ease: 'Sine.Out', onComplete: () => mote.destroy() });
    this.scene.tweens.add({ targets: mote, alpha: 0.85, duration: 500, yoyo: true, hold: 700, ease: 'Sine.InOut' });
  }
}
