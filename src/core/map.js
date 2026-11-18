// Mapa del hospital (igual para todos los niveles). Cada carácter es un tile de 16x16.
//  #  pared            .  piso            D  puerta (en pared vertical)
//  b  camilla          k  escritorio      p  planta
//  h  silla            =  mostrador       w  dispensador de agua
//  T  tele (en pared)  m  alfombra        E  puerta de entrada (vidrio)
//  s  camilla rodante  r  carrito del enfermero
//  f  fichero          i  impresora       e  estante con historias clínicas
//  n  mostrador de enfermería             o  mesa redonda (2 tiles)
//
// Columnas 0-14: el sanatorio del nivel 1 (consultorios, pasillo y hall).
// Columnas 15-26: el ala del personal (pasillo, Administración, office de enfermería,
// Jefatura y sala de reuniones). Se entra desde el hall por la puerta (14,12).
export const MAP = [
  '###########################',
  '#bk.#.....#.kb#..#ff....iw#',
  '#...#.....#...#..#..k.....#',
  '#...D.....D...#..#........#',
  '#p..#.....#..p#..D........#',
  '#####.....#####..#........#',
  '#bk.#.r...#.kb#..#..k..k..#',
  '#...#.....#...#..#p......p#',
  '#...D.....D...#..##########',
  '#p..#....s#..p#..#eee.....#',
  '#####.....##T##..#........#',
  '#....=.......w#..D....nnn.#',
  '#=====........D..#........#',
  '#.........hhhh#..#.......p#',
  '#.............#..##########',
  '#.........hhhh#..#.......p#',
  '#.............#..D.....k..#',
  '#p...........p#..#p.......#',
  '#.............#..##########',
  '#.............#..#p......p#',
  '#.............#..#........#',
  '#p....mmm....p#..D...oo...#',
  '#.....mmm.....#..#........#',
  '######EEE##################',
];

export const TILE = 16;
export const MAP_W = MAP[0].length;
export const MAP_H = MAP.length;

const SOLID = new Set(['#', 'b', 'k', 'p', 'h', '=', 'w', 'T', 'E', 's', 'r', 'f', 'i', 'e', 'n', 'o']);

// Habitaciones con puerta: puerta, un tile adentro, un tile afuera, rectángulo interior
// y de qué lado de la puerta queda la habitación (para el cartel).
export const ROOMS = {
  c1: { numero: 1, door: { x: 4, y: 3 }, inside: { x: 3, y: 3 }, outside: { x: 5, y: 3 }, rect: { x: 1, y: 1, w: 3, h: 4 }, side: 'left' },
  c2: { numero: 2, door: { x: 4, y: 8 }, inside: { x: 3, y: 8 }, outside: { x: 5, y: 8 }, rect: { x: 1, y: 6, w: 3, h: 4 }, side: 'left' },
  c3: { numero: 3, door: { x: 10, y: 3 }, inside: { x: 11, y: 3 }, outside: { x: 9, y: 3 }, rect: { x: 11, y: 1, w: 3, h: 4 }, side: 'right' },
  c4: { numero: 4, door: { x: 10, y: 8 }, inside: { x: 11, y: 8 }, outside: { x: 9, y: 8 }, rect: { x: 11, y: 6, w: 3, h: 4 }, side: 'right' },
  // Ala del personal
  ala: { titulo: 'PERSONAL', door: { x: 14, y: 12 }, inside: { x: 15, y: 12 }, outside: { x: 13, y: 12 }, rect: { x: 15, y: 1, w: 11, h: 22 }, side: 'right' },
  adm: { titulo: 'ADMINISTRACIÓN', door: { x: 17, y: 4 }, inside: { x: 18, y: 4 }, outside: { x: 16, y: 4 }, rect: { x: 18, y: 1, w: 8, h: 7 }, side: 'right' },
  ofi: { titulo: 'ENFERMERÍA', door: { x: 17, y: 11 }, inside: { x: 18, y: 11 }, outside: { x: 16, y: 11 }, rect: { x: 18, y: 9, w: 8, h: 5 }, side: 'right' },
  jef: { titulo: 'DESPACHO', door: { x: 17, y: 16 }, inside: { x: 18, y: 16 }, outside: { x: 16, y: 16 }, rect: { x: 18, y: 15, w: 8, h: 3 }, side: 'right' },
  reu: { titulo: 'REUNIONES', door: { x: 17, y: 21 }, inside: { x: 18, y: 21 }, outside: { x: 16, y: 21 }, rect: { x: 18, y: 19, w: 8, h: 4 }, side: 'right' },
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
  if (x >= 15) {
    if (x <= 16) return 'corr';
    if (y >= 1 && y <= 7) return 'wood';
    if (y >= 15 && y <= 17) return 'carpet';
    if (y >= 19) return 'wood';
    return 'room';
  }
  if (y <= 9 && (x <= 3 || x >= 11)) return 'room';
  if (y <= 10 && x >= 5 && x <= 9) return 'corr';
  return 'hall';
}

