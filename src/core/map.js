// Mapa del hospital (igual para todos los niveles). Cada carácter es un tile de 16x16.
//  #  pared            .  piso            D  puerta de consultorio
//  b  camilla          k  escritorio      p  planta
//  h  silla            =  mostrador       w  dispensador de agua
//  T  tele (en pared)  m  alfombra        E  puerta de entrada (vidrio)
//  s  camilla rodante  r  carrito del enfermero
export const MAP = [
  '###############',
  '#bk.#.....#.kb#',
  '#...#.....#...#',
  '#...D.....D...#',
  '#p..#.....#..p#',
  '#####.....#####',
  '#bk.#.r...#.kb#',
  '#...#.....#...#',
  '#...D.....D...#',
  '#p..#....s#..p#',
  '#####.....##T##',
  '#....=.......w#',
  '#=====........#',
  '#.........hhhh#',
  '#.............#',
  '#.........hhhh#',
  '#.............#',
  '#p...........p#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#p....mmm....p#',
  '#.....mmm.....#',
  '######EEE######',
];

export const TILE = 16;
export const MAP_W = MAP[0].length;
export const MAP_H = MAP.length;

const SOLID = new Set(['#', 'b', 'k', 'p', 'h', '=', 'w', 'T', 'E', 's', 'r']);

// Consultorios: puerta, habitación interior y lado del pasillo donde va el cartel.
export const ROOMS = {
  c1: { numero: 1, door: { x: 4, y: 3 }, inside: { x: 3, y: 3 }, outside: { x: 5, y: 3 }, rect: { x: 1, y: 1, w: 3, h: 4 }, side: 'left' },
  c2: { numero: 2, door: { x: 4, y: 8 }, inside: { x: 3, y: 8 }, outside: { x: 5, y: 8 }, rect: { x: 1, y: 6, w: 3, h: 4 }, side: 'left' },
  c3: { numero: 3, door: { x: 10, y: 3 }, inside: { x: 11, y: 3 }, outside: { x: 9, y: 3 }, rect: { x: 11, y: 1, w: 3, h: 4 }, side: 'right' },
  c4: { numero: 4, door: { x: 10, y: 8 }, inside: { x: 11, y: 8 }, outside: { x: 9, y: 8 }, rect: { x: 11, y: 6, w: 3, h: 4 }, side: 'right' },
};

export function tileAt(x, y) {
  if (y < 0 || y >= MAP_H || x < 0 || x >= MAP_W) return '#';
  return MAP[y][x];
}

export function isSolidTile(x, y) {
  return SOLID.has(tileAt(x, y));
}

export function isCounter(x, y) {
  return tileAt(x, y) === '=';
}

export function doorAt(x, y) {
  for (const id of Object.keys(ROOMS)) {
    const d = ROOMS[id].door;
    if (d.x === x && d.y === y) return id;
  }
  return null;
}

export function inRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

// ---------- dibujo del mapa (una sola imagen) ----------
function floorKind(x, y) {
  if (tileAt(x, y) === 'D') return 'room';
  if (y <= 9 && (x <= 3 || x >= 11)) return 'room';
  if (y <= 10 && x >= 5 && x <= 9) return 'corr';
  return 'hall';
}

const DECOR = { '6,0': 'cross', '8,0': 'cross', '7,0': 'clock', '2,5': 'poster', '12,5': 'cross', '2,0': 'cross', '12,0': 'poster' };

