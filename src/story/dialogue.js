import STORY from '../data/story.json';
import { createInitialState } from '../engine/index.js';

export const SPEAKERS = {
  control: 'Mission Control',
  astro: 'Astronaut',
  note: 'Science note',
};

// What the outpost starts with, so "extra" means "more than the basics".
const BASE = createInitialState();

// Which lines to show depends on what the player packed.
export const CONDITIONS = {
  hasBattery: (s) => s.power.batteryMax > BASE.power.batteryMax,
  noBattery: (s) => s.power.batteryMax <= BASE.power.batteryMax,
  extraPower: (s) => s.power.generation > BASE.power.generation,
  basePower: (s) => s.power.generation <= BASE.power.generation,
  hasShield: (s) => s.protection.shielding > BASE.protection.shielding,
  noShield: (s) => s.protection.shielding <= BASE.protection.shielding,
};

export function contextFor(game, event) {
  const s = game.state;
  return {
    blocked: event ? Math.round((event.dustLoss || 0) * 100) : 0,
    power: s.power.generation,
    battery: Math.round((100 * s.power.battery) / s.power.batteryMax),
    shield: Math.round(s.protection.shielding * 100),
  };
}

function fill(text, ctx) {
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in ctx ? String(ctx[key]) : match));
}

function build(lines, game, event) {
  const ctx = contextFor(game, event);
  return (lines || [])
    .filter((l) => !l.when || (CONDITIONS[l.when] && CONDITIONS[l.when](game.state)))
    .map((l) => ({ who: l.who, text: fill(l.text, ctx) }));
}

// The talk before a decision.
export function introLines(eventId, game, event) {
  const ev = event || game.events.find((e) => e.id === eventId);
  return build(STORY[eventId] && STORY[eventId].intro, game, ev);
}

// The talk after a decision, ending with a short science note.
export function replyLines(eventId, optionId, game) {
  const ev = game.events.find((e) => e.id === eventId);
  const reply = STORY[eventId] && STORY[eventId].reply && STORY[eventId].reply[optionId];
  const lines = build(reply, game, ev);
  const option = ev && ev.options.find((o) => o.id === optionId);
  if (lines.length && option) lines.push({ who: 'note', text: option.why });
  return lines;
}