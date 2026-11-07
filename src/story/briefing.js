import { CONFIG, FOCUS } from '../engine/index.js';

const CALM = [
  'All systems are calm this morning.',
  'A quiet morning on Mars. The sky is clear.',
  'Good news: nothing unusual on our sensors today.',
  'The outpost is running smoothly.',
  'Another calm sunrise over the outpost.',
];

const EFFECT_TEXT = {
  'underpowered:lifeSupport': 'Life support ran short on power yesterday.',
  'underpowered:protection': 'The radiation shield ran short on power yesterday.',
  'underpowered:greenhouse': 'The greenhouse ran short on power yesterday.',
  'underpowered:research': 'Research had to wait for power yesterday.',
  'empty:o2': 'Oxygen ran out yesterday!',
  'empty:water': 'Water ran out yesterday!',
  'empty:food': 'Food ran out yesterday!',
  'over-limit:protection': 'Radiation went over the safe limit yesterday.',
  'burst:protection': 'The solar storm sent a burst of radiation yesterday.',
};

// "yesterday" for the morning briefing, "today" for the evening report.
function effectTexts(lastDay, when) {
  if (!lastDay) return [];
  const seen = new Set();
  for (const e of lastDay.effects) {
    const text = EFFECT_TEXT[`${e.kind}:${e.system}`];
    if (text) seen.add(when === 'today' ? text.replace('yesterday', 'today') : text);
  }
  return [...seen];
}

// What the astronaut notices first.
function observation(s) {
  const food = Math.round(s.stocks.food);
  const crops = Math.round(s.crops);
  const exposure = Math.round(s.protection.exposure);
  const battery = Math.round((100 * s.power.battery) / s.power.batteryMax);
  if (food < 40) return `Food is getting low: ${food}%.`;
  if (crops < 60) return `The greenhouse is at ${crops}%. The plants need care.`;
  if (exposure > 0.7 * CONFIG.exposureLimit) {
    return `Radiation is building up: ${exposure} of ${CONFIG.exposureLimit}.`;
  }
  if (battery < 50) return `The battery is at ${battery}%.`;
  return `Everything looks fine. Research is at ${Math.round(s.research)}%.`;
}

export function briefingLines(game) {
  const s = game.state;
  const day = s.sol + 1;
  const lines = [];
  if (day === 1) {
    lines.push({
      who: 'control',
      text: 'Welcome, Humanities-01. Every day: listen to the briefing, check the outpost, choose what the crew does, then watch what happens.',
    });
  }
  const issues = effectTexts(game.lastDay, 'yesterday');
  const news = issues.length ? issues[0] : CALM[(day - 1) % CALM.length];
  lines.push({ who: 'control', text: `Day ${day} of ${CONFIG.missionSols}. ${news}` });
  lines.push({ who: 'astro', text: observation(s) });
  return lines;
}

// What changed today, as small numbers the player can read.
export function eveningReport(game) {
  const after = game.state;
  const before = game.day && game.day.before ? game.day.before : after;
  const focus = FOCUS[game.day && game.day.focus] || FOCUS.balanced;
  const r = Math.round;
  const batteryPct = (s) => r((100 * s.power.battery) / s.power.batteryMax);

  const rows = [
    { label: 'Research', delta: r(after.research) - r(before.research), unit: '%', goodWhenUp: true },
    {
      label: 'Radiation shield strength',
      delta: r(after.protection.shielding * 100) - r(before.protection.shielding * 100),
      unit: '%',
      goodWhenUp: true,
    },
    { label: 'Crops', delta: r(after.crops) - r(before.crops), unit: '%', goodWhenUp: true },
    { label: 'Food', delta: r(after.stocks.food) - r(before.stocks.food), unit: '%', goodWhenUp: true },
    {
      label: 'Radiation taken in',
      delta: r(after.protection.exposure) - r(before.protection.exposure),
      unit: '',
      goodWhenUp: false,
    },
    { label: 'Battery', delta: batteryPct(after) - batteryPct(before), unit: '%', goodWhenUp: true },
  ]
    .filter((x) => x.delta !== 0)
    .map((x) => ({
      ...x,
      text: `${x.label} ${x.delta > 0 ? '▲ +' : '▼ '}${x.delta}${x.unit}`,
      good: x.goodWhenUp ? x.delta > 0 : x.delta < 0,
    }));

  return {
    day: before.sol + 1,
    summary: focus.summary,
    rows,
    notes: effectTexts(game.lastDay, 'today'),
    finished: after.finished,
    alive: after.alive,
  };
}