import EVENTS from '../data/events.json';
import { createCampaign, addItem, buildEngineState } from '../campaign/index.js';
import { createScenario, choose, pendingDecision, stepDay } from '../engine/index.js';

// TEMPORARY: a fixed loadout until the shop screen exists (Milestone 5).
const DEFAULT_LOADOUT = ['solar-array', 'battery-pack'];

const listeners = new Set();
let game = null;

function emit() {
  listeners.forEach((fn) => fn(game));
}

function buildGame(seed) {
  let campaign = createCampaign({ seed });
  for (const id of DEFAULT_LOADOUT) {
    const result = addItem(campaign, id);
    if (result.ok) campaign = result.campaign;
  }
  return {
    seed,
    campaign,
    state: buildEngineState(campaign),
    scenario: createScenario(seed, EVENTS),
    events: EVENTS,
    lastDay: null, // { day, effects, activeEvents } from the most recent day
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
  game = buildGame(seed);
  emit();
  return game;
}

export function restart() {
  return startGame(game.seed + 1);
}

export function getPending() {
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
  if (game.state.finished || getPending()) return false;
  const step = stepDay(game.state, game.scenario, EVENTS);
  game = { ...game, state: step.state, lastDay: step };
  emit();
  return true;
}