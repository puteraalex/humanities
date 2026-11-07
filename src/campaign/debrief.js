import { CONFIG, runMission } from '../engine/index.js';
import { buildEngineState, totals } from './loadout.js';
import { learningSummary } from './learning.js';


const round = Math.round;

const EFFECT_TEXT = {
  'underpowered:lifeSupport': 'Life support was short on power',
  'underpowered:protection': 'The radiation shield was short on power',
  'underpowered:greenhouse': 'The greenhouse was short on power, so crops shrank',
  'underpowered:research': 'Research had to wait for power',
  'empty:o2': 'The oxygen ran out',
  'empty:water': 'The water ran out',
  'empty:food': 'The food ran out',
  'over-limit:protection': 'Radiation went over the safe limit',
  'burst:protection': 'A radiation burst reached the outpost',
};

const EMPTY_HINT = {
  o2: 'Keep life support powered first.',
  water: 'Keep life support powered first.',
  food: 'Extra supplies or a powered greenhouse would help.',
};

// [7,8,9,12] -> "days 7-9, 12"
export function formatDays(days) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (!sorted.length) return '';
  const parts = [];
  let start = sorted[0];
  let prev = start;
  for (let i = 1; i <= sorted.length; i++) {
    const d = sorted[i];
    if (d === prev + 1) {
      prev = d;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = d;
    prev = d;
  }
  return (sorted.length > 1 ? 'days ' : 'day ') + parts.join(', ');
}

function summary(s) {
  return {
    alive: s.alive,
    sols: s.sol,
    health: round(s.health),
    research: round(s.research),
    food: round(s.stocks.food),
    exposure: round(s.protection.exposure),
  };
}

// Turns "event:dust-storm" / "decision:dust-storm:protect-crops" into readable text.
function causeLabels(game, causes) {
  const out = [];
  for (const c of causes) {
    const [type, evId, optId] = c.split(':');
    const ev = game.events.find((e) => e.id === evId);
    if (!ev) continue;
    if (type === 'event') out.push(ev.title);
    else {
      const opt = ev.options.find((o) => o.id === optId);
      if (opt) out.push(`You chose: ${opt.label}`);
    }
  }
  return [...new Set(out)];
}

function groupEffects(history) {
  const groups = new Map();
  for (const h of history) {
    for (const e of h.effects) {
      const key = `${e.kind}:${e.system}`;
      if (!EFFECT_TEXT[key]) continue;
      const g = groups.get(key) ?? { key, days: [], causes: new Set(), points: null };
      g.days.push(h.day);
      (e.causes || []).forEach((c) => g.causes.add(c));
      if (e.points !== undefined && g.points === null) g.points = e.points;
      groups.set(key, g);
    }
  }
  return groups;
}

// First day the battery hit zero while a sun-blocking event was active.
function findDry(game) {
  return game.history.find(
    (h) =>
      h.snap.battery <= 0 &&
      h.activeEvents.some((id) => (game.events.find((e) => e.id === id)?.dustLoss ?? 0) > 0)
  );
}

function buildTrail(game, startState, groups, dry) {
  const { campaign, items, events, scenario, state } = game;
  const t = totals(campaign, items);
  const nodes = [];

  const counts = {};
  for (const id of campaign.loadout) counts[id] = (counts[id] || 0) + 1;
  const names = Object.keys(counts).map(
    (id) => `${items.find((i) => i.id === id).name} x${counts[id]}`
  );
  const start = `The outpost started with ${startState.power.generation} power units, a ${startState.power.batteryMax}-unit battery and ${round(startState.protection.shielding * 100)}% shielding.`;
  nodes.push({
    day: 0,
    kind: 'prep',
    title: 'You packed for Mars',
    text: names.length ? `${names.join(', ')}. ${start}` : `You packed no extra gear. ${start}`,
    meta: `Budget used ${t.cost} of ${campaign.budgetTotal}. Mass used ${t.mass} of ${campaign.massLimit}.`,
  });

  const slots = scenario.schedule.filter((s) => s.start <= state.sol);
  for (const slot of slots) {
    const ev = events.find((e) => e.id === slot.eventId);
    const opt = ev.options.find((o) => o.id === (scenario.choices[ev.id] ?? ev.defaultOption));
    nodes.push({
      day: slot.warnDay,
      kind: 'event',
      title: `Warning: ${ev.title}`,
      text: `It hit on day ${slot.start}${ev.duration > 1 ? ` and lasted until day ${slot.end}` : ''}.`,
    });
    nodes.push({
      day: slot.warnDay,
      kind: 'decision',
      title: `You chose: ${opt.label}`,
      text: `Good: ${opt.benefit} Cost: ${opt.cost}`,
    });
  }

  for (const g of groups.values()) {
    const because = causeLabels(game, g.causes);
    nodes.push({
      day: Math.min(...g.days),
      kind: 'effect',
      title: EFFECT_TEXT[g.key],
      text: `${formatDays(g.days)}${g.points !== null ? `. About ${g.points} radiation points got through` : ''}.`,
      because: because.length ? because : ['What you packed on Earth'],
    });
  }

  if (dry) {
    const because = causeLabels(game, new Set(dry.effects.flatMap((e) => e.causes || [])));
    nodes.push({
      day: dry.day,
      kind: 'effect',
      title: 'The battery ran out',
      text: `On day ${dry.day}, while sunlight was blocked.`,
      because: because.length ? because : ['The storm blocked sunlight'],
    });
  }

  nodes.push({
    day: Infinity,
    kind: 'outcome',
    title: state.alive ? 'The crew survived!' : 'The mission failed',
    text:
      state.endReason === 'health'
        ? `Crew health reached zero on day ${state.sol}.`
        : `All ${state.sol} days finished with ${round(state.health)}% health.`,
  });

  return nodes.sort((a, b) => a.day - b.day); // stable: ties keep insertion order
}

