import Phaser from 'phaser';
import { GW, COLORS, titleText, bodyText, makeButton, fadeIn, goTo } from '../core/ui.js';
import { frameIndex } from '../core/characters.js';
import { audio } from '../core/audio.js';

export default class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    fadeIn(this);
    audio.setMusic(false);
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // Título grande
    const t = titleText(this, GW / 2, 130, 'SANATORIO\nDEL OESTE', 80, COLORS.yellow, {
      align: 'center',
      lineSpacing: -8,
    }).setOrigin(0.5);
    t.setShadow(0, 6, '#000000', 0, false, true);
    this.tweens.add({ targets: t, y: 138, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    bodyText(this, GW / 2, 240, '3 niveles para arreglar el sanatorio', 38, COLORS.cream).setOrigin(0.5);

    // Fachada pixel art (180x120 escalada x4 → 720x480, de y=290 a y=770)
    const top = 290;
    this.add.image(GW / 2, top, 'facade').setScale(4).setOrigin(0.5, 0);
    const g = this.add.graphics();
    g.fillStyle(0x26303a, 1);
    g.fillRect(GW / 2 - 236, top + 152, 472, 44);
    g.fillStyle(0x1f4e79, 1);
    g.fillRect(GW / 2 - 231, top + 157, 462, 34);
    titleText(this, GW / 2, top + 174, 'SANATORIO DEL OESTE', 28, '#ffffff').setOrigin(0.5);

    // Paciente rengueando frente a la puerta
    const baseY = top + 400;
    const p = this.add.sprite(GW / 2 - 60, baseY, 'ch_paciente', frameIndex('right', 0)).setScale(5);
    let dir = 1;
    let step = 0;
    this.time.addEvent({
      delay: 210,
      loop: true,
      callback: () => {
        step += 1;
        const d = dir > 0 ? 'right' : 'left';
        const f = step % 4 === 1 ? 1 : step % 4 === 3 ? 2 : 0;
        p.setFrame(frameIndex(d, f));
        const limp = step % 4 === 3;
        p.x += dir * (limp ? 5 : 11);
        p.y = limp ? baseY + 5 : baseY;
        if (p.x > GW / 2 + 100) dir = -1;
        if (p.x < GW / 2 - 130) dir = 1;
      },
    });

    // Instrucciones
    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.35);
    box.fillRect(40, 812, GW - 80, 110);
    bodyText(this, GW / 2, 867, 'Mové con el joystick.\nTocá A para hablar.', 40, COLORS.cream, {
      align: 'center',
    }).setOrigin(0.5);

    const btn = makeButton(
      this,
      GW / 2,
      1040,
      580,
      120,
      'TOCÁ PARA ENTRAR',
      () => {
        audio.unlock();
        audio.setMusic(true);
        goTo(this, 'Levels');
      },
      { name: 'btn:entrar', fontSize: 36 },
    );
    this.tweens.add({ targets: btn.txt, scale: 1.06, duration: 600, yoyo: true, repeat: -1 });

    bodyText(this, GW / 2, 1180, 'TP · Equipos, Personas y Liderazgo', 28, '#7fa8a4').setOrigin(0.5);

    const mute = document.getElementById('mute');
    if (mute) mute.classList.add('visible');
  }
}
