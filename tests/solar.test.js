import { describe, it, expect } from 'vitest';
import EVENTS from '../src/data/events.json';
import CARDS from '../src/data/cards.json';
import SOURCES from '../src/data/sources.json';
import { scheduleEvents, runMission } from '../src/engine/index.js';
import { createCampaign, addItem, buildEngineState } from '../src/campaign/index.js';

const SOLAR = EVENTS.filter((e) => e.id === 'solar-storm').map((e) => ({
  ...e,
  startRange: [12, 12],
}));

function outpost(ids) {
  let c = createCampaign();
  for (const id of ids) c = addItem(c, id).campaign;
  return buildEngineState(c);
}
const base = () => outpost(['solar-array', 'battery-pack']);
const play = (state, optionId) => runMission(state, 1, SOLAR, () => optionId);

describe('solar storm event', () => {
  it('is scheduled inside its range for every seed', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const start = scheduleEvents(seed, EVENTS)[1].start;
      expect(start).toBeGreaterThanOrEqual(13);
      expect(start).toBeLessThanOrEqual(16);
    }
  });

  it('trades radiation against research', () => {
    const full = play(base(), 'full-shelter').state;
    const part = play(base(), 'partial-shelter').state;
    const work = play(base(), 'keep-working').state;
    expect(full.protection.exposure).toBeLessThan(part.protection.exposure);
    expect(part.protection.exposure).toBeLessThan(work.protection.exposure);
    expect(full.research).toBeLessThan(part.research);
    expect(part.research).toBeLessThan(work.research);
    expect(full.health).toBeGreaterThan(work.health);
  });

  it('better shielding from the shop lowers the burst', () => {
    const plain = play(base(), 'keep-working').state;
    const shielded = play(
      outpost(['solar-array', 'battery-pack', 'radiation-shield']),
      'keep-working'
    ).state;
    expect(shielded.protection.exposure).toBeLessThan(plain.protection.exposure);
  });

  it('logs the burst with its causes', () => {
    const { log } = play(base(), 'full-shelter');
    const burst = log.flatMap((l) => l.effects).find((e) => e.kind === 'burst');
    expect(burst).toBeDefined();
    expect(burst.causes).toContain('event:solar-storm');
    expect(burst.causes).toContain('decision:solar-storm:full-shelter');
  });
});

describe('traceable science', () => {
  it('every event card and every card source exists', () => {
    for (const ev of EVENTS) {
      if (ev.cardId) expect(CARDS.some((c) => c.id === ev.cardId)).toBe(true);
    }
    for (const card of CARDS) {
      expect(SOURCES.some((s) => s.id === card.sourceId)).toBe(true);
    }
  });

  it('real sources have a link and plain-language notes', () => {
    for (const s of SOURCES.filter((x) => x.kind === 'measured')) {
      expect(s.url.startsWith('https://')).toBe(true);
      expect(s.used.length).toBeGreaterThan(20);
      expect(s.affects.length).toBeGreaterThan(20);
      expect(s.simplified.length).toBeGreaterThan(20);
    }
  });

  it('measured cards point to measured sources', () => {
    for (const card of CARDS.filter((c) => c.kind === 'measured')) {
      expect(SOURCES.find((s) => s.id === card.sourceId).kind).toBe('measured');
    }
  });
});