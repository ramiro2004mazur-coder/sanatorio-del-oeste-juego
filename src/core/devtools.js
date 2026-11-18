// Modo debug (?debug=1) y hooks para tests (?test=1). Nunca se cargan sin parámetro.
import { DEBUG, TEST } from './debug.js';
import { state } from './state.js';
import { audio } from './audio.js';
import { controls } from './controls.js';
import { hitClientPoint, GW } from './ui.js';
import { TILE } from './map.js';

const SCENES = ['Title', 'Levels', 'Game', 'WhatFailed', 'Decision', 'Lost', 'Fixed', 'Proposal', 'End', 'Finale'];

export function jumpTo(game, key) {
  state.ensureRun();
  audio.unlock();
  game.scene.getScenes(true).forEach((s) => {
    if (s.scene.key !== 'Boot') game.scene.stop(s.scene.key);
  });
  if (key === 'Lost') {
    const wrong = state.level.decision.opciones.find((o) => !o.correcta);
    game.scene.start('Lost', { id: wrong.id });
  } else {
    game.scene.start(key);
  }
}

export function initDevtools(game) {
  if (!TEST) return;

  window.__TEST__ = {
    get ready() {
      return game.scene.getScenes(true).some((s) => s.scene.key !== 'Boot');
    },
    scenes() {
      return game.scene.getScenes(true).map((s) => s.scene.key);
    },
    game() {
      const g = game.scene.getScene('Game');
      return g && g.sys.isActive() ? g.testState() : null;
    },
    run() {
      return JSON.parse(JSON.stringify(state.run));
    },
    runCount() {
      return state.runCount;
    },
    dialogOpen() {
      const h = game.scene.getScene('Hud');
      return !!(h && h.sys.isActive() && h.isDialogOpen());
    },
    // Coordenadas de página (CSS px) de un botón/zona registrado.
    hit(name) {
      return hitClientPoint(game, name);
    },
    // Coordenadas de página del centro de un tile del mapa.
    tile(x, y) {
      const g = game.scene.getScene('Game');
      if (!g || !g.sys.isActive()) return null;
      const cam = g.cameras.main;
      const v = cam.worldView;
      const rect = game.canvas.getBoundingClientRect();
      const k = rect.width / GW;
      return {
        x: rect.left + (x * TILE + 8 - v.x) * cam.zoom * k,
        y: rect.top + (y * TILE + 8 - v.y) * cam.zoom * k,
      };
    },
    walkTo(x, y) {
      const g = game.scene.getScene('Game');
      if (!g || !g.sys.isActive() || !g.canControl()) return false;
      return g.walkTo({ x, y });
    },
    pressA() {
      controls.pressA();
    },
    setSpeed(n) {
      state.speed = n;
    },
    jump(key) {
      jumpTo(game, key);
    },
    // Elige nivel (0, 1, 2) y salta a una escena (por defecto, el juego).
    level(i, key = 'Game') {
      state.startLevel(i);
      jumpTo(game, key);
    },
    levelIndex() {
      return state.levelIndex;
    },
    completed() {
      return state.completed.slice();
    },
    hudState() {
      const h = game.scene.getScene('Hud');
      if (!h || !h.sys.isActive()) return null;
      return {
        meterLabel: h.pain.label.text,
        meterIcon: h.pain.icon,
        calendar: h.calText.visible ? h.calText.text : null,
        controls: h.controlsVisible,
        faint: !!h.faintState,
      };
    },
    // Fuerza el valor del medidor (para probar topes y finales).
    setMeter(v) {
      const g = game.scene.getScene('Game');
      if (g && g.sys.isActive()) g.pain = v;
    },
    // Dispara un evento del guion del nivel actual (para pruebas de robustez).
    event(name) {
      const g = game.scene.getScene('Game');
      if (g && g.sys.isActive()) g.engineEvent(name);
    },
    fps() {
      return game.loop.actualFps;
    },
    audio() {
      return { muted: audio.muted, ctx: audio.ctx ? audio.ctx.state : 'none', music: !!audio.musicTimer };
    },
    proposalScroll() {
      const p = game.scene.getScene('Proposal');
      return p && p.sys.isActive() ? { scroll: p.scroll, max: p.maxScroll } : null;
    },
    loopRunning() {
      return !!(game.loop && game.loop.running);
    },
  };

  if (!DEBUG) return;

  // Panel de debug
  const root = document.createElement('div');
  root.id = 'dbg';
  const toggle = document.createElement('button');
  toggle.textContent = 'DBG';
  toggle.addEventListener('click', () => root.classList.toggle('open'));
  const panel = document.createElement('div');
  panel.className = 'panel';
  SCENES.forEach((k) => {
    const b = document.createElement('button');
    b.textContent = k;
    b.addEventListener('click', () => jumpTo(game, k));
    panel.appendChild(b);
  });
  panel.appendChild(document.createElement('br'));
  [0, 1, 2].forEach((i) => {
    const b = document.createElement('button');
    b.textContent = `Nivel ${i + 1}`;
    b.addEventListener('click', () => {
      state.startLevel(i);
      jumpTo(game, 'Game');
    });
    panel.appendChild(b);
  });
  const hb = document.createElement('button');
  const paintHb = () => (hb.textContent = `hitboxes: ${state.hitboxes ? 'ON' : 'off'}`);
  hb.addEventListener('click', () => {
    state.hitboxes = !state.hitboxes;
    paintHb();
  });
  paintHb();
  const sp = document.createElement('button');
  const paintSp = () => (sp.textContent = `velocidad: x${state.speed}`);
  sp.addEventListener('click', () => {
    state.speed = state.speed === 1 ? 3 : 1;
    paintSp();
  });
  paintSp();
  panel.appendChild(document.createElement('br'));
  panel.appendChild(hb);
  panel.appendChild(sp);
  ['pointerdown', 'touchstart', 'mousedown'].forEach((ev) =>
    root.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }),
  );
  root.appendChild(toggle);
  root.appendChild(panel);
  document.body.appendChild(root);
}
