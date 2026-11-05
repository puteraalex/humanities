import { CONFIG } from './config.js';

export function createInitialState({
  seed = 1,
  panels = 1,
  batteryMax = 60,
  shielding = 0.5,
} = {}) {
  return {
    sol: 0,
    seed,
    alive: true,
    finished: false,
    endReason: null,
    crew: CONFIG.crew,
    power: { generation: 100 * panels, battery: batteryMax, batteryMax },
    env: { dustLoss: 0 }, // 0 = clear sky, 0.5 = half the sunlight blocked
    stocks: { o2: 60, water: 60, food: 60 },
    crops: 100,
    protection: { shielding, exposure: 0 },
    research: 0,
    health: 100,
    priority: [...CONFIG.defaultPriority],
  };
}