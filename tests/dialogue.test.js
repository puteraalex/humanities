import { describe, it, expect } from 'vitest';
import EVENTS from '../src/data/events.json';
import STORY from '../src/data/story.json';
import { createCampaign, addItem, buildEngineState } from '../src/campaign/index.js';
import { introLines, replyLines, SPEAKERS, CONDITIONS } from '../src/story/dialogue.js';
import { PORTRAIT_MAPS, PORTRAIT_COLORS } from '../src/ui/portraits.js';
import { currentDialogue } from '../src/ui/renderDialogue.js';
import {
  startGame,
  getGame,
  getPending,
  getPendingQuestion,
  answerQuestion,
  pickOption,
  advanceDialogue,
  endDay,
  buy,
  launch,
} from '../src/state/store.js';

function fakeGame(items = []) {
  let campaign = createCampaign({ seed: 1 });
  for (const id of items) campaign = addItem(campaign, id).campaign;
  return { state: buildEngineState(campaign), events: EVENTS };
}

describe('story data', () => {
  it('has an intro and a reply for every event and option', () => {
    for (const ev of EVENTS) {
      expect(STORY[ev.id], ev.id).toBeDefined();
      expect(STORY[ev.id].intro.length).toBeGreaterThan(2);
      for (const opt of ev.options) {
        expect(STORY[ev.id].reply[opt.id], `${ev.id}/${opt.id}`).toBeDefined();
      }
    }
  });

  it('uses only known speakers and known conditions, and keeps lines short', () => {
    const all = [];
    for (const entry of Object.values(STORY)) {
      all.push(...entry.intro);
      for (const lines of Object.values(entry.reply)) all.push(...lines);
    }
    for (const line of all) {
      expect(Object.keys(SPEAKERS)).toContain(line.who);
      if (line.when) expect(Object.keys(CONDITIONS)).toContain(line.when);
      expect(line.text.length).toBeLessThan(170);
    }
  });
});

describe('lines depend on what you packed', () => {
  it('mentions the battery only in the right way', () => {
    const text = (items) =>
      introLines('dust-storm', fakeGame(items)).map((l) => l.text).join(' ');
    expect(text(['battery-pack'])).toContain('battery pack can store');
    expect(text([])).toContain('no extra battery');
  });

  it('mentions shielding and fills in the numbers', () => {
    const plain = introLines('solar-storm', fakeGame([])).map((l) => l.text).join(' ');
    const shielded = introLines('solar-storm', fakeGame(['radiation-shield'])).map((l) => l.text).join(' ');
    expect(plain).toContain('basic shielding, about 50%');
    expect(shielded).toContain('extra shield wall');
    expect(shielded).toContain('70%');
  });

  it('never leaves an unfilled {token}', () => {
    for (const ev of EVENTS) {
      const g = fakeGame(['solar-array', 'battery-pack']);
      const lines = [...introLines(ev.id, g)];
      for (const opt of ev.options) lines.push(...replyLines(ev.id, opt.id, g));
      for (const l of lines) expect(l.text).not.toMatch(/[{}]/);
    }
  });

  it('ends every reply with a science note', () => {
    for (const ev of EVENTS) {
      for (const opt of ev.options) {
        const lines = replyLines(ev.id, opt.id, fakeGame());
        expect(lines[lines.length - 1].who).toBe('note');
      }
    }
  });
});

describe('portraits', () => {
  it('are clean 12 x 12 pictures with known colours', () => {
    for (const [name, map] of Object.entries(PORTRAIT_MAPS)) {
      expect(map.length, name).toBe(12);
      for (const row of map) {
        expect(row.length, name).toBe(12);
        for (const ch of row) {
          if (ch !== '.') expect(PORTRAIT_COLORS[ch], `${name}: ${ch}`).toBeDefined();
        }
      }
    }
  });
});

describe('dialogue flow in the game', () => {
  it('plays the intro, then the choice, then the reply', () => {
    startGame(1);
    buy('solar-array');
    launch();
    let guard = 0;
    while (!getPending() && guard++ < 30) endDay();

    // the prediction question comes first, with no dialogue yet
    expect(currentDialogue(getGame())).toBeNull();
    const q = getPendingQuestion();
    answerQuestion(q.id, q.correct);

    const pending = getPending();
    const total = introLines(pending.id, getGame(), pending).length;
    for (let i = 0; i < total; i++) {
      expect(currentDialogue(getGame()).kind).toBe('intro');
      expect(advanceDialogue()).toBe(true);
    }
    expect(getGame().story.introDone[pending.id]).toBe(true);
    expect(currentDialogue(getGame())).toBeNull();
    expect(advanceDialogue()).toBe(false);

    expect(pickOption(pending.options[0].id)).toBe(true);
    expect(currentDialogue(getGame()).kind).toBe('reply');
    let n = 0;
    while (getGame().story.reply && n++ < 10) advanceDialogue();
    expect(getGame().story.reply).toBeNull();
    expect(currentDialogue(getGame())).toBeNull();
    expect(endDay()).toBe(true);
  });
});