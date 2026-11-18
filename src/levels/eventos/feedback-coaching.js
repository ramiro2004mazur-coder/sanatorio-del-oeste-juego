// Eventos con animación del NIVEL 3 (Feedback y coaching · "Un año sin feedback").
import { TILE } from '../../core/map.js';
import { audio } from '../../core/audio.js';
import { GW } from '../../core/ui.js';

const strip = (s) => String(s).split('**').join('');

// ---------- calendario ----------
function setMonth(game, m, opts = {}) {
  const ex = game.extra;
  const C = game.level.calendario;
  const target = Math.max(0, Math.min(11, m));
  const jump = target - ex.mes;
  if (jump <= 0 && !opts.force) return;
  ex.mes = target;
  ex.desdeMes = 0;
  const hud = game.hud();
  const meses = C.meses;
  if (hud) hud.setCalendar(meses[target], opts.sub || (jump > 1 ? `(pasaron ${jump} meses)` : 'Sin novedades'), !opts.quiet);
  if (jump > 0) {
    game.addPain(C.bajaPorMes * jump, { hit: false });
    audio.play('lowbatt');
    game.floatText(`-${C.bajaPorMes * jump}`, '#e04848');
  }
}

// La jefa pasa caminando cerca de Tomás, dice algo (nunca feedback) y se va.
function jefaPasa(game, text) {
  const ex = game.extra;
  if (ex.paseo) return;
  const pl = game.player;
  // un tile libre cerca (a 2-3 pasos), así se ve en pantalla
  const cand = [];
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < 2 || d > 4) continue;
      const x = pl.tx + dx;
      const y = pl.ty + dy;
      if (!game.world.isBlocked(x, y)) cand.push({ x, y, d });
    }
  }
  if (!cand.length) return;
  const s = cand[Math.floor(Math.random() * cand.length)];
  const w = game.world.addWalker('jefa', s.x, s.y, 'down', { id: 'jefaPaseo' });
  w.kind = 'extra';
  w.sprite.setAlpha(0);
  ex.paseo = w;
  game.tweens.add({ targets: w.sprite, alpha: 1, duration: 250 });
  game.later(300, () => {
    if (w.sprite.active) game.world.bubble(w, text, 1800, '#1d2b30');
  });
  // camina un par de pasos y desaparece (no se queda bloqueando a nadie)
  let steps = 0;
  const walk = game.time.addEvent({
    delay: 380,
    repeat: 4,
    callback: () => {
      if (!w.sprite.active) return;
      const dirs = ['left', 'right', 'up', 'down'];
      const d = dirs[(steps + s.x) % 4];
      steps += 1;
      w.tryStep(d, 330);
    },
  });
  game.later(2300, () => {
    walk.remove();
    game.tweens.add({
      targets: w.sprite,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        game.world.removeWalker(w);
        if (ex.paseo === w) ex.paseo = null;
      },
    });
  });
}

// ---------- eventos del guion ----------
function agarrarCarpeta(game) {
  game.extra.carpeta = true;
}

function dejarCarpeta(game) {
  const ex = game.extra;
  ex.carpeta = false;
  ex.dejadas += 1;
  const b = game.objects.bandeja;
  if (!b) return;
  const t = b.tiles[0];
  game.add.image(t.x * TILE + 8, t.y * TILE + 5, 'folder').setDepth(t.y * TILE + 6);
  // brillito rojo sutil: es la bandeja equivocada (se entiende al final)
  if (!ex.glint) {
    ex.glint = game.add.image(t.x * TILE + 12, t.y * TILE + 3, 'glint').setDepth(t.y * TILE + 7).setAlpha(0.5);
    game.tweens.add({ targets: ex.glint, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });
  }
}

function idea(game) {
  const ex = game.extra;
  ex.lampara = 'on';
  audio.play('lamp');
  game.say([{ quien: 'Tomás', texto: game.level.idea }]);
}

function apagarIdea(game) {
  const ex = game.extra;
  ex.lampara = 'off';
  audio.play('lampOff');
  game.later(1400, () => {
    ex.lampara = null;
  });
}

