// Eventos con animación del NIVEL 2 (Seguridad psicológica · "El error de la factura").
import { TILE } from '../../core/map.js';
import { audio } from '../../core/audio.js';

const MAX_PAPELES = 60; // tope de papeles en pantalla (se reciclan los más viejos)
const ADMIN = { x: 18, y: 1, w: 8, h: 7 };
const PASILLO = { x: 15, y: 1, w: 2, h: 22 };
const ESCRITORIO = { x: 23, y: 6 };
const IMPRESORA = { x: 24, y: 1 };

// Burbuja sobre un tile (sin personaje).
function tileBubble(game, x, y, text, ms, color) {
  return game.world.bubble({ sprite: { x: x * TILE + 8, y: y * TILE + 6 } }, text, ms, color);
}

// ---------- papeles (con reciclado para no pasarnos nunca de MAX_PAPELES) ----------
function papelLibre(game) {
  const ex = game.extra;
  const area = ex.papelesEnPasillo ? (Math.random() < 0.6 ? ADMIN : PASILLO) : ADMIN;
  for (let k = 0; k < 12; k++) {
    const x = area.x + Math.floor(Math.random() * area.w);
    const y = area.y + Math.floor(Math.random() * area.h);
    if (!game.world.isSolid(x, y)) return { x, y };
  }
  return null;
}

function addPapel(game, from) {
  const ex = game.extra;
  const pos = papelLibre(game);
  if (!pos) return;
  let img;
  if (ex.papeles.length >= MAX_PAPELES) {
    img = ex.papeles.shift();
    ex.paperTiles.delete(img.getData('k'));
  } else {
    img = game.add.image(0, 0, Math.random() < 0.3 ? 'paperRed' : 'paper');
  }
  const px = pos.x * TILE + 3 + Math.random() * 10;
  const py = pos.y * TILE + 4 + Math.random() * 9;
  const k = `${pos.x},${pos.y}`;
  img.setData('k', k);
  img.setAngle(Math.random() * 40 - 20).setDepth(pos.y * TILE + 1).setAlpha(1);
  if (from) {
    img.setPosition(from.x * TILE + 8, from.y * TILE + 4);
    game.tweens.add({ targets: img, x: px, y: py, duration: 450, ease: 'Quad.Out' });
  } else {
    img.setPosition(px, py - 10);
    game.tweens.add({ targets: img, y: py, duration: 300, ease: 'Bounce.Out' });
  }
  ex.papeles.push(img);
  ex.paperTiles.set(k, (ex.paperTiles.get(k) || 0) + 1);
}

// ---------- eventos del guion ----------
function errorFactura(game) {
  audio.play('error');
  const ex = game.extra;
  ex.papelRojo = game.add
    .image(ESCRITORIO.x * TILE + 8, ESCRITORIO.y * TILE + 3, 'paperRed')
    .setDepth(ESCRITORIO.y * TILE + 12)
    .setScale(0.2);
  game.tweens.add({ targets: ex.papelRojo, scale: 1.3, duration: 300, ease: 'Back.Out' });
  game.cameras.main.shake(200, 0.004);
  game.addPain(10, { hit: false });
  game.say(['Uy... la cargaste a la **obra social equivocada**.'], () => game.setStep('avisar'));
}

function jefeGrita(game) {
  if (game.extra.grito) return;
  game.extra.grito = true;
  game.cutscene(true);
  const cam = game.cameras.main;
  cam.stopFollow();
  cam.pan(20.5 * TILE, 16 * TILE, 500, 'Sine.easeInOut');
  const jefe = game.npcs.jefe;
  game.later(600, () => {
    if (jefe) game.world.bubble(jefe, '(al teléfono)\n¡Acá el que se equivoca, SE VA!', 2600, '#c0392b');
    audio.play('shout');
  });
  game.later(1500, () => {
    audio.play('slam');
    cam.shake(350, 0.012);
  });
  game.later(2900, () => {
    cam.pan(game.player.sprite.x, game.player.sprite.y, 400, 'Sine.easeInOut');
    game.addPain(22, { hit: true });
    game.pushPlayer('left'); // Lucía retrocede sola (un paso, sin encerrarla)
  });
  game.later(3500, () => {
    game.cutscene(false);
    game.say([{ quien: 'Lucía', texto: 'No me animo...' }], () => game.setStep('esconder'));
  });
}

