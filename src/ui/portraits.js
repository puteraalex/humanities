// Small pixel portraits, drawn from letters (12 x 12) and shown large.
const COLORS = {
  w: '#f1e4c8',
  s: '#b9a98a',
  v: '#6fb7c4',
  f: '#d9a47a',
  k: '#3a2a36',
  m: '#a8432f',
  o: '#e08a45',
  h: '#5a3a2a',
  g: '#8a8fa3',
  N: '#2c3a78',
  y: '#ffd37a',
};

export const PORTRAIT_MAPS = {
  astro: [
    '...wwwwww...',
    '..wwwwwwww..',
    '.wwvvvvvvww.',
    '.wvvffffvvw.',
    '.wvfkffkfvw.',
    '.wvffffffvw.',
    '.wvvfmmfvvw.',
    '.wwvvvvvvww.',
    '..wwwwwwww..',
    '.ssswwwwsss.',
    'sswwwwwwwwss',
    'swwwwwwwwwws',
  ],
  control: [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    '.hhffffffhh.',
    '.hfkffffkfh.',
    'ghffffffffhg',
    'gffffmmffffg',
    '..ffffffff..',
    '...ffffff...',
    '..NNNNNNNN..',
    '.NNNNooNNNN.',
    'NNNNNooNNNNN',
  ],
  note: [
    '....kkkk....',
    '...kyyyyk...',
    '..kyyyyyyk..',
    '..kyyyyyyk..',
    '..kyyyyyyk..',
    '...kyyyyk...',
    '....kyyk....',
    '....kssk....',
    '....kssk....',
    '.....kk.....',
    '............',
    '............',
  ],
};

export const PORTRAIT_COLORS = COLORS;

const cache = {};

export function portraitUrl(who) {
  if (cache[who]) return cache[who];
  const map = PORTRAIT_MAPS[who] || PORTRAIT_MAPS.note;
  const canvas = document.createElement('canvas');
  canvas.width = 12;
  canvas.height = 12;
  const ctx = canvas.getContext('2d');
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (COLORS[ch]) {
        ctx.fillStyle = COLORS[ch];
        ctx.fillRect(x, y, 1, 1);
      }
    });
  });
  cache[who] = canvas.toDataURL();
  return cache[who];
}