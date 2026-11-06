import { COLORS as C, PALETTE, SPRITES, spriteSize } from './sprites.js';

export const W = 320;
export const H = 180;

const rect = (ctx, color, x, y, w, h) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

// Pixel disc (or upper half only) around a centre point.
function disc(ctx, color, cx, cy, r, upperOnly = false) {
  for (let dy = -r; dy <= (upperOnly ? 0 : r); dy++) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    rect(ctx, color, cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}

// Repeatable pseudo-random numbers, so the scenery is always the same.
export function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function make(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

function fromMap(scene, key, map) {
  const { w, h } = spriteSize(map);
  make(scene, key, w, h, (ctx) => {
    map.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const color = PALETTE[ch];
        if (color) rect(ctx, color, x, y, 1, 1);
      });
    });
  });
}

function ridge(scene, key, h, base, amp, f1, f2, color, edge) {
  make(scene, key, W, h, (ctx) => {
    for (let x = 0; x < W; x++) {
      const top = Math.round(base + amp * Math.sin(x / f1) + amp * 0.5 * Math.sin(x / f2 + 1));
      const y = h - Math.min(h - 1, Math.max(3, top));
      rect(ctx, color, x, y, 1, h - y);
      rect(ctx, edge, x, y, 1, 1);
    }
  });
}

function drawSky(ctx) {
  const bands = [
    [18, '#0e1230'], [14, '#141a40'], [14, '#1b2250'], [12, '#2c2f66'], [12, '#4a3a72'],
    [12, '#7a4568'], [10, '#a8503f'], [10, '#c8603a'], [10, '#e08a45'],
  ];
  let y = 0;
  bands.forEach(([h, color], i) => {
    rect(ctx, color, 0, y, W, h);
    // a dotted edge between bands gives the retro "banding" look
    if (i > 0) for (let x = 0; x < W; x += 2) rect(ctx, color, x, y - 1, 1, 1);
    y += h;
  });
}

function drawMoon(ctx) {
  disc(ctx, C.cream, 5, 5, 5);
  rect(ctx, C.creamShade, 3, 6, 2, 2);
  rect(ctx, C.creamShade, 7, 3, 2, 1);
  rect(ctx, C.creamShade, 6, 7, 1, 1);
}

function drawGround(ctx) {
  rect(ctx, '#b44e34', 0, 0, W, 11);
  rect(ctx, C.red, 0, 11, W, 20);
  rect(ctx, '#9a3a2a', 0, 31, W, 15);
  rect(ctx, C.redDark, 0, 46, W, 16);
  for (let x = 0; x < W; x += 2) {
    rect(ctx, C.red, x, 10, 1, 1);
    rect(ctx, '#9a3a2a', x + 1, 30, 1, 1);
    rect(ctx, C.redDark, x, 45, 1, 1);
  }
  // the packed-sand path the astronaut walks on
  rect(ctx, '#b45c3c', 0, 36, W, 6);
  rect(ctx, '#c8785a', 0, 36, W, 1);
  rect(ctx, '#8a4630', 0, 41, W, 1);
  // rocks
  const rnd = lcg(7);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd() * W);
    let y = Math.floor(rnd() * 62);
    if (y >= 34 && y <= 43) y += 10;
    const big = rnd() < 0.3;
    rect(ctx, '#6a2a22', x, y, big ? 3 : 2, big ? 2 : 1);
    rect(ctx, C.redLight, x, y - 1, 1, 1);
  }
}

function drawHabitat(ctx) {
  // dome: outline, fill, then shading
  for (let dy = -17; dy <= 0; dy++) {
    const hw = Math.floor(Math.sqrt(17 * 17 - dy * dy) + 0.5);
    rect(ctx, C.outline, 36 - hw, 22 + dy, hw * 2 + 1, 1);
  }
  for (let dy = -16; dy <= 0; dy++) {
    const hw = Math.floor(Math.sqrt(16 * 16 - dy * dy) + 0.5);
    rect(ctx, C.cream, 36 - hw, 22 + dy, hw * 2 + 1, 1);
    const half = Math.floor(hw * 0.5);
    rect(ctx, C.creamShade, 36 + half, 22 + dy, hw - half + 1, 1);
  }
  // body
  rect(ctx, C.outline, 4, 22, 64, 22);
  rect(ctx, C.cream, 5, 23, 62, 20);
  rect(ctx, C.creamShade, 5, 37, 62, 6);
  rect(ctx, C.creamLight, 5, 23, 62, 1);
  rect(ctx, C.creamDark, 24, 23, 1, 20);
  rect(ctx, C.creamDark, 48, 23, 1, 20);
  // windows (the light is a separate object, so it can dim)
  for (const [x, y] of [[12, 28], [52, 28], [32, 11]]) {
    rect(ctx, C.outline, x - 1, y - 1, 10, 7);
    rect(ctx, C.glass, x, y, 8, 5);
  }
  // door
  rect(ctx, C.outline, 31, 29, 10, 15);
  rect(ctx, '#241a22', 32, 30, 8, 14);
  rect(ctx, C.creamDark, 31, 28, 10, 1);
}

function drawAntenna(ctx) {
  rect(ctx, C.metal, 5, 6, 2, 26);
  rect(ctx, C.metalDark, 2, 31, 8, 3);
  rect(ctx, C.creamLight, 1, 3, 10, 2);
  rect(ctx, C.creamShade, 2, 5, 8, 1);
  rect(ctx, C.metal, 5, 0, 2, 3);
}

