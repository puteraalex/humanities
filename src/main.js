import './style.css';
import Phaser from 'phaser';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#14100e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: {
    create() {
      this.add
        .text(480, 270, 'HUMANITIES - setup OK', { fontSize: '32px', color: '#ffffff' })
        .setOrigin(0.5);
    },
  },
});