function empujarCarrito(game) {
  const o = game.objects.carrito;
  if (!o) return;
  audio.play('drawer');
  const dest =
    game.level.carritoDestino.find((d) => !game.world.walkerAt(d.x, d.y) && !game.world.isSolid(d.x, d.y)) ||
    o.tiles[0];
  game.moveObject('carrito', dest.x, dest.y, 700);
}

function abrirDespacho(game) {
  game.world.openDoor('jef');
  audio.play('door');
}

function evaluacion(game) {
  game.faint();
}

// Derrota: el pergamino gigante de la evaluación anual y Tomás desplomado arriba.
function animDerrota(game, show) {
  const ex = game.extra;
  const E = game.level.evaluacion;
  setMonth(game, 11, { quiet: true });
  ex.lampara = null;
  ex.carpeta = false;
  const hud = game.hud();
  const jefa = game.npcs.jefa;
  if (jefa) {
    jefa.face('left');
    game.world.bubble(jefa, E.jefa, 1800, '#1d2b30');
  }
  game.cameras.main.stopFollow();
  audio.play('scroll');
  const rustle = game.time.addEvent({ delay: 420, repeat: 16, callback: () => audio.play('scroll') });
  if (hud) hud.showScroll(E.titulo, E.lineas, { unroll: 2400, scroll: 5200 });
  game.tweenPain(100, 5600);
  game.later(1800, () => audio.play('lowbatt'));
  game.later(3800, () => audio.play('lowbatt'));
  // Tomás se desploma arriba del pergamino
  game.later(5800, () => {
    rustle.remove();
    if (!hud) return;
    const big = hud.add.sprite(GW / 2, 620, 'ch_tomas_bajon', 0).setScale(9);
    hud.overlay.add(big);
    audio.play('faint');
    hud.tweens.add({ targets: big, angle: 90, y: 760, duration: 600, ease: 'Bounce.Out' });
    hud.cameras.main.shake(300, 0.01);
  });
  game.later(6700, show);
}

