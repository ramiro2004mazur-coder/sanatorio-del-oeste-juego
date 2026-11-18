// Utilidades de interfaz: textos, botones pixel, texto enriquecido, transiciones.
import { FONT_BODY, FONT_TITLE } from './fonts.js';
import { audio } from './audio.js';

export const GW = 720;
export const GH = 1280;

export const COLORS = {
  bg: '#0f2a2e',
  bgN: 0x0f2a2e,
  cream: '#f6f1e3',
  creamN: 0xf6f1e3,
  dark: '#1d2b30',
  darkN: 0x1d2b30,
  green: '#3fb68b',
  greenN: 0x3fb68b,
  blue: '#4f9fd8',
  blueN: 0x4f9fd8,
  red: '#e04848',
  redN: 0xe04848,
  yellow: '#ffd84a',
  yellowN: 0xffd84a,
  teal: '#a6dcc9',
};

export function bodyText(scene, x, y, str, size = 36, color = COLORS.cream, extra = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT_BODY,
    fontSize: `${size}px`,
    color,
    ...extra,
  });
}

export function titleText(scene, x, y, str, size = 56, color = COLORS.cream, extra = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT_TITLE,
    fontStyle: 'bold',
    fontSize: `${size}px`,
    color,
    ...extra,
  });
}

// ---------- registro de zonas tocables (para los tests) ----------
const hits = new Map();
export function registerHit(name, scene, obj) {
  hits.set(name, { scene, obj });
}
export function hitClientPoint(game, name) {
  const h = hits.get(name);
  if (!h || !h.obj || !h.obj.active || !h.scene.sys.isActive()) return null;
  const rect = game.canvas.getBoundingClientRect();
  const k = rect.width / GW;
  const cam = h.scene.cameras.main;
  const x = (h.obj.x - cam.scrollX) * cam.zoom;
  const y = (h.obj.y - cam.scrollY) * cam.zoom;
  return { x: rect.left + x * k, y: rect.top + y * k };
}

// ---------- panel pixel ----------
export function pixelPanel(g, x, y, w, h, fill = COLORS.creamN, border = COLORS.darkN, shadow = true) {
  if (shadow) {
    g.fillStyle(0x000000, 0.45);
    g.fillRect(x + 6, y + 8, w, h);
  }
  g.fillStyle(border, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(fill, 1);
  g.fillRect(x + 5, y + 5, w - 10, h - 10);
}

function lighten(c, amt) {
  const r = Math.min(255, ((c >> 16) & 255) + amt);
  const g = Math.min(255, ((c >> 8) & 255) + amt);
  const b = Math.min(255, (c & 255) + amt);
  return (r << 16) | (g << 8) | b;
}

// ---------- botón pixel (un solo disparo por defecto) ----------
export function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const color = opts.color == null ? COLORS.greenN : opts.color;
  const g = scene.add.graphics();
  const txt = titleText(scene, x, y, label, opts.fontSize || 40, opts.textColor || COLORS.cream).setOrigin(0.5);
  txt.setShadow(0, 3, '#000000', 0, false, true);
  let pressed = false;
  let disabled = false;
  let used = false;
  const draw = () => {
    g.clear();
    const dy = pressed ? 6 : 0;
    if (!pressed) {
      g.fillStyle(0x000000, 0.55);
      g.fillRect(x - w / 2 + 2, y - h / 2 + 8, w, h);
    }
    g.fillStyle(COLORS.darkN, 1);
    g.fillRect(x - w / 2, y - h / 2 + dy, w, h);
    g.fillStyle(disabled ? 0x6b7b85 : color, 1);
    g.fillRect(x - w / 2 + 5, y - h / 2 + 5 + dy, w - 10, h - 10);
    g.fillStyle(disabled ? 0x8a969e : lighten(color, 50), 1);
    g.fillRect(x - w / 2 + 5, y - h / 2 + 5 + dy, w - 10, 5);
    txt.y = y + dy;
  };
  draw();
  const zone = scene.add.zone(x, y, w + 10, h + 14).setInteractive({ useHandCursor: true });
  zone.on('pointerdown', () => {
    if (disabled || used) return;
    pressed = true;
    draw();
  });
  zone.on('pointerout', () => {
    if (!pressed) return;
    pressed = false;
    draw();
  });
  zone.on('pointerup', () => {
    if (!pressed || disabled || used) return;
    pressed = false;
    draw();
    if (opts.once !== false) used = true;
    audio.play('click');
    onClick();
  });
  if (opts.name) registerHit(opts.name, scene, zone);
  const api = {
    g,
    txt,
    zone,
    setDisabled(v) {
      disabled = !!v;
      draw();
    },
    reset() {
      used = false;
      pressed = false;
      draw();
    },
    setVisible(v) {
      g.setVisible(v);
      txt.setVisible(v);
      if (v) zone.setInteractive();
      else zone.disableInteractive();
    },
    setDepth(d) {
      g.setDepth(d);
      txt.setDepth(d + 1);
      zone.setDepth(d + 2);
      return api;
    },
  };
  return api;
}

