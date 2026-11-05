import { CONFIG } from './config.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Runs one sol. Returns { state, effects } and never changes the input.
export function tick(prev, priority = prev.priority) {
  if (prev.finished) return { state: prev, effects: [] };

  const s = structuredClone(prev);
  const effects = [];

  // Make sure every system appears in the order
  const ids = Object.keys(CONFIG.demand);
  const order = [...priority, ...ids.filter((id) => !priority.includes(id))];
  s.priority = order;

  // 1. Power: pooled supply is shared by priority; leftovers recharge the battery
  const effective = s.power.generation * (1 - s.env.dustLoss);
  let supply = effective + s.power.battery;
  const powered = {};
  for (const id of order) {
    const demand = CONFIG.demand[id];
    const give = Math.min(demand, supply);
    supply -= give;
    powered[id] = give / demand;
    if (powered[id] < 1) effects.push({ system: id, kind: 'underpowered', ratio: powered[id] });
  }
  s.power.battery = clamp(supply, 0, s.power.batteryMax);

  // 2. Life support: oxygen and water
  const ls = powered.lifeSupport;
  s.stocks.o2 += CONFIG.lifeSupportOutput.o2 * ls - CONFIG.perCrewPerSol.o2 * s.crew;
  s.stocks.water += CONFIG.lifeSupportOutput.water * ls - CONFIG.perCrewPerSol.water * s.crew;

  // 3. Greenhouse: crops change slowly, so the food effect is delayed
  const g = powered.greenhouse;
  if (g >= 0.9) s.crops += CONFIG.crops.up;
  else s.crops -= (1 - g) * CONFIG.crops.downPerMissingPower;
  s.crops = clamp(s.crops, 0, 100);
  s.stocks.food += CONFIG.foodCapacity * (s.crops / 100) - CONFIG.perCrewPerSol.food * s.crew;

  // 4. Stocks: cap them and count empty ones
  let empty = 0;
  for (const k of Object.keys(s.stocks)) {
    s.stocks[k] = clamp(s.stocks[k], 0, CONFIG.stockMax);
    if (s.stocks[k] <= 0) {
      empty++;
      effects.push({ system: k, kind: 'empty' });
    }
  }

  // 5. Protection: shielding only works as well as the system is powered
  s.protection.exposure +=
    CONFIG.radiationBase * (1 - s.protection.shielding * powered.protection);
  const overLimit = s.protection.exposure > CONFIG.exposureLimit;
  if (overLimit) effects.push({ system: 'protection', kind: 'over-limit' });

  // 6. Research
  s.research = clamp(s.research + CONFIG.researchPerSol * powered.research, 0, 100);

  // 7. Health and end conditions
  const loss = empty * CONFIG.healthLoss.empty + (overLimit ? CONFIG.healthLoss.radiation : 0);
  s.health = clamp(s.health - loss, 0, 100);
  s.sol += 1;
  if (s.health <= 0) {
    s.alive = false;
    s.finished = true;
    s.endReason = 'health';
  } else if (s.sol >= CONFIG.missionSols) {
    s.finished = true;
    s.endReason = 'complete';
  }

  return { state: s, effects };
}