function buildReview(game, groups, dry) {
  const { state, campaign, items, scenario } = game;
  const t = totals(campaign, items);
  const wentWell = [];
  const improve = [];
  const emptyKeys = [...groups.keys()].filter((k) => k.startsWith('empty:'));
  const solarHappened = scenario.schedule.some(
    (s) => s.eventId === 'solar-storm' && s.start <= state.sol
  );

  if (state.alive) wentWell.push({ text: `The crew survived all ${state.sol} days.` });
  if (!emptyKeys.length) wentWell.push({ text: 'Air, water and food never ran out.' });
  if (state.protection.exposure <= CONFIG.exposureLimit) {
    wentWell.push({ text: 'Radiation stayed under the safe limit.' });
  }
  if (state.research >= 80) wentWell.push({ text: `Research reached ${round(state.research)}%.` });

  for (const key of emptyKeys) {
    const g = groups.get(key);
    improve.push({
      text: `${EFFECT_TEXT[key]} (${formatDays(g.days)}). ${EMPTY_HINT[key.split(':')[1]]}`,
    });
  }
  if (state.protection.exposure > CONFIG.exposureLimit) {
    improve.push({
      text: 'Radiation went over the safe limit. A Radiation Shield Wall, or sheltering during a solar storm, lowers it.',
      cardId: solarHappened ? 'spe-2024' : null,
    });
  }
  if (dry) {
    improve.push({
      text: `The battery ran out on day ${dry.day} while sunlight was blocked. More panels or batteries keep systems running longer.`,
      cardId: 'dust-power',
    });
  }
  if (state.research < 50) {
    improve.push({
      text: `Research only reached ${round(state.research)}%. Research slows down whenever it waits for power.`,
    });
  }
  if (improve.length && t.budgetLeft >= 25 && t.massLeft >= 8) {
    improve.push({
      text: `You left ${t.budgetLeft} budget and ${t.massLeft} mass unused. Extra gear might have helped.`,
    });
  }
  if (!improve.length) {
    improve.push({ text: 'Try a different loadout or storm choice to see how the trade-offs change.' });
  }
  return { wentWell, improve };
}

// Re-runs the same mission (same seed, same gear), changing one decision at a time.
export function whatIf(game) {
  const start = buildEngineState(game.campaign, game.items);
  const choiceOf = (ev) => game.scenario.choices[ev.id] ?? ev.defaultOption;
  const focusFor = (day) => (game.focusLog && game.focusLog[day - 1]) || 'balanced';
  const happened = game.scenario.schedule.filter((s) => s.start <= game.state.sol);
  return happened.map((slot) => {
    const ev = game.events.find((e) => e.id === slot.eventId);
    const chosen = choiceOf(ev);
    const options = ev.options.map((o) => {
      const run = runMission(
        start,
        game.seed,
        game.events,
        (pending) => (pending.id === ev.id ? o.id : choiceOf(pending)),
        focusFor
      );
      return { id: o.id, label: o.label, chosen: o.id === chosen, ...summary(run.state) };
    });
    return { eventId: ev.id, title: ev.title, day: slot.start, options };
  });
}

function lowest(history, startState) {
  const low = {
    o2: startState.stocks.o2,
    water: startState.stocks.water,
    food: startState.stocks.food,
    battery: startState.power.battery,
  };
  for (const h of history) {
    for (const k of Object.keys(low)) low[k] = Math.min(low[k], h.snap[k]);
  }
  return Object.fromEntries(Object.entries(low).map(([k, v]) => [k, round(v)]));
}

// Everything the debrief screen shows, from recorded game data only.
export function buildDebrief(game) {
  const startState = buildEngineState(game.campaign, game.items);
  const groups = groupEffects(game.history);
  const dry = findDry(game);
  return {
    outcome: { ...summary(game.state), endReason: game.state.endReason },
    left: {
      o2: round(game.state.stocks.o2),
      water: round(game.state.stocks.water),
      food: round(game.state.stocks.food),
      battery: round(game.state.power.battery),
    },
    lowest: lowest(game.history, startState),
    trail: buildTrail(game, startState, groups, dry),
    ...buildReview(game, groups, dry),
    whatIf: whatIf(game),
    learning: learningSummary(game),
  };
}