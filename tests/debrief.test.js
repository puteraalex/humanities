import { describe, it, expect } from 'vitest';
import EVENTS from '../src/data/events.json';
import ITEMS from '../src/data/items.json';
import CARDS from '../src/data/cards.json';
import {
  createScenario,
  choose,
  pendingDecision,
  stepDay,
  historyEntry,
} from '../src/engine/index.js';
import {
  createCampaign,
  addItem,
  buildEngineState,
  buildDebrief,
  formatDays,
} from '../src/campaign/index.js';

// Dust storm on day 4, solar storm on day 12 so the tests are predictable.
const EV = EVENTS.map((e) => ({
  ...e,
  startRange: e.id === 'dust-storm' ? [4, 4] : [12, 12],
}));

function playGame(itemIds, pick) {
  let campaign = createCampaign({ seed: 1 });
  for (const id of itemIds) campaign = addItem(campaign, id).campaign;
  let scenario = createScenario(1, EV);
  let state = buildEngineState(campaign);
  const history = [];
  while (!state.finished) {
    const pending = pendingDecision(state, scenario, EV);
    if (pending) scenario = choose(scenario, pending.id, pick(pending));
    const step = stepDay(state, scenario, EV);
    state = step.state;
    history.push(historyEntry(step));
  }
  return { seed: 1, campaign, state, scenario, events: EV, items: ITEMS, history };
}

const picks = (p) => (p.id === 'dust-storm' ? 'protect-crops' : 'full-shelter');
const ready = () => playGame(['solar-array', 'battery-pack'], picks);

describe('formatDays', () => {
  it('writes ranges', () => {
    expect(formatDays([7, 8, 9, 12])).toBe('days 7-9, 12');
    expect(formatDays([5])).toBe('day 5');
    expect(formatDays([3, 4])).toBe('days 3-4');
    expect(formatDays([])).toBe('');
  });
});

describe('domino trail', () => {
  it('starts with packing and ends with the outcome', () => {
    const d = buildDebrief(ready());
    expect(d.trail[0].kind).toBe('prep');
    expect(d.trail[d.trail.length - 1].kind).toBe('outcome');
  });

  it('records each decision the player made', () => {
    const titles = buildDebrief(ready()).trail.map((n) => n.title);
    expect(titles).toContain('You chose: Protect the crops');
    expect(titles).toContain('You chose: Everyone shelters');
  });

  it('links consequences to the decision that caused them', () => {
    const d = buildDebrief(ready());
    const linked = d.trail.filter(
      (n) => n.kind === 'effect' && n.because.includes('You chose: Protect the crops')
    );
    expect(linked.length).toBeGreaterThan(0);
  });
});

describe('what if', () => {
  it('compares every option and matches what really happened', () => {
    const game = ready();
    const d = buildDebrief(game);
    expect(d.whatIf.length).toBe(2);
    for (const w of d.whatIf) {
      expect(w.options.length).toBe(3);
      expect(w.options.filter((o) => o.chosen).length).toBe(1);
      const mine = w.options.find((o) => o.chosen);
      expect(mine.alive).toBe(game.state.alive);
      expect(mine.health).toBe(Math.round(game.state.health));
      expect(mine.research).toBe(Math.round(game.state.research));
      expect(mine.exposure).toBe(Math.round(game.state.protection.exposure));
      expect(mine.food).toBe(Math.round(game.state.stocks.food));
    }
  });
});

describe('review', () => {
  it('always gives something to improve, with cards that exist', () => {
    const d = buildDebrief(playGame([], (p) => p.options[0].id));
    expect(d.improve.length).toBeGreaterThan(0);
    for (const item of d.improve) {
      if (item.cardId) expect(CARDS.some((c) => c.id === item.cardId)).toBe(true);
    }
  });

  it('matches the outcome', () => {
    const game = ready();
    const d = buildDebrief(game);
    expect(d.outcome.alive).toBe(game.state.alive);
    if (d.outcome.alive) expect(d.wentWell.some((w) => w.text.includes('survived'))).toBe(true);
  });
});