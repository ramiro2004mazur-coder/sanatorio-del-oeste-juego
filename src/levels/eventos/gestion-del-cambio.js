// Eventos con animación del NIVEL 1 (Gestión del cambio).
// Los textos viven en ../gestion-del-cambio.js; acá solo está el "cómo se mueve".
import { TILE } from '../../core/map.js';
import { audio } from '../../core/audio.js';

// La gente se amontona en el mostrador.
function formarCola(game) {
  const pos = game.level.cola.posiciones;
  let i = 0;
  game.queue = [];
  for (const w of game.pacientes) {
    while (i < pos.length && pos[i].x === game.player.tx && pos[i].y === game.player.ty) i += 1;
    if (i >= pos.length) break;
    const target = pos[i];
    i += 1;
    w.inQueue = true;
    game.queue.push(w);
    game.tweens.add({
      targets: w.sprite,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (!w.sprite.active) return;
        w.dir = 'up';
        w.place(target.x, target.y);
        game.tweens.add({ targets: w.sprite, alpha: 1, duration: 250 });
      },
    });
  }
}

// El mostrador colapsa: quejas, grito y desmayo.
function colapso(game) {
  if (game.extra.colapso || game.fainted) return;
  game.extra.colapso = true;
  game.cutscene(true);
  const cam = game.cameras.main;
  cam.stopFollow();
  cam.pan(3 * TILE, 14 * TILE, 700, 'Sine.easeInOut');
  const C = game.level.cola;
  const q = (game.queue || []).slice(0, 5);
  let t = 800;
  let prev = null;
  // Una queja por vez (cada globito reemplaza al anterior para que se lean).
  q.forEach((w, k) => {
    game.later(t, () => {
      if (prev && prev.active) prev.destroy();
      prev = game.world.bubble(w, C.quejas[k % C.quejas.length], 1500);
      audio.play('murmur');
      game.addPain(2);
    });
    t += 1100;
  });
  game.later(t, () => {
    if (game.npcs.recepcionista) {
      game.npcs.recepcionista.face('down');
      game.world.bubble(game.npcs.recepcionista, C.grito, 2600, '#c0392b');
    }
    audio.play('shout');
    cam.shake(400, 0.008);
  });
  t += 1900;
  game.later(t, () => {
    cam.pan(game.player.sprite.x, game.player.sprite.y, 500, 'Sine.easeInOut');
    game.world.bubble(game.player, C.jugador, 1800);
    game.tweenPain(100, 1300);
  });
  t += 1700;
  game.later(t, () => game.faint());
}

// Repetición (~17 s) del hospital funcionando con la propuesta.
function arreglado(sc) {
  const L = sc.level;
  const A = L.arreglado;
  const at = (ms, fn) => sc.at(ms, fn);
  sc.cameras.main.centerOn(7.5 * TILE, 4 * TILE);
  const M = A.medico;
  const medico = sc.world.addWalker(M.sprite, M.x, M.y, M.dir, { id: 'medico' });
  // Pocos pacientes, sentados tranquilos
  ['pac2', 'pac5', 'pac7'].forEach((sp, i) => sc.world.addWalker(sp, 10 + i, 14, 'up'));
  sc.player.place(L.jugador.x, L.jugador.y - 1);
  sc.player.face('up');

  // 1) Los carteles se actualizan
  L.carteles.forEach((c, i) => {
    if (c.arreglado && c.arreglado !== c.texto) at(700 + i * 450, () => sc.world.flipSign(c.id, c.arreglado));
  });
  at(2200, () => {
    if (A.puertaQueSeAbre) {
      sc.world.openDoor(A.puertaQueSeAbre);
      audio.play('door');
    }
  });

  // 2) Todos dicen lo mismo
  at(2800, () => sc.cameras.main.pan(7 * TILE, 13 * TILE, 800, 'Sine.easeInOut'));
  at(3700, () => {
    A.hablan.forEach((id) => {
      const w = sc.npcs[id];
      if (w) sc.world.bubble(w, A.frase, 3400, '#0d6e4a');
    });
    if (sc.npcs.recepcionista) sc.world.bubble(sc.npcs.recepcionista, A.recepcion, 3400, '#0d6e4a');
    audio.play('objective');
  });

  // 3) El paciente va directo al consultorio correcto
  at(7400, () => {
    sc.cameras.main.startFollow(sc.player.sprite, true, 0.15, 0.15);
    sc.walkTo(A.destino, () => {
      sc.player.face('left');
      medico.face('right');
      sc.world.bubble(medico, M.dice, 2600, '#0d6e4a');
      audio.play('heal');
      sc.tweenPain(0, 2200, 600);
      sc.at(3000, () => {
        sc.world.bubble(sc.player, A.jugadorFinal, 2400, '#0d6e4a');
        sc.hearts(sc.player);
      });
      sc.at(4200, () => sc.showStamp());
      sc.at(6200, () => sc.finish());
    });
  });
}

export default {
  eventos: { formarCola, colapso },
  arreglado,
};
