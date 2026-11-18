import Phaser from 'phaser';
import { GW, GH, COLORS, bodyText, titleText, Meter, registerHit, renderRich } from '../core/ui.js';
import { controls } from '../core/controls.js';
import { audio } from '../core/audio.js';
import { state } from '../core/state.js';

const A_X = 600;
const A_Y = 1120;
const A_R = 82;
const JOY_R = 92;
const TOP_H = 168;

function stripEm(s) {
  return String(s).split('**').join('');
}

// Interfaz del juego: barra de dolor, objetivo, joystick, botón A, diálogos y desmayo.
export default class Hud extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    this.ready = false;
    this.gameScene = this.scene.get('Game');
    this.dialog = null;
    this.dialogClosedAt = 0;
    this.lastAdvance = 0;
    this.faintState = null;
    this.joyPointer = null;
    this.taps = {};
    this.controlsVisible = true;
    controls.reset();

    const L = state.level;
    // Viñeta del medidor (roja para dolor, oscura para miedo...)
    const vk = (L.medidor && L.medidor.vineta) || 'vignette';
    this.vignette = this.add.image(0, 0, vk).setOrigin(0).setScale(4).setAlpha(0).setDepth(0);
    this.redFlash = this.add.rectangle(0, 0, GW, GH, 0xff2a2a, 1).setOrigin(0).setAlpha(0).setDepth(1);

    // Panel superior
    const top = this.add.graphics().setDepth(5);
    top.fillStyle(0x0f2a2e, 0.88);
    top.fillRect(0, 0, GW, TOP_H);
    top.fillStyle(0x000000, 0.5);
    top.fillRect(0, TOP_H, GW, 4);
    this.pain = new Meter(this, 16, 10, 568, L.medidor).setDepth(6);
    // Calendario (solo si el nivel lo usa)
    this.calIcon = this.add.image(300, 20, 'calIcon').setScale(4).setOrigin(0, 0.5).setDepth(6).setVisible(false);
    this.calText = titleText(this, 338, 4, '', 26, COLORS.yellow).setDepth(6).setVisible(false);
    // Hoja grande de calendario que aparece al cambiar de mes
    this.calPage = this.add.container(GW / 2, 470).setDepth(15).setVisible(false);
    {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.45);
      g.fillRect(-150 + 8, -120 + 10, 300, 240);
      g.fillStyle(0x26303a, 1);
      g.fillRect(-150, -120, 300, 240);
      g.fillStyle(0xffffff, 1);
      g.fillRect(-144, -114, 288, 228);
      g.fillStyle(0xe04848, 1);
      g.fillRect(-144, -114, 288, 66);
      g.fillStyle(0x26303a, 1);
      [-90, 78].forEach((x) => g.fillRect(x, -134, 12, 34));
      this.calPageText = titleText(this, 0, -81, '', 34, '#ffffff').setOrigin(0.5);
      this.calPageSub = bodyText(this, 0, 30, '', 40, COLORS.dark, {
        align: 'center',
        wordWrap: { width: 260, useAdvancedWrap: true },
      }).setOrigin(0.5);
      this.calPage.add([g, this.calPageText, this.calPageSub]);
    }
    this.overlay = this.add.container(0, 0).setDepth(25);
    this.objective = bodyText(this, 18, 100, '', 32, COLORS.cream, {
      wordWrap: { width: GW - 36, useAdvancedWrap: true },
      lineSpacing: -4,
    }).setDepth(6);

    // Flecha al borde cuando el objetivo está fuera de pantalla
    this.edgeArrow = this.add.image(0, 0, 'edgeArrow').setScale(5).setVisible(false).setDepth(4);

    // Joystick
    this.joyG = this.add.graphics().setDepth(10);
    this.joyBase = { x: 150, y: 1120 };
    this.joyKnob = { x: 150, y: 1120 };
    this.joyActive = false;

    // Botón A
    this.aG = this.add.graphics().setDepth(10);
    this.aText = titleText(this, A_X, A_Y - 6, 'A', 70, '#ffffff').setOrigin(0.5).setDepth(11);
    this.aLabel = bodyText(this, A_X, A_Y + 48, 'HABLAR', 26, '#ffffff').setOrigin(0.5).setDepth(11);
    this.aPressedUntil = 0;
    this.aZone = this.add.zone(A_X, A_Y, A_R * 2, A_R * 2);
    registerHit('btn:A', this, this.aZone);

    this.drawControls();

    // Diálogo
    this.dlgG = this.add.graphics().setDepth(20).setVisible(false);
    this.dlgName = titleText(this, 48, 864, '', 26, '#ffffff').setDepth(21).setVisible(false);
    this.dlgText = bodyText(this, 46, 928, '', 42, COLORS.dark, {
      wordWrap: { width: GW - 100, useAdvancedWrap: true },
      lineSpacing: 2,
    })
      .setDepth(21)
      .setVisible(false);
    this.dlgMore = titleText(this, GW - 70, 1190, '▼', 30, COLORS.dark).setDepth(21).setVisible(false);
    this.tweens.add({ targets: this.dlgMore, y: 1198, duration: 350, yoyo: true, repeat: -1 });

    // Desmayo
    this.blackout = this.add.rectangle(0, 0, GW, GH, 0x000000, 1).setOrigin(0).setAlpha(0).setDepth(30);
    this.faintText = titleText(this, GW / 2, GH / 2 - 40, '', 50, '#ffffff', {
      align: 'center',
      wordWrap: { width: GW - 80, useAdvancedWrap: true },
    })
      .setOrigin(0.5)
      .setDepth(31)
      .setAlpha(0);
    this.faintHint = bodyText(this, GW / 2, GH / 2 + 120, 'Tocá para seguir', 38, COLORS.yellow)
      .setOrigin(0.5)
      .setDepth(31)
      .setAlpha(0);
    this.faintZone = this.add.zone(GW / 2, GH / 2, GW, GH);
    registerHit('faint:seguir', this, this.faintZone);

    // Entrada táctil / mouse
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.input.on('gameout', this.releaseJoystick, this);
    this.game.events.on('hidden', this.releaseJoystick, this);
    this.game.events.on('blur', this.releaseJoystick, this);
    this.events.once('shutdown', () => {
      this.game.events.off('hidden', this.releaseJoystick, this);
      this.game.events.off('blur', this.releaseJoystick, this);
      controls.reset();
    });

    this.ready = true;
    const g = this.gameScene;
    if (g && g.sys.isActive()) {
      this.setObjective(g.currentObjective(), false);
      this.setPain(g.pain);
    }
  }

  // ---------- objetivo y dolor ----------
  setObjective(text, flash = true) {
    if (!this.ready) return;
    this.objective.setText(`Objetivo: ${text}`);
    if (flash) {
      audio.play('objective');
      this.objective.setColor(COLORS.yellow);
      this.tweens.add({
        targets: this.objective,
        alpha: 0.3,
        duration: 140,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          this.objective.setAlpha(1);
          this.objective.setColor(COLORS.cream);
        },
      });
    }
  }

  setPain(v) {
    if (!this.ready) return;
    this.pain.setValue(v);
    const base = Math.max(0, Math.min(1, (v - 30) / 70));
    let a = base * 0.8;
    if (v > 75) a += Math.sin(this.time.now / 180) * 0.08;
    this.vignette.setAlpha(Math.max(0, a));
  }

  // ---------- calendario ----------
  setCalendar(month, sub, big = true) {
    if (!this.ready) return;
    this.calIcon.setVisible(true);
    this.calText.setVisible(true).setText(month);
    if (!big) return;
    audio.play('calendar');
    this.calPageText.setText(month);
    this.calPageSub.setText(sub || '');
    this.tweens.killTweensOf(this.calPage);
    this.calPage.setVisible(true).setAlpha(1).setScale(1, 0.1).setY(470);
    this.tweens.add({ targets: this.calPage, scaleY: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({
      targets: this.calPage,
      alpha: 0,
      y: 430,
      delay: 1100,
      duration: 350,
      onComplete: () => this.calPage.setVisible(false),
    });
  }

  // ---------- pergamino (evaluación anual) ----------
  // Se desenrolla de arriba hacia abajo y sigue de largo. Va debajo del fundido de derrota.
  showScroll(title, lines, opts = {}) {
    const W = 560;
    const x0 = (GW - W) / 2;
    const c = this.add.container(0, 0);
    this.overlay.add(c);
    const paper = this.add.graphics();
    const content = this.add.container(0, 0);
    c.add([paper, content]);
    // contenido
    const blocks = [{ t: 'h', text: title, color: '#7a2a10', size: 40, align: 'center' }];
    lines.forEach((l) => blocks.push({ t: 'p', text: l, after: 22 }));
    const rich = renderRich(this, blocks, { width: W - 80, size: 38, color: '#3a2a10', em: '#b01818' });
    const img = this.add.image(x0 + 40, 0, rich.key).setOrigin(0, 0);
    content.add(img);
    const top = 190;
    const st = { len: 0, offset: 0 };
    const draw = () => {
      paper.clear();
      const h = st.len;
      paper.fillStyle(0x000000, 0.35);
      paper.fillRect(x0 + 10, top + 12, W, h);
      paper.fillStyle(0xe8d29a, 1);
      paper.fillRect(x0, top, W, h);
      paper.fillStyle(0xf6e7b8, 1);
      paper.fillRect(x0 + 10, top, W - 20, h);
      paper.fillStyle(0xd4b878, 1);
      for (let yy = 0; yy < h; yy += 46) paper.fillRect(x0 + 20, top + yy + 30 - (st.offset % 46), W - 40, 2);
      // rodillo de arriba y rodillo de abajo
      paper.fillStyle(0x8a5a2a, 1);
      paper.fillRect(x0 - 24, top - 24, W + 48, 30);
      paper.fillStyle(0xb07a45, 1);
      paper.fillRect(x0 - 18, top - 20, W + 36, 10);
      paper.fillStyle(0x8a5a2a, 1);
      paper.fillRect(x0 - 24, top + h - 6, W + 48, 30);
      paper.fillStyle(0xb07a45, 1);
      paper.fillRect(x0 - 18, top + h - 2, W + 36, 10);
      img.y = top + 30 - st.offset;
      img.setCrop(0, st.offset, W - 80, Math.max(0, h - 40));
    };
    draw();
    const maxLen = GH - top + 40;
    // se desenrolla hasta abajo...
    this.tweens.add({
      targets: st,
      len: maxLen,
      duration: opts.unroll || 2600,
      ease: 'Sine.Out',
      onUpdate: draw,
      onComplete: () => {
        // ...y sigue de largo: el texto se sigue corriendo
        this.tweens.add({
          targets: st,
          offset: Math.max(0, rich.height - (maxLen - 120)),
          duration: opts.scroll || 6000,
          ease: 'Linear',
          onUpdate: draw,
        });
      },
    });
    this.scrollObj = c;
    return c;
  }

  clearOverlay() {
    this.overlay.removeAll(true);
  }

  hit() {
    if (!this.ready) return;
    this.redFlash.setAlpha(0.35);
    this.tweens.add({ targets: this.redFlash, alpha: 0, duration: 380 });
  }

  setEdgeArrow(visible, x, y, angle) {
    if (!this.ready) return;
    this.edgeArrow.setVisible(visible && this.controlsVisible);
    if (visible) {
      const bob = Math.sin(this.time.now / 160) * 6;
      this.edgeArrow.setPosition(x + Math.cos(angle) * bob, y + Math.sin(angle) * bob);
      this.edgeArrow.setRotation(angle);
    }
  }

  setControlsVisible(v) {
    this.controlsVisible = v;
    if (!v) this.releaseJoystick();
    this.drawControls();
  }

  // ---------- controles ----------
  drawControls() {
    const show = this.controlsVisible && !this.dialog;
    const g = this.joyG;
    g.clear();
    if (show) {
      const b = this.joyBase;
      const k = this.joyKnob;
      const alpha = this.joyActive ? 1 : 0.45;
      g.fillStyle(0x000000, 0.28 * alpha + 0.1);
      g.fillCircle(b.x, b.y, JOY_R);
      g.lineStyle(5, 0xf6f1e3, 0.55 * alpha + 0.1);
      g.strokeCircle(b.x, b.y, JOY_R);
      g.fillStyle(0xf6f1e3, 0.75 * alpha + 0.1);
      g.fillCircle(k.x, k.y, 40);
      g.fillStyle(0x0f2a2e, 0.35);
      g.fillCircle(k.x, k.y + 6, 30);
    }
    const a = this.aG;
    a.clear();
    this.aText.setVisible(show);
    this.aLabel.setVisible(show);
    if (show) {
      const pressed = this.time.now < this.aPressedUntil;
      const dy = pressed ? 6 : 0;
      if (!pressed) {
        a.fillStyle(0x000000, 0.5);
        a.fillCircle(A_X, A_Y + 8, A_R);
      }
      a.fillStyle(0x26303a, 1);
      a.fillCircle(A_X, A_Y + dy, A_R);
      a.fillStyle(0xe04848, 1);
      a.fillCircle(A_X, A_Y + dy, A_R - 7);
      a.fillStyle(0xff7a6a, 1);
      a.fillCircle(A_X - 18, A_Y - 26 + dy, 16);
      this.aText.y = A_Y - 6 + dy;
      this.aLabel.y = A_Y + 48 + dy;
    }
  }

  onDown(p) {
    audio.unlock();
    if (this.faintState) {
      if (this.faintState.canContinue) this.faintContinue();
      return;
    }
    if (this.dialog) {
      this.advanceDialog();
      return;
    }
    const g = this.gameScene;
    if (!g || !g.canControl()) return;
    // Botón A
    const da = Phaser.Math.Distance.Between(p.x, p.y, A_X, A_Y);
    if (da < A_R + 18) {
      this.aPressedUntil = this.time.now + 140;
      this.drawControls();
      controls.pressA();
      return;
    }
    // Joystick: mitad izquierda, debajo del panel superior
    if (p.x < GW / 2 && p.y > TOP_H && this.joyPointer === null) {
      this.joyPointer = p.id;
      this.joyActive = true;
      this.joyMoved = false;
      this.joyStart = { x: p.x, y: p.y, t: this.time.now };
      const bx = Phaser.Math.Clamp(p.x, JOY_R + 8, GW / 2 - 20);
      const by = Phaser.Math.Clamp(p.y, TOP_H + JOY_R + 8, GH - JOY_R - 8);
      this.joyBase = { x: bx, y: by };
      this.joyKnob = { x: bx, y: by };
      this.drawControls();
      return;
    }
    this.taps[p.id] = { x: p.x, y: p.y, t: this.time.now };
  }

  onMove(p) {
    if (this.joyPointer === null || p.id !== this.joyPointer) return;
    const b = this.joyBase;
    let dx = p.x - b.x;
    let dy = p.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 18) this.joyMoved = true;
    if (dist > JOY_R) {
      dx = (dx / dist) * JOY_R;
      dy = (dy / dist) * JOY_R;
    }
    this.joyKnob = { x: b.x + dx, y: b.y + dy };
    if (dist < 24) controls.joyDir = null;
    else if (Math.abs(dx) > Math.abs(dy)) controls.joyDir = dx > 0 ? 'right' : 'left';
    else controls.joyDir = dy > 0 ? 'down' : 'up';
    this.drawControls();
  }

  onUp(p) {
    if (this.joyPointer !== null && p.id === this.joyPointer) {
      const s = this.joyStart;
      const quick = s && !this.joyMoved && this.time.now - s.t < 350;
      this.releaseJoystick();
      if (quick) this.tap(s.x, s.y);
      return;
    }
    const t = this.taps[p.id];
    if (t) {
      delete this.taps[p.id];
      const d = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y);
      if (d < 30 && this.time.now - t.t < 500) this.tap(t.x, t.y);
    }
  }

  tap(x, y) {
    const g = this.gameScene;
    if (!g || !g.canControl() || this.dialog) return;
    g.handleTap(x, y);
  }

  releaseJoystick() {
    this.joyPointer = null;
    this.joyActive = false;
    controls.joyDir = null;
    this.joyBase = { x: 150, y: 1120 };
    this.joyKnob = { x: 150, y: 1120 };
    if (this.ready) this.drawControls();
  }

  // ---------- diálogos ----------
  // lines: [{quien, texto}]
  showDialog(lines, onDone) {
    if (!lines || !lines.length) {
      if (onDone) onDone();
      return;
    }
    this.releaseJoystick();
    this.dialog = { lines, i: 0, onDone, shown: 0, full: '', openedAt: this.time.now };
    this.dlgG.setVisible(true);
    this.dlgName.setVisible(true);
    this.dlgText.setVisible(true);
    this.drawControls();
    this.showLine();
  }

  showLine() {
    const d = this.dialog;
    const line = d.lines[d.i];
    d.full = stripEm(line.texto);
    d.shown = 0;
    this.dlgText.setText('');
    this.dlgName.setText(line.quien || '');
    this.dlgMore.setVisible(false);
    const g = this.dlgG;
    g.clear();
    const x = 20;
    const y = 900;
    const w = GW - 40;
    const h = 330;
    g.fillStyle(0x000000, 0.5);
    g.fillRect(x + 6, y + 8, w, h);
    g.fillStyle(0x26303a, 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(0xf6f1e3, 1);
    g.fillRect(x + 6, y + 6, w - 12, h - 12);
    if (line.quien) {
      const nw = Math.max(160, this.dlgName.width + 40);
      g.fillStyle(0x26303a, 1);
      g.fillRect(x + 10, y - 50, nw, 56);
      g.fillStyle(0x3fb68b, 1);
      g.fillRect(x + 16, y - 44, nw - 12, 44);
    }
  }

  advanceDialog() {
    const d = this.dialog;
    if (!d) return;
    const now = this.time.now;
    if (now - d.openedAt < 180 || now - this.lastAdvance < 120) return;
    this.lastAdvance = now;
    if (d.shown < d.full.length) {
      d.shown = d.full.length;
      this.dlgText.setText(d.full);
      this.dlgMore.setVisible(true);
      return;
    }
    d.i += 1;
    if (d.i < d.lines.length) {
      audio.play('blip');
      this.showLine();
      return;
    }
    this.closeDialog();
  }

  closeDialog() {
    const d = this.dialog;
    this.dialog = null;
    this.dialogClosedAt = this.time.now;
    this.dlgG.setVisible(false);
    this.dlgName.setVisible(false);
    this.dlgText.setVisible(false);
    this.dlgMore.setVisible(false);
    controls.aPending = false;
    this.drawControls();
    if (d && d.onDone) d.onDone();
  }

  // Cierra un diálogo abierto sin ejecutar lo que venía después (lo usa la derrota).
  closeDialogSilently() {
    if (!this.dialog) return;
    this.dialog.onDone = null;
    this.closeDialog();
  }

  isDialogOpen() {
    return !!this.dialog;
  }

  // ---------- desmayo ----------
  showFaint(text, onContinue) {
    this.releaseJoystick();
    this.setControlsVisible(false);
    this.closeDialogSilently();
    this.faintState = { canContinue: false, onContinue, done: false };
    this.faintText.setText(text);
    this.tweens.add({ targets: this.blackout, alpha: 0.88, duration: 1300, delay: 500 });
    this.tweens.add({ targets: this.faintText, alpha: 1, duration: 600, delay: 1500 });
    this.time.delayedCall(2600, () => {
      if (!this.faintState) return;
      this.faintState.canContinue = true;
      this.tweens.add({ targets: this.faintHint, alpha: 1, duration: 300 });
      this.tweens.add({ targets: this.faintHint, alpha: 0.4, duration: 600, yoyo: true, repeat: -1, delay: 300 });
    });
    // Si nadie toca, seguimos solos.
    this.time.delayedCall(8000, () => this.faintContinue());
  }

  faintContinue() {
    const f = this.faintState;
    if (!f || f.done) return;
    f.done = true;
    if (f.onContinue) f.onContinue();
  }

  update(time, delta) {
    const d = this.dialog;
    if (d && d.shown < d.full.length) {
      const before = Math.floor(d.shown);
      d.shown = Math.min(d.full.length, d.shown + (delta / 1000) * 60 * Math.max(1, state.speed));
      const now = Math.floor(d.shown);
      if (now !== before) {
        this.dlgText.setText(d.full.substring(0, now));
        if (now % 3 === 0) audio.play('blip');
      }
      if (d.shown >= d.full.length) this.dlgMore.setVisible(true);
    }
    if (this.aPressedUntil && time > this.aPressedUntil) {
      this.aPressedUntil = 0;
      this.drawControls();
    }
  }
}
