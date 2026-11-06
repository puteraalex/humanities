import { describe, it, expect } from 'vitest';
import { SPRITES, PALETTE, spriteSize } from '../src/scenes/pixel/sprites.js';

describe('pixel sprites', () => {
  it('every sprite is a clean rectangle', () => {
    for (const [name, map] of Object.entries(SPRITES)) {
      const { w } = spriteSize(map);
      map.forEach((row, i) => expect(row.length, `${name} row ${i}`).toBe(w));
    }
  });

  it('only uses colours from the palette', () => {
    for (const [name, map] of Object.entries(SPRITES)) {
      for (const row of map) {
        for (const ch of row) {
          if (ch !== '.') expect(PALETTE[ch], `${name}: "${ch}"`).toBeDefined();
        }
      }
    }
  });

  it('astronaut frames share one size, and plants share one size', () => {
    const a = spriteSize(SPRITES.astro_idle);
    expect(spriteSize(SPRITES.astro_walk1)).toEqual(a);
    expect(spriteSize(SPRITES.astro_walk2)).toEqual(a);
    const p = spriteSize(SPRITES.plant_1);
    for (const key of ['plant_dead', 'plant_2', 'plant_3']) {
      expect(spriteSize(SPRITES[key])).toEqual(p);
    }
  });
});