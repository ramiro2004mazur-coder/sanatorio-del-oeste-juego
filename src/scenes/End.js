import Phaser from 'phaser';
import { GW, COLORS, titleText, bodyText, makeButton, fadeIn, goTo, renderRich, pixelPanel } from '../core/ui.js';
import { frameIndex } from '../core/characters.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';
import { CREDITOS } from '../config.js';
import { LEVELS } from '../levels/index.js';

export default class End extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create() {
    fadeIn(this, 300);
    audio.setMusic(true);
    const L = state.level;
    this.cameras.main.setBackgroundColor('#0f2a2e');

    const t = titleText(this, GW / 2 - 20, 130, '¡NIVEL COMPLETADO!', 36, COLORS.yellow).setOrigin(0.5);
    t.setShadow(0, 5, '#000000', 0, false, true);
    bodyText(this, GW / 2, 190, `Nivel ${state.levelIndex + 1}: ${L.titulo}`, 34, '#a6dcc9').setOrigin(0.5);

    // Paciente feliz
    const p = this.add.sprite(GW / 2 - 50, 276, 'ch_paciente', frameIndex('down', 0)).setScale(5);
    this.add.image(GW / 2 + 50, 276, 'face0').setScale(5);
    this.tweens.add({ targets: p, y: 264, duration: 300, yoyo: true, repeat: -1, ease: 'Quad.Out' });

    // Resumen de la solución
    const res = renderRich(this, [{ t: 'p', text: L.final.resumen, align: 'center', after: 0 }], {
      width: GW - 130,
      size: 38,
      color: COLORS.dark,
      em: '#0d7a55',
    });
    const g = this.add.graphics();
    const ry = 340;
    pixelPanel(g, 40, ry, GW - 80, res.height + 50, COLORS.creamN, COLORS.darkN);
    this.add.image(GW / 2, ry + 25, res.key).setOrigin(0.5, 0);

    // Créditos
    let y = ry + res.height + 50 + 40;
    const cred = renderRich(
      this,
      [
        { t: 'p', text: `**Materia:** ${CREDITOS.materia}`, align: 'center', after: 4 },
        { t: 'p', text: `**Profesor:** ${CREDITOS.profesor}`, align: 'center', after: 14 },
        { t: 'p', text: '**Grupo:**', align: 'center', after: 0 },
        { t: 'p', text: (CREDITOS.grupo || []).join(' · '), align: 'center', after: 0 },
      ],
      { width: GW - 80, size: 34, color: COLORS.cream, em: COLORS.yellow },
    );
    this.add.image(GW / 2, y, cred.key).setOrigin(0.5, 0);
    y += cred.height + 30;

    // Próximamente
    const slots = Math.max(6, LEVELS.length + 5);
    const boxH = 150;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.3);
    bg.fillRect(40, y, GW - 80, boxH);
    titleText(this, GW / 2, y + 34, 'Próximamente: más niveles', 28, '#ffffff').setOrigin(0.5);
    const sw = 70;
    const total = slots * sw + (slots - 1) * 14;
    for (let i = 0; i < slots; i++) {
      const x = GW / 2 - total / 2 + i * (sw + 14);
      const done = i < LEVELS.length;
      bg.fillStyle(done ? 0x3fb68b : 0x2f4a50, 1);
      bg.fillRect(x, y + 66, sw, 66);
      titleText(this, x + sw / 2, y + 99, done ? '✓' : '?', 36, done ? '#ffffff' : '#7fa8a4').setOrigin(0.5);
    }
    y += boxH;

    const by = Math.max(y + 90, 1150);
    makeButton(
      this,
      GW / 2,
      Math.min(by, 1190),
      500,
      112,
      'JUGAR DE NUEVO',
      () => {
        state.newRun();
        goTo(this, 'Game');
      },
      { name: 'btn:jugar', fontSize: 36 },
    );
  }
}
