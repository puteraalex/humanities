// Colours: deep navy, Martian red, orange, cream and muted cyan.
export const COLORS = {
  outline: '#3a2a36',
  cream: '#d8c7a5',
  creamLight: '#f1e4c8',
  creamShade: '#b9a98a',
  creamDark: '#8a7a66',
  glass: '#2c3a78',
  metal: '#8a8fa3',
  metalDark: '#5d6278',
  cyan: '#6fb7c4',
  cyanLight: '#9fd7e0',
  panelCell: '#2c4a8c',
  panelLight: '#4a74c0',
  soil: '#5a3a2a',
  soilDark: '#3f2a20',
  dustA: '#c8a070',
  dustB: '#d8b080',
  dustPx: '#e0a870',
  windowGlow: '#ffd37a',
  orange: '#e08a45',
  orangeBright: '#ff7a2f',
  red: '#a8432f',
  redDark: '#7a2e24',
  redLight: '#c8603a',
  beaconGreen: '#6fe08a',
  beaconAmber: '#ffb02e',
  beaconRed: '#ff4d2e',
  stormTint: '#b0623a',
};

// One letter = one colour in the small ASCII sprites below.
export const PALETTE = {
  w: '#f1e4c8',
  s: '#b9a98a',
  v: '#6fb7c4',
  V: '#9fd7e0',
  o: '#e08a45',
  b: '#5d6278',
  g: '#5aa86a',
  G: '#3f7d52',
  n: '#6b4a2a',
};

const ASTRO_TOP = [
  '...wwww...',
  '..wwwwww..',
  '..wVVvvw..',
  '..wvvvvw..',
  '..wvvvvw..',
  '..wwwwww..',
  '.sswwwwws.',
  'bbswwoowws',
  'bbswwwwwws',
  'bb.swwwws.',
  '...swwws..',
];

export const SPRITES = {
  astro_idle: [...ASTRO_TOP, '...ww.ww..', '...ww.ww..', '..bbb.bbb.'],
  astro_walk1: [...ASTRO_TOP, '..ww...ww.', '.ww.....ww', '.bbb...bbb'],
  astro_walk2: [...ASTRO_TOP, '....wwww..', '....wwww..', '...bbbbb..'],
  plant_dead: [
    '.......', '.......', '.......', '.......', '.......', '.......',
    '..n....', '.nn.n..', '..nnn..', '...n...',
  ],
  plant_1: [
    '.......', '.......', '.......', '.......', '.......', '.......',
    '..g.g..', '..gGg..', '...G...', '...G...',
  ],
  plant_2: [
    '.......', '.......', '.......',
    '...g...', '..gGg..', '.gGgGg.', '..gGg..', '...G...', '...G...', '...G...',
  ],
  plant_3: [
    '...g...', '..gGg..', '.gGgGg.', '..gGo..', '.ggGgg.', '..gGg..',
    '.oggGgo', '...G...', '...G...', '...G...',
  ],
};

export function spriteSize(map) {
  return { w: Math.max(...map.map((row) => row.length)), h: map.length };
}