export default {
  init(game) {
    const ex = game.extra;
    ex.mes = 0;
    ex.desdeMes = 0;
    ex.dejadas = 0;
    ex.carpeta = false;
    ex.lampara = null;
    ex.pasaSolo = 0;
    ex.lastPaso = game.paso;
    const P = game.player.sprite;
    ex.qmark = game.add.image(P.x, P.y - 14, 'qmark').setDepth(2700);
    ex.folder = game.add.image(P.x, P.y - 12, 'folder').setDepth(2701).setVisible(false);
    ex.lamp = game.add.image(P.x, P.y - 16, 'lampOn').setDepth(2702).setVisible(false);
    // El calendario arranca en enero (sin animación grande)
    game.later(60, () => {
      const hud = game.hud();
      if (hud) hud.setCalendar(game.level.calendario.meses[0], '', false);
    });
  },

  eventos: { agarrarCarpeta, dejarCarpeta, idea, apagarIdea, empujarCarrito, abrirDespacho, evaluacion },

  update(game, dt, dialogOpen) {
    const ex = game.extra;
    const L = game.level;
    // Cambio de paso: el calendario salta y la jefa pasa sin dar feedback
    if (ex.lastPaso !== game.paso) {
      ex.lastPaso = game.paso;
      const s = game.currentStep();
      if (s && s.mes != null) setMonth(game, Math.max(s.mes, ex.mes + 1));
      if (s && s.pasa) game.later(1500, () => game.phase === 'play' && jefaPasa(game, s.pasa));
    }
    // Si te quedás quieto, el año pasa igual (hasta noviembre)
    if (game.phase === 'play' && !dialogOpen) {
      ex.desdeMes += dt / 1000;
      if (ex.desdeMes > L.calendario.avanzaSoloCada && ex.mes < 10) {
        setMonth(game, ex.mes + 1);
        const t = L.pasaSolo[ex.pasaSolo % L.pasaSolo.length];
        ex.pasaSolo += 1;
        jefaPasa(game, t);
      }
    }
    // Lo que flota sobre la cabeza de Tomás
    const P = game.player.sprite;
    const bob = Math.sin(game.time.now / 220) * 1.5;
    const showHead = game.phase !== 'faint';
    ex.qmark.setPosition(P.x, P.y - 15 + bob).setVisible(showHead && !ex.lampara);
    ex.folder.setPosition(P.x + 5, P.y + 1).setVisible(showHead && ex.carpeta);
    ex.lamp
      .setPosition(P.x, P.y - 17 + bob)
      .setVisible(showHead && !!ex.lampara)
      .setTexture(ex.lampara === 'off' ? 'lampOff' : 'lampOn');
  },

  // Tope de tiempo: diciembre llega igual, estés donde estés.
  alTope(game) {
    game.faint();
  },

  animDerrota,

  testState(game) {
    const ex = game.extra;
    return {
      mes: ex.mes,
      mesNombre: game.level.calendario.meses[ex.mes],
      carpeta: !!ex.carpeta,
      lampara: ex.lampara,
      dejadas: ex.dejadas,
      carrito: game.objects.carrito ? game.objects.carrito.tiles[0] : null,
    };
  },

  // ---------- versión arreglada (~17 s) ----------
  arreglado(sc) {
    const A = sc.level.arreglado;
    const meses = sc.level.calendario.meses;
    const cam = sc.cameras.main;
    cam.centerOn(21.5 * TILE, 20.5 * TILE);
    const P = sc.player.sprite;
    const qmark = sc.add.image(P.x, P.y - 15, 'qmark').setDepth(2700);
    const lamp = sc.add.image(P.x, P.y - 17, 'lampOff').setDepth(2702).setAlpha(0);
    const MES = 1300;
    meses.forEach((m, i) => sc.at(300 + i * MES, () => sc.setCalendar(m)));
    sc.tweenPain(0, 1500, 2600); // batería llena desde la primera charla
    // charlas 1 a 1 (cada 3 meses)
    const byMonth = {};
    A.charlas.forEach(([m, who, text]) => {
      byMonth[m] = byMonth[m] || [];
      byMonth[m].push([who, text]);
    });
    Object.keys(byMonth).forEach((m) => {
      byMonth[m].forEach(([who, text], k) => {
        sc.at(300 + Number(m) * MES + k * 1150, () => {
          const w = who === 'jugador' ? sc.player : sc.npcs[who];
          if (w) sc.world.bubble(w, text, 1300, '#0d6e4a');
          audio.play('blip');
        });
      });
    });
    // en marzo desaparece el "?"
    sc.at(300 + 2 * MES + 2400, () => {
      sc.tweens.add({ targets: qmark, alpha: 0, scale: 0, duration: 300 });
      audio.play('heal');
    });
    // en junio la idea: la lamparita se prende y queda arriba de la puerta
    sc.at(300 + 5 * MES + 1200, () => {
      lamp.setTexture('lampOn').setAlpha(1);
      audio.play('lamp');
      sc.tweens.add({
        targets: lamp,
        x: 17 * TILE + 8,
        y: 20 * TILE + 6,
        delay: 500,
        duration: 700,
        ease: 'Sine.InOut',
      });
      const glow = sc.add.image(17 * TILE + 8, 20 * TILE + 6, 'glow').setDepth(2701).setAlpha(0);
      sc.tweens.add({ targets: glow, alpha: 0.9, scale: 2, delay: 1200, duration: 500, yoyo: true, repeat: -1 });
    });
    // diciembre: la evaluación es una hojita
    sc.at(300 + 11 * MES + 200, () => {
      const sheet = sc.add.image(21.5 * TILE + 8, 21 * TILE + 2, 'sheet').setDepth(3000).setScale(0.3);
      sc.tweens.add({ targets: sheet, scale: 1.2, duration: 300, ease: 'Back.Out' });
      sc.world.bubble({ sprite: { x: 21.5 * TILE + 8, y: 21 * TILE - 4 } }, strip(A.diciembre), 2000, '#0d6e4a');
      sc.hearts(sc.player);
    });
    sc.at(300 + 11 * MES + 900, () => sc.showStamp());
    sc.at(300 + 11 * MES + 2600, () => sc.finish());
  },
};

