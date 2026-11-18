// Personajes en pixel art (16x16) definidos como texto + paleta.
// O contorno, H pelo, S piel, E ojos, C remera/ambo, P pantalón, B zapatos, L pelo largo.

const OUT = '#26303a';
const EYE = '#1d1d28';
const COAT = '#f4f7f8';

export const DIRS = ['down', 'up', 'left', 'right'];

const UPPER = {
  down: [
    '................',
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '...OHHHHHHHHO...',
    '...OHHSSSSHHO...',
    '...OSSSSSSSSO...',
    '...OSESSSSESO...',
    '..LOSSSSSSSSOL..',
    '..LLOSSSSSSOLL..',
    '..OCCCCCCCCCCO..',
    '.OSCCCCCCCCCCSO.',
    '.OSCCCCCCCCCCSO.',
  ],
  up: [
    '................',
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '..LOHHHHHHHHOL..',
    '..LLOHHHHHHOLL..',
    '..OCCCCCCCCCCO..',
    '.OSCCCCCCCCCCSO.',
    '.OSCCCCCCCCCCSO.',
  ],
  left: [
    '................',
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '...OHHHHHHHHO...',
    '...OSSHHHHHHO...',
    '..OSSSSHHHHHO...',
    '..OSESSSHHHHO...',
    '...OSSSSSHHOL...',
    '....OSSSSOLLL...',
    '....OCCCCCCO....',
    '...OCCSSCCCCO...',
    '...OCCSSCCCCO...',
  ],
};

// Piernas: [quieto, paso largo, paso corto]
const LEGS = {
  front: [
    ['...OPPPPPPPPO...', '....OPPOOPPO....', '....OPPOOPPO....', '....OBBOOBBO....'],
    ['...OPPPPPPPPO...', '....OPPOOPPO....', '....OPPOOBBO....', '....OBBO.OO.....'],
    ['...OPPPPPPPPO...', '....OPPOOPPO....', '....OBBOOPPO....', '.....OO.OBBO....'],
  ],
  side: [
    ['....OPPPPPPO....', '.....OPPPPO.....', '.....OPPPPO.....', '.....OBBBBO.....'],
    ['....OPPPPPPO....', '....OPPOOPPO....', '...OPPO..OPPO...', '...OBBO..OBBO...'],
    ['....OPPPPPPO....', '.....OPPPPO.....', '....OPPOOPO.....', '....OBBOOBO.....'],
  ],
};

function setChar(row, x, ch) {
  return row.substring(0, x) + ch + row.substring(x + 1);
}

function frameRows(dir, f, def) {
  const baseDir = dir === 'right' ? 'left' : dir;
  const upper = UPPER[baseDir].slice();
  const legs = (baseDir === 'left' ? LEGS.side : LEGS.front)[f].slice();
  // "Bajón": cabeza y hombros un pixel más abajo (encorvado).
  let rows = def.droop ? ['................'].concat(upper, legs.slice(1)) : upper.concat(legs);
  // Venda en la rodilla (fila 13).
  if (def.bandage && baseDir !== 'up') {
    const cols = baseDir === 'down' ? [5, 6] : f === 1 ? [5, 6] : [7, 8];
    cols.forEach((x) => {
      if (rows[13][x] === 'P') rows[13] = setChar(rows[13], x, 'W');
    });
  }
  if (dir === 'right') rows = rows.map((r) => r.split('').reverse().join(''));
  return rows;
}

function paletteFor(def) {
  return {
    O: OUT,
    E: EYE,
    H: def.hair,
    S: def.skin,
    C: def.shirt,
    P: def.pants,
    B: def.shoes || '#3a2f2a',
    L: def.long ? def.hair : null,
    W: '#ffffff',
  };
}

// Dibuja la hoja de 12 frames (4 direcciones x 3) en un canvas 192x16.
export function drawCharacterSheet(def) {
  const c = document.createElement('canvas');
  c.width = 16 * 12;
  c.height = 16;
  const ctx = c.getContext('2d');
  const pal = paletteFor(def);
  DIRS.forEach((dir, di) => {
    for (let f = 0; f < 3; f++) {
      const rows = frameRows(dir, f, def);
      const ox = (di * 3 + f) * 16;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const col = pal[rows[y][x]];
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(ox + x, y, 1, 1);
        }
      }
      // Detalle: estetoscopio para los médicos.
      if (def.steth && dir === 'down') {
        ctx.fillStyle = '#4a5a6a';
        ctx.fillRect(ox + 5, 9, 1, 2);
        ctx.fillRect(ox + 10, 9, 1, 2);
        ctx.fillRect(ox + 6, 11, 4, 1);
        ctx.fillStyle = '#c0c8d0';
        ctx.fillRect(ox + 8, 11, 1, 1);
      }
      // Detalle: anteojos.
      if (def.glasses && dir === 'down') {
        ctx.fillStyle = '#26303a';
        ctx.fillRect(ox + 4, 6, 3, 1);
        ctx.fillRect(ox + 9, 6, 3, 1);
        ctx.fillRect(ox + 7, 6, 2, 1);
      }
      // Detalle: cofia/gorro del enfermero.
      if (def.cap) {
        ctx.fillStyle = def.cap;
        ctx.fillRect(ox + 5, def.droop ? 2 : 1, 6, 2);
      }
      // Detalle: corbata (jefe).
      if (def.tie && dir === 'down') {
        ctx.fillStyle = def.tie;
        ctx.fillRect(ox + 7, 9, 2, 3);
      }
      // Detalle: credencial colgada (personal del sanatorio).
      if (def.badge && dir === 'down') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox + 9, 10, 2, 2);
        ctx.fillStyle = '#4f9fd8';
        ctx.fillRect(ox + 9, 10, 2, 1);
      }
    }
  });
  return c;
}