export function drawMapCanvas() {
  const c = document.createElement('canvas');
  c.width = MAP_W * TILE;
  c.height = MAP_H * TILE;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const r = (x, y, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };

  const floor = (px, py, kind) => {
    if (kind === 'hall') {
      r(px, py, 16, 16, '#ece6d6');
      r(px, py, 16, 1, '#d6cdb8');
      r(px, py, 1, 16, '#d6cdb8');
      r(px, py + 8, 16, 1, '#e1d9c6');
      r(px + 8, py, 1, 16, '#e1d9c6');
      r(px + 2, py + 2, 2, 1, '#f7f3ea');
      r(px + 10, py + 10, 2, 1, '#f7f3ea');
    } else if (kind === 'corr') {
      r(px, py, 16, 16, '#dce7ec');
      r(px, py, 8, 8, '#cfdde4');
      r(px + 8, py + 8, 8, 8, '#cfdde4');
    } else {
      r(px, py, 16, 16, '#e4f0ea');
      r(px, py, 16, 1, '#d0e3d9');
      r(px, py, 1, 16, '#d0e3d9');
      r(px + 3, py + 4, 1, 1, '#f2f8f5');
    }
  };

  const wallFace = (px, py) => {
    r(px, py, 16, 16, '#a6dcc9');
    r(px, py, 16, 2, '#c3eadc');
    r(px, py + 9, 16, 2, '#8ccbb6');
    r(px, py + 13, 16, 3, '#5b9c88');
    r(px, py + 13, 16, 1, '#4a8574');
  };
  const wallTop = (px, py) => {
    r(px, py, 16, 16, '#2f5552');
    r(px + 1, py + 1, 14, 14, '#3a6763');
    r(px + 1, py + 1, 14, 1, '#4c7f7a');
  };

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = tileAt(x, y);
      const px = x * TILE;
      const py = y * TILE;
      if (t === '#' || t === 'T') {
        const below = tileAt(x, y + 1);
        const isFace = y + 1 < MAP_H && below !== '#' && below !== 'T' && below !== 'D' && below !== 'E';
        if (isFace) wallFace(px, py);
        else wallTop(px, py);
        if (t === 'T') {
          r(px + 1, py + 2, 14, 10, '#222831');
          r(px + 2, py + 3, 12, 8, '#4fb3e8');
          r(px + 2, py + 3, 12, 2, '#7fd0f5');
          r(px + 4, py + 7, 3, 3, '#f6f1e3');
          r(px + 9, py + 6, 3, 4, '#ffd84a');
          r(px + 7, py + 12, 2, 1, '#222831');
        }
        const deco = DECOR[`${x},${y}`];
        if (deco && isFace) {
          if (deco === 'cross') {
            r(px + 4, py + 2, 8, 8, '#ffffff');
            r(px + 7, py + 3, 2, 6, '#e04848');
            r(px + 5, py + 5, 6, 2, '#e04848');
          } else if (deco === 'clock') {
            r(px + 5, py + 2, 6, 8, '#ffffff');
            r(px + 4, py + 3, 8, 6, '#ffffff');
            r(px + 7, py + 4, 1, 3, '#26303a');
            r(px + 8, py + 6, 2, 1, '#26303a');
          } else if (deco === 'poster') {
            r(px + 3, py + 1, 10, 10, '#f6f1e3');
            r(px + 4, py + 2, 8, 3, '#4f9fd8');
            r(px + 4, py + 6, 8, 1, '#9aa5ad');
            r(px + 4, py + 8, 6, 1, '#9aa5ad');
          }
        }
        continue;
      }
      if (t === 'E') {
        r(px, py, 16, 16, '#5e6e78');
        r(px + 1, py + 1, 14, 14, '#a9dcf0');
        r(px + 3, py + 3, 2, 6, '#d8f1fb');
        r(px + 5, py + 2, 1, 3, '#d8f1fb');
        r(px + 15, py, 1, 16, '#5e6e78');
        continue;
      }
      floor(px, py, floorKind(x, y));
      switch (t) {
        case 'D':
          r(px, py, 16, 2, '#2f5552');
          r(px, py + 14, 16, 2, '#2f5552');
          r(px + 1, py + 2, 2, 12, '#7fb3d5');
          r(px + 13, py + 2, 2, 12, '#7fb3d5');
          break;
        case 'b':
          r(px + 1, py + 2, 14, 12, '#5b8fd6');
          r(px + 2, py + 3, 12, 10, '#f7f7f7');
          r(px + 3, py + 4, 3, 8, '#dfe8f2');
          r(px + 8, py + 3, 6, 10, '#bfe3f5');
          r(px + 2, py + 14, 2, 1, '#333');
          r(px + 12, py + 14, 2, 1, '#333');
          break;
        case 'k':
          r(px + 5, py + 1, 6, 5, '#3a3f47');
          r(px + 6, py + 2, 4, 3, '#7fd3ff');
          r(px, py + 5, 16, 9, '#b07a45');
          r(px, py + 5, 16, 2, '#c99561');
          r(px, py + 13, 16, 2, '#7d5530');
          r(px + 5, py + 8, 6, 2, '#e0e0e0');
          r(px + 12, py + 7, 2, 3, '#f6f1e3');
          break;
        case 'p':
          r(px + 3, py + 2, 10, 8, '#3fa35b');
          r(px + 5, py + 0, 6, 3, '#3fa35b');
          r(px + 4, py + 4, 2, 2, '#2e7d46');
          r(px + 9, py + 3, 2, 2, '#2e7d46');
          r(px + 7, py + 7, 2, 2, '#2e7d46');
          r(px + 5, py + 10, 6, 5, '#c86b3c');
          r(px + 4, py + 10, 8, 1, '#a55530');
          break;
        case 'h':
          r(px + 2, py + 2, 12, 4, '#3b63a8');
          r(px + 2, py + 6, 12, 6, '#4f7fd1');
          r(px + 2, py + 6, 12, 1, '#6f9be3');
          r(px + 3, py + 12, 2, 3, '#7a7a7a');
          r(px + 11, py + 12, 2, 3, '#7a7a7a');
          break;
        case '=':
          r(px, py, 16, 6, '#c48a4a');
          r(px, py, 16, 1, '#d9a466');
          r(px, py + 6, 16, 10, '#f2ecdc');
          r(px, py + 9, 16, 2, '#3fb68b');
          r(px, py + 15, 16, 1, '#c9c2b0');
          if (tileAt(x, y - 1) !== '=') {
            r(px + 3, py + 1, 3, 2, '#f6f1e3');
          }
          break;
        case 'w':
          r(px + 4, py + 6, 8, 9, '#9aa5ad');
          r(px + 5, py + 7, 6, 7, '#eef2f5');
          r(px + 5, py, 6, 6, '#8fd0ff');
          r(px + 6, py + 1, 2, 3, '#c8ecff');
          r(px + 7, py + 9, 2, 2, '#3f6fd1');
          break;
        case 'm':
          r(px, py, 16, 16, '#a8473f');
          r(px + 1, py + 3, 14, 1, '#c25a50');
          r(px + 1, py + 8, 14, 1, '#c25a50');
          r(px + 1, py + 13, 14, 1, '#c25a50');
          break;
        case 's':
          r(px + 3, py, 10, 15, '#9aa5ad');
          r(px + 4, py + 1, 8, 13, '#ffffff');
          r(px + 5, py + 2, 6, 3, '#dfe8f2');
          r(px + 3, py + 15, 2, 1, '#333');
          r(px + 11, py + 15, 2, 1, '#333');
          break;
        case 'r':
          r(px + 2, py + 4, 12, 9, '#8a969e');
          r(px + 3, py + 5, 10, 7, '#dfe6ea');
          r(px + 4, py + 2, 3, 3, '#7ec8e3');
          r(px + 8, py + 1, 2, 4, '#f6f1e3');
          r(px + 10, py + 7, 3, 3, '#e04848');
          r(px + 11, py + 7, 1, 3, '#ffffff');
          r(px + 3, py + 13, 2, 2, '#333');
          r(px + 11, py + 13, 2, 2, '#333');
          break;
        default:
          break;
      }
    }
  }
  return c;
}
