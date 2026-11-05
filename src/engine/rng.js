// Seeded random numbers (mulberry32). Same seed = same sequence.
// Pure: pass a seed in, get { value, seed } out.
export function nextRandom(seed) {
  const a = (seed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: a };
}