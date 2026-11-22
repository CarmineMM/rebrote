import * as Phaser from 'phaser';
import { WORLD } from './layout';
import type { QualityProfile } from './quality';
import { REFUGE, lightPoints, refugeRandom } from './refugeArt';
import { TEX, artInvOf } from './textures';

/** Ritmos y cantidades del refugio (T-036). Las cantidades son las de Alto: cada nivel grafico las multiplica. */
const LOOK = {
  stars: 60,
  clouds: 4,
  rainColumns: 24,
  bitsPerColumn: 5,
  /** Segundos que tarda una columna de bits en caer, entre estos dos. */
  rainSeconds: [4, 8],
  /** Cada cuanto pasa el gusano por fuera y cuanto tarda en cruzar. */
  wormEveryMs: 9000,
  wormCrossMs: 26000,
  /** Cada cuanto cae un relampago morado (solo con brillos). */
  flashEveryMs: 11000,
  lampSwingDeg: 2.2,
  lampSwingMs: 2500,
  bulbTwinkleMs: 1050,
  teal: 0x5ff2d0,
  purple: 0xc86bff,
  cloudTint: 0x2e1d55,
  flash: 0xc9a2ff,
  wormBody: 0x120822,
  wormEyes: 0xff5ad9,
} as const;

/**
 * Pinta y anima el refugio del Invernadero (T-036, LP-01) en la escena de la portada, en lugar del jardin. Por capas: el
 * cielo de fuera con estrellas que titilan, nubes oscuras, circuitos que laten, lluvia de bits, un gusano que pasa y
 * algun relampago; encima la sala (cristales, tablas, sacos, suelo y alfombra) con sus guirnaldas que parpadean y la
 * lampara que se mece y da luz calida. Todo con tweens y el reloj de la escena.
 *
 * Niveles graficos (ADR-0006): estrellas y nubes con `life`, bits con `particles`; los circuitos laten, las bombillas y la
 * lampara brillan (luz aditiva) y caen relampagos solo con `glows`.
 */
