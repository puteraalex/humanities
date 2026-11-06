import Phaser from 'phaser';
import { getGame, getPending, subscribe } from '../state/store.js';
import { outpostVisuals, plantKey, MAX_PANELS } from './visuals.js';
import { buildTextures, lcg, W, H } from './pixel/textures.js';
import { COLORS as C } from './pixel/sprites.js';

const hex = (s) => parseInt(s.slice(1), 16);

const WALK_Y = 158; // the path the astronaut walks on
const HAB = { x: 124, y: 106 }; // habitat top-left
const GH = { x: 206, y: 120 }; // greenhouse top-left
const DOOR_X = 160;
const PANEL_X0 = 16;
const PANEL_STEP = 15;
const PATROL = [160, 232, 276, 66];
const BEACON = {
  green: hex(C.beaconGreen),
  amber: hex(C.beaconAmber),
  red: hex(C.beaconRed),
};

export default class OutpostScene extends Phaser.Scene {
  constructor() {
    super('Outpost');
  }

  create() {
    buildTextures(this);
    this.visual = outpostVisuals(getGame(), getPending());
    this.current = { light: this.visual.light, dust: this.visual.dust };
    this.prevRadiation = this.visual.radiation;

    this.buildBackdrop();
    this.buildStructures();
    this.buildAstronaut();
    this.buildEffects();
    this.applyDiscrete();

    const unsubscribe = subscribe((game) => {
      this.visual = outpostVisuals(game, getPending());
      this.applyDiscrete();
    });
    this.events.once('shutdown', unsubscribe);
  }

  buildBackdrop() {
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setDepth(0);
    const rnd = lcg(11);
    for (let i = 0; i < 36; i++) {
      const star = this.add
        .rectangle(Math.floor(rnd() * W), Math.floor(rnd() * 84), 1, 1, hex(C.creamLight))
        .setOrigin(0, 0)
        .setDepth(1)
        .setAlpha(0.35 + rnd() * 0.5);
      if (i % 3 === 0) {
        this.tweens.add({
          targets: star,
          alpha: 0.08,
          duration: 700 + Math.floor(rnd() * 1200),
          yoyo: true,
          repeat: -1,
          delay: Math.floor(rnd() * 1500),
        });
      }
    }
    this.add.image(250, 30, 'moon').setOrigin(0.5).setDepth(1);
    this.add.image(0, 84, 'mtn_far').setOrigin(0, 0).setDepth(2);
    this.add.image(0, 96, 'mtn_near').setOrigin(0, 0).setDepth(3);
    this.add.image(0, 118, 'ground').setOrigin(0, 0).setDepth(4);
  }

  buildStructures() {
    // Solar panels: the number on screen follows how much power the outpost makes.
    this.panels = [];
    for (let i = 0; i < MAX_PANELS; i++) {
      const x = PANEL_X0 + i * PANEL_STEP;
      const base = this.add.image(x, 150, 'panel').setOrigin(0, 1).setDepth(150);
      const dustA = this.add.image(x, 150, 'panel_dust_a').setOrigin(0, 1).setDepth(151).setAlpha(0);
      const dustB = this.add.image(x, 150, 'panel_dust_b').setOrigin(0, 1).setDepth(151).setAlpha(0);
      this.panels.push({ base, dustA, dustB });
    }

    // Habitat. The window light is separate so it can dim and flicker.
    this.add.image(HAB.x, HAB.y, 'habitat').setOrigin(0, 0).setDepth(150);
    this.glows = [
      this.add.rectangle(HAB.x + 12, HAB.y + 28, 8, 5, hex(C.windowGlow)).setOrigin(0, 0).setDepth(152),
      this.add.rectangle(HAB.x + 52, HAB.y + 28, 8, 5, hex(C.windowGlow)).setOrigin(0, 0).setDepth(152),
      this.add.rectangle(HAB.x + 32, HAB.y + 11, 8, 5, hex(C.windowGlow)).setOrigin(0, 0).setDepth(152),
    ];

    // Antenna with a status light.
    this.add.image(HAB.x + 58, HAB.y + 22, 'antenna').setOrigin(0, 1).setDepth(150);
    this.beacon = this.add
      .rectangle(HAB.x + 63, HAB.y + 22 - 35, 2, 2, BEACON.green)
      .setOrigin(0, 0)
      .setDepth(152);

    // Greenhouse: back wall, plants, then glass in front.
    this.add.image(GH.x, GH.y, 'gh_back').setOrigin(0, 0).setDepth(149);
    this.plants = [];
    for (let i = 0; i < 5; i++) {
      this.plants.push(
        this.add.image(GH.x + 8 + i * 10, GH.y + 24, 'plant_3').setOrigin(0.5, 1).setDepth(150)
      );
    }
    this.add.image(GH.x, GH.y, 'gh_glass').setOrigin(0, 0).setDepth(151);

    // Storage and the rover.
    this.add.image(268, 132, 'crates').setOrigin(0, 0).setDepth(150);
    this.add.image(112, 174, 'rover').setOrigin(0, 1).setDepth(174);
    this.roverLight = this.add
      .rectangle(112 + 6, 174 - 15, 2, 1, hex(C.beaconAmber))
      .setOrigin(0, 0)
      .setDepth(175);
  }