export const CHARACTERS = {
  paciente: { hair: '#6b4226', skin: '#f1c29b', shirt: '#ef7d32', pants: '#3d5a99', bandage: true },
  recepcionista: { hair: '#2b1d14', skin: '#d9a37a', shirt: '#e06b9a', pants: '#3b3b55', long: true },
  cardiologa: { hair: '#8c3b1e', skin: '#f3c6a5', shirt: COAT, pants: '#7ec8e3', long: true, steth: true },
  ecografista: { hair: '#e3c06a', skin: '#f1c29b', shirt: COAT, pants: '#9fd8c6', long: true, steth: true },
  clinico: { hair: '#1f1f1f', skin: '#b97c55', shirt: COAT, pants: '#4f7fd1', steth: true },
  traumatologo: { hair: '#a0a0a0', skin: '#e8b48f', shirt: COAT, pants: '#3fa37a', steth: true, glasses: true },
  enfermero: { hair: '#3a2618', skin: '#c98f66', shirt: '#7ec8e3', pants: '#7ec8e3', cap: '#7ec8e3' },
  administrativo: { hair: '#4a3020', skin: '#f0c8a8', shirt: '#b8c4cc', pants: '#3d4650', glasses: true },
  maestranza: { hair: '#222222', skin: '#a8714d', shirt: '#5bbf8a', pants: '#3c7f5c' },
  pac1: { hair: '#d8d8d8', skin: '#f0c8a8', shirt: '#9b59b6', pants: '#4a4a4a' },
  pac2: { hair: '#5a3a1a', skin: '#c98f66', shirt: '#f1c40f', pants: '#2c3e50', long: true },
  pac3: { hair: '#1a1a1a', skin: '#8d5a3b', shirt: '#e74c3c', pants: '#34495e' },
  pac4: { hair: '#c0702a', skin: '#f3c6a5', shirt: '#1abc9c', pants: '#5d4037', long: true },
  pac5: { hair: '#6b6b6b', skin: '#e8b48f', shirt: '#3498db', pants: '#7f8c8d' },
  pac6: { hair: '#2b1d14', skin: '#d9a37a', shirt: '#95a5a6', pants: '#2c3e50', long: true },
  pac7: { hair: '#8a5a2a', skin: '#f1c29b', shirt: '#e67e22', pants: '#556b2f' },
  pac8: { hair: '#f0e0b0', skin: '#f3d0b5', shirt: '#c0392b', pants: '#3b3b55', long: true },
  // Nivel 2 · Administración
  lucia: { hair: '#3a2618', skin: '#f3c6a5', shirt: '#b58ad6', pants: '#3b3b55', long: true, badge: true },
  jefe: { hair: '#5a5a5a', skin: '#d9a37a', shirt: '#3a4a6a', pants: '#2c3440', glasses: true, tie: '#c0392b' },
  companero: { hair: '#1f1f1f', skin: '#c98f66', shirt: '#e6c35a', pants: '#4a4a4a', badge: true },
  companera: { hair: '#d8b04a', skin: '#f3d0b5', shirt: '#5f9fd8', pants: '#3b3b55', long: true, badge: true },
  enfermera: { hair: '#2b1d14', skin: '#b97c55', shirt: '#e88aa8', pants: '#e88aa8', long: true, cap: '#e88aa8' },
  // Nivel 3 · Enfermería
  tomas: { hair: '#c0702a', skin: '#e8b48f', shirt: '#5bc8a8', pants: '#5bc8a8', badge: true },
  tomas_bajon: { hair: '#c0702a', skin: '#e8b48f', shirt: '#4aa88c', pants: '#4aa88c', badge: true, droop: true },
  jefa: { hair: '#7a2f1e', skin: '#f0c8a8', shirt: '#3d7fb8', pants: '#3d7fb8', long: true, cap: '#3d7fb8', glasses: true },
};

export function frameIndex(dir, f) {
  return DIRS.indexOf(dir) * 3 + f;
}
