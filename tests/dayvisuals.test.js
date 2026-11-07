import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/engine/index.js';
import { outpostVisuals } from '../src/scenes/visuals.js';
import { startGame, getGame, buy, launch, advanceDialogue, chooseAction, finishWatch, nextDay, showDebrief, getPending, getPendingQuestion, answerQuestion, pickOption } from '../src/state/store.js';
import { briefingLines } from '../src/story/briefing.js';
import { availableFocuses } from '../src/engine/index.js';
import { buildDebrief } from '../src/campaign/index.js';

describe('the astronaut while the crew works', () => {
  const watching = (focus) => ({
    state: createInitialState(),
    lastDay: null,
    day: { stage: 'watch', focus },
  });

  it('goes to the work', () => {
    expect(outpostVisuals(watching('science')).astronautTask).toBe('science');
    expect(outpostVisuals(watching('reinforce')).astronautTask).toBe('reinforce');
    expect(outpostVisuals(watching('garden')).astronautTask).toBe('greenhouse');
  });

  it('still hides from a radiation burst first', () => {
    const g = watching('science');
    g.lastDay = { effects: [{ kind: 'burst', system: 'protection' }] };
    expect(outpostVisuals(g).astronautTask).toBe('shelter');
  });
});

describe('the What if? table', () => {
  it('matches what really happened, including the daily choices', () => {
    startGame(1);
    buy('solar-array');
    buy('battery-pack');
    launch();
    let guard = 0;
    while (!getGame().state.finished && guard++ < 40) {
      while (getGame().day.stage === 'briefing') advanceDialogue();
      const q = getPendingQuestion();
      if (q) answerQuestion(q.id, q.correct);
      if (getPending()) {
        const id = getPending().id;
        while (!getGame().story.introDone[id]) advanceDialogue();
        pickOption(getPending().options[0].id);
        while (getGame().story.reply) advanceDialogue();
      }
      const pick = availableFocuses(getGame().state).filter((f) => f.enabled);
      chooseAction(pick[guard % pick.length].id); // vary the choices
      finishWatch();
      if (!getGame().state.finished) nextDay();
    }
    showDebrief();
    const game = getGame();
    const d = buildDebrief(game);
    expect(d.whatIf.length).toBeGreaterThan(0);
    for (const w of d.whatIf) {
      const mine = w.options.find((o) => o.chosen);
      expect(mine.health).toBe(Math.round(game.state.health));
      expect(mine.research).toBe(Math.round(game.state.research));
      expect(mine.exposure).toBe(Math.round(game.state.protection.exposure));
    }
  });
});