function esconder(game) {
  const p = game.extra.papelRojo;
  if (p) {
    game.tweens.add({ targets: p, y: p.y + 6, scale: 0.2, alpha: 0, duration: 400, onComplete: () => p.destroy() });
    game.extra.papelRojo = null;
  }
}

function bolaDeNieve(game) {
  const ex = game.extra;
  if (ex.bola) return;
  ex.bola = true;
  ex.bolaT = 0;
  game.meterRate = 1.5; // el miedo sube rápido...
  game.capOff = true; // ...y ahora sí puede llegar al máximo
  const loop = (ms, fn) =>
    game.time.addEvent({
      delay: ms,
      loop: true,
      callback: () => {
        if (game.phase !== 'faint') fn();
      },
    });
  // Papeles que se multiplican, cada vez más rápido
  ex.tPapel = loop(260, () => {
    const n = 1 + Math.floor(ex.bolaT / 6000);
    for (let i = 0; i < n; i++) addPapel(game);
    if (Math.random() < 0.5) audio.play('paper');
  });
  // La impresora escupe hojas sin parar
  ex.tImpresora = loop(900, () => {
    audio.play('printer');
    for (let i = 0; i < 2; i++) addPapel(game, IMPRESORA);
  });
  // Teléfonos sonando
  ex.tTelefono = loop(2300, () => {
    audio.play('phone');
    const spots = [ESCRITORIO, { x: 20, y: 2 }, { x: 20, y: 6 }];
    const s = spots[Math.floor(Math.random() * spots.length)];
    tileBubble(game, s.x, s.y, '¡RIIING!', 900, '#c0392b');
  });
  game.later(5000, () => {
    ex.papelesEnPasillo = true;
  });
}

function atender(game) {
  const ex = game.extra;
  const L = game.level;
  const i = ex.llamadas || 0;
  ex.llamadas = i + 1;
  if (i >= L.telefono.length) {
    game.say([{ quien: 'Lucía', texto: 'No quiero atender más...' }]);
    return;
  }
  audio.play('phone');
  game.say([{ quien: 'Teléfono', texto: L.telefono[i] }], () => {
    game.addPain(10, { hit: true });
    for (let k = 0; k < 8; k++) addPapel(game);
  });
}

// El paciente enojado en el hall (se ve un momento y la cámara vuelve).
function pacienteEnojado(game) {
  const ex = game.extra;
  ex.enojado = true;
  const spot = [[13, 12], [12, 12], [13, 13], [11, 12], [12, 13]].find(([x, y]) => !game.world.isBlocked(x, y)) || [13, 12];
  const w = game.world.addWalker('pac3', spot[0], spot[1], 'right', { id: 'enojado' });
  w.kind = 'extra';
  game.cutscene(true);
  const cam = game.cameras.main;
  cam.stopFollow();
  cam.pan(w.sprite.x, w.sprite.y, 450, "Sine.easeInOut");
  game.later(450, () => {
    game.world.bubble(w, game.level.pacienteEnojado.split('**').join(''), 2200, '#c0392b');
    audio.play('shout');
  });
  game.later(2300, () => {
    cam.pan(game.player.sprite.x, game.player.sprite.y, 350, 'Sine.easeInOut');
  });
  game.later(2700, () => game.cutscene(false));
}

// Derrota: una pila gigante de papeles se le viene encima a Lucía.
function animDerrota(game, show) {
  const ex = game.extra;
  ['tPapel', 'tImpresora', 'tTelefono'].forEach((k) => ex[k] && ex[k].remove());
  const cam = game.cameras.main;
  cam.stopFollow();
  cam.pan(game.player.sprite.x, game.player.sprite.y, 300);
  const p = game.player.sprite;
  audio.play('pile');
  const pile = [];
  for (let i = 0; i < 26; i++) {
    const img = game.add.image(p.x + (Math.random() * 18 - 9), p.y - 90 - i * 6, Math.random() < 0.35 ? 'paperRed' : 'paper');
    img.setAngle(Math.random() * 60 - 30).setDepth(2400 + i);
    const row = Math.floor(i / 5);
    game.tweens.add({
      targets: img,
      y: p.y + 4 - row * 3 + Math.random() * 3,
      duration: 380 + i * 25,
      delay: i * 40,
      ease: 'Bounce.Out',
    });
    pile.push(img);
  }
  game.later(900, () => {
    cam.shake(350, 0.012);
    game.tweens.add({ targets: p, alpha: 0, duration: 300 });
  });
  game.later(1500, show);
}

