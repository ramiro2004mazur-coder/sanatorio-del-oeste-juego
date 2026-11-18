import Phaser from 'phaser';
import { GW, COLORS, titleText, bodyText, makeButton, fadeIn, goTo, renderRich, pixelPanel } from '../core/ui.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';

export default class WhatFailed extends Phaser.Scene {
  constructor() {
    super('WhatFailed');
  }

  create() {
    fadeIn(this, 400);
    audio.setMusic(false);
    const Q = state.level.queFallo;
    this.cameras.main.setBackgroundColor('#141d24');

    titleText(this, GW / 2, 150, '¿QUÉ FALLÓ?', 46, '#ff8a7a').setOrigin(0.5);
    const t = titleText(this, GW / 2, 270, Q.titulo, 62, COLORS.yellow, {
      align: 'center',
      wordWrap: { width: GW - 60, useAdvancedWrap: true },
    }).setOrigin(0.5);
    t.setShadow(0, 5, '#000000', 0, false, true);

    // Frase madre en una tarjeta
    const g = this.add.graphics();
    const quote = renderRich(this, [{ t: 'p', text: `“${Q.frase}”`, size: 50, align: 'center' }], {
      width: GW - 140,
      size: 50,
      color: COLORS.dark,
      lineHeight: 1.05,
    });
    const cardY = 400;
    const cardH = quote.height + 70;
    pixelPanel(g, 40, cardY, GW - 80, cardH, COLORS.creamN, COLORS.darkN);
    this.add.image(GW / 2, cardY + 35, quote.key).setOrigin(0.5, 0);

    const line = renderRich(this, [{ t: 'p', text: Q.linea, align: 'center' }], {
      width: GW - 100,
      size: 44,
      color: COLORS.cream,
      em: '#ff8a7a',
    });
    this.add.image(GW / 2, cardY + cardH + 70, line.key).setOrigin(0.5, 0);

    const btn = makeButton(this, GW / 2, 1110, 440, 110, 'SEGUIR  ▶', () => goTo(this, 'Decision'), {
      name: 'btn:seguir',
    });
    // Evita que el toque que cerró el desmayo pase de largo esta pantalla.
    btn.setDisabled(true);
    this.time.delayedCall(700, () => btn.setDisabled(false));
  }
}
