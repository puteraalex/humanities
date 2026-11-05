import { CONFIG } from './config.js';
import { nextRandom } from './rng.js';
import { tick } from './tick.js';

const byId = (events, id) => events.find((e) => e.id === id);

// Picks each event's start day from the seed. Same seed = same schedule.
export function scheduleEvents(seed, events) {
  let s = seed;
  return events.map((ev) => {
    const [lo, hi] = ev.startRange;
    const r = nextRandom(s);
    s = r.seed;
    const start = lo + Math.floor(r.value * (hi - lo + 1));
    return {
      eventId: ev.id,
      start,
      end: start + ev.duration - 1,
      warnDay: start - ev.warnSols,
    };
  });
}

export function createScenario(seed, events) {
  return { seed, schedule: scheduleEvents(seed, events), choices: {} };
}

export function choose(scenario, eventId, optionId) {
  return { ...scenario, choices: { ...scenario.choices, [eventId]: optionId } };
}

// "Day" is the sol about to be simulated (state.sol + 1).
// Returns the event the player must decide on today, or null.
export function pendingDecision(state, scenario, events) {
  const day = state.sol + 1;
  for (const slot of scenario.schedule) {
    if (day === slot.warnDay && !(slot.eventId in scenario.choices)) {
      return byId(events, slot.eventId);
    }
  }
  return null;
}

// Runs one day with any active events applied.
// Effects carry "causes" so the debrief can explain what led to what.
export function stepDay(state, scenario, events) {
  const day = state.sol + 1;
  const active = scenario.schedule.filter((s) => day >= s.start && day <= s.end);

  let dustLoss = 0;
  let priority = CONFIG.defaultPriority;
  const causes = [];

  for (const slot of active) {
    const ev = byId(events, slot.eventId);
    dustLoss = Math.max(dustLoss, ev.dustLoss);
    const optionId = scenario.choices[ev.id] ?? ev.defaultOption;
    const option = ev.options.find((o) => o.id === optionId);
    priority = option.priority;
    causes.push(`event:${ev.id}`, `decision:${ev.id}:${option.id}`);
  }

  const ready = { ...state, env: { ...state.env, dustLoss } };
  const result = tick(ready, priority);
  return {
    state: result.state,
    effects: result.effects.map((e) => ({ ...e, causes })),
    day,
    activeEvents: active.map((s) => s.eventId),
  };
}

// Plays a whole mission. chooser(event) returns an option id, or null for the default.
// Used by tests now and by "What if?" replays later.
export function runMission(startState, seed, events, chooser = () => null) {
  let scenario = createScenario(seed, events);
  let state = startState;
  const log = [];
  while (!state.finished) {
    const pending = pendingDecision(state, scenario, events);
    if (pending) {
      const optionId = chooser(pending);
      if (optionId) scenario = choose(scenario, pending.id, optionId);
    }
    const step = stepDay(state, scenario, events);
    state = step.state;
    log.push({ day: step.day, effects: step.effects });
  }
  return { state, scenario, log };
}