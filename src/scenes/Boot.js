import Phaser from 'phaser';
import { loadFonts } from '../core/fonts.js';
import { generateTextures } from '../core/textures.js';
import { state } from '../core/state.js';

export default class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      try {
        generateTextures(this);
      } catch (e) {
        // Si algo del dibujo falla no queremos pantalla negra: lo reportamos y seguimos.
        console.error(e);
      }
      state.ensureRun();
      const el = document.getElementById('loading');
      if (el) el.classList.add('hidden');
      this.scene.start('Title');
    };
    loadFonts().then(go, go);
  }
}
