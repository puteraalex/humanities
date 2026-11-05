import ITEMS from '../data/items.json';
import { createInitialState } from '../engine/index.js';

// GAME ASSUMPTIONS: invented limits for play.
export const BUDGET_TOTAL = 100;
export const MASS_LIMIT = 40;

const findItem = (catalog, id) => catalog.find((i) => i.id === id);

export function createCampaign({ seed = 1 } = {}) {
  return {
    version: 1,
    seed,
    chapter: 'prep',
    budgetTotal: BUDGET_TOTAL,
    massLimit: MASS_LIMIT,
    loadout: [], // item ids; the same id can appear more than once
    decisionsLog: [],
  };
}

export function totals(campaign, catalog = ITEMS) {
  let cost = 0;
  let mass = 0;
  for (const id of campaign.loadout) {
    const item = findItem(catalog, id);
    if (item) {
      cost += item.cost;
      mass += item.mass;
    }
  }
  return {
    cost,
    mass,
    budgetLeft: campaign.budgetTotal - cost,
    massLeft: campaign.massLimit - mass,
  };
}

export function canAdd(campaign, itemId, catalog = ITEMS) {
  const item = findItem(catalog, itemId);
  if (!item) return { ok: false, reason: 'unknown-item' };
  const owned = campaign.loadout.filter((id) => id === itemId).length;
  if (owned >= item.maxQty) return { ok: false, reason: 'max-quantity' };
  const t = totals(campaign, catalog);
  if (item.cost > t.budgetLeft) return { ok: false, reason: 'over-budget' };
  if (item.mass > t.massLeft) return { ok: false, reason: 'over-mass' };
  return { ok: true };
}

// Returns { ok, campaign, reason }. Never changes the campaign passed in.
export function addItem(campaign, itemId, catalog = ITEMS) {
  const check = canAdd(campaign, itemId, catalog);
  if (!check.ok) return { ok: false, campaign, reason: check.reason };
  const item = findItem(catalog, itemId);
  return {
    ok: true,
    campaign: {
      ...campaign,
      loadout: [...campaign.loadout, itemId],
      decisionsLog: [
        ...campaign.decisionsLog,
        {
          id: `d${campaign.decisionsLog.length + 1}`,
          chapter: 'prep',
          type: 'buy',
          itemId,
          cost: item.cost,
          mass: item.mass,
        },
      ],
    },
  };
}

export function removeItem(campaign, itemId, catalog = ITEMS) {
  const index = campaign.loadout.indexOf(itemId);
  if (index === -1) return { ok: false, campaign, reason: 'not-in-loadout' };
  const item = findItem(catalog, itemId);
  const loadout = [...campaign.loadout];
  loadout.splice(index, 1);
  return {
    ok: true,
    campaign: {
      ...campaign,
      loadout,
      decisionsLog: [
        ...campaign.decisionsLog,
        {
          id: `d${campaign.decisionsLog.length + 1}`,
          chapter: 'prep',
          type: 'sell',
          itemId,
          cost: item ? item.cost : 0,
          mass: item ? item.mass : 0,
        },
      ],
    },
  };
}

export function applyEffect(state, { path, add, max }) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = state;
  for (const key of keys) target = target?.[key];
  if (!target || typeof target[last] !== 'number') {
    throw new Error(`Bad effect path: ${path}`);
  }
  let value = target[last] + add;
  if (max !== undefined) value = Math.min(value, max);
  target[last] = value;
}

// Turns the loadout into the engine's starting state.
export function buildEngineState(campaign, catalog = ITEMS) {
  const state = createInitialState({ seed: campaign.seed });
  for (const id of campaign.loadout) {
    const item = findItem(catalog, id);
    if (!item) continue;
    for (const effect of item.effects) applyEffect(state, effect);
  }
  return state;
}