import Phaser from 'phaser';
import { World } from '../core/world.js';
import { TILE, MAP_W, MAP_H } from '../core/map.js';
import { GW, COLORS, titleText, fadeIn, goTo, makeButton, PainBar } from '../core/ui.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';

const ZOOM = 4;

// Repetición automática (~17 s) del hospital funcionando con la propuesta.
export default class Fixed extends Phaser.Scene {
  constructor() {
    super('Fixed');
  }

  create() {
    fadeIn(this, 400);
    audio.setMusic(true);
    const L = state.level;
    const A = L.arreglado;
    this.time.timeScale = state.speed;
    this.tweens.timeScale = state.speed;
    this.pain = 60;
    this.done = false;

    this.cameras.main.setBackgroundColor('#1b3b3f');
    const world = (this.world = new World(this, L, { fixed: true }));

    this.npcs = {};
    L.npcs.forEach((n) => {
      this.npcs[n.id] = world.addWalker(n.sprite, n.x, n.y, n.dir, { id: n.id });
    });
    const M = A.medico;
    this.medico = world.addWalker(M.sprite, M.x, M.y, M.dir, { id: 'medico' });
    // Pocos pacientes, sentados tranquilos
    ['pac2', 'pac5', 'pac7'].forEach((sp, i) => world.addWalker(sp, 10 + i, 14, 'up'));

    const j = L.jugador;
    this.player = world.addWalker('paciente', j.x, j.y - 1, 'up', { id: 'jugador', limp: true });

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, -44, MAP_W * TILE, MAP_H * TILE + 84);
    cam.centerOn(7.5 * TILE, 4 * TILE);

    // UI en una cámara aparte sin zoom
    this.uiCam = this.cameras.add(0, 0, GW, 1280);
    this.uiCam.setScroll(0, 0);
    const ui = [];
    const top = this.add.graphics();
    top.fillStyle(0x0f2a2e, 0.9);
    top.fillRect(0, 0, GW, 168);
    ui.push(top);
    const pb = (this.painBar = new PainBar(this, 16, 10, 568));
    ui.push(pb.face, pb.label, pb.g);
    const banner = titleText(this, GW / 2, 132, A.titulo, 26, COLORS.yellow).setOrigin(0.5);
    ui.push(banner);
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

    this.runTimeline(A);
  }

  runTimeline(A) {
    const L = state.level;
    const at = (ms, fn) => this.time.delayedCall(ms, fn);

    // 1) Los carteles se actualizan
    L.carteles.forEach((c, i) => {
      if (c.arreglado && c.arreglado !== c.texto) at(700 + i * 450, () => this.world.flipSign(c.id, c.arreglado));
    });
    at(2200, () => {
      if (A.puertaQueSeAbre) {
        this.world.openDoor(A.puertaQueSeAbre);
        audio.play('door');
      }
    });

    // 2) Todos dicen lo mismo
    at(2800, () => {
      this.cameras.main.pan(7 * TILE, 13 * TILE, 800, 'Sine.easeInOut');
    });
    at(3700, () => {
      A.hablan.forEach((id) => {
        const w = this.npcs[id];
        if (w) this.world.bubble(w, A.frase, 3400, '#0d6e4a');
      });
      if (this.npcs.recepcionista) this.world.bubble(this.npcs.recepcionista, A.recepcion, 3400, '#0d6e4a');
      audio.play('objective');
    });

    // 3) El paciente va directo al consultorio correcto
    at(7400, () => {
      this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
      const from = { x: this.player.tx, y: this.player.ty };
      const path =
        this.world.findPath(from, A.destino, this.player) || this.world.findPath(from, A.destino, this.player, true) || [];
      this.walkPath(path, () => this.arrive(A));
    });

    // Red de seguridad: pase lo que pase, a los 22 s seguimos.
    at(22000, () => this.finish());
  }

  walkPath(path, onDone) {
    const step = () => {
      if (!path.length) {
        onDone();
        return;
      }
      const n = path[0];
      const dir = n.x > this.player.tx ? 'right' : n.x < this.player.tx ? 'left' : n.y > this.player.ty ? 'down' : 'up';
      if (this.player.tryStep(dir, 200)) {
        path.shift();
        this.player.onArrive = () => {
          audio.play('step');
          step();
        };
      } else {
        // alguien en el medio: esperamos un toque y probamos de nuevo (con tope)
        this.blockedTries = (this.blockedTries || 0) + 1;
        if (this.blockedTries > 20) onDone();
        else this.time.delayedCall(150, step);
      }
    };
    step();
  }

  arrive(A) {
    this.player.face('left');
    this.medico.face('right');
    this.world.bubble(this.medico, A.medico.dice, 2600, '#0d6e4a');
    audio.play('heal');
    this.tweens.addCounter({
      from: this.pain,
      to: 0,
      duration: 2200,
      delay: 600,
      onUpdate: (tw) => {
        this.pain = tw.getValue();
      },
    });
    this.time.delayedCall(3000, () => {
      this.world.bubble(this.player, A.jugadorFinal, 2400, '#0d6e4a');
      for (let i = 0; i < 5; i++) {
        const h = this.add.image(this.player.sprite.x + (i - 2) * 4, this.player.sprite.y - 6, 'heart').setDepth(2600);
        this.tweens.add({
          targets: h,
          y: h.y - 18 - i * 2,
          alpha: 0,
          duration: 1400,
          delay: i * 120,
          onComplete: () => h.destroy(),
        });
      }
    });
    this.time.delayedCall(4200, () => {
      audio.play('jingle');
      this.tweens.add({ targets: this.stamp, alpha: 1, scale: { from: 2.5, to: 1 }, duration: 300, ease: 'Back.Out' });
    });
    this.time.delayedCall(6200, () => this.finish());
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
    this.painBar.setValue(this.pain);
  }
}