export function createRefuge(scene: Phaser.Scene, quality: QualityProfile): void {
  const rand = refugeRandom(7);
  const image = (x: number, y: number, key: string) => scene.add.image(x, y, key).setScale(artInvOf(key));

  scene.add.image(WORLD.left, WORLD.top, TEX.refugeOutside).setOrigin(0).setScale(artInvOf(TEX.refugeOutside));
  addStars(scene, quality, rand, image);
  addClouds(scene, quality, rand);
  const circuits = scene.add
    .image(WORLD.left, REFUGE.circuits.top, TEX.refugeCircuits)
    .setOrigin(0)
    .setScale(artInvOf(TEX.refugeCircuits))
    .setAlpha(quality.glows ? 0.45 : 0.75);
  if (quality.glows) scene.tweens.add({ targets: circuits, alpha: 1, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  addRain(scene, quality, rand, image);
  addWorm(scene, quality);
  if (quality.glows) addFlashes(scene);

  scene.add.image(WORLD.left, WORLD.top, TEX.refugeRoom).setOrigin(0).setScale(artInvOf(TEX.refugeRoom));
  addLights(scene, quality, image);
  addLamp(scene, quality, image);
}

type ImageAt = (x: number, y: number, key: string) => Phaser.GameObjects.Image;

function addStars(scene: Phaser.Scene, quality: QualityProfile, rand: () => number, image: ImageAt): void {
  const count = Math.round(LOOK.stars * quality.life);
  for (let i = 0; i < count; i++) {
    const star = image(WORLD.left + rand() * WORLD.width, WORLD.top + rand() * (330 - WORLD.top), TEX.refugeStar);
    star.setScale(star.scale * (0.3 + rand() * 0.5)).setAlpha(0.9);
    scene.tweens.add({ targets: star, alpha: 0.2, duration: 1200 + rand() * 1600, delay: rand() * 3000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}

function addClouds(scene: Phaser.Scene, quality: QualityProfile, rand: () => number): void {
  const count = Math.max(1, Math.round(LOOK.clouds * quality.life));
  for (let i = 0; i < count; i++) {
    const key = TEX.clouds[i % TEX.clouds.length];
    const x = WORLD.left + ((i + 0.3 + rand() * 0.4) / count) * WORLD.width;
    const cloud = scene.add
      .image(x, 90 + rand() * 160, key)
      .setScale(artInvOf(key) * (0.9 + rand() * 0.5))
      .setTint(LOOK.cloudTint)
      .setAlpha(0.85);
    scene.tweens.add({ targets: cloud, x: x + 60 + rand() * 40, duration: 18000 + rand() * 8000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}

/** Columnas de ceros y unos que caen detras del cristal, cada una a su ritmo. */
function addRain(scene: Phaser.Scene, quality: QualityProfile, rand: () => number, image: ImageAt): void {
  const count = Math.round(LOOK.rainColumns * quality.particles);
  const { from, to } = REFUGE.rain;
  for (let i = 0; i < count; i++) {
    const x = WORLD.left + ((i + rand()) / count) * WORLD.width;
    const tint = rand() < 0.33 ? LOOK.purple : LOOK.teal;
    const column = scene.add.container(x, from);
    for (let j = 0; j < LOOK.bitsPerColumn; j++) {
      const bit = image(0, j * 26, TEX.refugeBits[rand() < 0.5 ? 0 : 1])
        .setTint(tint)
        .setAlpha(1 - j * 0.18);
      column.add(bit);
    }
    const [slow, fast] = LOOK.rainSeconds;
    const duration = (slow + rand() * (fast - slow)) * 1000;
    const tween = scene.tweens.add({ targets: column, y: to, duration, repeat: -1, ease: 'Linear' });
    // Cada columna empieza a media caida, para que no caigan todas a la vez al entrar.
    tween.seek(rand() * duration);
  }
}

/** Un gusano en silueta que cruza la colina de fuera de vez en cuando, con los ojos encendidos. */
function addWorm(scene: Phaser.Scene, quality: QualityProfile): void {
  const { y, segments } = REFUGE.worm;
  const worm = scene.add.container(WORLD.left - 200, y);
  for (let i = segments - 1; i >= 0; i--) {
    const segment = scene.add.circle(-i * 34, (i % 2) * 6, 26 - i * 2.5, LOOK.wormBody);
    worm.add(segment);
  }
  if (quality.glows) {
    for (const ex of [6, 20]) worm.add(scene.add.image(ex, -8, TEX.glow).setScale(0.18).setTint(LOOK.wormEyes).setBlendMode(Phaser.BlendModes.ADD));
  }
  for (const ex of [6, 20]) worm.add(scene.add.circle(ex, -8, 5, LOOK.wormEyes));
  // Ondula al andar.
  worm.each((child: Phaser.GameObjects.GameObject) => {
    const part = child as Phaser.GameObjects.Arc;
    scene.tweens.add({ targets: part, y: part.y - 5, duration: 420, delay: Math.max(0, part.x / -34) * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  });
  scene.tweens.add({
    targets: worm,
    x: WORLD.right + 220,
    duration: LOOK.wormCrossMs,
    delay: 2000,
    repeat: -1,
    repeatDelay: LOOK.wormEveryMs,
    onRepeat: () => worm.setX(WORLD.left - 200),
  });
}

/** Relampagos morados sobre lo de fuera: un parpadeo doble cada tanto. */
function addFlashes(scene: Phaser.Scene): void {
  const flash = scene.add
    .rectangle(WORLD.left, WORLD.top, WORLD.width, REFUGE.glassBottom - WORLD.top, LOOK.flash)
    .setOrigin(0)
    .setAlpha(0);
  scene.time.addEvent({
    delay: LOOK.flashEveryMs,
    loop: true,
    callback: () =>
      scene.tweens.chain({
        targets: flash,
        tweens: [
          { alpha: 0.45, duration: 70 },
          { alpha: 0.05, duration: 90 },
          { alpha: 0.35, duration: 90 },
          { alpha: 0, duration: 500, ease: 'Quad.Out' },
        ],
      }),
  });
}

/** Las bombillas de las guirnaldas, que parpadean por turnos; con brillos, cada una con su halo. */
function addLights(scene: Phaser.Scene, quality: QualityProfile, image: ImageAt): void {
  for (const string of REFUGE.lights) {
    lightPoints(string).forEach((p, i) => {
      const color = string.colors[i % string.colors.length];
      const targets: Phaser.GameObjects.Image[] = [];
      if (quality.glows)
        targets.push(
          scene.add
            .image(p.x, p.y + 17, TEX.glow)
            .setScale(0.32)
            .setTint(color)
            .setAlpha(0.6)
            .setBlendMode(Phaser.BlendModes.ADD),
        );
      targets.push(image(p.x, p.y, TEX.refugeBulb).setOrigin(0.5, 0).setTint(color));
      scene.tweens.add({ targets, alpha: 0.55, duration: LOOK.bulbTwinkleMs, delay: (i % 3) * 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });
  }
}

/** La lampara que se mece colgada de la viga y su luz calida sobre la sala, que tiembla un poco. */
function addLamp(scene: Phaser.Scene, quality: QualityProfile, image: ImageAt): void {
  const { x, cord, glow } = REFUGE.lamp;
  const lamp = image(x, REFUGE.beam.y + 10, TEX.refugeLamp)
    .setOrigin(0.5, 0)
    .setAngle(-LOOK.lampSwingDeg);
  scene.tweens.add({ targets: lamp, angle: LOOK.lampSwingDeg, duration: LOOK.lampSwingMs, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  if (quality.glows) {
    const halo = scene.add
      .image(x, REFUGE.beam.y + 10 + cord + 50, TEX.glow)
      .setScale(1.3)
      .setTint(0xffd27a)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    // El halo va con la bombilla: sigue el giro de la lampara.
    const follow = () => {
      const a = Phaser.Math.DegToRad(lamp.angle);
      const r = cord + 50;
      halo.setPosition(x - Math.sin(a) * r, REFUGE.beam.y + 10 + Math.cos(a) * r);
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, follow);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, follow));
  }
  const light = scene.add.image(glow.x, glow.y, TEX.refugeLampGlow).setDisplaySize(glow.width, glow.height);
  scene.tweens.add({ targets: light, alpha: 0.86, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
}
