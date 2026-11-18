import Phaser from 'phaser';
import { GW, GH, COLORS, titleText, bodyText, makeButton, fadeIn, goTo, renderRich } from '../core/ui.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';

const VIEW_TOP = 176;
const VIEW_BOTTOM = 1090;

export default class Proposal extends Phaser.Scene {
  constructor() {
    super('Proposal');
  }

  create() {
    fadeIn(this, 300);
    audio.setMusic(true);
    const L = state.level;
    const P = L.propuesta;
    this.cameras.main.setBackgroundColor('#f6f1e3');

    const blocks = [];
    P.bloques.forEach((b) => {
      blocks.push({ t: 'h', text: b.titulo, color: '#0d7a55', size: 40 });
      blocks.push({ t: 'p', text: b.texto, after: 26 });
    });
    blocks.push({ t: 'gap', h: 6 });
    if (P.encuesta) {
      blocks.push({
        t: 'box',
        title: P.encuesta.titulo,
        items: [P.encuesta.texto],
        note: P.encuesta.nota,
        fill: '#e3f2fb',
        titleColor: '#0d6e9a',
      });
    }
    blocks.push({ t: 'box', title: P.materia.titulo, items: P.materia.items });
    blocks.push({ t: 'gap', h: 10 });
    const content = renderRich(this, blocks, { width: GW - 80, size: 36, color: COLORS.dark, em: '#0d6e9a' });
    this.content = this.add.image(40, VIEW_TOP + 20, content.key).setOrigin(0, 0);
    this.contentH = content.height + 40;
    this.viewH = VIEW_BOTTOM - VIEW_TOP;
    this.maxScroll = Math.max(0, this.contentH - this.viewH);
    this.scroll = 0;

    // Cabecera y pie tapan lo que se sale del área visible
    const head = this.add.graphics().setDepth(10);
    head.fillStyle(0x0f2a2e, 1);
    head.fillRect(0, 0, GW, VIEW_TOP);
    head.fillStyle(0x3fb68b, 1);
    head.fillRect(0, VIEW_TOP - 8, GW, 8);
    titleText(this, 30, 40, P.titulo, 34, COLORS.yellow).setDepth(11);
    bodyText(this, 32, 104, L.titulo.charAt(0) + L.titulo.slice(1).toLowerCase(), 36, '#a6dcc9').setDepth(11);

    const foot = this.add.graphics().setDepth(10);
    foot.fillStyle(0x0f2a2e, 1);
    foot.fillRect(0, VIEW_BOTTOM, GW, GH - VIEW_BOTTOM);
    foot.fillStyle(0x3fb68b, 1);
    foot.fillRect(0, VIEW_BOTTOM, GW, 8);

    this.hint = bodyText(this, GW / 2, VIEW_BOTTOM - 34, 'Deslizá para leer más ▼', 30, '#ffffff', {
      backgroundColor: '#0d6e9a',
      padding: { x: 14, y: 4 },
    })
      .setOrigin(0.5)
      .setDepth(9)
      .setVisible(this.maxScroll > 0);
    this.tweens.add({ targets: this.hint, y: VIEW_BOTTOM - 28, duration: 500, yoyo: true, repeat: -1 });

    this.bar = this.add.graphics().setDepth(9);
    const btn = makeButton(this, GW / 2, 1186, 420, 108, 'SEGUIR  ▶', () => goTo(this, state.isLastLevel ? 'Finale' : 'End'), {
      name: 'btn:seguir',
    });
    btn.setDepth(12);

    // Scroll con dedo o rueda
    this.drag = null;
    this.vel = 0;
    this.input.on('pointerdown', (p) => {
      if (p.y > VIEW_TOP && p.y < VIEW_BOTTOM) this.drag = { id: p.id, y: p.y, s: this.scroll, last: p.y };
    });
    this.input.on('pointermove', (p) => {
      if (!this.drag || p.id !== this.drag.id) return;
      this.vel = this.drag.last - p.y;
      this.drag.last = p.y;
      this.setScroll(this.drag.s + (this.drag.y - p.y));
    });
    const up = (p) => {
      if (this.drag && p.id === this.drag.id) this.drag = null;
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.input.on('wheel', (p, objs, dx, dy) => {
      this.vel = 0;
      this.setScroll(this.scroll + dy);
    });
    this.drawBar();
  }

  setScroll(v) {
    this.scroll = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.content.y = Math.round(VIEW_TOP + 20 - this.scroll);
    if (this.scroll > this.maxScroll - 30) this.hint.setVisible(false);
    this.drawBar();
  }

  drawBar() {
    const g = this.bar;
    g.clear();
    if (this.maxScroll <= 0) return;
    const trackH = this.viewH - 20;
    const h = Math.max(60, (this.viewH / this.contentH) * trackH);
    const y = VIEW_TOP + 10 + (this.scroll / this.maxScroll) * (trackH - h);
    g.fillStyle(0x000000, 0.12);
    g.fillRect(GW - 18, VIEW_TOP + 10, 8, trackH);
    g.fillStyle(0x0d6e9a, 0.8);
    g.fillRect(GW - 18, y, 8, h);
  }

  update() {
    if (!this.drag && Math.abs(this.vel) > 0.5) {
      this.vel *= 0.92;
      this.setScroll(this.scroll + this.vel);
    }
  }
}
