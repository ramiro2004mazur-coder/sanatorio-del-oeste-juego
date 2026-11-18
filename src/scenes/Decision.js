import Phaser from 'phaser';
import { GW, COLORS, titleText, bodyText, fadeIn, goTo, renderRich, registerHit } from '../core/ui.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';

const LETTERS = ['A', 'B', 'C', 'D'];

export default class Decision extends Phaser.Scene {
  constructor() {
    super('Decision');
  }

  create() {
    fadeIn(this, 250);
    audio.setMusic(false);
    const run = state.ensureRun();
    const D = state.level.decision;
    this.cameras.main.setBackgroundColor('#0f2a2e');
    this.chosen = false;
    this.cards = [];

    // Ancho acotado para no quedar debajo del botón de sonido (arriba a la derecha).
    titleText(this, GW / 2 - 30, 110, D.pregunta, 36, COLORS.yellow, {
      align: 'center',
      wordWrap: { width: GW - 240, useAdvancedWrap: true },
    }).setOrigin(0.5);
    bodyText(this, GW / 2, 206, 'Tocá la opción correcta', 34, '#a6dcc9').setOrigin(0.5);

    const opts = run.order.map((id) => D.opciones.find((o) => o.id === id)).filter(Boolean);
    const top = 250;
    const bottom = 1250;
    const gap = 26;
    const cardW = GW - 60;
    const textW = cardW - 130;

    // Ajustamos el tamaño de letra para que entren las tres tarjetas.
    let size = 36;
    let rendered = [];
    for (;;) {
      rendered.forEach((r) => this.textures.remove(r.key));
      rendered = opts.map((o) =>
        renderRich(this, [{ t: 'p', text: o.texto, after: 0 }], { width: textW, size, color: COLORS.dark, em: '#0d6e9a' }),
      );
      const total = rendered.reduce((s, r) => s + r.height + 56, 0) + gap * (opts.length - 1);
      if (total <= bottom - top || size <= 26) break;
      size -= 2;
    }
    const total = rendered.reduce((s, r) => s + r.height + 56, 0) + gap * (opts.length - 1);
    let y = top + Math.max(0, (bottom - top - total) / 2);

    opts.forEach((o, i) => {
      const r = rendered[i];
      const h = r.height + 56;
      const crossed = run.crossed.includes(o.id);
      const card = this.add.container(GW / 2, y + h / 2);
      const g = this.add.graphics();
      const draw = (pressed) => {
        g.clear();
        const dy = pressed ? 5 : 0;
        if (!pressed) {
          g.fillStyle(0x000000, 0.5);
          g.fillRect(-cardW / 2 + 6, -h / 2 + 8, cardW, h);
        }
        g.fillStyle(crossed ? 0x4a5560 : 0x26303a, 1);
        g.fillRect(-cardW / 2, -h / 2 + dy, cardW, h);
        g.fillStyle(crossed ? 0x9aa5ad : 0xf6f1e3, 1);
        g.fillRect(-cardW / 2 + 6, -h / 2 + 6 + dy, cardW - 12, h - 12);
        g.fillStyle(crossed ? 0x6b7b85 : 0x4f9fd8, 1);
        g.fillRect(-cardW / 2 + 6, -h / 2 + 6 + dy, 84, h - 12);
        card.list.forEach((ch) => {
          if (ch !== g && ch.getData('baseY') != null) ch.y = ch.getData('baseY') + dy;
        });
      };
      card.add(g);
      const letter = titleText(this, -cardW / 2 + 48, 0, LETTERS[i], 52, '#ffffff').setOrigin(0.5);
      letter.setData('baseY', 0);
      const img = this.add.image(-cardW / 2 + 110, -h / 2 + 28, r.key).setOrigin(0, 0);
      img.setData('baseY', -h / 2 + 28);
      card.add([letter, img]);
      if (crossed) {
        img.setAlpha(0.55);
        const s = this.add.graphics();
        s.lineStyle(7, 0xc0392b, 0.9);
        s.lineBetween(-cardW / 2 + 100, -h / 2 + 20, cardW / 2 - 20, h / 2 - 20);
        s.lineBetween(-cardW / 2 + 100, h / 2 - 20, cardW / 2 - 20, -h / 2 + 20);
        card.add(s);
        const tag = titleText(this, cardW / 2 - 18, -h / 2 - 2, ' YA PROBASTE ', 24, '#ffffff', {
          backgroundColor: '#c0392b',
        }).setOrigin(1, 0.5);
        card.add(tag);
      }
      draw(false);

      const zone = this.add.zone(GW / 2, y + h / 2, cardW, h);
      registerHit(`opt:${o.id}`, this, zone);
      if (!crossed) {
        zone.setInteractive({ useHandCursor: true });
        let pressed = false;
        zone.on('pointerdown', () => {
          if (this.chosen) return;
          pressed = true;
          draw(true);
        });
        zone.on('pointerout', () => {
          if (!pressed) return;
          pressed = false;
          draw(false);
        });
        zone.on('pointerup', () => {
          if (!pressed || this.chosen) return;
          pressed = false;
          draw(false);
          this.choose(o, card);
        });
      }
      this.cards.push({ o, card, zone });
      y += h + gap;
    });
  }

  choose(o, card) {
    if (this.chosen) return;
    this.chosen = true;
    this.cards.forEach((c) => c.zone.disableInteractive());
    const run = state.ensureRun();
    if (o.correcta) {
      audio.play('jingle');
      this.tweens.add({ targets: card, scale: 1.04, duration: 120, yoyo: true, repeat: 1 });
      const stamp = titleText(this, GW / 2, 640, '¡BIEN!', 130, '#3fb68b').setOrigin(0.5).setDepth(10);
      stamp.setStroke('#0f2a2e', 14);
      stamp.setScale(3).setAlpha(0);
      this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
      this.time.delayedCall(1300, () => goTo(this, 'Fixed', null, 300));
    } else {
      if (!run.crossed.includes(o.id)) run.crossed.push(o.id);
      run.lastWrong = o.id;
      // Pantalla roja de golpe, sin fundido.
      goTo(this, 'Lost', { id: o.id }, 0);
    }
  }
}
