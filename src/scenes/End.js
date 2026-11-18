import Phaser from 'phaser';
import { GW, COLORS, titleText, bodyText, makeButton, fadeIn, goTo, renderRich, pixelPanel } from '../core/ui.js';
import { frameIndex } from '../core/characters.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';

// Fin de un nivel: resumen de la solución + "Siguiente nivel" y "Menú".
export default class End extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create() {
    fadeIn(this, 300);
    audio.setMusic(true);
    const L = state.level;
    state.markDone(L.id);
    this.cameras.main.setBackgroundColor('#0f2a2e');

    const t = titleText(this, GW / 2 - 20, 130, '¡NIVEL COMPLETADO!', 36, COLORS.yellow).setOrigin(0.5);
    t.setShadow(0, 5, '#000000', 0, false, true);
    bodyText(this, GW / 2, 196, `Nivel ${state.levelIndex + 1}: ${L.titulo}`, 34, '#a6dcc9').setOrigin(0.5);

    // Personaje feliz + medidor en "todo bien"
    const p = this.add.sprite(GW / 2 - 60, 320, `ch_${L.jugador.sprite}`, frameIndex('down', 0)).setScale(6);
    const icon = L.medidor.icono || 'face';
    this.add.image(GW / 2 + 60, 320, `${icon}${icon === 'batt' ? 4 : 0}`).setScale(6);
    this.tweens.add({ targets: p, y: 306, duration: 300, yoyo: true, repeat: -1, ease: 'Quad.Out' });

    // Resumen de la solución
    const res = renderRich(this, [{ t: 'p', text: L.final.resumen, align: 'center', after: 0 }], {
      width: GW - 130,
      size: 40,
      color: COLORS.dark,
      em: '#0d7a55',
    });
    const g = this.add.graphics();
    const ry = 430;
    pixelPanel(g, 40, ry, GW - 80, res.height + 60, COLORS.creamN, COLORS.darkN);
    this.add.image(GW / 2, ry + 30, res.key).setOrigin(0.5, 0);

    // Progreso: niveles hechos
    const y = ry + res.height + 60 + 70;
    titleText(this, GW / 2, y, 'Tu progreso', 26, '#ffffff').setOrigin(0.5);
    const total = state.levelCount;
    const sw = 120;
    const x0 = GW / 2 - (total * sw + (total - 1) * 20) / 2;
    const bg = this.add.graphics();
    for (let i = 0; i < total; i++) {
      const done = state.isDone(state.levelId(i));
      bg.fillStyle(done ? 0x3fb68b : 0x2f4a50, 1);
      bg.fillRect(x0 + i * (sw + 20), y + 34, sw, 70);
      titleText(this, x0 + i * (sw + 20) + sw / 2, y + 69, done ? `${i + 1} OK` : `${i + 1}`, 26, done ? '#ffffff' : '#7fa8a4').setOrigin(0.5);
    }

    const next = () => {
      if (state.isLastLevel) {
        goTo(this, 'Finale');
        return;
      }
      state.startLevel(state.levelIndex + 1);
      goTo(this, 'Game');
    };
    makeButton(this, GW / 2, 1060, 560, 112, state.isLastLevel ? 'FINAL ▶' : 'SIGUIENTE NIVEL ▶', next, {
      name: 'btn:siguiente',
      fontSize: 34,
    });
    makeButton(this, GW / 2, 1196, 340, 90, 'MENÚ', () => goTo(this, 'Levels'), {
      name: 'btn:menu',
      fontSize: 30,
      color: 0x4f9fd8,
    });
  }
}
