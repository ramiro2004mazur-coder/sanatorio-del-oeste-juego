import Phaser from 'phaser';
import { GW, GH, titleText, bodyText, makeButton, goTo, renderRich, pixelPanel } from '../core/ui.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';

export default class Lost extends Phaser.Scene {
  constructor() {
    super('Lost');
  }

  create(data) {
    this._leaving = false;
    audio.setMusic(false);
    audio.play('buzzer');
    const D = state.level.decision;
    const id = (data && data.id) || state.ensureRun().lastWrong;
    const o = D.opciones.find((x) => x.id === id) || D.opciones.find((x) => !x.correcta);

    this.cameras.main.setBackgroundColor('#c81e1e');
    // Destello blanco + temblor
    const flash = this.add.rectangle(0, 0, GW, GH, 0xffffff, 1).setOrigin(0).setDepth(50);
    this.tweens.add({ targets: flash, alpha: 0, duration: 260 });
    this.cameras.main.shake(380, 0.02);

    // franjas
    const g = this.add.graphics();
    for (let i = 0; i < 14; i++) {
      g.fillStyle(0x000000, 0.08);
      g.fillRect(0, i * 96, GW, 48);
    }

    const big = titleText(this, GW / 2, 230, 'PERDISTE', 104, '#ffffff').setOrigin(0.5);
    big.setShadow(0, 10, '#5a0000', 0, false, true);
    big.setScale(1.6);
    this.tweens.add({ targets: big, scale: 1, duration: 280, ease: 'Back.Out' });

    bodyText(this, GW / 2, 360, 'Elegiste:', 34, '#ffd0c8').setOrigin(0.5);
    const chosen = renderRich(this, [{ t: 'p', text: o.texto, align: 'center', after: 0 }], {
      width: GW - 120,
      size: 34,
      color: '#ffe7e2',
      em: '#ffffff',
    });
    this.add.image(GW / 2, 390, chosen.key).setOrigin(0.5, 0);

    const why = renderRich(this, [{ t: 'p', text: o.porQue || '', after: 0 }], {
      width: GW - 140,
      size: 42,
      color: '#1d2b30',
      em: '#b01818',
    });
    const py = 390 + chosen.height + 50;
    const ph = why.height + 120;
    const pg = this.add.graphics();
    pixelPanel(pg, 40, py, GW - 80, ph, 0xfff4f0, 0x3a0a0a);
    titleText(this, 74, py + 22, '¿Por qué no sirve?', 32, '#b01818');
    this.add.image(GW / 2, py + 76, why.key).setOrigin(0.5, 0);

    const btn = makeButton(this, GW / 2, 1130, 520, 116, 'PROBÁ DE NUEVO', () => goTo(this, 'Decision', null, 200), {
      name: 'btn:reintentar',
      fontSize: 36,
      color: 0xffd84a,
      textColor: '#3a0a0a',
    });
    btn.txt.setShadow(0, 0, '#000000', 0);
    btn.setDisabled(true);
    this.time.delayedCall(800, () => btn.setDisabled(false));
  }
}
