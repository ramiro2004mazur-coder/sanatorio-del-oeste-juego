// Mundo del hospital: mapa, carteles, personajes que caminan por grilla, colisiones y caminos.
import { TILE, MAP_W, MAP_H, ROOMS, isSolidTile, doorAt, tileAt } from './map.js';
import { frameIndex } from './characters.js';
import { FONT_BODY } from './fonts.js';
import { audio } from './audio.js';

const DIR_V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const DIR_LIST = ['up', 'down', 'left', 'right'];

export function dirBetween(a, b) {
  if (b.x > a.x) return 'right';
  if (b.x < a.x) return 'left';
  if (b.y > a.y) return 'down';
  return 'up';
}

export function worldText(scene, x, y, str, size, color, extra = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT_BODY,
    fontSize: `${size}px`,
    color,
    resolution: 4,
    ...extra,
  });
}

export class Walker {
  constructor(world, key, tx, ty, dir = 'down', opts = {}) {
    this.world = world;
    this.scene = world.scene;
    this.id = opts.id || key;
    this.key = key;
    this.tx = tx;
    this.ty = ty;
    this.dir = dir;
    this.moving = false;
    this.fromX = tx;
    this.fromY = ty;
    this.toX = tx;
    this.toY = ty;
    this.t = 0;
    this.dur = 200;
    this.steps = 0;
    this.limp = !!opts.limp;
    this.path = null;
    this.onArrive = null;
    this.sprite = this.scene.add.sprite(0, 0, `ch_${key}`, frameIndex(dir, 0));
    this.sprite.setOrigin(0.5, 0.5);
    this.bob = 0;
    this.offX = 0; // temblor (lo maneja el nivel)
    this.offY = 0; // hombros caídos / saltitos
    this.place(tx, ty);
  }

  place(tx, ty) {
    this.tx = tx;
    this.ty = ty;
    this.toX = tx;
    this.toY = ty;
    this.moving = false;
    this.sprite.x = tx * TILE + 8 + this.offX;
    this.sprite.y = ty * TILE + 8 + this.offY;
    this.sprite.setDepth(ty * TILE + 8);
    this.sprite.setFrame(frameIndex(this.dir, 0));
  }

  // Reubica el sprite en su tile (para aplicar temblor/postura estando quieto).
  refresh() {
    if (this.moving) return;
    this.sprite.x = this.tx * TILE + 8 + this.offX;
    this.sprite.y = this.ty * TILE + 8 + this.offY;
  }

  setSkin(key) {
    if (this.key === key || !this.scene.textures.exists(`ch_${key}`)) return;
    this.key = key;
    this.sprite.setTexture(`ch_${key}`, frameIndex(this.dir, 0));
  }

  face(dir) {
    this.dir = dir;
    if (!this.moving) this.sprite.setFrame(frameIndex(dir, 0));
  }

  front() {
    const v = DIR_V[this.dir];
    return { x: this.tx + v[0], y: this.ty + v[1] };
  }

  // Intenta dar un paso. Devuelve true si arrancó a moverse.
  tryStep(dir, dur) {
    if (this.moving) return false;
    this.face(dir);
    const v = DIR_V[dir];
    const nx = this.tx + v[0];
    const ny = this.ty + v[1];
    if (this.world.isBlocked(nx, ny, this)) return false;
    this.moving = true;
    this.fromX = this.tx;
    this.fromY = this.ty;
    this.toX = nx;
    this.toY = ny;
    this.t = 0;
    this.steps += 1;
    // Rengueo: un paso más largo que el otro.
    this.dur = this.limp && this.steps % 2 === 0 ? dur * 1.35 : dur;
    return true;
  }

