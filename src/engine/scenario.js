import { CONFIG } from './config.js';
import { nextRandom } from './rng.js';
import { tick } from './tick.js';
import { FOCUS, SHIELD_MAX } from './focus.js';

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

// Runs one day with any active events applied, and the crew's focus for the day.
// Effects carry "causes" so the debrief can explain what led to what.
export function stepDay(state, scenario, events, focusId = 'balanced') {
  const day = state.sol + 1;
  const focus = FOCUS[focusId] || FOCUS.balanced;
  const active = scenario.schedule.filter((s) => day >= s.start && day <= s.end);

  let dustLoss = 0;
  let priority = CONFIG.defaultPriority;
  let researchFactor = focus.research;
  let burst = 0;
  const causes = [];

  for (const slot of active) {
    const ev = byId(events, slot.eventId);
    dustLoss = Math.max(dustLoss, ev.dustLoss ?? 0);
    const optionId = scenario.choices[ev.id] ?? ev.defaultOption;
    const option = ev.options.find((o) => o.id === optionId);
    if (option.priority) priority = option.priority;
    if (option.researchFactor !== undefined) researchFactor *= option.researchFactor;
    // GAME RULE: a radiation burst, reduced by the outpost's shielding and the player's choice.
    if (ev.burst && day === slot.start) {
      burst += ev.burst * (option.exposureFactor ?? 1) * (1 - state.protection.shielding);
    }
    causes.push(`event:${ev.id}`, `decision:${ev.id}:${option.id}`);
  }

  const ready = { ...state, env: { ...state.env, dustLoss } };
  const result = tick(ready, priority);
  let next = result.state;
  const effects = result.effects.map((e) => ({ ...e, causes }));

  if (researchFactor !== 1) {
    const gained = next.research - state.research;
    next = { ...next, research: Math.min(100, state.research + gained * researchFactor) };
  }
  // The crew's focus: stronger walls for good, or recovering crops.
  if (focus.shielding) {
    next = {
      ...next,
      protection: {
        ...next.protection,
        shielding: Math.min(SHIELD_MAX, next.protection.shielding + focus.shielding),
      },
    };
  }
  if (focus.crops) {
    next = { ...next, crops: Math.min(100, next.crops + focus.crops) };
  }
  if (burst > 0) {
    next = {
      ...next,
      protection: { ...next.protection, exposure: next.protection.exposure + burst },
    };
    effects.push({ system: 'protection', kind: 'burst', points: Math.round(burst), causes });
  }

  return { state: next, effects, day, activeEvents: active.map((s) => s.eventId) };
}

// Plays a whole mission. chooser(event) returns an option id, or null for the default.
// focusFor(day) says what the crew did each day. Used by tests and the "What if?" replays.
export function runMission(
  startState,
  seed,
  events,
  chooser = () => null,
  focusFor = () => 'balanced'
) {
  let scenario = createScenario(seed, events);
  let state = startState;
  const log = [];
  while (!state.finished) {
    const pending = pendingDecision(state, scenario, events);
    if (pending) {
      const optionId = chooser(pending);
      if (optionId) scenario = choose(scenario, pending.id, optionId);
    }
    const step = stepDay(state, scenario, events, focusFor(state.sol + 1));
    state = step.state;
    log.push({ day: step.day, effects: step.effects });
  }
  return { state, scenario, log };
}