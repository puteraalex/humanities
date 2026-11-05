import { describe, it, expect } from 'vitest';
import EVENTS from '../src/data/events.json';
import {
  createInitialState,
  createScenario,
  scheduleEvents,
  pendingDecision,
  choose,
  stepDay,
  runMission,
} from '../src/engine/index.js';
import { createCampaign, addItem, buildEngineState } from '../src/campaign/index.js';

// Storm always starts on day 4 so the tests can compare choices fairly.
const FIXED = EVENTS.map((e) => ({ ...e, startRange: [4, 4] }));

function prepared() {
  let c = createCampaign();
  c = addItem(c, 'solar-array').campaign;
  c = addItem(c, 'battery-pack').campaign;
  return buildEngineState(c);
}

const play = (optionId) => runMission(prepared(), 1, FIXED, () => optionId);

describe('seeded schedule', () => {
  it('is repeatable and stays inside the allowed range', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const a = scheduleEvents(seed, EVENTS);
      const b = scheduleEvents(seed, EVENTS);
      expect(a).toEqual(b);
      expect(a[0].start).toBeGreaterThanOrEqual(4);
      expect(a[0].start).toBeLessThanOrEqual(8);
    }
  });

  it('gives different seeds different storm days', () => {
    const starts = new Set();
    for (let seed = 1; seed <= 30; seed++) starts.add(scheduleEvents(seed, EVENTS)[0].start);
    expect(starts.size).toBeGreaterThan(1);
  });
});

describe('decisions and storm days', () => {
  it('asks for a decision on the warning day only, and only once', () => {
    const scenario = createScenario(1, FIXED);
    const early = { ...createInitialState(), sol: 1 };
    const warnDay = { ...createInitialState(), sol: 2 };
    expect(pendingDecision(early, scenario, FIXED)).toBeNull();
    expect(pendingDecision(warnDay, scenario, FIXED).id).toBe('dust-storm');
    const answered = choose(scenario, 'dust-storm', 'protect-crops');
    expect(pendingDecision(warnDay, answered, FIXED)).toBeNull();
  });

  it('blocks sunlight only during the storm', () => {
    const scenario = createScenario(1, FIXED);
    const clear = stepDay({ ...createInitialState(), sol: 0 }, scenario, FIXED);
    const stormy = stepDay({ ...createInitialState(), sol: 3 }, scenario, FIXED);
    const after = stepDay({ ...createInitialState(), sol: 8 }, scenario, FIXED);
    expect(clear.state.env.dustLoss).toBe(0);
    expect(stormy.state.env.dustLoss).toBe(0.6);
    expect(after.state.env.dustLoss).toBe(0);
  });
});

describe('consequences of each choice', () => {
  it('every mission can be played to the end and is repeatable', () => {
    const a = play('protect-crew');
    const b = play('protect-crew');
    expect(a.state.finished).toBe(true);
    expect(a.state).toEqual(b.state);
  });

  it('all three prepared choices survive but end differently', () => {
    const crew = play('protect-crew').state;
    const crops = play('protect-crops').state;
    const science = play('keep-science').state;
    expect(crew.alive && crops.alive && science.alive).toBe(true);

    const outcomes = new Set(
      [crew, crops, science].map((s) =>
        JSON.stringify([Math.round(s.research), Math.round(s.stocks.food), Math.round(s.protection.exposure)])
      )
    );
    expect(outcomes.size).toBe(3);
  });

  it('has a trade-off: no option wins on everything', () => {
    const crew = play('protect-crew').state;
    const crops = play('protect-crops').state;
    const science = play('keep-science').state;
    expect(crew.protection.exposure).toBeLessThan(crops.protection.exposure);
    expect(crops.stocks.food).toBeGreaterThan(crew.stocks.food);
    expect(science.research).toBeGreaterThan(crew.research);
    expect(science.stocks.food).toBeLessThan(crew.stocks.food);
  });

  it('preparation matters during a storm', () => {
    const bare = runMission(buildEngineState(createCampaign()), 1, FIXED).state;
    const ready = runMission(prepared(), 1, FIXED).state;
    expect(ready.health).toBeGreaterThan(bare.health);
  });

  it('tags consequences with the decision that caused them', () => {
    const { log } = play('protect-crops');
    const tagged = log.some((entry) =>
      entry.effects.some((e) => e.causes.includes('decision:dust-storm:protect-crops'))
    );
    expect(tagged).toBe(true);
  });
});