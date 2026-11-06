import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/engine/index.js';
import { outpostVisuals, plantStage, plantKey, MAX_PANELS } from '../src/scenes/visuals.js';

function make(mutate = () => {}, effects = null) {
  const state = createInitialState();
  mutate(state);
  return { state, lastDay: effects ? { effects } : null };
}

describe('lights', () => {
  it('are full with a healthy battery and dim with a low one', () => {
    expect(outpostVisuals(make()).light).toBeCloseTo(1);
    const low = outpostVisuals(make((s) => { s.power.battery = 6; })).light;
    expect(low).toBeLessThan(0.5);
  });

  it('drop when life support is short on power', () => {
    const v = outpostVisuals(make(() => {}, [{ kind: 'underpowered', system: 'lifeSupport', ratio: 0.5 }]));
    expect(v.light).toBeLessThanOrEqual(0.3);
  });
});

describe('dust and panels', () => {
  it('maps the dust storm strength to 0-1', () => {
    expect(outpostVisuals(make()).dust).toBe(0);
    expect(outpostVisuals(make((s) => { s.env.dustLoss = 0.6; })).dust).toBe(1);
    expect(outpostVisuals(make((s) => { s.env.dustLoss = 0.3; })).dust).toBeCloseTo(0.5);
  });

  it('shows more panels when the outpost makes more power', () => {
    const count = (gen) => outpostVisuals(make((s) => { s.power.generation = gen; })).panelCount;
    expect(count(100)).toBe(4);
    expect(count(150)).toBe(6);
    expect(count(25)).toBe(2);
    expect(count(900)).toBe(MAX_PANELS);
  });
});

describe('plants', () => {
  it('have stages that follow crop health', () => {
    expect([0, 9, 10, 39, 40, 69, 70, 100].map(plantStage)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(plantKey(3, 0)).toBe('plant_3');
    expect(plantKey(3, 1)).toBe('plant_2');
    expect(plantKey(1, 1)).toBe('plant_1');
    expect(plantKey(0, 0)).toBe('plant_dead');
  });
});

describe('radiation and the astronaut', () => {
  it('tells burst, warning, high and none apart', () => {
    expect(outpostVisuals(make(() => {}, [{ kind: 'burst', system: 'protection' }])).radiation).toBe('burst');
    expect(outpostVisuals(make(), { burst: 30 }).radiation).toBe('warning');
    expect(outpostVisuals(make((s) => { s.protection.exposure = 70; })).radiation).toBe('high');
    expect(outpostVisuals(make()).radiation).toBe('none');
  });

  it('chooses the most urgent task', () => {
    const burstAndDust = make((s) => { s.env.dustLoss = 0.6; }, [{ kind: 'burst', system: 'protection' }]);
    expect(outpostVisuals(burstAndDust).astronautTask).toBe('shelter');
    expect(outpostVisuals(make(), { burst: 30 }).astronautTask).toBe('doorway');
    expect(outpostVisuals(make((s) => { s.env.dustLoss = 0.6; })).astronautTask).toBe('panels');
    expect(outpostVisuals(make((s) => { s.crops = 5; })).astronautTask).toBe('greenhouse');
    expect(outpostVisuals(make()).astronautTask).toBe('patrol');
  });

  it('sets the antenna light', () => {
    expect(outpostVisuals(make()).beacon).toBe('green');
    expect(outpostVisuals(make((s) => { s.env.dustLoss = 0.6; })).beacon).toBe('amber');
    expect(outpostVisuals(make((s) => { s.power.battery = 0; })).beacon).toBe('red');
  });
});