  buildAstronaut() {
    this.astro = { x: DOOR_X, target: DOOR_X, wait: 0, wp: 0, frame: 0, frameTimer: 0 };
    this.shadow = this.add
      .rectangle(DOOR_X, WALK_Y, 8, 1, hex(C.outline), 0.5)
      .setOrigin(0.5, 1)
      .setDepth(WALK_Y - 1);
    this.astroSprite = this.add
      .image(DOOR_X, WALK_Y, 'astro_idle')
      .setOrigin(0.5, 1)
      .setDepth(WALK_Y);
  }

  buildEffects() {
    // Dust grains: only some are visible, depending on the storm.
    this.dustPx = [];
    for (let i = 0; i < 72; i++) {
      const p = this.add
        .image(Phaser.Math.Between(0, W), Phaser.Math.Between(30, 175), 'dust')
        .setDepth(600)
        .setAlpha(0.8);
      p.vy = Phaser.Math.FloatBetween(-4, 6);
      p.speed = Phaser.Math.FloatBetween(0.7, 1.3);
      this.dustPx.push(p);
    }
    // The sky tint for dust storms.
    this.tint = this.add
      .rectangle(0, 0, W, H, hex(C.stormTint))
      .setOrigin(0, 0)
      .setDepth(500)
      .setAlpha(0);
    // A red border for radiation warnings.
    this.border = [
      [0, 0, W, 4],
      [0, H - 4, W, 4],
      [0, 0, 4, H],
      [W - 4, 0, 4, H],
    ].map(([x, y, w, h]) =>
      this.add.rectangle(x, y, w, h, hex(C.beaconRed)).setOrigin(0, 0).setDepth(700).setAlpha(0)
    );
    this.warnIcon = this.add
      .image(HAB.x + 36, HAB.y - 22, 'warn')
      .setOrigin(0.5, 1)
      .setDepth(650)
      .setVisible(false);
  }

  // Things that change in steps, not smoothly.
  applyDiscrete() {
    const v = this.visual;
    this.panels.forEach((p, i) => {
      const on = i < v.panelCount;
      p.base.setVisible(on);
      p.dustA.setVisible(on);
      p.dustB.setVisible(on);
    });
    this.plants.forEach((p, i) => p.setTexture(plantKey(v.plantStage, i)));
    this.beacon.setFillStyle(BEACON[v.beacon]);
    if (this.prevRadiation !== 'burst' && v.radiation === 'burst') {
      this.cameras.main.shake(400, 0.006);
    }
    this.prevRadiation = v.radiation;
  }

