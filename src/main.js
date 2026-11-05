import './style.css';
import Phaser from 'phaser';
import ColonyScene from './scenes/ColonyScene.js';
import {
  startGame,
  getGame,
  subscribe,
  endDay,
  pickOption,
  restart,
  retrySame,
  showDebrief,
  buy,
  sell,
  launch,
} from './state/store.js';
import { renderAll } from './ui/render.js';

let phaserGame = null;

// Phaser starts only after launch, when its container is visible.
function ensurePhaser(game) {
  if (game.phase !== 'colony') return;
  if (phaserGame) {
    phaserGame.scale.refresh();
    return;
  }
  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 960,
    height: 540,
    backgroundColor: '#14100e',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [ColonyScene],
  });
}

startGame(1);
subscribe(renderAll); // must come first so the container is visible before Phaser starts
subscribe(ensurePhaser);
renderAll(getGame());

document.addEventListener('click', (e) => {
  const buyBtn = e.target.closest('[data-buy]');
  const sellBtn = e.target.closest('[data-sell]');
  const option = e.target.closest('[data-option]');
  const action = e.target.closest('[data-action]');
  const name = action ? action.dataset.action : null;
  let focusSelector = null;

  if (buyBtn) {
    buy(buyBtn.dataset.buy);
    focusSelector = `[data-buy="${buyBtn.dataset.buy}"]`;
  } else if (sellBtn) {
    sell(sellBtn.dataset.sell);
    focusSelector = `[data-sell="${sellBtn.dataset.sell}"]`;
  } else if (option) {
    pickOption(option.dataset.option);
  } else if (name === 'launch') {
    launch();
  } else if (name === 'end-day') {
    endDay();
  } else if (name === 'debrief') {
    showDebrief();
  } else if (name === 'retry-same') {
    retrySame();
  } else if (name === 'restart') {
    restart();
  } else {
    return;
  }

  // keep keyboard focus on a sensible button after the screen re-renders
  const fallback =
    document.querySelector('#prep:not([hidden]) button:not([disabled])') ||
    document.querySelector('#decision button') ||
    document.querySelector('#debrief:not([hidden]) button');
  const target = (focusSelector && document.querySelector(focusSelector)) || fallback;
  if (target && !target.disabled) target.focus();
  if (name === 'debrief' || name === 'retry-same' || name === 'restart') window.scrollTo(0, 0);
});