// ---------- transiciones sin doble disparo ----------
export function fadeIn(scene, ms = 220) {
  scene._leaving = false;
  scene.cameras.main.fadeIn(ms, 0, 0, 0);
}

export function goTo(scene, key, data, ms = 220) {
  if (scene._leaving) return false;
  scene._leaving = true;
  const go = () => {
    if (!scene.sys || !scene.sys.isActive()) return;
    if (scene.scene.isActive('Hud') && scene.scene.key !== 'Hud') scene.scene.stop('Hud');
    scene.scene.start(key, data);
  };
  if (ms <= 0) {
    go();
    return true;
  }
  scene.cameras.main.fadeOut(ms, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', go);
  // Respaldo por si el evento de fade no llega (pestaña oculta, etc.).
  scene.time.delayedCall(ms + 400, go);
  return true;
}

// ---------- texto enriquecido renderizado a canvas ----------
// Bloques: {t:'h', text, color, size} · {t:'p', text} · {t:'li', text} · {t:'box', title, items:[...]} · {t:'gap', h}
// Dentro del texto, **así** se resalta.

function tokenize(text) {
  const out = [];
  const parts = String(text).split('**');
  parts.forEach((part, i) => {
    const em = i % 2 === 1;
    part.split(/(\s+)/).forEach((w) => {
      if (w === '') return;
      out.push({ text: w, em, space: /^\s+$/.test(w) });
    });
  });
  return out;
}

function wrap(ctx, text, maxW) {
  const tokens = tokenize(text);
  const lines = [];
  let line = [];
  let lw = 0;
  tokens.forEach((tk) => {
    const w = ctx.measureText(tk.text).width;
    if (tk.space) {
      if (line.length) {
        line.push({ ...tk, w });
        lw += w;
      }
      return;
    }
    if (lw + w > maxW && line.length) {
      while (line.length && line[line.length - 1].space) lw -= line.pop().w;
      lines.push({ words: line, width: lw });
      line = [];
      lw = 0;
    }
    line.push({ ...tk, w });
    lw += w;
  });
  while (line.length && line[line.length - 1].space) lw -= line.pop().w;
  if (line.length) lines.push({ words: line, width: lw });
  return lines;
}

let richCounter = 0;

export function renderRich(scene, blocks, opts = {}) {
  const width = opts.width || 640;
  const size = opts.size || 34;
  const color = opts.color || COLORS.dark;
  const em = opts.em || '#0d7a55';
  const lh = Math.round(size * (opts.lineHeight || 1.12));
  const align = opts.align || 'left';
  const scratch = document.createElement('canvas').getContext('2d');

  const run = (ctx, draw) => {
    let y = 0;
    const font = (sz, title) => (title ? `bold ${sz}px ${FONT_TITLE}` : `${sz}px ${FONT_BODY}`);
    const para = (text, x0, maxW, sz, col, emCol, al, title) => {
      ctx.font = font(sz, title);
      const lines = wrap(ctx, text, maxW);
      const lhh = Math.round(sz * (opts.lineHeight || 1.12));
      lines.forEach((ln) => {
        let x = x0;
        if (al === 'center') x = x0 + (maxW - ln.width) / 2;
        if (draw) {
          ln.words.forEach((wd) => {
            if (!wd.space) {
              ctx.fillStyle = wd.em ? emCol : col;
              ctx.fillText(wd.text, Math.round(x), y + Math.round(sz * 0.82));
              if (wd.em && !title) ctx.fillText(wd.text, Math.round(x) + 1, y + Math.round(sz * 0.82));
            }
            x += wd.w;
          });
        }
        y += lhh;
      });
    };
    (blocks || []).forEach((b) => {
      if (b.t === 'gap') {
        y += b.h || 16;
      } else if (b.t === 'h') {
        para(b.text, 0, width, b.size || Math.round(size * 1.15), b.color || em, b.color || em, b.align || align, true);
        y += 6;
      } else if (b.t === 'p') {
        para(b.text, 0, width, b.size || size, b.color || color, b.em || em, b.align || align, false);
        y += b.after == null ? 10 : b.after;
      } else if (b.t === 'li') {
        const bullet = 26;
        if (draw) {
          ctx.fillStyle = b.bulletColor || em;
          ctx.fillRect(4, y + Math.round(size * 0.35), 10, 10);
        }
        para(b.text, bullet, width - bullet, b.size || size, b.color || color, b.em || em, 'left', false);
        y += 8;
      } else if (b.t === 'box') {
        const pad = 22;
        const y0 = y;
        // primer pase para medir alto del recuadro
        const innerTop = y + pad;
        y = innerTop;
        const before = y;
        if (b.title) {
          ctx.font = font(Math.round(size * 1.05), true);
          const tl = wrap(ctx, b.title, width - pad * 2);
          y += tl.length * Math.round(size * 1.05 * 1.12) + 8;
        }
        (b.items || []).forEach((it) => {
          ctx.font = font(size, false);
          const ls = wrap(ctx, it, width - pad * 2 - 26);
          y += ls.length * lh + 8;
        });
        const boxH = y - y0 + pad - 8;
        if (draw) {
          ctx.fillStyle = b.border || '#1d2b30';
          ctx.fillRect(0, y0, width, boxH);
          ctx.fillStyle = b.fill || '#fff6cc';
          ctx.fillRect(5, y0 + 5, width - 10, boxH - 10);
          y = before;
          if (b.title) {
            para(b.title, pad, width - pad * 2, Math.round(size * 1.05), b.titleColor || '#b4542a', b.titleColor || '#b4542a', 'left', true);
            y += 8;
          }
          (b.items || []).forEach((it) => {
            ctx.fillStyle = b.titleColor || '#b4542a';
            ctx.fillRect(pad + 4, y + Math.round(size * 0.35), 10, 10);
            para(it, pad + 26, width - pad * 2 - 26, size, color, b.em || em, 'left', false);
            y += 8;
          });
        }
        y = y0 + boxH + 14;
      }
    });
    return y;
  };

  const h = Math.max(1, Math.ceil(run(scratch, false)));
  const c = document.createElement('canvas');
  c.width = width;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  run(ctx, true);
  richCounter += 1;
  const key = `rich_${richCounter}`;
  scene.textures.addCanvas(key, c);
  // Liberamos la textura cuando la escena se apaga.
  scene.events.once('shutdown', () => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
  });
  return { key, width, height: h };
}

