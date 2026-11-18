import Phaser from 'phaser';
import { World } from '../core/world.js';
import { TILE, MAP_W, MAP_H } from '../core/map.js';
import { GW, COLORS, titleText, bodyText, fadeIn, goTo, makeButton, Meter } from '../core/ui.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';
import { scriptFor } from '../levels/index.js';

const ZOOM = 4;

// Repetición automática (~15-20 s) del sanatorio funcionando con la propuesta.
// Qué pasa en la repetición lo decide el guion de cada nivel (función arreglado).
export default class Fixed extends Phaser.Scene {
  constructor() {
    super('Fixed');
  }

  create() {
    fadeIn(this, 400);
    audio.setMusic(true);
    const L = (this.level = state.level);
    const A = L.arreglado;
    this.time.timeScale = state.speed;
    this.tweens.timeScale = state.speed;
    this.pain = A.medidorInicial == null ? 60 : A.medidorInicial;
    this.done = false;
    this.extra = {};

    this.cameras.main.setBackgroundColor('#1b3b3f');
    const world = (this.world = new World(this, L, { fixed: true, closed: A.puertasCerradas || [] }));

    this.npcs = {};
    (A.npcs || L.npcs || []).forEach((n) => {
      this.npcs[n.id] = world.addWalker(n.sprite, n.x, n.y, n.dir, { id: n.id });
    });
    this.objects = {};
    (L.objetos || []).forEach((o) => {
      if (!o.sprite) return;
      this.objects[o.id] = this.add.image(o.x * TILE + 8, o.y * TILE + 8, o.sprite).setDepth(o.y * TILE + 4);
    });

    const j = L.jugador;
    const start = A.jugador || j;
    this.player = world.addWalker(j.sprite || 'paciente', start.x, start.y, start.dir || 'up', {
      id: 'jugador',
      limp: j.andar === 'renguea',
    });

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    const camW = ((L.camara && L.camara.ancho) || MAP_W) * TILE;
    cam.setBounds(0, -44, camW, MAP_H * TILE + 84);

    // UI en una cámara aparte sin zoom
    this.uiCam = this.cameras.add(0, 0, GW, 1280);
    this.uiCam.setScroll(0, 0);
    const ui = (this.ui = []);
    const top = this.add.graphics();
    top.fillStyle(0x0f2a2e, 0.9);
    top.fillRect(0, 0, GW, 168);
    ui.push(top);
    this.meter = new Meter(this, 16, 10, 568, L.medidor);
    ui.push(...this.meter.objects());
    const banner = titleText(this, GW / 2, 132, A.titulo, 26, COLORS.yellow).setOrigin(0.5);
    ui.push(banner);
    this.calText = bodyText(this, 300, -2, '', 34, COLORS.yellow).setVisible(false);
    ui.push(this.calText);
    const skip = makeButton(this, GW - 130, 1190, 220, 84, 'SALTAR ▶', () => this.finish(), {
      name: 'btn:saltar',
      fontSize: 30,
      color: 0x4f9fd8,
    });
    ui.push(skip.g, skip.txt, skip.zone);
    this.stamp = titleText(this, GW / 2, 640, '¡ASÍ SÍ!', 120, '#3fb68b').setOrigin(0.5).setAlpha(0);
    this.stamp.setStroke('#0f2a2e', 14);
    ui.push(this.stamp);
    ui.forEach((o) => o.setScrollFactor(0));
    cam.ignore(ui);
    this.uiCam.ignore(this.children.list.filter((o) => !ui.includes(o)));
    // Lo que se cree después (burbujas, corazones) es del mundo: que la cámara UI no lo vea.
    this.events.on('addedtoscene', (go) => {
      if (!ui.includes(go)) this.uiCam.ignore(go);
    });

    const script = scriptFor(L.id);
    try {
      if (script.arreglado) script.arreglado(this);
    } catch (e) {
      console.error(e);
    }
    // Red de seguridad: pase lo que pase, seguimos.
    this.at(A.duracionMax || 24000, () => this.finish());
  }

  // Elementos de UI agregados por el guion (que no los vea la cámara del mundo).
  addUi(obj) {
    obj.setScrollFactor(0);
    this.ui.push(obj);
    this.cameras.main.ignore(obj);
    return obj;
  }

  at(ms, fn) {
    return this.time.delayedCall(ms, () => {
      if (!this.done && this.sys && this.sys.isActive()) fn();
    });
  }

  setCalendar(text) {
    if (!this.calIcon) {
      this.calIcon = this.addUi(this.add.image(290, 18, 'calIcon').setScale(4).setOrigin(0, 0.5));
      this.calText.setPosition(330, -2);
    }
    if (this.calText.text !== text) audio.play('calendar');
    this.calText.setText(text).setVisible(true);
  }

  tweenPain(to, ms, delay = 0) {
    this.tweens.addCounter({
      from: this.pain,
      to,
      duration: ms,
      delay,
      onUpdate: (tw) => {
        this.pain = tw.getValue();
      },
    });
  }

  hearts(w) {
    for (let i = 0; i < 5; i++) {
      const h = this.add.image(w.sprite.x + (i - 2) * 4, w.sprite.y - 6, 'heart').setDepth(2600);
      this.tweens.add({
        targets: h,
        y: h.y - 18 - i * 2,
        alpha: 0,
        duration: 1400,
        delay: i * 120,
        onComplete: () => h.destroy(),
      });
    }
  }

  showStamp() {
    audio.play('jingle');
    this.tweens.add({ targets: this.stamp, alpha: 1, scale: { from: 2.5, to: 1 }, duration: 300, ease: 'Back.Out' });
  }

  // Camina por el camino más corto (esperando si alguien se cruza, con tope).
  walkTo(goal, onDone, walker = this.player, dur = 200) {
    const from = { x: walker.tx, y: walker.ty };
    const path = this.world.findPath(from, goal, walker) || this.world.findPath(from, goal, walker, true) || [];
    let tries = 0;
    const step = () => {
      if (this.done) return;
      if (!path.length) {
        if (onDone) onDone();
        return;
      }
      const n = path[0];
      const dir = n.x > walker.tx ? 'right' : n.x < walker.tx ? 'left' : n.y > walker.ty ? 'down' : 'up';
      if (walker.tryStep(dir, dur)) {
        path.shift();
        walker.onArrive = () => {
          if (walker === this.player) audio.play('step');
          step();
        };
      } else {
        tries += 1;
        if (tries > 20) {
          if (onDone) onDone();
        } else this.time.delayedCall(150, step);
      }
    };
    step();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    goTo(this, 'Proposal', null, 300);
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) * state.speed;
    if (state.rotatePaused) return;
    this.world.walkers.forEach((w) => w.update(dt));
    this.meter.setValue(this.pain);
  }
}