function drawPanel(ctx) {
  rect(ctx, C.metalDark, 0, 0, 14, 9);
  rect(ctx, C.panelCell, 1, 1, 12, 7);
  rect(ctx, C.panelLight, 4, 1, 1, 7);
  rect(ctx, C.panelLight, 8, 1, 1, 7);
  rect(ctx, C.panelLight, 1, 4, 12, 1);
  rect(ctx, C.metal, 6, 9, 2, 4);
  rect(ctx, C.metalDark, 3, 13, 8, 1);
}

// Two checkerboard layers: together they cover the whole panel.
function drawDust(ctx, color, offset) {
  for (let y = 1; y <= 7; y++) {
    for (let x = 1; x <= 12; x++) {
      if ((x + y) % 2 === offset) rect(ctx, color, x, y, 1, 1);
    }
  }
}

function drawGreenhouseBack(ctx) {
  rect(ctx, '#2a2450', 1, 3, 54, 21);
  rect(ctx, '#4a3a72', 1, 3, 54, 2);
  rect(ctx, C.soil, 0, 24, 56, 6);
  rect(ctx, C.soilDark, 0, 28, 56, 2);
}

function drawGreenhouseGlass(ctx) {
  rect(ctx, 'rgba(159,215,224,0.16)', 1, 3, 54, 21);
  const line = C.cyan;
  rect(ctx, line, 10, 0, 36, 1);
  rect(ctx, line, 6, 1, 4, 1);
  rect(ctx, line, 46, 1, 4, 1);
  rect(ctx, line, 3, 2, 3, 1);
  rect(ctx, line, 50, 2, 3, 1);
  rect(ctx, line, 1, 3, 2, 1);
  rect(ctx, line, 53, 3, 2, 1);
  rect(ctx, line, 0, 4, 1, 22);
  rect(ctx, line, 55, 4, 1, 22);
  for (const x of [14, 28, 42]) rect(ctx, 'rgba(111,183,196,0.7)', x, 1, 1, 24);
  rect(ctx, line, 0, 25, 56, 1);
  rect(ctx, 'rgba(255,255,255,0.28)', 4, 7, 1, 9);
  rect(ctx, 'rgba(255,255,255,0.18)', 6, 9, 1, 5);
}

function drawCrates(ctx) {
  rect(ctx, C.outline, 0, 8, 12, 10);
  rect(ctx, C.redLight, 1, 9, 10, 8);
  rect(ctx, C.redDark, 1, 12, 10, 1);
  rect(ctx, C.outline, 2, 0, 9, 8);
  rect(ctx, C.orange, 3, 1, 7, 6);
  rect(ctx, C.redDark, 3, 3, 7, 1);
  rect(ctx, C.outline, 14, 2, 10, 16);
  rect(ctx, C.cyan, 15, 3, 8, 14);
  rect(ctx, C.cyanLight, 17, 3, 1, 14);
  rect(ctx, C.metalDark, 16, 0, 6, 3);
}

function drawRover(ctx) {
  rect(ctx, C.metal, 6, 0, 1, 4);
  rect(ctx, C.outline, 3, 4, 24, 6);
  rect(ctx, C.cream, 4, 5, 22, 4);
  rect(ctx, C.creamShade, 4, 8, 22, 1);
  rect(ctx, C.cyan, 17, 1, 8, 4);
  for (const x of [2, 12, 23]) {
    rect(ctx, C.outline, x, 9, 5, 5);
    rect(ctx, C.metalDark, x + 1, 10, 3, 3);
    rect(ctx, C.metal, x + 2, 11, 1, 1);
  }
}

function drawWarn(ctx) {
  for (let r = 0; r < 11; r++) {
    const hw = Math.floor((r + 1) / 2);
    rect(ctx, C.orangeBright, 6 - hw, r, hw * 2 + 1, 1);
  }
  rect(ctx, C.outline, 6, 3, 1, 4);
  rect(ctx, C.outline, 6, 8, 1, 1);
}

export function buildTextures(scene) {
  make(scene, 'sky', W, 112, drawSky);
  make(scene, 'moon', 11, 11, drawMoon);
  ridge(scene, 'mtn_far', 30, 14, 8, 23, 9, '#6a3a58', '#8a4a62');
  ridge(scene, 'mtn_near', 24, 9, 5, 17, 6, '#8a3a3a', '#a8503f');
  make(scene, 'ground', W, 62, drawGround);
  make(scene, 'habitat', 72, 44, drawHabitat);
  make(scene, 'antenna', 12, 34, drawAntenna);
  make(scene, 'panel', 14, 14, drawPanel);
  make(scene, 'panel_dust_a', 14, 14, (ctx) => drawDust(ctx, C.dustA, 0));
  make(scene, 'panel_dust_b', 14, 14, (ctx) => drawDust(ctx, C.dustB, 1));
  make(scene, 'gh_back', 56, 30, drawGreenhouseBack);
  make(scene, 'gh_glass', 56, 30, drawGreenhouseGlass);
  make(scene, 'crates', 26, 18, drawCrates);
  make(scene, 'rover', 30, 14, drawRover);
  make(scene, 'warn', 13, 12, drawWarn);
  make(scene, 'dust', 2, 1, (ctx) => rect(ctx, C.dustPx, 0, 0, 2, 1));
  for (const [key, map] of Object.entries(SPRITES)) fromMap(scene, key, map);
}