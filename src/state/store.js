import EVENTS from '../data/events.json';
import ITEMS from '../data/items.json';
import { createCampaign, addItem, removeItem, buildEngineState } from '../campaign/index.js';
import { createScenario, choose, pendingDecision, stepDay } from '../engine/index.js';

const listeners = new Set();
let game = null;

function emit() {
  listeners.forEach((fn) => fn(game));
}

// Builds a fresh game in the "prep" phase. A loadout can be carried over for replays.
function makeGame(seed, loadout = []) {
  let campaign = createCampaign({ seed });
  for (const id of loadout) {
    const r = addItem(campaign, id, ITEMS);
    if (r.ok) campaign = r.campaign;
  }
  return {
    seed,
    phase: 'prep', // 'prep' -> 'colony'
    campaign,
    state: buildEngineState(campaign, ITEMS),
    scenario: createScenario(seed, EVENTS),
    events: EVENTS,
    items: ITEMS,
    lastDay: null,
  };
}

export function getGame() {
  return game;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function startGame(seed = 1) {
  game = makeGame(seed);
  emit();
  return game;
}

// Replay: new seed (so the storm may come on a different day), same loadout to adjust.
export function restart() {
  game = makeGame(game.seed + 1, game.campaign.loadout);
  emit();
  return game;
}

export function buy(itemId) {
  if (game.phase !== 'prep') return { ok: false, reason: 'wrong-phase' };
  const r = addItem(game.campaign, itemId, ITEMS);
  if (r.ok) {
    game = { ...game, campaign: r.campaign, state: buildEngineState(r.campaign, ITEMS) };
    emit();
  }
  return r;
}

export function sell(itemId) {
  if (game.phase !== 'prep') return { ok: false, reason: 'wrong-phase' };
  const r = removeItem(game.campaign, itemId, ITEMS);
  if (r.ok) {
    game = { ...game, campaign: r.campaign, state: buildEngineState(r.campaign, ITEMS) };
    emit();
  }
  return r;
}

export function launch() {
  if (game.phase !== 'prep') return false;
  game = { ...game, phase: 'colony', lastDay: null };
  emit();
  return true;
}

export function getPending() {
  if (game.phase !== 'colony') return null;
  return pendingDecision(game.state, game.scenario, EVENTS);
}

export function pickOption(optionId) {
  const pending = getPending();
  if (!pending || !pending.options.some((o) => o.id === optionId)) return false;
  game = { ...game, scenario: choose(game.scenario, pending.id, optionId) };
  emit();
  return true;
}

export function endDay() {
  if (game.phase !== 'colony' || game.state.finished || getPending()) return false;
  const step = stepDay(game.state, game.scenario, EVENTS);
  game = { ...game, state: step.state, lastDay: step };
  emit();
  return true;
}