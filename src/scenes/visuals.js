import { CONFIG } from '../engine/index.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const MAX_PANELS = 7;
// GAME RULE: the dust storm blocks 60% of sunlight, so that is "full dust" on screen.
export const REFERENCE_DUST = 0.6;

export function plantStage(crops) {
  if (crops < 10) return 0; // wilted
  if (crops < 40) return 1;
  if (crops < 70) return 2;
  return 3;
}

export function plantKey(stage, index) {
  return stage === 0 ? 'plant_dead' : `plant_${Math.max(1, stage - (index % 2))}`;
}

// Turns the game state into "what should the world look like".
export function outpostVisuals(game, pendingEvent = null) {
  const s = game.state;
  const effects = game.lastDay ? game.lastDay.effects : [];
  const under = (system) => effects.find((e) => e.kind === 'underpowered' && e.system === system);

  // Lights follow the battery; they drop further when life support is short on power.
  const batteryRatio = clamp(s.power.battery / s.power.batteryMax, 0, 1);
  let light = 0.15 + 0.85 * Math.min(1, batteryRatio * 2);
  if (under('lifeSupport')) light = Math.min(light, 0.3);

  const dust = clamp(s.env.dustLoss / REFERENCE_DUST, 0, 1);

  const burst = effects.some((e) => e.kind === 'burst');
  let radiation = 'none';
  if (burst) radiation = 'burst';
  else if (pendingEvent && pendingEvent.burst) radiation = 'warning';
  else if (s.protection.exposure > CONFIG.exposureLimit) radiation = 'high';

  const stage = plantStage(s.crops);

  let astronautTask = 'patrol';
  if (radiation === 'burst') astronautTask = 'shelter';
  else if (radiation === 'warning') astronautTask = 'doorway';
  else if (dust > 0.05) astronautTask = 'panels';
  else if (stage <= 1) astronautTask = 'greenhouse';

  let beacon = 'green';
  if (light < 0.3) beacon = 'red';
  else if (dust > 0.05 || radiation === 'burst' || radiation === 'warning') beacon = 'amber';

  return {
    light,
    dust,
    panelCount: clamp(Math.round(s.power.generation / 25), 2, MAX_PANELS),
    plantStage: stage,
    radiation,
    astronautTask,
    beacon,
  };
}