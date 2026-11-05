import Phaser from 'phaser';
import { getGame, subscribe } from '../state/store.js';

export default class ColonyScene extends Phaser.Scene {
  constructor() {
    super('Colony');
  }

  create() {
    this.g = this.add.graphics();
    this.dust = this.add.rectangle(480, 270, 960, 540, 0xc98b4b, 0).setDepth(10);
    const unsubscribe = subscribe((game) => this.redraw(game));
    this.events.once('shutdown', unsubscribe);
    this.redraw(getGame());
  }

  redraw(game) {
    const { state } = game;
    const g = this.g;
    g.clear();

    // sky and ground
    g.fillGradientStyle(0x3b1d1a, 0x3b1d1a, 0xc1440e, 0xc1440e, 1);
    g.fillRect(0, 0, 960, 360);
    g.fillStyle(0x8a3a1c, 1);
    g.fillRect(0, 360, 960, 180);
    g.fillStyle(0xffd9a0, 1);
    g.fillCircle(780, 120, 30);

    // habitat (placeholder shapes)
    g.fillStyle(0xd8d2cc, 1);
    g.fillRect(400, 320, 160, 50);
    g.fillStyle(0x9fd7e8, 1);
    g.fillCircle(480, 320, 45);

    // one panel per 25 units of generation
    const panels = Math.min(12, Math.round(state.power.generation / 25));
    g.fillStyle(0x203a7a, 1);
    for (let i = 0; i < panels; i++) {
      g.fillRect(60 + i * 55, 385, 45, 25);
    }

    // red light when the battery is low
    if (state.power.battery / state.power.batteryMax < 0.25) {
      g.fillStyle(0xff4d2e, 1);
      g.fillCircle(560, 300, 8);
    }

    // dust darkens the scene
    this.dust.setAlpha(state.env.dustLoss * 0.7);
  }
}