import './style.css';
import Phaser from 'phaser';
import ColonyScene from './scenes/ColonyScene.js';
import { startGame, getGame, subscribe, endDay, pickOption, restart } from './state/store.js';
import { renderAll } from './ui/render.js';

startGame(1);
subscribe(renderAll);
renderAll(getGame());

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#14100e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [ColonyScene],
});

document.getElementById('app').addEventListener('click', (e) => {
  const option = e.target.closest('[data-option]');
  const action = e.target.closest('[data-action]');
  if (option) pickOption(option.dataset.option);
  else if (action && action.dataset.action === 'end-day') endDay();
  else if (action && action.dataset.action === 'restart') restart();
  else return;
  // keep keyboard focus inside the decision panel after it re-renders
  const next = document.querySelector('#decision button');
  if (next) next.focus();
});