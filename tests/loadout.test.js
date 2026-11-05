import { describe, it, expect } from 'vitest';
import ITEMS from '../src/data/items.json';
import { tick, createInitialState } from '../src/engine/index.js';
import {
  createCampaign,
  addItem,
  removeItem,
  totals,
  buildEngineState,
  applyEffect,
} from '../src/campaign/index.js';

function buyAll(campaign, ids) {
  let c = campaign;
  for (const id of ids) {
    const r = addItem(c, id);
    expect(r.ok).toBe(true);
    c = r.campaign;
  }
  return c;
}

// Dust blocks 60% of sunlight during sols 3-8, then clears.
function runStorm(state) {
  let s = state;
  while (!s.finished) {
    const stormy = s.sol >= 2 && s.sol <= 7;
    s = { ...s, env: { ...s.env, dustLoss: stormy ? 0.6 : 0 } };
    s = tick(s).state;
  }
  return s;
}

describe('catalog', () => {
  it('has at least five items with valid effects', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(5);
    for (const item of ITEMS) {
      expect(item.cost).toBeGreaterThan(0);
      expect(item.mass).toBeGreaterThan(0);
      for (const effect of item.effects) {
        expect(() => applyEffect(createInitialState(), effect)).not.toThrow();
      }
    }
  });
});

describe('budget and mass', () => {
  it('tracks totals', () => {
    const c = buyAll(createCampaign(), ['solar-array', 'battery-pack']);
    const t = totals(c);
    expect(t.cost).toBe(35);
    expect(t.mass).toBe(22);
    expect(t.budgetLeft).toBe(65);
    expect(t.massLeft).toBe(18);
  });

  it('rejects over-budget purchases', () => {
    const poor = { ...createCampaign(), budgetTotal: 20 };
    const r = addItem(poor, 'radiation-shield');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('over-budget');
  });

  it('rejects over-mass purchases', () => {
    const c = buyAll(createCampaign(), ['solar-array', 'solar-array', 'battery-pack']);
    const r = addItem(c, 'radiation-shield');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('over-mass');
  });

  it('rejects too many of one item', () => {
    const c = buyAll(createCampaign(), ['solar-array', 'solar-array']);
    expect(addItem(c, 'solar-array').reason).toBe('max-quantity');
  });

  it('rejects unknown items', () => {
    expect(addItem(createCampaign(), 'warp-drive').reason).toBe('unknown-item');
  });

  it('removing an item frees budget and mass', () => {
    const c = buyAll(createCampaign(), ['solar-array']);
    const back = removeItem(c, 'solar-array').campaign;
    expect(totals(back).cost).toBe(0);
    expect(totals(back).mass).toBe(0);
  });

  it('does not change the original campaign', () => {
    const c = createCampaign();
    addItem(c, 'solar-array');
    expect(c.loadout).toEqual([]);
    expect(c.decisionsLog).toEqual([]);
  });

  it('logs each decision with an id', () => {
    const c = buyAll(createCampaign(), ['solar-array', 'battery-pack']);
    expect(c.decisionsLog.map((d) => d.id)).toEqual(['d1', 'd2']);
    expect(c.decisionsLog[0]).toMatchObject({ type: 'buy', itemId: 'solar-array' });
  });
});

describe('loadout changes the simulation', () => {
  it('applies item effects to the starting state', () => {
    const c = buyAll(createCampaign(), ['solar-array', 'battery-pack', 'radiation-shield']);
    const s = buildEngineState(c);
    expect(s.power.generation).toBe(150);
    expect(s.power.batteryMax).toBe(100);
    expect(s.power.battery).toBe(100);
    expect(s.protection.shielding).toBeCloseTo(0.7);
  });

  it('shielding lowers radiation exposure', () => {
    const plain = buildEngineState(createCampaign());
    const shielded = buildEngineState(buyAll(createCampaign(), ['radiation-shield']));
    const a = tick(plain).state.protection.exposure;
    const b = tick(shielded).state.protection.exposure;
    expect(b).toBeLessThan(a);
  });

  it('good preparation survives a dust storm that the bare outpost does not', () => {
    const bare = runStorm(buildEngineState(createCampaign()));
    const prepared = runStorm(
      buildEngineState(buyAll(createCampaign(), ['solar-array', 'battery-pack']))
    );
    expect(bare.alive).toBe(false);
    expect(prepared.alive).toBe(true);
    expect(prepared.endReason).toBe('complete');
  });
});