const DECOR = {
  '6,0': 'cross', '8,0': 'cross', '7,0': 'clock', '2,5': 'poster', '12,5': 'cross', '2,0': 'cross', '12,0': 'poster',
  // ala del personal
  '21,0': 'window', '22,0': 'window', '19,8': 'clock', '22,8': 'qr', '23,8': 'qrtext', '20,14': 'window', '21,14': 'window',
  '23,18': 'board', '22,14': 'poster',
};

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

  const floor = (px, py, kind, x, y) => {
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
    } else if (kind === 'wood') {
      r(px, py, 16, 16, '#d9b98a');
      r(px, py + 4, 16, 1, '#c9a674');
      r(px, py + 9, 16, 1, '#c9a674');
      r(px, py + 14, 16, 1, '#c9a674');
      r(px + ((x * 7 + y * 3) % 12), py, 1, 4, '#c9a674');
      r(px + ((x * 5 + y * 11) % 12) + 2, py + 5, 1, 4, '#c9a674');
    } else if (kind === 'carpet') {
      r(px, py, 16, 16, '#8a5a6e');
      r(px + 1, py + 1, 14, 14, '#9a6a7e');
      r(px + 4, py + 4, 2, 2, '#a97a8e');
      r(px + 10, py + 10, 2, 2, '#a97a8e');
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
          } else if (deco === 'window') {
            r(px + 1, py + 1, 14, 10, '#5e6e78');
            r(px + 2, py + 2, 12, 8, '#9fd6ef');
            r(px + 2, py + 2, 12, 2, '#c8ecff');
            r(px + 7, py + 2, 2, 8, '#5e6e78');
            r(px + 3, py + 5, 2, 3, '#ffffff');
          } else if (deco === 'qr') {
            r(px + 1, py + 0, 15, 12, '#26303a');
            r(px + 2, py + 1, 14, 10, '#ffffff');
            const qr = ['1110101', '1010011', '1110100', '0001011', '1101110', '1011010', '1110111'];
            qr.forEach((row, yy) =>
              row.split('').forEach((v, xx) => {
                if (v === '1') r(px + 3 + xx, py + 2 + yy, 1, 1, '#1d2b30');
              }),
            );
            r(px + 11, py + 2, 4, 2, '#3fb68b');
            r(px + 11, py + 5, 4, 1, '#9aa5ad');
            r(px + 11, py + 7, 3, 1, '#9aa5ad');
          } else if (deco === 'qrtext') {
            r(px, py + 0, 14, 12, '#26303a');
            r(px, py + 1, 13, 10, '#ffffff');
            r(px + 1, py + 2, 10, 2, '#3fb68b');
            r(px + 1, py + 5, 11, 1, '#9aa5ad');
            r(px + 1, py + 7, 9, 1, '#9aa5ad');
            r(px + 1, py + 9, 10, 1, '#9aa5ad');
          } else if (deco === 'board') {
            r(px + 1, py + 1, 14, 10, '#7d5530');
            r(px + 2, py + 2, 12, 8, '#c99561');
            r(px + 3, py + 3, 4, 3, '#ffe27a');
            r(px + 8, py + 3, 4, 4, '#ffffff');
            r(px + 4, py + 7, 3, 2, '#7fd3ff');
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
      floor(px, py, floorKind(x, y), x, y);
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
        case 'f':
          r(px + 2, py + 0, 12, 15, '#7a8792');
          r(px + 3, py + 1, 10, 13, '#a3b0ba');
          [2, 6, 10].forEach((yy) => {
            r(px + 3, py + yy, 10, 1, '#5e6b75');
            r(px + 7, py + yy + 2, 2, 1, '#3a434b');
          });
          r(px + 2, py + 15, 12, 1, '#4a545c');
          break;
        case 'i':
          r(px + 1, py + 4, 14, 10, '#3a3f47');
          r(px + 2, py + 5, 12, 8, '#d8dde2');
          r(px + 3, py + 2, 10, 3, '#f7f7f7');
          r(px + 3, py + 11, 10, 1, '#26303a');
          r(px + 11, py + 6, 2, 1, '#3fb68b');
          r(px + 4, py + 12, 8, 3, '#ffffff');
          break;
        case 'e':
          r(px + 0, py + 0, 16, 15, '#7d5530');
          r(px + 1, py + 1, 14, 6, '#5a3a20');
          r(px + 1, py + 8, 14, 6, '#5a3a20');
          ['#4f9fd8', '#e04848', '#ffd84a', '#3fb68b', '#f6f1e3', '#9b59b6'].forEach((col, k) => {
            r(px + 1 + k * 2 + (k > 2 ? 1 : 0), py + 2, 2, 5, col);
            r(px + 2 + k * 2, py + 9, 2, 5, k % 2 ? '#f6f1e3' : '#7fc8e8');
          });
          r(px, py + 15, 16, 1, '#4a3018');
          break;
        case 'n':
          r(px, py, 16, 6, '#7fc8b8');
          r(px, py, 16, 1, '#a6dcc9');
          r(px, py + 6, 16, 10, '#f2ecdc');
          r(px, py + 9, 16, 2, '#4f9fd8');
          r(px, py + 15, 16, 1, '#c9c2b0');
          break;
        case 'o': {
          const left = tileAt(x + 1, y) === 'o';
          const ox = left ? 0 : -16;
          // mesa redonda de 32x16 dibujada en dos mitades
          const rr = (xx, yy, w, h, col) => {
            const a = Math.max(xx, -ox);
            const b = Math.min(xx + w, 16 - ox);
            if (b > a) r(px + a + ox, py + yy, b - a, h, col);
          };
          rr(6, 1, 20, 14, '#7d5530');
          rr(3, 3, 26, 10, '#7d5530');
          rr(7, 2, 18, 11, '#b07a45');
          rr(4, 4, 24, 7, '#b07a45');
          rr(8, 3, 10, 2, '#c99561');
          rr(12, 6, 6, 4, '#f6f1e3');
          rr(20, 7, 3, 3, '#ffffff');
          break;
        }
        default:
          break;
      }
    }
  }
  return c;
}
