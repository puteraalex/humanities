import { describe, it, expect } from 'vitest';
import { createInitialState, tick, nextRandom } from '../src/engine/index.js';

function run(state, n, priority) {
  let last = { state, effects: [] };
  for (let i = 0; i < n; i++) last = tick(last.state, priority);
  return last;
}

describe('rng', () => {
  it('repeats for the same seed', () => {
    const draw = (seed) => {
      const out = [];
      let s = seed;
      for (let i = 0; i < 5; i++) {
        const r = nextRandom(s);
        out.push(r.value);
        s = r.seed;
      }
      return out;
    };
    expect(draw(42)).toEqual(draw(42));
    expect(draw(42)).not.toEqual(draw(43));
    draw(42).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
  });
});

describe('engine', () => {
  it('full power keeps everything stable', () => {
    const { state, effects } = tick(createInitialState());
    expect(effects).toEqual([]);
    expect(state.stocks.o2).toBeCloseTo(62);
  });

  it('priority decides which system is cut', () => {
    const start = createInitialState();
    start.env.dustLoss = 0.5;
    const first = tick(start).state; // battery covers the gap
    const normal = tick(first).effects;
    expect(normal.some((e) => e.system === 'greenhouse' && e.kind === 'underpowered')).toBe(true);
    expect(normal.some((e) => e.system === 'protection' && e.kind === 'underpowered')).toBe(false);

    const flipped = tick(first, ['research', 'lifeSupport', 'protection', 'greenhouse']).effects;
    expect(flipped.some((e) => e.system === 'protection' && e.kind === 'underpowered')).toBe(true);
  });

  it('an unpowered greenhouse hurts crops gradually', () => {
    const start = createInitialState();
    start.power.generation = 0;
    start.power.battery = 0;
    const { state, effects } = run(start, 3);
    expect(state.crops).toBe(40);
    expect(effects.some((e) => e.system === 'o2' && e.kind === 'empty')).toBe(true);
  });

  it('is deterministic', () => {
    const a = run(createInitialState({ seed: 7 }), 10).state;
    const b = run(createInitialState({ seed: 7 }), 10).state;
    expect(a).toEqual(b);
  });

  it('a calm mission finishes alive', () => {
    const { state } = run(createInitialState(), 20);
    expect(state.finished).toBe(true);
    expect(state.alive).toBe(true);
    expect(state.sol).toBe(20);
  });
});