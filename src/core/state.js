import { LEVELS } from '../levels/index.js';
import { START_SPEED } from './debug.js';

const DONE_KEY = 'sanatorio-completados';

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

function loadDone() {
  try {
    const raw = window.localStorage.getItem(DONE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch (e) {
    return [];
  }
}

// Estado global de la partida (lo que sobrevive entre escenas).
export const state = {
  levelIndex: 0,
  runCount: 0,
  run: null,
  speed: START_SPEED,
  hitboxes: false,
  rotatePaused: false,
  completed: loadDone(),

  get level() {
    return LEVELS[this.levelIndex];
  },

  get levelCount() {
    return LEVELS.length;
  },

  levelId(i) {
    return LEVELS[i] ? LEVELS[i].id : '';
  },

  get isLastLevel() {
    return this.levelIndex >= LEVELS.length - 1;
  },

  // Elige un nivel y arranca una partida nueva de ese nivel.
  startLevel(i) {
    this.levelIndex = Math.max(0, Math.min(LEVELS.length - 1, i | 0));
    return this.newRun();
  },

  // Arranca una partida nueva del nivel actual: orden de opciones nuevo, nada tachado.
  newRun() {
    this.runCount += 1;
    const ids = this.level.decision.opciones.map((o) => o.id);
    this.run = {
      level: this.level.id,
      order: shuffle(ids),
      crossed: [],
      lastWrong: null,
    };
    return this.run;
  },

  ensureRun() {
    if (!this.run || this.run.level !== this.level.id) this.newRun();
    return this.run;
  },

  isDone(id) {
    return this.completed.includes(id);
  },

  markDone(id) {
    if (!this.completed.includes(id)) this.completed.push(id);
    try {
      window.localStorage.setItem(DONE_KEY, JSON.stringify(this.completed));
    } catch (e) {
      /* modo privado o lleno: no pasa nada */
    }
  },
};
