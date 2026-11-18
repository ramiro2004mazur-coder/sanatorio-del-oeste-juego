import Phaser from 'phaser';
import { GW, COLORS, titleText, makeButton, fadeIn, goTo, renderRich } from '../core/ui.js';
import { frameIndex } from '../core/characters.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';
import { CREDITOS } from '../config.js';
import { LEVELS } from '../levels/index.js';

const OTRAS = 'Liderazgo bajo presión · Cultura organizacional · Diversidad generacional';

// Pantalla final, después del último nivel.
export default class Finale extends Phaser.Scene {
  constructor() {
    super('Finale');
  }

  create() {
    fadeIn(this, 400);
    audio.setMusic(true);
    state.markDone(state.level.id);
    this.cameras.main.setBackgroundColor('#0f2a2e');
    audio.play('jingle');

    // Título (angosto para no quedar debajo del botón de sonido)
    const t = titleText(this, GW / 2 - 24, 96, '¡Arreglaste el\nSanatorio del Oeste!', 38, COLORS.yellow, {
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    t.setShadow(0, 5, '#000000', 0, false, true);

    // El hall arreglado con los tres personajes contentos
    const crop = { x: 0, y: 13, w: 15, h: 8 };
    if (!this.textures.exists('hallCrop')) {
      const src = this.textures.get('map').getSourceImage();
      const c = document.createElement('canvas');
      c.width = crop.w * 16;
      c.height = crop.h * 16;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, crop.x * 16, crop.y * 16, c.width, c.height, 0, 0, c.width, c.height);
      this.textures.addCanvas('hallCrop', c);
    }
    const S = 2.6;
    const iy = 170;
    const ih = crop.h * 16 * S;
    const frame = this.add.graphics();
    frame.fillStyle(0x26303a, 1);
    frame.fillRect(GW / 2 - (crop.w * 16 * S) / 2 - 6, iy - 6, crop.w * 16 * S + 12, ih + 12);
    this.add.image(GW / 2, iy, 'hallCrop').setOrigin(0.5, 0).setScale(S);
    const chars = ['paciente', 'lucia', 'tomas'];
    chars.forEach((k, i) => {
      const x = GW / 2 + (i - 1) * 120;
      const y = iy + ih * 0.55;
      const sp = this.add.sprite(x, y, `ch_${k}`, frameIndex('down', 0)).setScale(S * 1.6);
      this.tweens.add({ targets: sp, y: y - 22, duration: 280, yoyo: true, repeat: -1, delay: i * 140, ease: 'Quad.Out' });
    });
    // papelitos de festejo
    const cols = [0xffd84a, 0x3fb68b, 0xe04848, 0x4f9fd8, 0xffffff];
    for (let i = 0; i < 26; i++) {
      const r = this.add.rectangle(
        GW / 2 + (Math.random() - 0.5) * 560,
        iy - 10,
        8,
        8,
        cols[i % cols.length],
      );
      this.tweens.add({
        targets: r,
        y: iy + ih - 10,
        angle: 360,
        duration: 1800 + Math.random() * 1400,
        delay: Math.random() * 1600,
        repeat: -1,
      });
    }

    // Las soluciones, una línea cada una
    const blocks = [];
    LEVELS.forEach((L) => blocks.push({ t: 'li', text: L.final.linea }));
    blocks.push({ t: 'gap', h: 6 });
    blocks.push({ t: 'p', text: `**También encontramos oportunidades en:** ${OTRAS}`, size: 28, after: 0, color: '#a6dcc9' });
    const sol = renderRich(this, blocks, { width: GW - 80, size: 31, color: COLORS.cream, em: COLORS.yellow, lineHeight: 1.05 });
    let y = iy + ih + 26;
    this.add.image(40, y, sol.key).setOrigin(0, 0);
    y += sol.height + 12;

    // Créditos (editables en src/config.js)
    const cred = renderRich(
      this,
      [
        { t: 'p', text: `**${CREDITOS.materia}** · Profesor: ${CREDITOS.profesor}`, align: 'center', after: 2 },
        { t: 'p', text: `Grupo: ${(CREDITOS.grupo || []).join(' · ')}`, align: 'center', after: 0 },
      ],
      { width: GW - 80, size: 28, color: '#cfe3df', em: '#ffffff', lineHeight: 1.05 },
    );
    this.add.image(GW / 2, y, cred.key).setOrigin(0.5, 0);

    makeButton(
      this,
      GW / 2,
      1080,
      520,
      104,
      'JUGAR DE NUEVO',
      () => {
        state.startLevel(0);
        goTo(this, 'Game');
      },
      { name: 'btn:jugar', fontSize: 34 },
    );
    makeButton(this, GW / 2, 1204, 460, 88, 'MENÚ DE NIVELES', () => goTo(this, 'Levels'), {
      name: 'btn:menu',
      fontSize: 28,
      color: 0x4f9fd8,
    });
  }
}

