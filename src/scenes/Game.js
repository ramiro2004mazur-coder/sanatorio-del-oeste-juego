import Phaser from 'phaser';
import { World, dirBetween, worldText } from '../core/world.js';
import { TILE, MAP_W, MAP_H, ROOMS, inRect, isCounter, doorAt, tileAt, isSolidTile } from '../core/map.js';
import { controls } from '../core/controls.js';
import { audio } from '../core/audio.js';
import { state } from '../core/state.js';
import { fadeIn, goTo, GW, GH } from '../core/ui.js';
import { scriptFor } from '../levels/index.js';

const ZOOM = 4;
const HUD_TOP_WORLD = 44; // alto del panel superior, en unidades de mundo

export function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

const DIR_V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Escena de juego genérica: el nivel (datos) dice qué hay y el guion (eventos) qué pasa.
export default class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    fadeIn(this, 300);
    audio.setMusic(true);
    state.ensureRun();
    controls.reset();
    const L = (this.level = state.level);
    this.script = scriptFor(L.id);
    this.M = L.medidor;

    this.phase = 'play'; // play | cutscene | faint
    this.flags = new Set();
    this.usedRules = new Set();
    this.pain = this.M.inicial; // valor del medidor (0 = bien, 100 = perdiste)
    this.meterRate = this.M.porSegundo;
    this.capOff = false;
    this.elapsed = 0;
    this.auto = null;
    this.fainted = false;
    this.topeHit = false;
    this.lastBump = 0;
    this.bubbleTimer = 6000;
    this.paso = L.pasos[0].id;
    this.timers = [];
    this.extra = {}; // estado propio de cada nivel (lo usa su guion)

    this.cameras.main.setBackgroundColor('#1b3b3f');
    this.world = new World(this, L);

    // NPCs fijos
    this.npcs = {};
    this.npcMeta = {};
    (L.npcs || []).forEach((n) => this.addNpc(n));

    // Objetos con los que se interactúa (fichero, bandeja, carrito...)
    this.objects = {};
    (L.objetos || []).forEach((o) => this.addObject(o));

    // Jugador
    const j = L.jugador;
    this.player = this.world.addWalker(j.sprite || 'paciente', j.x, j.y, j.dir, {
      id: 'jugador',
      limp: j.andar === 'renguea',
    });
    this.player.kind = 'player';
    this.player.onArrive = () => this.onPlayerArrive();

    // Pacientes que deambulan (si el nivel tiene)
    this.pacientes = [];
    if (L.pacientes) this.spawnPacientes(L.pacientes);

    // Cámara
    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    const camW = ((L.camara && L.camara.ancho) || MAP_W) * TILE;
    cam.setBounds(0, -HUD_TOP_WORLD, camW, MAP_H * TILE + HUD_TOP_WORLD + 40);
    cam.startFollow(this.player.sprite, true, 0.18, 0.18);
    cam.setRoundPixels(true);

    // Flechita de objetivo y marcas de puntos a visitar
    this.arrow = this.add.image(0, 0, 'arrow').setOrigin(0.5, 1).setDepth(3000).setVisible(false);
    this.markers = [];

    // Zonas en las que está parado el jugador
    this.inZones = new Set(this.zonesAt(this.player.tx, this.player.ty));

    // Teclado
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ENTER');
    const onA = () => {
      audio.unlock();
      const hud = this.hud();
      if (hud && hud.faintState) {
        if (hud.faintState.canContinue) hud.faintContinue();
        return;
      }
      if (hud && hud.isDialogOpen()) hud.advanceDialog();
      else if (this.canControl()) controls.pressA();
    };
    this.input.keyboard.on('keydown-SPACE', onA);
    this.input.keyboard.on('keydown-ENTER', onA);

    this.hitG = this.add.graphics().setDepth(5000);

    if (this.script.init) this.script.init(this);

    this.scene.launch('Hud');
    this.scene.bringToTop('Hud');

    this.events.once('shutdown', () => {
      this.input.keyboard.removeAllListeners();
      controls.reset();
      this.auto = null;
      if (this.script.shutdown) this.script.shutdown(this);
    });
  }

  // ---------- armado ----------
  addNpc(n) {
    const w = this.world.addWalker(n.sprite, n.x, n.y, n.dir, { id: n.id });
    w.kind = 'npc';
    this.npcs[n.id] = w;
    this.npcMeta[n.id] = n;
    return w;
  }

  removeNpc(id) {
    const w = this.npcs[id];
    if (!w) return;
    this.world.removeWalker(w);
    delete this.npcs[id];
  }

  addObject(o) {
    const tiles = o.tiles ? o.tiles.map(([x, y]) => ({ x, y })) : [{ x: o.x, y: o.y }];
    const obj = { ...o, tiles, img: null };
    if (o.sprite) {
      obj.img = this.add.image(tiles[0].x * TILE + 8, tiles[0].y * TILE + 8, o.sprite).setDepth(tiles[0].y * TILE + 4);
    }
    if (o.solido) tiles.forEach((t) => this.world.setExtraSolid(t.x, t.y, true));
    this.objects[o.id] = obj;
    return obj;
  }

  // Mueve un objeto (por ejemplo, el carrito) a otro tile, con animación.
  moveObject(id, x, y, ms = 600) {
    const o = this.objects[id];
    if (!o) return;
    if (o.solido) o.tiles.forEach((t) => this.world.setExtraSolid(t.x, t.y, false));
    o.tiles = [{ x, y }];
    if (o.solido) this.world.setExtraSolid(x, y, true);
    if (o.img) {
      this.tweens.add({ targets: o.img, x: x * TILE + 8, y: y * TILE + 8, duration: ms, ease: 'Sine.InOut' });
      o.img.setDepth(y * TILE + 4);
    }
  }

  objectAt(x, y) {
    for (const id of Object.keys(this.objects)) {
      const o = this.objects[id];
      if (o.tiles.some((t) => t.x === x && t.y === y)) return o;
    }
    return null;
  }

  spawnPacientes(P) {
    const j = this.level.jugador;
    const pz = P.zona;
    const free = [];
    for (let y = pz.y; y < pz.y + pz.h; y++) {
      for (let x = pz.x; x < pz.x + pz.w; x++) {
        if (!this.world.isBlocked(x, y) && Math.abs(x - j.x) + Math.abs(y - j.y) > 2) free.push({ x, y });
      }
    }
    Phaser.Utils.Array.Shuffle(free);
    P.sprites.forEach((sp, i) => {
      const pos = free[i];
      if (!pos) return;
      const dirs = ['down', 'left', 'right', 'up'];
      const w = this.world.addWalker(sp, pos.x, pos.y, dirs[i % 4], { id: `paciente${i}` });
      w.kind = 'paciente';
      w.nextMove = 600 + Math.random() * 2000;
      w.inQueue = false;
      this.pacientes.push(w);
    });
  }

  hud() {
    const h = this.scene.get('Hud');
    return h && h.ready && h.sys.isActive() ? h : null;
  }

  canControl() {
    return this.phase === 'play' && !this._leaving;
  }

  currentStep() {
    return this.level.pasos.find((p) => p.id === this.paso);
  }

  currentObjective() {
    const s = this.currentStep();
    if (!s) return '';
    let t = s.objetivo;
    if (s.contador) {
      const n = s.contador.filter((f) => this.flags.has(f)).length;
      t += ` (${n}/${s.contador.length})`;
    }
    return t;
  }

  refreshObjective() {
    const hud = this.hud();
    if (hud) hud.setObjective(this.currentObjective(), false);
  }

  // ---------- medidor ----------
  addPain(v, opts = {}) {
    const cap = this.phase === 'play' && !this.capOff ? this.M.maxAntesDelColapso : 100;
    const before = this.pain;
    this.pain = Math.max(0, Math.min(Math.max(cap, before), this.pain + v));
    const d = this.pain - before;
    const hud = this.hud();
    if (opts.hit && v > 0) {
      audio.play(this.M.sonido || 'pain');
      this.cameras.main.shake(260, 0.006);
      if (hud) hud.hit();
      this.floatText(`${this.M.golpe || '¡AY!'} ${this.M.sube === false ? '-' : '+'}${Math.round(v)}`);
    } else if (opts.hit && v < 0) {
      this.floatText(`${this.M.sube === false ? '+' : '-'}${Math.round(-v)}`, '#3fb68b');
    }
    return d;
  }

  // Lleva el medidor a un valor con animación.
  tweenPain(to, ms) {
    return this.tweens.addCounter({
      from: this.pain,
      to,
      duration: ms,
      onUpdate: (tw) => {
        this.pain = tw.getValue();
      },
    });
  }

  floatText(str, color = '#ff4a4a', at = this.player) {
    const p = at.sprite || at;
    const t = worldText(this, p.x, p.y - 12, str, 6, color, { fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 1 })
      .setOrigin(0.5, 1)
      .setDepth(2500);
    this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  // ---------- guion ----------
  setStep(id) {
    if (!this.level.pasos.find((p) => p.id === id)) return;
    this.paso = id;
    const hud = this.hud();
    if (hud) hud.setObjective(this.currentObjective(), true);
    const s = this.currentStep();
    if (s.alEntrar) this.engineEvent(s.alEntrar);
    if (this.paso !== id) return; // el evento ya cambió de paso
    if (!this.checkStepComplete()) {
      // Si ya estás parado en una zona que dispara algo en este paso, que se dispare.
      this.later(350, () => this.recheckZones());
    }
  }

  checkStepComplete() {
    const s = this.currentStep();
    if (s && s.completo && s.completo.flags.every((f) => this.flags.has(f))) {
      this.setStep(s.completo.ir);
      return true;
    }
    return false;
  }

  findRule(key) {
    const rules = this.level.reglas;
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (!asArray(r.en).includes(key)) continue;
      if (r.paso && !asArray(r.paso).includes(this.paso)) continue;
      if (r.si && !asArray(r.si).every((f) => this.flags.has(f))) continue;
      if (r.siNo && asArray(r.siNo).some((f) => this.flags.has(f))) continue;
      if (r.unaVez && this.usedRules.has(i)) continue;
      return { r, i };
    }
    return null;
  }

  // Normaliza líneas de diálogo: 'texto' o {quien, texto}.
  lines(list, quien = '') {
    return asArray(list).map((t) => (typeof t === 'string' ? { quien, texto: t } : t));
  }

  // Muestra un diálogo y después sigue.
  say(list, onDone, quien = '') {
    const hud = this.hud();
    const ls = this.lines(list, quien);
    if (!ls.length || !hud) {
      if (onDone) onDone();
      return;
    }
    audio.play('blip');
    hud.showDialog(ls, onDone);
  }

  runEvent(key, who) {
    if (this.phase !== 'play') return false;
    const found = this.findRule(key);
    if (!found) return false;
    const { r, i } = found;
    this.usedRules.add(i);
    this.auto = null;
    let lines = [];
    if (r.alAzar) {
      const fr = this.level.pacientes.frases;
      lines = [{ quien: 'Paciente', texto: fr[Math.floor(Math.random() * fr.length)] }];
    } else {
      let name = '';
      if (key.startsWith('npc:')) name = (this.npcMeta[key.slice(4)] || {}).nombre;
      else if (key.startsWith('obj:')) name = (this.objects[key.slice(4)] || {}).nombre;
      lines = this.lines(r.dice, r.quien || name || '');
    }
    if (who && who !== this.player && who.face) {
      who.face(dirBetween({ x: who.tx, y: who.ty }, { x: this.player.tx, y: this.player.ty }));
    }
    if (r.mira) {
      asArray(r.mira).forEach((id) => {
        const w = this.npcs[id];
        if (w) w.face(dirBetween({ x: w.tx, y: w.ty }, { x: this.player.tx, y: this.player.ty }));
      });
    }
    if (r.sonido) audio.play(r.sonido);
    if (r.flotante) this.floatText(r.flotante, '#0d7a55');
    if (r.antes) this.engineEvent(r.antes, r);
    const apply = () => this.applyRule(r);
    const hud = this.hud();
    if (lines.length && hud) {
      audio.play('blip');
      hud.showDialog(lines, apply);
    } else {
      apply();
    }
    return true;
  }

  applyRule(r) {
    asArray(r.marca).forEach((f) => this.flags.add(f));
    const v = r.medidor != null ? r.medidor : r.dolor;
    if (v) this.addPain(v, { hit: true });
    if (r.marca) this.refreshObjective();
    if (r.evento) this.engineEvent(r.evento, r);
    if (r.ir) this.setStep(r.ir);
    else if (this.phase === 'play') this.checkStepComplete();
  }

  engineEvent(name, rule) {
    const ev = this.script.eventos && this.script.eventos[name];
    if (ev) ev(this, rule);
  }

  // delayedCall que se cancela solo al salir de la escena
  later(ms, fn) {
    return this.time.delayedCall(ms, () => {
      if (this.sys && this.sys.isActive()) fn();
    });
  }

  // Corta el control del jugador (escena guionada) o lo devuelve.
  cutscene(on) {
    const hud = this.hud();
    if (on) {
      this.phase = 'cutscene';
      this.auto = null;
      controls.reset();
      if (hud) hud.setControlsVisible(false);
      this.arrow.setVisible(false);
    } else if (!this.fainted) {
      this.phase = 'play';
      if (hud) hud.setControlsVisible(true);
      this.cameras.main.startFollow(this.player.sprite, true, 0.18, 0.18);
    }
  }

  // ---------- zonas ----------
  zonesAt(x, y) {
    return (this.level.zonas || []).filter((z) => inRect(x, y, z)).map((z) => z.id);
  }

  recheckZones() {
    if (this.phase !== 'play') return;
    const hud = this.hud();
    if (hud && hud.isDialogOpen()) return;
    for (const z of this.zonesAt(this.player.tx, this.player.ty)) {
      if (this.runEvent(`zona:${z}`)) return;
    }
  }

  onPlayerArrive() {
    audio.play('step');
    const now = new Set(this.zonesAt(this.player.tx, this.player.ty));
    const entered = [...now].filter((z) => !this.inZones.has(z));
    this.inZones = now;
    const d = doorAt(this.player.tx, this.player.ty);
    if (d) audio.play('door');
    if (this.script.onArrive) this.script.onArrive(this);
    for (const z of entered) {
      if (this.runEvent(`zona:${z}`)) break;
    }
  }

  // ---------- interacción ----------
  tryInteract() {
    const f = this.player.front();
    const w = this.world.walkerAt(f.x, f.y, this.player);
    if (w) return this.interactWalker(w);
    const o = this.objectAt(f.x, f.y);
    if (o) return this.runEvent(`obj:${o.id}`);
    if (isCounter(f.x, f.y) && this.npcs.recepcionista) return this.interactWalker(this.npcs.recepcionista);
    const door = tileAt(f.x, f.y) === 'D' ? doorAt(f.x, f.y) : null;
    if (door && this.world.closed.has(door)) return this.runEvent(`puerta:${door}`);
    return false;
  }

  interactWalker(w) {
    if (w.kind === 'npc') return this.runEvent(`npc:${w.id}`, w);
    if (w.kind === 'paciente') return this.runEvent('paciente', w);
    return false;
  }

  // Tocar la pantalla: si es un personaje, objeto, puerta o piso, caminamos hasta ahí (y hablamos).
  handleTap(sx, sy) {
    if (!this.canControl()) return;
    const p = this.cameras.main.getWorldPoint(sx, sy);
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
    const pl = { x: this.player.tx, y: this.player.ty };
    let w = this.world.walkerAt(tx, ty, this.player);
    if (!w && isCounter(tx, ty) && this.npcs.recepcionista) w = this.npcs.recepcionista;
    if (w && w.kind !== 'player') {
      this.approachAndTalk(w);
      return;
    }
    const o = this.objectAt(tx, ty);
    if (o) {
      this.approachObject(o);
      return;
    }
    const door = tileAt(tx, ty) === 'D' ? doorAt(tx, ty) : null;
    if (door) {
      const room = ROOMS[door];
      if (this.world.closed.has(door)) {
        this.walkTo(room.outside, () => {
          this.player.face(dirBetween(room.outside, room.door));
          this.runEvent(`puerta:${door}`);
        });
      } else {
        const inRoom = inRect(pl.x, pl.y, room.rect);
        this.walkTo(inRoom ? room.outside : room.inside);
      }
      return;
    }
    if (!this.world.isSolid(tx, ty)) this.walkTo({ x: tx, y: ty });
  }

  // Lugares desde donde se puede interactuar con un tile (mirando hacia él).
  spotsAround(tiles) {
    const spots = [];
    tiles.forEach((t) =>
      [['up', 0, 1], ['down', 0, -1], ['left', 1, 0], ['right', -1, 0]].forEach(([face, dx, dy]) =>
        spots.push({ x: t.x + dx, y: t.y + dy, face }),
      ),
    );
    return spots;
  }

  goInteract(spots, act) {
    const pl = { x: this.player.tx, y: this.player.ty };
    const here = spots.find((s) => s.x === pl.x && s.y === pl.y);
    if (here) {
      this.player.face(here.face);
      act();
      return true;
    }
    let best = null;
    for (const s of spots) {
      if (this.world.isBlocked(s.x, s.y, this.player)) continue;
      const path = this.world.findPath(pl, s, this.player);
      if (path && (!best || path.length < best.path.length)) best = { s, path };
    }
    if (!best) return false;
    this.walkTo(best.s, () => {
      this.player.face(best.s.face);
      act();
    });
    return true;
  }

  approachAndTalk(w) {
    // Para la recepcionista se habla desde el otro lado del mostrador.
    const spots = [];
    if (w === this.npcs.recepcionista) {
      for (let x = 1; x <= 4; x++) spots.push({ x, y: 13, face: 'up' });
    }
    spots.push(...this.spotsAround([{ x: w.tx, y: w.ty }]));
    this.goInteract(spots, () => this.interactWalker(w));
  }

  approachObject(o) {
    this.goInteract(this.spotsAround(o.tiles), () => this.runEvent(`obj:${o.id}`));
  }

  walkTo(goal, onDone) {
    const pl = { x: this.player.tx, y: this.player.ty };
    let path = this.world.findPath(pl, goal, this.player);
    if (!path) path = this.world.findPath(pl, goal, this.player, true);
    if (!path) return false;
    this.auto = { path, goal: { x: goal.x, y: goal.y }, onDone, wait: 0 };
    if (!path.length) {
      this.auto = null;
      if (onDone) onDone();
    }
    return true;
  }

  // Empuja al jugador un paso (por ejemplo, retrocede asustado). Nunca lo encierra.
  pushPlayer(dir) {
    const v = DIR_V[dir];
    const nx = this.player.tx + v[0];
    const ny = this.player.ty + v[1];
    if (this.world.isBlocked(nx, ny, this.player)) return false;
    const face = this.player.dir;
    const ok = this.player.tryStep(dir, 260);
    if (ok) this.player.dir = face;
    return ok;
  }

  // ---------- derrota ----------
  faint() {
    if (this.fainted) return;
    this.fainted = true;
    this.phase = 'faint';
    this.pain = 100;
    this.auto = null;
    controls.reset();
    this.arrow.setVisible(false);
    this.clearMarkers();
    audio.setMusic(false);
    const hud = this.hud();
    if (hud) hud.setControlsVisible(false);
    const D = this.level.desmayo;
    const inHall = this.zonesAt(this.player.tx, this.player.ty).includes('hall');
    const text = D.texto || (inHall ? D.textoHall : D.textoOtro);
    const next = () => goTo(this, 'WhatFailed', null, 400);
    const show = () => {
      const h = this.hud();
      if (h) h.showFaint(text, next, D.oscuro);
      else this.later(3000, next);
    };
    if (this.script.animDerrota) this.script.animDerrota(this, show);
    else {
      this.defaultFaintAnim();
      show();
    }
  }

  defaultFaintAnim() {
    audio.play('faint');
    const p = this.player.sprite;
    this.tweens.add({ targets: p, angle: 90, y: p.y + 3, duration: 500, ease: 'Bounce.Out' });
    this.cameras.main.shake(300, 0.01);
    // Estrellitas de mareo
    for (let i = 0; i < 3; i++) {
      const s = this.add.image(p.x, p.y - 8, 'star').setDepth(2600);
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 1200,
        repeat: -1,
        onUpdate: (tw) => {
          const a = tw.getValue() * Math.PI * 2 + (i * Math.PI * 2) / 3;
          s.x = p.x + Math.cos(a) * 7;
          s.y = p.y - 9 + Math.sin(a) * 2.5;
        },
      });
    }
  }

  // ---------- objetivo / flecha ----------
  posOf(t) {
    if (t.startsWith('npc:') && this.npcs[t.slice(4)]) {
      const w = this.npcs[t.slice(4)];
      return { x: w.tx, y: w.ty };
    }
    if (t.startsWith('puerta:') && ROOMS[t.slice(7)]) return ROOMS[t.slice(7)].door;
    if (t.startsWith('obj:') && this.objects[t.slice(4)]) {
      const o = this.objects[t.slice(4)];
      let best = o.tiles[0];
      let bd = Infinity;
      o.tiles.forEach((tt) => {
        const d = Math.abs(tt.x - this.player.tx) + Math.abs(tt.y - this.player.ty);
        if (d < bd) {
          bd = d;
          best = tt;
        }
      });
      return best;
    }
    if (t.startsWith('tile:')) {
      const [x, y] = t.slice(5).split(',').map(Number);
      return { x, y };
    }
    return null;
  }

  pendingTargets() {
    const s = this.currentStep();
    if (!s || !s.target) return [];
    return asArray(s.target).filter(
      (t) => !(t.startsWith('npc:') && this.flags.has(`hablo:${t.slice(4)}`)) && !this.flags.has(`hecho:${t}`),
    );
  }

  targetTile() {
    let best = null;
    for (const t of this.pendingTargets()) {
      const pos = this.posOf(t);
      if (!pos) continue;
      const d = Math.abs(pos.x - this.player.tx) + Math.abs(pos.y - this.player.ty);
      if (!best || d < best.d) best = { ...pos, d };
    }
    return best;
  }

  clearMarkers() {
    this.markers.forEach((m) => m.destroy());
    this.markers = [];
    this.markerKey = '';
  }

  // Marquitas sobre los objetos pendientes del paso (ej: las 3 facturas).
  updateMarkers() {
    const list = this.phase === 'play' ? this.pendingTargets().filter((t) => t.startsWith('obj:')) : [];
    const key = list.join('|');
    if (key !== this.markerKey) {
      this.clearMarkers();
      this.markerKey = key;
      list.forEach((t) => {
        const o = this.objects[t.slice(4)];
        if (!o) return;
        const tt = o.tiles[0];
        const m = this.add.image(tt.x * TILE + 8, tt.y * TILE + 8, 'marker').setDepth(2900);
        this.tweens.add({ targets: m, scale: 1.5, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
        this.markers.push(m);
      });
    }
  }

  updateArrow() {
    const hud = this.hud();
    const tt = this.phase === 'play' ? this.targetTile() : null;
    if (!tt) {
      this.arrow.setVisible(false);
      if (hud) hud.setEdgeArrow(false);
      return;
    }
    const bob = Math.sin(this.time.now / 170) * 2;
    const wx = tt.x * TILE + 8;
    const wy = tt.y * TILE - 2 + bob;
    this.arrow.setPosition(wx, wy).setVisible(tt.d > 0);
    if (!hud) return;
    const cam = this.cameras.main;
    const v = cam.worldView;
    const sx = (wx - v.x) * ZOOM;
    const sy = (tt.y * TILE + 8 - v.y) * ZOOM;
    const onScreen = sx > 30 && sx < GW - 30 && sy > 190 && sy < GH - 260;
    if (onScreen) {
      hud.setEdgeArrow(false);
      return;
    }
    const px = (this.player.sprite.x - v.x) * ZOOM;
    const py = (this.player.sprite.y - v.y) * ZOOM;
    const ang = Math.atan2(sy - py, sx - px);
    const ex = Phaser.Math.Clamp(px + Math.cos(ang) * 1000, 50, GW - 50);
    const ey = Phaser.Math.Clamp(py + Math.sin(ang) * 1000, 220, GH - 300);
    // proyectamos sobre el borde del rectángulo
    const kx = Math.cos(ang) !== 0 ? Math.abs(((Math.cos(ang) > 0 ? GW - 50 : 50) - px) / Math.cos(ang)) : Infinity;
    const ky = Math.sin(ang) !== 0 ? Math.abs(((Math.sin(ang) > 0 ? GH - 300 : 220) - py) / Math.sin(ang)) : Infinity;
    const k = Math.min(kx, ky);
    const fx = Number.isFinite(k) ? px + Math.cos(ang) * k : ex;
    const fy = Number.isFinite(k) ? py + Math.sin(ang) * k : ey;
    hud.setEdgeArrow(true, Phaser.Math.Clamp(fx, 50, GW - 50), Phaser.Math.Clamp(fy, 220, GH - 300), ang);
  }

  // ---------- loop ----------
  keyDir() {
    const k = this.keys;
    if (!k) return null;
    if (k.UP.isDown || k.W.isDown) return 'up';
    if (k.DOWN.isDown || k.S.isDown) return 'down';
    if (k.LEFT.isDown || k.A.isDown) return 'left';
    if (k.RIGHT.isDown || k.D.isDown) return 'right';
    return null;
  }

  handleMovement(dt) {
    const pl = this.player;
    if (pl.moving) return;
    const manual = this.keyDir() || controls.joyDir;
    if (manual) this.auto = null;
    let dir = manual;
    if (!dir && this.auto) {
      const a = this.auto;
      if (!a.path.length) {
        this.auto = null;
        if (a.onDone) a.onDone();
        return;
      }
      const next = a.path[0];
      if (Math.abs(next.x - pl.tx) + Math.abs(next.y - pl.ty) !== 1) {
        // nos desviamos: recalculamos
        this.walkTo(a.goal, a.onDone);
        return;
      }
      dir = dirBetween({ x: pl.tx, y: pl.ty }, next);
      if (this.world.isBlocked(next.x, next.y, pl)) {
        pl.face(dir);
        a.wait += dt;
        if (a.wait > 450) {
          const np = this.world.findPath({ x: pl.tx, y: pl.ty }, a.goal, pl);
          if (np && np.length) {
            a.path = np;
            a.wait = 0;
          } else if (a.wait > 2500) {
            this.auto = null;
          }
        }
        return;
      }
      a.wait = 0;
    }
    if (!dir) return;
    const slow = 1 - (this.M.lentitud == null ? 0.45 : this.M.lentitud) * (this.pain / 100);
    let dur = 175 / slow;
    const v = DIR_V[dir];
    if (this.script.slowAt && this.script.slowAt(this, pl.tx + v[0], pl.ty + v[1])) dur *= 1.6;
    if (pl.tryStep(dir, dur)) {
      if (!manual && this.auto) this.auto.path.shift();
    } else if (manual && this.time.now - this.lastBump > 300) {
      this.lastBump = this.time.now;
      audio.play('bump');
    }
  }

  updatePacientes(dt) {
    if (!this.level.pacientes) return;
    const zona = this.level.pacientes.zona;
    for (const w of this.pacientes) {
      if (w.inQueue || w.moving) continue;
      w.nextMove -= dt;
      if (w.nextMove > 0) continue;
      w.nextMove = 900 + Math.random() * 2400;
      const dirs = ['up', 'down', 'left', 'right'];
      const dir = dirs[Math.floor(Math.random() * 4)];
      const v = DIR_V[dir];
      const nx = w.tx + v[0];
      const ny = w.ty + v[1];
      if (!inRect(nx, ny, zona)) {
        w.face(dir);
        continue;
      }
      w.tryStep(dir, 340);
    }
    // De vez en cuando alguno se queja en voz alta.
    if (this.phase === 'play' && this.level.pacientes.frases) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) {
        this.bubbleTimer = 7000 + Math.random() * 4000;
        const free = this.pacientes.filter((w) => !w.inQueue);
        if (free.length) {
          const w = free[Math.floor(Math.random() * free.length)];
          const fr = this.level.pacientes.frases;
          this.world.bubble(w, fr[Math.floor(Math.random() * fr.length)], 2200);
        }
      }
    }
  }

  // Forma de caminar según el medidor: temblor (miedo) o encorvado (bajón).
  updatePosture() {
    const andar = this.level.jugador.andar;
    const pl = this.player;
    if (andar === 'tiembla') {
      const shake = this.pain > 35 && this.phase !== 'faint';
      const amp = this.pain > 70 ? 1 : 0.6;
      pl.offX = shake && Math.random() < amp * 0.5 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      pl.refresh();
    } else if (andar === 'cansado') {
      const sp = this.level.jugador.sprite;
      pl.setSkin(this.pain > 55 ? `${sp}_bajon` : sp);
    }
  }

  drawHitboxes() {
    const g = this.hitG;
    g.clear();
    if (!state.hitboxes) return;
    g.lineStyle(0.5, 0xff0000, 0.9);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (this.world.isSolid(x, y)) g.strokeRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    g.lineStyle(0.5, 0x00ff00, 1);
    for (const w of this.world.walkers) {
      g.strokeRect(w.tx * TILE + 1, w.ty * TILE + 1, TILE - 2, TILE - 2);
      if (w.moving) g.strokeRect(w.toX * TILE + 3, w.toY * TILE + 3, TILE - 6, TILE - 6);
    }
    (this.level.zonas || []).forEach((z) => {
      g.lineStyle(0.5, 0x3fa9ff, 0.8);
      g.strokeRect(z.x * TILE, z.y * TILE, z.w * TILE, z.h * TILE);
    });
  }

  update(time, delta) {
    if (state.rotatePaused) return;
    const dt = Math.min(delta, 50) * state.speed;
    for (const w of this.world.walkers) w.update(dt);
    this.updatePacientes(dt);

    const hud = this.hud();
    const dialogOpen = hud ? hud.isDialogOpen() : false;
    if (this.phase === 'play' && hud) {
      if (!dialogOpen) {
        this.elapsed += dt / 1000;
        this.addPain((this.meterRate * dt) / 1000);
        if (this.elapsed >= this.M.topeSegundos && !this.topeHit) {
          this.topeHit = true;
          if (this.script.alTope) this.script.alTope(this);
          else this.faint();
        } else {
          const a = controls.consumeA();
          if (a && hud.time.now - hud.dialogClosedAt > 250 && !this.player.moving) this.tryInteract();
          if (!hud.isDialogOpen() && this.phase === 'play') this.handleMovement(dt);
        }
      } else {
        controls.consumeA();
      }
    }
    if (this.script.update) this.script.update(this, dt, dialogOpen);
    this.updatePosture();
    if (hud) hud.setPain(this.pain);
    this.updateArrow();
    this.updateMarkers();
    this.drawHitboxes();
  }

  // ---------- datos para tests ----------
  testState() {
    return {
      nivel: this.level.id,
      paso: this.paso,
      phase: this.phase,
      dolor: Math.round(this.pain * 10) / 10,
      medidor: Math.round(this.pain * 10) / 10,
      elapsed: this.elapsed,
      flags: [...this.flags],
      player: { x: this.player.tx, y: this.player.ty, moving: this.player.moving, sprite: this.player.key },
      auto: !!this.auto,
      pacientes: this.pacientes.map((w) => ({ x: w.tx, y: w.ty, inQueue: w.inQueue })),
      npcs: Object.fromEntries(Object.entries(this.npcs).map(([k, w]) => [k, { x: w.tx, y: w.ty }])),
      objetos: Object.fromEntries(Object.entries(this.objects).map(([k, o]) => [k, o.tiles[0]])),
      extra: this.script.testState ? this.script.testState(this) : {},
      reachable: this.reachabilityCheck(),
    };
  }

  // Verifica que desde cualquier tile caminable se puede llegar a recepción (nadie queda encerrado).
  reachabilityCheck() {
    const goal = { x: 2, y: 13 };
    const closedRooms = [...this.world.closed].map((id) => ROOMS[id].rect);
    let bad = 0;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (this.world.isSolid(x, y) || isSolidTile(x, y)) continue;
        if (closedRooms.some((r) => inRect(x, y, r))) continue;
        if (inRect(x, y, { x: 1, y: 11, w: 4, h: 1 })) continue; // detrás del mostrador (solo personal)
        if (x === goal.x && y === goal.y) continue;
        if (!this.world.findPath({ x, y }, goal, null, true)) bad += 1;
      }
    }
    return bad === 0;
  }
}
