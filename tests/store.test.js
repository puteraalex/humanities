import { describe, it, expect } from 'vitest';
import {
  startGame,
  restart,
  getGame,
  getPending,
  endDay,
  pickOption,
  buy,
  sell,
  launch,
} from '../src/state/store.js';

function prepAndLaunch(seed = 1) {
  startGame(seed);
  buy('solar-array');
  buy('battery-pack');
  launch();
}

describe('prep phase', () => {
  it('cannot end a day before launching', () => {
    startGame(1);
    expect(getGame().phase).toBe('prep');
    expect(endDay()).toBe(false);
    expect(getGame().state.sol).toBe(0);
  });

  it('enforces budget and mass limits in the shop', () => {
    startGame(1);
    expect(buy('solar-array').ok).toBe(true);
    expect(buy('solar-array').ok).toBe(true);
    expect(buy('battery-pack').ok).toBe(true);
    const tooHeavy = buy('radiation-shield');
    expect(tooHeavy.ok).toBe(false);
    expect(tooHeavy.reason).toBe('over-mass');
    expect(sell('battery-pack').ok).toBe(true);
    expect(buy('radiation-shield').ok).toBe(true);
  });

  it('launch moves to the colony and the loadout changes the outpost', () => {
    startGame(1);
    buy('solar-array');
    expect(launch()).toBe(true);
    expect(getGame().phase).toBe('colony');
    expect(getGame().state.power.generation).toBe(150);
    expect(buy('battery-pack').reason).toBe('wrong-phase');
  });
});

describe('colony phase', () => {
  it('stops for the decision, then continues', () => {
    prepAndLaunch(1);
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

  it('plays a full mission, then restarts in prep with the same loadout and a new seed', () => {
    prepAndLaunch(1);
    let guard = 0;
    while (!getGame().state.finished && guard++ < 100) {
      if (getPending()) pickOption('protect-crew');
      endDay();
    }
    expect(getGame().state.finished).toBe(true);

    const oldSeed = getGame().seed;
    const oldLoadout = [...getGame().campaign.loadout];
    restart();
    expect(getGame().phase).toBe('prep');
    expect(getGame().seed).toBe(oldSeed + 1);
    expect(getGame().state.sol).toBe(0);
    expect(getGame().campaign.loadout).toEqual(oldLoadout);
    expect(getGame().campaign.decisionsLog.length).toBe(oldLoadout.length);
  });
});