export default {
  init(game) {
    const ex = game.extra;
    ex.papeles = [];
    ex.paperTiles = new Map();
    ex.llamadas = 0;
    ex.beat = 0;
  },

  eventos: { errorFactura, jefeGrita, esconder, bolaDeNieve, atender },

  update(game, dt, dialogOpen) {
    const ex = game.extra;
    // Latido que se acelera con el miedo
    if (game.phase !== 'faint' && game.pain > 30) {
      ex.beat -= dt;
      if (ex.beat <= 0) {
        ex.beat = Math.max(330, 1150 - game.pain * 8);
        audio.play('heartbeat');
      }
    }
    if (ex.bola && game.phase === 'play' && !dialogOpen) {
      ex.bolaT += dt;
      if (!ex.enojado && ex.bolaT > 3500) pacienteEnojado(game);
      if (game.pain >= 99.5) game.faint();
    }
  },

  // Tope de tiempo: si todavía no explotó, explota ahora.
  alTope(game) {
    if (!game.extra.bola) {
      game.extra.papelesEnPasillo = true;
      for (let i = 0; i < 30; i++) addPapel(game);
    }
    game.faint();
  },

  animDerrota,

  // Los papeles frenan un poco, nunca bloquean.
  slowAt(game, x, y) {
    return game.extra.paperTiles && game.extra.paperTiles.has(`${x},${y}`);
  },

  testState(game) {
    const ex = game.extra;
    return { papeles: ex.papeles ? ex.papeles.length : 0, bola: !!ex.bola, llamadas: ex.llamadas || 0 };
  },

  // ---------- versión arreglada (~16 s) ----------
  arreglado(sc) {
    const A = sc.level.arreglado;
    const cam = sc.cameras.main;
    cam.centerOn(sc.player.sprite.x, sc.player.sprite.y);
    cam.startFollow(sc.player.sprite, true, 0.15, 0.15);
    // El error todavía está ahí
    const papers = [];
    [[16, 14], [15, 15], [16, 17], [19, 16], [20, 15], [15, 13]].forEach(([x, y], i) => {
      papers.push(
        sc.add
          .image(x * TILE + 8, y * TILE + 9, i === 0 ? 'paperRed' : 'paper')
          .setAngle(i * 17 - 30)
          .setDepth(y * TILE + 1),
      );
    });
    sc.at(400, () => sc.world.bubble(sc.player, A.lucia, 2200, '#1d2b30'));
    sc.at(900, () =>
      sc.walkTo(A.destino, () => {
        sc.player.face('right');
        const jefe = sc.npcs.jefe;
        sc.world.bubble(jefe, A.jefe.split('**').join(''), 2800, '#0d6e4a');
        audio.play('heal');
        sc.tweenPain(0, 2600, 300);
        sc.at(1600, () => {
          audio.play('paper');
          papers.forEach((p, i) =>
            sc.tweens.add({ targets: p, scale: 0, angle: 360, alpha: 0, duration: 450, delay: i * 90 }),
          );
        });
        sc.at(2900, () => {
          audio.play('ding');
          sc.world.bubble({ sprite: { x: 23 * TILE + 8, y: 16 * TILE + 4 } }, A.telefono, 1800, '#0d6e4a');
        });
        // Reunión de aprendizaje
        sc.at(4600, () => {
          cam.fadeOut(250, 0, 0, 0);
        });
        sc.at(4900, () => {
          cam.stopFollow();
          const seats = {
            jefe: [20, 21, 'right'],
            companera: [23, 21, 'left'],
            companero: [22, 22, 'up'],
            jugador: [21, 20, 'down'],
          };
          Object.entries(seats).forEach(([id, [x, y, d]]) => {
            const w = id === 'jugador' ? sc.player : sc.npcs[id];
            if (!w) return;
            w.dir = d;
            w.place(x, y);
          });
          cam.centerOn(21.5 * TILE, 21 * TILE);
          cam.fadeIn(250, 0, 0, 0);
        });
        let t = 5500;
        A.reunion.forEach(([id, text]) => {
          sc.at(t, () => {
            const w = id === 'jugador' ? sc.player : sc.npcs[id];
            if (w) sc.world.bubble(w, text, 1900, '#0d6e4a');
            audio.play('blip');
          });
          t += 2000;
        });
        sc.at(t, () => {
          sc.hearts(sc.player);
          sc.showStamp();
        });
        sc.at(t + 1800, () => sc.finish());
      }),
    );
  },
};

