import EVENTS from '../data/events.json';
import ITEMS from '../data/items.json';
import QUESTIONS from '../data/questions.json';
import { createCampaign, addItem, removeItem, buildEngineState } from '../campaign/index.js';
import {
  createScenario,
  choose,
  pendingDecision,
  stepDay,
  historyEntry,
} from '../engine/index.js';

const listeners = new Set();
let game = null;
let attemptCounter = 0;
let sessionLog = []; // quiz answers for this browser session only

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
  attemptCounter += 1;
  return {
    seed,
    attempt: attemptCounter,
    phase: 'prep', // 'prep' -> 'colony' -> 'debrief'
    campaign,
    state: buildEngineState(campaign, ITEMS),
    scenario: createScenario(seed, EVENTS),
    events: EVENTS,
    items: ITEMS,
    lastDay: null,
    history: [],
    answers: {},
  };
}

export function getGame() {
  return game;
}

export function getSessionLog() {
  return sessionLog;
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

// New seed (storms may come on different days), same loadout to adjust.
export function restart() {
  game = makeGame(game.seed + 1, game.campaign.loadout);
  emit();
  return game;
}

// Same seed (same storm days) and same loadout: change only your choices.
export function retrySame() {
  game = makeGame(game.seed, game.campaign.loadout);
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
  game = { ...game, phase: 'colony', lastDay: null, history: [] };
  emit();
  return true;
}

export function getPending() {
  if (game.phase !== 'colony') return null;
  return pendingDecision(game.state, game.scenario, EVENTS);
}

// The "before" prediction question for today's decision, if it has not been answered yet.
export function getPendingQuestion() {
  const pending = getPending();
  if (!pending) return null;
  const q = QUESTIONS.find((x) => x.eventId === pending.id && x.when === 'before');
  if (!q || q.id in game.answers) return null;
  return q;
}

// "before" questions only during the mission (for today's event); "after" only in the debrief.
export function answerQuestion(questionId, optionId) {
  const q = QUESTIONS.find((x) => x.id === questionId);
  if (!q || questionId in game.answers) return false;
  if (!q.options.some((o) => o.id === optionId)) return false;
  if (q.when === 'before') {
    const pending = getPending();
    if (!pending || pending.id !== q.eventId) return false;
  } else if (game.phase !== 'debrief') {
    return false;
  }
  game = { ...game, answers: { ...game.answers, [questionId]: optionId } };
  sessionLog = [
    ...sessionLog,
    {
      attempt: game.attempt,
      qid: q.id,
      concept: q.concept,
      when: q.when,
      correct: optionId === q.correct,
    },
  ];
  emit();
  return true;
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
  game = {
    ...game,
    state: step.state,
    lastDay: step,
    history: [...game.history, historyEntry(step)],
  };
  emit();
  return true;
}

export function showDebrief() {
  if (game.phase !== 'colony' || !game.state.finished) return false;
  game = { ...game, phase: 'debrief' };
  emit();
  return true;
}