import { describe, it, expect } from 'vitest';
import EVENTS from '../src/data/events.json';
import {
  createInitialState,
  createScenario,
  choose,
  stepDay,
  availableFocuses,
  SHIELD_MAX,
} from '../src/engine/index.js';
import { briefingLines, eveningReport } from '../src/story/briefing.js';
import {
  startGame,
  getGame,
  buy,
  launch,
  getPending,
  getPendingQuestion,
  answerQuestion,
  pickOption,
  advanceDialogue,
  chooseAction,
  finishWatch,
  nextDay,
  showDebrief,
} from '../src/state/store.js';
import { buildDebrief } from '../src/campaign/index.js';

const calm = () => createScenario(1, []);
const run = (state, focus) => stepDay(state, calm(), [], focus).state;

describe('what the crew does with a day', () => {
  it('science doubles the research gain', () => {
    const base = createInitialState();
    expect(run(base, 'balanced').research).toBeCloseTo(5);
    expect(run(base, 'science').research).toBeCloseTo(10);
  });

  it('strengthening the walls costs research and adds shielding, up to a limit', () => {
    const r = run(createInitialState(), 'reinforce');
    expect(r.research).toBe(0);
    expect(r.protection.shielding).toBeCloseTo(0.54);
    const near = createInitialState();
    near.protection.shielding = 0.94;
    expect(run(near, 'reinforce').protection.shielding).toBeCloseTo(SHIELD_MAX);
  });

  it('gardening helps crops and halves research', () => {
    const base = createInitialState();
    base.crops = 50;
    const r = run(base, 'garden');
    expect(r.crops).toBeCloseTo(68);
    expect(r.research).toBeCloseTo(2.5);
  });

  it('an unknown focus acts like a normal day', () => {
    const base = createInitialState();
    expect(run(base, 'dance')).toEqual(run(base, 'balanced'));
  });

  it('sheltering and working on science do not cancel out', () => {
    const solar = EVENTS.filter((e) => e.id === 'solar-storm').map((e) => ({
      ...e,
      startRange: [12, 12],
    }));
    const state = { ...createInitialState(), sol: 11, research: 50 };
    const sheltered = choose(createScenario(1, solar), 'solar-storm', 'full-shelter');
    const working = choose(createScenario(1, solar), 'solar-storm', 'keep-working');
    expect(stepDay(state, sheltered, solar, 'science').state.research).toBeCloseTo(50);
    expect(stepDay(state, working, solar, 'science').state.research).toBeCloseTo(60);
  });
});

describe('the choices offered', () => {
  it('switch off when they would do nothing useful', () => {
    const list = availableFocuses(createInitialState());
    expect(list.map((f) => f.id)).toEqual(['science', 'reinforce', 'garden']);
    expect(list.find((f) => f.id === 'garden').enabled).toBe(false);
    expect(list.find((f) => f.id === 'science').enabled).toBe(true);
  });

  it('always leave something to do', () => {
    const s = createInitialState();
    s.research = 100;
    s.protection.shielding = SHIELD_MAX;
    const list = availableFocuses(s);
    expect(list.some((f) => f.enabled)).toBe(true);
  });
});

describe('briefing and evening report', () => {
  it('welcomes on day 1 and reacts to the outpost', () => {
    const day1 = briefingLines({ state: createInitialState(), lastDay: null });
    expect(day1[0].text).toContain('Welcome');
    const later = briefingLines({ state: { ...createInitialState(), sol: 4 }, lastDay: null });
    expect(later[0].text).toContain('Day 5 of 20');
    const wilting = briefingLines({ state: { ...createInitialState(), crops: 30 }, lastDay: null });
    expect(wilting.map((l) => l.text).join(' ')).toContain('greenhouse is at 30%');
    for (const l of [...day1, ...later, ...wilting]) expect(l.text).not.toMatch(/[{}]/);
  });

  it('lists what changed with arrows', () => {
    const before = createInitialState();
    const after = run(before, 'science');
    const rep = eveningReport({
      state: after,
      day: { focus: 'science', before },
      lastDay: { effects: [] },
    });
    expect(rep.rows.some((r) => r.text.includes('Research ▲ +10%'))).toBe(true);
    expect(rep.summary).toContain('experiments');
  });
});

// Plays one day the way the screen does it.
function playDay() {
  let guard = 0;
  while (getGame().day.stage === 'briefing' && guard++ < 10) advanceDialogue();
  const q = getPendingQuestion();
  if (q) answerQuestion(q.id, q.correct);
  if (getPending()) {
    const id = getPending().id;
    while (!getGame().story.introDone[id] && guard++ < 30) advanceDialogue();
    pickOption(getPending().options[0].id);
    while (getGame().story.reply && guard++ < 60) advanceDialogue();
  }
  const pick = availableFocuses(getGame().state).find((f) => f.enabled).id;
  const ok = chooseAction(pick);
  if (ok) finishWatch();
  return ok;
}

describe('a day in the game', () => {
  it('goes briefing, action, watch, report, next day', () => {
    startGame(1);
    buy('solar-array');
    launch();
    expect(getGame().day.stage).toBe('briefing');
    expect(chooseAction('science')).toBe(false);

    const total = briefingLines(getGame()).length;
    for (let i = 0; i < total; i++) expect(advanceDialogue()).toBe(true);
    expect(getGame().day.stage).toBe('play');

    expect(chooseAction('garden')).toBe(false); // the plants are healthy
    expect(chooseAction('science')).toBe(true);
    expect(getGame().state.sol).toBe(1);
    expect(getGame().day.stage).toBe('watch');
    expect(chooseAction('science')).toBe(false);

    expect(finishWatch()).toBe(true);
    expect(getGame().day.stage).toBe('report');
    expect(nextDay()).toBe(true);
    expect(getGame().day.stage).toBe('briefing');
    expect(getGame().focusLog).toEqual(['science']);
  });

  it('plays a full mission through the new loop', () => {
    startGame(1);
    buy('solar-array');
    buy('battery-pack');
    launch();
    let guard = 0;
    while (!getGame().state.finished && guard++ < 40) {
      expect(playDay()).toBe(true);
      if (!getGame().state.finished) nextDay();
    }
    expect(getGame().state.finished).toBe(true);
    expect(getGame().focusLog.length).toBe(getGame().state.sol);
    expect(showDebrief()).toBe(true);
  });
});