  update(time, delta) {
    const dt = delta / 1000;
    const k = Math.min(1, delta / 350);
    const cur = this.current;
    cur.light = Phaser.Math.Linear(cur.light, this.visual.light, k);
    cur.dust = Phaser.Math.Linear(cur.dust, this.visual.dust, k);

    // Window lights follow the power; they flicker when it is very low.
    const flicker = cur.light < 0.35 ? 0.75 + 0.25 * Math.sin(time / 70) : 1;
    const glow = Phaser.Math.Clamp(cur.light * flicker, 0, 1);
    this.glows.forEach((g) => g.setAlpha(glow));

    // Dust: sky tint and the layers covering the panels.
    this.tint.setAlpha(0.5 * cur.dust);
    const coverA = Phaser.Math.Clamp(cur.dust * 1.5, 0, 1);
    const coverB = Phaser.Math.Clamp((cur.dust - 0.5) * 2, 0, 1);
    this.panels.forEach((p) => {
      p.dustA.setAlpha(coverA);
      p.dustB.setAlpha(coverB);
    });

    // Status light blinks: slow when fine, fast when the power is very low.
    const slow = Math.floor(time / 800) % 2 === 0;
    const fast = Math.floor(time / 250) % 2 === 0;
    this.beacon.setVisible(this.visual.beacon === 'red' ? fast : slow);
    this.roverLight.setVisible(Math.floor(time / 1000) % 2 === 0);

    // Radiation warning: flashing triangle and a pulsing red border.
    const rad = this.visual.radiation;
    const pulse = 0.5 + 0.5 * Math.sin(time / 120);
    const flashing = rad === 'warning' || rad === 'burst';
    this.warnIcon.setVisible(flashing && pulse > 0.25);
    const borderAlpha = rad === 'burst' ? 0.25 + 0.35 * pulse : rad === 'warning' ? 0.15 * pulse : 0;
    this.border.forEach((b) => b.setAlpha(borderAlpha));

    this.updateAstronaut(time, delta);
    this.updateDust(dt);
  }

  updateDust(dt) {
    const dust = this.current.dust;
    const active = Math.round(8 + 64 * dust);
    const speed = 18 + 130 * dust;
    this.dustPx.forEach((p, i) => {
      p.setVisible(i < active);
      if (i >= active) return;
      p.x += speed * p.speed * dt;
      p.y += p.vy * dt;
      if (p.x > W + 3) {
        p.x = -3;
        p.y = Phaser.Math.Between(40, 175);
      }
      if (p.y < 20 || p.y > 178) p.vy = -p.vy;
    });
  }

  // Where should the astronaut be, and what is he doing?
  goalFor(task) {
    if (task === 'shelter') return { x: DOOR_X, hide: true };
    if (task === 'doorway') return { x: DOOR_X + 14 };
    if (task === 'panels') return { x: PANEL_X0 + (this.visual.panelCount * PANEL_STEP) / 2, work: true };
    if (task === 'greenhouse') return { x: GH.x + 28, work: true };
    return null; // patrol
  }

  updateAstronaut(time, delta) {
    const a = this.astro;
    const dt = delta / 1000;
    const goal = this.goalFor(this.visual.astronautTask);
    let hide = false;
    let work = false;

    if (goal) {
      a.target = goal.x;
      hide = !!goal.hide;
      work = !!goal.work;
    } else if (Math.abs(a.x - a.target) < 1 && time >= a.wait) {
      a.wp = (a.wp + 1) % PATROL.length;
      a.target = PATROL[a.wp];
    }

    const dx = a.target - a.x;
    const walking = Math.abs(dx) > 0.5;
    if (walking) {
      a.x += Math.sign(dx) * Math.min(Math.abs(dx), 30 * dt);
      this.astroSprite.setFlipX(dx < 0);
      a.wait = time + 2500;
    }

    // Hide inside the habitat when sheltering (once arrived), come back out later.
    const wantAlpha = hide && !walking ? 0 : 1;
    this.astroSprite.alpha = Phaser.Math.Linear(this.astroSprite.alpha, wantAlpha, Math.min(1, dt * 6));
    this.shadow.setAlpha(0.5 * this.astroSprite.alpha);

    a.frameTimer += delta;
    if (a.frameTimer > (walking ? 160 : 320)) {
      a.frameTimer = 0;
      a.frame = 1 - a.frame;
    }
    let key = 'astro_idle';
    if (walking) key = a.frame ? 'astro_walk1' : 'astro_walk2';
    else if (work && !hide) key = a.frame ? 'astro_walk1' : 'astro_idle'; // busy shuffle
    this.astroSprite.setTexture(key);
    this.astroSprite.setPosition(Math.round(a.x), WALK_Y - (walking && a.frame ? 1 : 0));
    this.shadow.setPosition(Math.round(a.x), WALK_Y);
  }
}