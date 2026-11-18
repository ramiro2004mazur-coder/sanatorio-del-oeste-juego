// Genera todas las texturas del juego por código (sin imágenes externas).
import { CHARACTERS, drawCharacterSheet } from './characters.js';
import { drawMapCanvas } from './map.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function addCanvas(scene, key, c) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return scene.textures.addCanvas(key, c);
}

function addSheet(scene, key, c, fw, fh) {
  const tex = addCanvas(scene, key, c);
  const cols = Math.floor(c.width / fw);
  const rows = Math.floor(c.height / fh);
  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      tex.add(i, 0, x * fw, y * fh, fw, fh);
      i += 1;
    }
  }
  return tex;
}

function drawRows(ctx, rows, pal, ox = 0, oy = 0) {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const col = pal[rows[y][x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

const FACE = [
  '.....OOOOOO.....',
  '...OOYYYYYYOO...',
  '..OYYYYYYYYYYO..',
  '.OYYYYYYYYYYYYO.',
  '.OYYYYYYYYYYYYO.',
  'OYYYYYYYYYYYYYYO',
  'OYYYYYYYYYYYYYYO',
  'OYYYYYYYYYYYYYYO',
  'OYYYYYYYYYYYYYYO',
  'OYYYYYYYYYYYYYYO',
  'OYYYYYYYYYYYYYYO',
  '.OYYYYYYYYYYYYO.',
  '.OYYYYYYYYYYYYO.',
  '..OYYYYYYYYYYO..',
  '...OOYYYYYYOO...',
  '.....OOOOOO.....',
];

// Caritas de dolor: 0 🙂 · 1 😐 · 2 😟 · 3 😣 · 4 😵 (pixel art, no emoji).
function drawFace(level) {
  const { c, ctx } = canvas(16, 16);
  const colors = ['#ffd84a', '#ffc94a', '#ffab40', '#ff8a5a', '#c8dd8a'];
  drawRows(ctx, FACE, { O: '#26303a', Y: colors[level] });
  const p = (x, y, col = '#26303a') => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  if (level <= 2) {
    [5, 10].forEach((x) => {
      p(x, 5);
      p(x, 6);
    });
  }
  if (level === 0) {
    [4, 11].forEach((x) => p(x, 9));
    [5, 10].forEach((x) => p(x, 10));
    for (let x = 6; x <= 9; x++) p(x, 11);
    p(4, 8, '#ff8a7a');
    p(11, 8, '#ff8a7a');
  } else if (level === 1) {
    for (let x = 5; x <= 10; x++) p(x, 10);
  } else if (level === 2) {
    p(4, 4);
    p(6, 3);
    p(9, 3);
    p(11, 4);
    for (let x = 6; x <= 9; x++) p(x, 10);
    p(5, 11);
    p(10, 11);
  } else if (level === 3) {
    // ojos apretados > <
    p(4, 4); p(5, 5); p(4, 6);
    p(11, 4); p(10, 5); p(11, 6);
    for (let x = 5; x <= 10; x++) p(x, x % 2 ? 10 : 11);
    p(12, 3, '#7fd0f5'); p(12, 4, '#7fd0f5');
  } else {
    // ojos en X y boca abierta
    [[4, 4], [6, 6], [6, 4], [4, 6], [5, 5], [9, 4], [11, 6], [11, 4], [9, 6], [10, 5]].forEach(([x, y]) => p(x, y));
    for (let x = 6; x <= 9; x++) {
      p(x, 9);
      p(x, 12);
    }
    p(5, 10); p(5, 11); p(10, 10); p(10, 11);
    for (let x = 6; x <= 9; x++) {
      p(x, 10, '#7a2020');
      p(x, 11, '#7a2020');
    }
  }
  return c;
}

export function generateTextures(scene) {
  // Personajes
  Object.keys(CHARACTERS).forEach((key) => {
    addSheet(scene, `ch_${key}`, drawCharacterSheet(CHARACTERS[key]), 16, 16);
  });

  // Mapa del hospital
  addCanvas(scene, 'map', drawMapCanvas());

  // Caritas
  for (let i = 0; i < 5; i++) addCanvas(scene, `face${i}`, drawFace(i));

  // Pixel blanco
  {
    const { c, ctx } = canvas(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
    addCanvas(scene, 'px', c);
  }

  // Flechita de objetivo (apunta hacia abajo)
  {
    const { c, ctx } = canvas(9, 8);
    drawRows(
      ctx,
      ['OOOOOOOOO', 'OYYYYYYYO', '.OYYYYYO.', '.OYYYYYO.', '..OYYYO..', '..OYYYO..', '...OYO...', '....O....'],
      { O: '#26303a', Y: '#ffd84a' },
    );
    addCanvas(scene, 'arrow', c);
  }

  // Flecha de borde de pantalla (apunta a la derecha)
  {
    const { c, ctx } = canvas(10, 11);
    drawRows(
      ctx,
      ['OO........', 'OYOO......', 'OYYYOO....', 'OYYYYYOO..', 'OYYYYYYYOO', 'OYYYYYYYYO', 'OYYYYYYYOO', 'OYYYYYOO..', 'OYYYOO....', 'OYOO......', 'OO........'],
      { O: '#26303a', Y: '#ffd84a' },
    );
    addCanvas(scene, 'edgeArrow', c);
  }

  // Corazoncito
  {
    const { c, ctx } = canvas(7, 6);
    drawRows(ctx, ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], { R: '#ff5a7a' });
    addCanvas(scene, 'heart', c);
  }

  // Estrellitas de mareo
  {
    const { c, ctx } = canvas(5, 5);
    drawRows(ctx, ['..Y..', '.YYY.', 'YYYYY', '.YYY.', '..Y..'], { Y: '#ffd84a' });
    addCanvas(scene, 'star', c);
  }

  // Puerta cerrada (se dibuja encima del hueco de la puerta)
  {
    const { c, ctx } = canvas(16, 16);
    ctx.fillStyle = '#2f5552';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#7fb3d5';
    ctx.fillRect(1, 2, 14, 12);
    ctx.fillStyle = '#cfe9f7';
    ctx.fillRect(3, 4, 4, 4);
    ctx.fillStyle = '#26303a';
    ctx.fillRect(11, 8, 2, 2);
    ctx.fillStyle = '#ffe27a';
    ctx.fillRect(8, 9, 5, 4);
    addCanvas(scene, 'doorClosed', c);
  }

  // Viñeta roja (baja resolución, se escala x4: queda pixelada a propósito)
  {
    const w = 180;
    const h = 320;
    const { c, ctx } = canvas(w, h);
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2);
        const dy = (y - h / 2) / (h / 2);
        const d = Math.sqrt(dx * dx * 1.1 + dy * dy * 0.9);
        const a = Math.max(0, Math.min(1, (d - 0.55) / 0.6));
        const i = (y * w + x) * 4;
        img.data[i] = 200;
        img.data[i + 1] = 20;
        img.data[i + 2] = 30;
        img.data[i + 3] = Math.round(a * a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    addCanvas(scene, 'vignette', c);
  }

  // Fachada del sanatorio para la pantalla de inicio (180x120, se escala x4)
  {
    const { c, ctx } = canvas(180, 120);
    const r = (x, y, w, h, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
    };
    r(0, 0, 180, 120, '#bfe6f5');
    r(0, 0, 180, 18, '#a9dcf0');
    // nubes
    r(14, 10, 22, 5, '#ffffff');
    r(18, 7, 12, 3, '#ffffff');
    r(132, 14, 26, 5, '#ffffff');
    r(138, 11, 12, 3, '#ffffff');
    // edificio
    r(12, 34, 156, 76, '#e9f1ee');
    r(12, 34, 156, 4, '#3a6763');
    r(10, 30, 160, 5, '#2f5552');
    r(12, 104, 156, 6, '#a6dcc9');
    // cruz en el techo
    r(83, 12, 14, 18, '#ffffff');
    r(80, 15, 20, 12, '#ffffff');
    r(87, 14, 6, 14, '#e04848');
    r(82, 18, 16, 6, '#e04848');
    // ventanas
    for (let i = 0; i < 6; i++) {
      const wx = 20 + i * 25;
      if (i === 2 || i === 3) continue;
      r(wx, 54, 16, 13, '#5e6e78');
      r(wx + 1, 55, 14, 11, '#8fc9e6');
      r(wx + 2, 56, 4, 4, '#c8ecff');
      r(wx, 76, 16, 13, '#5e6e78');
      r(wx + 1, 77, 14, 11, '#8fc9e6');
      r(wx + 2, 78, 4, 4, '#c8ecff');
    }
    // puerta de vidrio
    r(70, 70, 40, 40, '#5e6e78');
    r(72, 72, 17, 38, '#a9dcf0');
    r(91, 72, 17, 38, '#a9dcf0');
    r(74, 75, 3, 12, '#d8f1fb');
    r(93, 75, 3, 12, '#d8f1fb');
    // cartelito "nos mudamos"
    r(116, 88, 16, 12, '#ffe27a');
    r(118, 90, 12, 1, '#c0392b');
    r(118, 93, 10, 1, '#8a6d1e');
    r(118, 96, 8, 1, '#8a6d1e');
    // plantas
    r(54, 98, 10, 12, '#3fa35b');
    r(56, 104, 6, 6, '#c86b3c');
    r(116, 102, 10, 8, '#3fa35b');
    r(118, 106, 6, 4, '#c86b3c');
    // vereda
    r(0, 110, 180, 10, '#c9c4b8');
    r(0, 110, 180, 1, '#aaa497');
    for (let x = 0; x < 180; x += 12) r(x, 111, 1, 9, '#b8b2a5');
    addCanvas(scene, 'facade', c);
  }
}
