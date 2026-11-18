import Phaser from 'phaser';
import { GW, COLORS, titleText, bodyText, fadeIn, goTo, makeButton, registerHit } from '../core/ui.js';
import { frameIndex } from '../core/characters.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';
import { LEVELS } from '../levels/index.js';

// Menú de niveles: todos desbloqueados, con marca de completado.
export default class Levels extends Phaser.Scene {
  constructor() {
    super('Levels');
  }

  create() {
    fadeIn(this);
    audio.setMusic(true);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.chosen = false;

    const t = titleText(this, GW / 2 - 30, 100, 'ELEGÍ UN NIVEL', 44, COLORS.yellow).setOrigin(0.5);
    t.setShadow(0, 5, '#000000', 0, false, true);
    bodyText(this, GW / 2, 168, 'Arreglá el Sanatorio del Oeste', 36, '#a6dcc9').setOrigin(0.5);

    const top = 230;
    const cardH = 236;
    const gap = 28;
    const cardW = GW - 60;
    LEVELS.forEach((L, i) => {
      const y = top + i * (cardH + gap);
      const done = state.isDone(L.id);
      const g = this.add.graphics();
      const cx = GW / 2;
      const draw = (pressed) => {
        g.clear();
        const dy = pressed ? 5 : 0;
        if (!pressed) {
          g.fillStyle(0x000000, 0.5);
          g.fillRect(cx - cardW / 2 + 6, y + 8, cardW, cardH);
        }
        g.fillStyle(0x26303a, 1);
        g.fillRect(cx - cardW / 2, y + dy, cardW, cardH);
        g.fillStyle(0xf6f1e3, 1);
        g.fillRect(cx - cardW / 2 + 6, y + 6 + dy, cardW - 12, cardH - 12);
        g.fillStyle(done ? 0x3fb68b : 0x4f9fd8, 1);
        g.fillRect(cx - cardW / 2 + 6, y + 6 + dy, 170, cardH - 12);
        objs.forEach((o) => (o.y = o.getData('y0') + dy));
      };
      const objs = [];
      const add = (o) => {
        o.setData('y0', o.y);
        objs.push(o);
        return o;
      };
      const sp = add(this.add.sprite(cx - cardW / 2 + 91, y + 110, `ch_${L.jugador.sprite}`, frameIndex('down', 0)).setScale(7));
      this.tweens.add({ targets: sp, scaleY: 7.3, duration: 500 + i * 90, yoyo: true, repeat: -1 });
      add(titleText(this, cx - cardW / 2 + 91, y + 200, `NIVEL ${i + 1}`, 26, '#ffffff').setOrigin(0.5));
      const tx = cx - cardW / 2 + 196;
      add(
        titleText(this, tx, y + 26, L.menu.nombre.toUpperCase(), 30, COLORS.dark, {
          wordWrap: { width: cardW - 220, useAdvancedWrap: true },
        }),
      );
      const sub = add(
        bodyText(this, tx, y + 108, `"${L.subtitulo}"`, 32, '#0d6e9a', { wordWrap: { width: cardW - 220, useAdvancedWrap: true } }),
      );
      add(
        bodyText(this, tx, Math.max(y + 152, sub.y + sub.height + 4), L.menu.personaje, 28, '#5e6b75', {
          wordWrap: { width: cardW - 220, useAdvancedWrap: true },
        }),
      );
      if (done) {
        const badge = this.add.graphics();
        badge.fillStyle(0x0d7a55, 1);
        badge.fillRect(cx + cardW / 2 - 190, y - 16, 180, 40);
        badge.fillStyle(0xffffff, 1);
        // tilde pixel
        [[0, 6], [3, 9], [6, 12], [9, 9], [12, 6], [15, 3], [18, 0]].forEach(([px, py]) =>
          badge.fillRect(cx + cardW / 2 - 178 + px, y - 6 + py, 5, 5),
        );
        add(badge);
        add(titleText(this, cx + cardW / 2 - 145, y + 4, 'HECHO', 22, '#ffffff').setOrigin(0, 0.5));
      }
      draw(false);
      const zone = this.add.zone(cx, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      registerHit(`lvl:${i}`, this, zone);
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
        this.chosen = true;
        audio.unlock();
        audio.play('click');
        state.startLevel(i);
        goTo(this, 'Game');
      });
    });

    makeButton(this, GW / 2, 1190, 300, 84, '◀ INICIO', () => goTo(this, 'Title'), {
      name: 'btn:inicio',
      fontSize: 28,
      color: 0x5e6b75,
    });

    const mute = document.getElementById('mute');
    if (mute) mute.classList.add('visible');
  }
}