// ---------- barra de dolor ----------
export class PainBar {
  constructor(scene, x, y, w) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.w = w;
    this.value = 0;
    this.face = scene.add.image(x, y + 34, 'face0').setScale(4).setOrigin(0, 0.5);
    this.label = bodyText(scene, x + 84, y - 4, 'DOLOR DE RODILLA', 30, COLORS.cream);
    this.g = scene.add.graphics();
    this.draw();
  }
  setDepth(d) {
    this.face.setDepth(d);
    this.label.setDepth(d);
    this.g.setDepth(d);
    return this;
  }
  setValue(v) {
    const nv = Math.max(0, Math.min(100, v));
    if (Math.abs(nv - this.value) < 0.05) return;
    this.value = nv;
    this.draw();
  }
  draw() {
    const v = this.value;
    const lvl = v < 25 ? 0 : v < 50 ? 1 : v < 70 ? 2 : v < 90 ? 3 : 4;
    this.face.setTexture(`face${lvl}`);
    const g = this.g;
    g.clear();
    const bx = this.x + 84;
    const by = this.y + 30;
    const bw = this.w - 84;
    const bh = 30;
    g.fillStyle(0x000000, 1);
    g.fillRect(bx, by, bw, bh);
    g.fillStyle(0x3a1a1a, 1);
    g.fillRect(bx + 4, by + 4, bw - 8, bh - 8);
    const segs = 20;
    const sw = (bw - 8) / segs;
    const filled = Math.round((v / 100) * segs);
    for (let i = 0; i < filled; i++) {
      const t = i / (segs - 1);
      const col = t < 0.4 ? 0x5bd17a : t < 0.7 ? 0xffd84a : t < 0.85 ? 0xff9a3a : 0xff4a4a;
      g.fillStyle(col, 1);
      g.fillRect(Math.round(bx + 4 + i * sw), by + 4, Math.ceil(sw) - 2, bh - 8);
    }
  }
}