  update(dt) {
    if (!this.moving) return;
    this.t += dt;
    const p = Math.min(1, this.t / this.dur);
    const x = (this.fromX + (this.toX - this.fromX) * p) * TILE + 8;
    let y = (this.fromY + (this.toY - this.fromY) * p) * TILE + 8;
    const badLeg = this.limp && this.steps % 2 === 0;
    if (badLeg && p > 0.25 && p < 0.75) y += 1; // se hunde en la pierna mala
    this.sprite.x = Math.round(x) + this.offX;
    this.sprite.y = Math.round(y) + this.offY;
    this.sprite.setDepth(Math.round(y));
    const f = p > 0.15 && p < 0.8 ? (this.steps % 2 ? 1 : 2) : 0;
    this.sprite.setFrame(frameIndex(this.dir, f));
    if (p >= 1) {
      this.moving = false;
      this.tx = this.toX;
      this.ty = this.toY;
      this.sprite.setFrame(frameIndex(this.dir, 0));
      if (this.onArrive) this.onArrive(this);
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}

export class World {
  constructor(scene, level, opts = {}) {
    this.scene = scene;
    this.level = level;
    this.fixed = !!opts.fixed;
    this.walkers = [];
    // Tiles bloqueados por objetos del nivel (carrito, bandejas...).
    this.extraSolid = new Set();
    const closed = opts.closed || (this.fixed ? [] : level.puertasCerradas || []);
    this.closed = new Set(closed);
    this.closedSprites = {};
    this.signs = {};

    scene.add.image(0, 0, 'map').setOrigin(0, 0).setDepth(-100);

    Object.keys(ROOMS).forEach((id) => {
      if (this.closed.has(id)) {
        const d = ROOMS[id].door;
        this.closedSprites[id] = scene.add.image(d.x * TILE, d.y * TILE, 'doorClosed').setOrigin(0).setDepth(-50);
      }
    });

    // Carteles fijos del edificio
    this.label(1 * TILE + 4, 10 * TILE + 1, 'RECEPCIÓN', '#1f4e79', 56);
    // Cartel de la entrada (en la pared de abajo, a la izquierda de la puerta)
    const s = worldText(scene, 3.5 * TILE, 23 * TILE + 8, 'SANATORIO\nDEL OESTE', 5.5, '#ffffff', {
      align: 'center',
      fontStyle: 'bold',
      lineSpacing: -1,
    });
    s.setOrigin(0.5).setDepth(900);
    const g = scene.add.graphics().setDepth(899);
    g.fillStyle(0x1d2b30, 1);
    g.fillRect(1 * TILE + 2, 23 * TILE + 1, 5 * TILE - 4, 14);
    g.fillStyle(0xe04848, 1);
    g.fillRect(1 * TILE + 4, 23 * TILE + 3, 4, 10);
    g.fillRect(1 * TILE + 2 + 5 * TILE - 4 - 6, 23 * TILE + 3, 4, 10);

    // Puerta del ala del personal cerrada (nivel 1): cartelito.
    if (this.closed.has('ala')) {
      const d = ROOMS.ala.door;
      const gg = scene.add.graphics().setDepth(899);
      gg.fillStyle(0x26303a, 1);
      gg.fillRect(d.x * TILE - 12, d.y * TILE - 9, 24, 9);
      gg.fillStyle(0xffffff, 1);
      gg.fillRect(d.x * TILE - 11, d.y * TILE - 8, 22, 7);
      worldText(scene, d.x * TILE, d.y * TILE - 4.5, 'SOLO PERSONAL', 3.6, '#c0392b', { fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(900);
    }

    // Carteles extra del nivel (por ejemplo, "¡Nos mudamos!")
    const ESTILOS = {
      amarillo: [0x26303a, 0xffe27a, '#5a3a10'],
      rojo: [0x5a0a0a, 0xe04848, '#ffffff'],
      blanco: [0x26303a, 0xffffff, '#1f4e79'],
    };
    this.extraSigns = {};
    (level.cartelesExtra || []).forEach((c) => {
      const [border, fill, ink] = ESTILOS[c.estilo || 'amarillo'] || ESTILOS.amarillo;
      const h = c.alto || 14;
      const gg = scene.add.graphics().setDepth(899);
      gg.fillStyle(border, 1);
      gg.fillRect(c.x * TILE, c.y * TILE + 1, c.w * TILE, h);
      gg.fillStyle(fill, 1);
      gg.fillRect(c.x * TILE + 1, c.y * TILE + 2, c.w * TILE - 2, h - 2);
      const t = worldText(scene, c.x * TILE + (c.w * TILE) / 2, c.y * TILE + 1 + h / 2, c.texto, c.tamano || 4.5, ink, {
        align: 'center',
        lineSpacing: -2,
        fontStyle: c.estilo === 'rojo' ? 'bold' : undefined,
      });
      t.setOrigin(0.5).setDepth(900);
      if (c.id) this.extraSigns[c.id] = { g: gg, t };
    });

    // Carteles de consultorios (según el nivel). En la versión arreglada arrancan
    // con el texto viejo y se dan vuelta con flipSign().
    (level.carteles || []).forEach((c) => {
      this.signs[c.id] = this.makeSign(c, c.texto);
    });
  }

  label(x, y, text, color, w) {
    const g = this.scene.add.graphics().setDepth(899);
    g.fillStyle(0x26303a, 1);
    g.fillRect(x, y, w, 11);
    g.fillStyle(0xffffff, 1);
    g.fillRect(x + 1, y + 1, w - 2, 9);
    const t = worldText(this.scene, x + w / 2, y + 5.5, text, 5, color, { fontStyle: 'bold' });
    t.setOrigin(0.5).setDepth(900);
    return t;
  }

  makeSign(def, texto) {
    const room = ROOMS[def.id];
    const scene = this.scene;
    const w = 38;
    const h = 15;
    const y = (room.door.y - 1) * TILE + 1;
    const x = room.side === 'left' ? (room.door.x + 1) * TILE + 1 : room.door.x * TILE - 1 - w;
    const container = scene.add.container(x + w / 2, y + h / 2).setDepth(950);
    const g = scene.add.graphics();
    g.fillStyle(0x26303a, 1);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle(0x1f4e79, 1);
    g.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
    const head = def.titulo || room.titulo || `CONSULTORIO ${room.numero}`;
    const num = worldText(scene, 0, -h / 2 + 1, head, 4, '#a9dcf0').setOrigin(0.5, 0);
    const txt = worldText(scene, 0, h / 2 - 1.5, texto, 4.5, '#ffffff', { fontStyle: 'bold' }).setOrigin(0.5, 1);
    container.add([g, num, txt]);
    return { container, txt, def };
  }

  // Animación de cartel que se da vuelta y cambia de texto.
  flipSign(id, nuevo) {
    const s = this.signs[id];
    if (!s) return;
    const scene = this.scene;
    scene.tweens.add({
      targets: s.container,
      scaleY: 0,
      duration: 160,
      yoyo: true,
      onYoyo: () => {
        s.txt.setText(nuevo);
        s.txt.setColor('#ffe27a');
        audio.play('flip');
      },
    });
  }

  closeDoor(id) {
    if (this.closed.has(id)) return;
    this.closed.add(id);
    const d = ROOMS[id].door;
    this.closedSprites[id] = this.scene.add.image(d.x * TILE, d.y * TILE, 'doorClosed').setOrigin(0).setDepth(-50);
  }

  setExtraSolid(x, y, on) {
    const k = y * MAP_W + x;
    if (on) this.extraSolid.add(k);
    else this.extraSolid.delete(k);
  }

  openDoor(id) {
    this.closed.delete(id);
    const sp = this.closedSprites[id];
    if (sp) {
      this.scene.tweens.add({ targets: sp, alpha: 0, duration: 300, onComplete: () => sp.destroy() });
      delete this.closedSprites[id];
    }
  }

  addWalker(key, x, y, dir, opts) {
    const w = new Walker(this, key, x, y, dir, opts);
    this.walkers.push(w);
    return w;
  }

  removeWalker(w) {
    this.walkers = this.walkers.filter((o) => o !== w);
    w.destroy();
  }

  isSolid(x, y) {
    if (isSolidTile(x, y)) return true;
    if (this.extraSolid.has(y * MAP_W + x)) return true;
    const d = tileAt(x, y) === 'D' ? doorAt(x, y) : null;
    if (d && this.closed.has(d)) return true;
    return false;
  }

  walkerAt(x, y, except) {
    for (const w of this.walkers) {
      if (w === except) continue;
      if (w.tx === x && w.ty === y) return w;
      if (w.moving && w.toX === x && w.toY === y) return w;
    }
    return null;
  }

  isBlocked(x, y, except) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
    return this.isSolid(x, y) || !!this.walkerAt(x, y, except);
  }

  // Camino más corto (BFS 4 direcciones). Devuelve lista de tiles sin el inicial, o null.
  findPath(from, to, except, ignoreWalkers = false) {
    if (from.x === to.x && from.y === to.y) return [];
    const key = (x, y) => y * MAP_W + x;
    const prev = new Map();
    const q = [from];
    prev.set(key(from.x, from.y), null);
    while (q.length) {
      const cur = q.shift();
      for (const d of DIR_LIST) {
        const v = DIR_V[d];
        const nx = cur.x + v[0];
        const ny = cur.y + v[1];
        const k = key(nx, ny);
        if (prev.has(k)) continue;
        const isGoal = nx === to.x && ny === to.y;
        const blocked = ignoreWalkers ? this.isSolid(nx, ny) : this.isBlocked(nx, ny, except);
        if (blocked && !isGoal) continue;
        if (isGoal && this.isSolid(nx, ny)) continue;
        prev.set(k, cur);
        if (isGoal) {
          const path = [];
          let c = { x: nx, y: ny };
          while (c && !(c.x === from.x && c.y === from.y)) {
            path.unshift(c);
            c = prev.get(key(c.x, c.y));
          }
          return path;
        }
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  // Burbuja de diálogo en el mundo, arriba de un personaje.
  bubble(walker, text, ms = 2200, color = '#1d2b30') {
    const scene = this.scene;
    const x = walker.sprite.x;
    const y = walker.sprite.y - 10;
    const t = worldText(scene, 0, 0, text, 4.5, color, {
      align: 'center',
      wordWrap: { width: 52, useAdvancedWrap: true },
      lineSpacing: -1,
    }).setOrigin(0.5, 1);
    const pw = Math.ceil(t.width) + 4;
    const ph = Math.ceil(t.height) + 2;
    const g = scene.add.graphics();
    g.fillStyle(0x26303a, 1);
    g.fillRect(-pw / 2 - 1, -ph - 1, pw + 2, ph + 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(-pw / 2, -ph, pw, ph);
    g.fillStyle(0x26303a, 1);
    g.fillRect(-2, 1, 4, 1);
    g.fillRect(-1, 2, 2, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(-1, 0, 2, 1);
    t.y = -1;
    let bx = x;
    // que la burbuja no se salga del mapa por los costados
    bx = Math.max(pw / 2 + 2, Math.min(MAP_W * TILE - pw / 2 - 2, bx));
    const c = scene.add.container(bx, y, [g, t]).setDepth(2000);
    c.setScale(0.2);
    scene.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.Out' });
    if (ms > 0) {
      scene.time.delayedCall(ms, () => {
        if (!c.active) return;
        scene.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() });
      });
    }
    return c;
  }
}
