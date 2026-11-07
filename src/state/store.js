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
  availableFocuses,
} from '../engine/index.js';
import { introLines, replyLines } from '../story/dialogue.js';
import { briefingLines } from '../story/briefing.js';

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
    // where we are in the story talk: intro lines, finished intros, and the reply to a choice
    story: { introIndex: 0, introDone: {}, reply: null },
    // where we are in the day: 'briefing' -> 'play' -> 'watch' -> 'report'
    day: { stage: 'briefing', briefIndex: 0 },
    // what the crew did each day (the debrief replays with this)
    focusLog: [],
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
  game = {
    ...game,
    phase: 'colony',
    lastDay: null,
    history: [],
    focusLog: [],
    day: { stage: 'briefing', briefIndex: 0 },
  };
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

// Picks an option, then queues the characters' reaction (if the story has one).
export function pickOption(optionId) {
  const pending = getPending();
  if (!pending || !pending.options.some((o) => o.id === optionId)) return false;
  const next = { ...game, scenario: choose(game.scenario, pending.id, optionId) };
  const lines = replyLines(pending.id, optionId, next);
  game = {
    ...next,
    story: {
      ...game.story,
      reply: lines.length ? { eventId: pending.id, optionId, index: 0 } : null,
    },
  };
  emit();
  return true;
}

// Moves the on-screen conversation forward by one line. Returns false when there is none.
export function advanceDialogue() {
  if (game.phase !== 'colony') return false;

  // the morning briefing
  if (game.day.stage === 'briefing') {
    const lines = briefingLines(game);
    const nextIndex = game.day.briefIndex + 1;
    game = {
      ...game,
      day:
        nextIndex >= lines.length
          ? { stage: 'play', briefIndex: 0 }
          : { ...game.day, briefIndex: nextIndex },
    };
    emit();
    return true;
  }

  if (game.story.reply) {
    const { eventId, optionId, index } = game.story.reply;
    const lines = replyLines(eventId, optionId, game);
    const nextIndex = index + 1;
    game = {
      ...game,
      story: {
        ...game.story,
        reply: nextIndex >= lines.length ? null : { eventId, optionId, index: nextIndex },
      },
    };
    emit();
    return true;
  }

  const pending = getPending();
  if (pending && !getPendingQuestion() && !game.story.introDone[pending.id]) {
    const lines = introLines(pending.id, game, pending);
    const nextIndex = game.story.introIndex + 1;
    game = {
      ...game,
      story:
        nextIndex >= lines.length
          ? { ...game.story, introIndex: 0, introDone: { ...game.story.introDone, [pending.id]: true } }
          : { ...game.story, introIndex: nextIndex },
    };
    emit();
    return true;
  }
  return false;
}

// The player's choice for the day: what the crew spends it on. Runs the day.
export function chooseAction(focusId) {
  if (game.phase !== 'colony' || game.state.finished) return false;
  if (game.day.stage !== 'play' || getPending()) return false;
  const choice = availableFocuses(game.state).find((f) => f.id === focusId);
  if (!choice || !choice.enabled) return false;

  const before = game.state;
  const step = stepDay(game.state, game.scenario, EVENTS, focusId);
  game = {
    ...game,
    state: step.state,
    lastDay: step,
    history: [...game.history, historyEntry(step)],
    focusLog: [...game.focusLog, focusId],
    day: { stage: 'watch', focus: focusId, before },
  };
  emit();
  return true;
}

// After a few seconds of watching the outpost, the evening report comes up.
export function finishWatch() {
  if (game.phase !== 'colony' || game.day.stage !== 'watch') return false;
  game = { ...game, day: { ...game.day, stage: 'report' } };
  emit();
  return true;
}

export function nextDay() {
  if (game.phase !== 'colony' || game.day.stage !== 'report' || game.state.finished) return false;
  game = { ...game, day: { stage: 'briefing', briefIndex: 0 } };
  emit();
  return true;
}

// Older, simpler way to run a day (used by the tests): no briefing, no report.
export function endDay(focusId = 'balanced') {
  if (game.phase !== 'colony' || game.state.finished || getPending()) return false;
  const step = stepDay(game.state, game.scenario, EVENTS, focusId);
  game = {
    ...game,
    state: step.state,
    lastDay: step,
    history: [...game.history, historyEntry(step)],
    focusLog: [...game.focusLog, focusId],
    day: { stage: 'play', briefIndex: 0 },
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

// ---- Title and story screens (UI only, not part of the game state) ----
let screen = null; // 'title' | 'story' | null
let storyStep = 0;

export function getScreen() {
  return screen;
}

export function setScreen(name) {
  screen = name;
  if (game) emit();
}

export function getStoryStep() {
  return storyStep;
}

export function startStory() {
  screen = 'story';
  storyStep = 0;
  if (game) emit();
}

export function nextStory(total) {
  storyStep += 1;
  if (storyStep >= total) {
    screen = null;
    storyStep = 0;
  }
  if (game) emit();
}

export function skipStory() {
  screen = null;
  storyStep = 0;
  if (game) emit();
}