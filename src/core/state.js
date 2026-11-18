import { LEVELS } from '../levels/index.js';
import { START_SPEED } from './debug.js';

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// Estado global de la partida (lo que sobrevive entre escenas).
export const state = {
  levelIndex: 0,
  runCount: 0,
  run: null,
  speed: START_SPEED,
  hitboxes: false,
  rotatePaused: false,

  get level() {
    return LEVELS[this.levelIndex];
  },

  // Arranca una partida nueva del nivel actual: orden de opciones nuevo, nada tachado.
  newRun() {
    this.runCount += 1;
    const ids = this.level.decision.opciones.map((o) => o.id);
    this.run = {
      order: shuffle(ids),
      crossed: [],
      lastWrong: null,
    };
    return this.run;
  },

  ensureRun() {
    if (!this.run) this.newRun();
    return this.run;
  },
};
