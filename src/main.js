import './style.css';
import '@fontsource/press-start-2p';
import Phaser from 'phaser';
import OutpostScene from './scenes/OutpostScene.js';
import {
  startGame,
  getGame,
  subscribe,
  endDay,
  pickOption,
  answerQuestion,
  restart,
  retrySame,
  showDebrief,
  buy,
  sell,
  launch,
  setScreen,
  startStory,
  nextStory,
  skipStory,
} from './state/store.js';
import { renderAll } from './ui/render.js';
import { STORY } from './ui/renderTitle.js';

let phaserGame = null;

// Phaser starts only after launch, when its container is visible.
// If it fails, the reason is shown on the page and in the console.
function ensurePhaser(game) {
  if (game.phase !== 'colony') return;
  if (phaserGame) {
    phaserGame.scale.refresh();
    return;
  }
  try {
    console.info('Starting Phaser', Phaser.VERSION);
    phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: 320,
      height: 180,
      pixelArt: true,
      backgroundColor: '#14100e',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [OutpostScene],
    });
  } catch (err) {
    console.error('Phaser failed to start:', err);
    const box = document.getElementById('game');
    if (box) box.textContent = 'The scene could not start: ' + err.message;
  }
}

startGame(1);
subscribe(renderAll); // must come first so the container is visible before Phaser starts
subscribe(ensurePhaser);
setScreen('title');
renderAll(getGame());

document.addEventListener('click', (e) => {
  const buyBtn = e.target.closest('[data-buy]');
  const sellBtn = e.target.closest('[data-sell]');
  const option = e.target.closest('[data-option]');
  const answer = e.target.closest('[data-answer]');
  const action = e.target.closest('[data-action]');
  const name = action ? action.dataset.action : null;
  let focusSelector = null;

  if (buyBtn) {
    buy(buyBtn.dataset.buy);
    focusSelector = `[data-buy="${buyBtn.dataset.buy}"]`;
  } else if (sellBtn) {
    sell(sellBtn.dataset.sell);
    focusSelector = `[data-sell="${sellBtn.dataset.sell}"]`;
  } else if (answer) {
    const [questionId, optionId] = answer.dataset.answer.split('|');
    answerQuestion(questionId, optionId);
  } else if (option) {
    pickOption(option.dataset.option);
  } else if (name === 'start-story') {
    startStory();
  } else if (name === 'story-next') {
    nextStory(STORY.length);
  } else if (name === 'skip-intro') {
    skipStory();
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
  const fallback = document.querySelector(
    '#title:not([hidden]) button, #story:not([hidden]) button, #prep:not([hidden]) button:not([disabled]), #debrief:not([hidden]) button, #app:not([hidden]) #decision button'
  );
  const target = (focusSelector && document.querySelector(focusSelector)) || fallback;
  if (target && !target.disabled) target.focus({ preventScroll: true });
  if (['start-story', 'story-next', 'skip-intro', 'debrief', 'retry-same', 'restart'].includes(name)) {
    window.scrollTo(0, 0);
  }
});