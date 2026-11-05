import { describe, it, expect } from 'vitest';
import { startGame, restart, getGame, getPending, endDay, pickOption } from '../src/state/store.js';

describe('store', () => {
  it('stops for the decision, then continues', () => {
    startGame(1);
    let guard = 0;
    while (!getPending() && !getGame().state.finished && guard++ < 30) endDay();
    expect(getPending()).not.toBeNull();

    const before = getGame().state.sol;
    expect(endDay()).toBe(false);
    expect(getGame().state.sol).toBe(before);

    expect(pickOption('protect-crops')).toBe(true);
    expect(getPending()).toBeNull();
    expect(endDay()).toBe(true);
    expect(getGame().state.sol).toBe(before + 1);
  });

  it('plays a full mission and restarts with a new seed', () => {
    startGame(1);
    let guard = 0;
    while (!getGame().state.finished && guard++ < 100) {
      if (getPending()) pickOption('protect-crew');
      endDay();
    }
    expect(getGame().state.finished).toBe(true);
    const oldSeed = getGame().seed;
    restart();
    expect(getGame().seed).toBe(oldSeed + 1);
    expect(getGame().state.sol).toBe(0);
  });
});