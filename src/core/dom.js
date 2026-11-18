// Todo lo que pasa fuera del canvas: mute, "girá el celu", gestos bloqueados, pausa al cambiar de app.
import { audio } from './audio.js';
import { state } from './state.js';

export function initDom(game) {
  // ---------- desbloqueo de audio en cualquier gesto ----------
  const unlock = () => audio.unlock();
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((ev) =>
    window.addEventListener(ev, unlock, { capture: true, passive: true }),
  );

  // ---------- mute ----------
  const mute = document.getElementById('mute');
  const paint = (m) => {
    if (!mute) return;
    mute.classList.toggle('muted', m);
    mute.setAttribute('aria-label', m ? 'Activar sonido' : 'Silenciar sonido');
  };
  paint(audio.muted);
  audio.onMuteChange = paint;
  if (mute) {
    const toggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      audio.unlock();
      audio.toggleMute();
    };
    mute.addEventListener('click', toggle);
    // Que tocar el mute no mueva el joystick ni dispare nada en el juego.
    ['pointerdown', 'touchstart', 'mousedown'].forEach((ev) =>
      mute.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }),
    );
  }

  // ---------- bloquear zoom, scroll, menú contextual, selección ----------
  const block = (e) => {
    if (e.cancelable) e.preventDefault();
  };
  document.addEventListener('touchmove', block, { passive: false });
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('gesturechange', block, { passive: false });
  document.addEventListener('dblclick', block, { passive: false });
  document.addEventListener('contextmenu', block, { passive: false });
  document.addEventListener('selectstart', block, { passive: false });
  // Doble toque para zoom en iOS viejo
  let lastTouch = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouch < 300 && e.target === game.canvas && e.cancelable) e.preventDefault();
      lastTouch = now;
    },
    { passive: false },
  );

  // ---------- orientación ----------
  const mq = window.matchMedia ? window.matchMedia('(orientation: landscape) and (max-height: 540px) and (pointer: coarse)') : null;
  const checkRotate = () => {
    state.rotatePaused = !!(mq && mq.matches);
  };
  checkRotate();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', checkRotate);
    else if (mq.addListener) mq.addListener(checkRotate);
  }
  window.addEventListener('resize', () => {
    checkRotate();
    // iOS a veces no recalcula al rotar: forzamos.
    setTimeout(() => {
      try {
        game.scale.refresh();
      } catch (e) {
        /* nada */
      }
    }, 250);
  });

  // ---------- pausa al cambiar de app/pestaña ----------
  // Phaser solo avisa; nosotros dormimos el loop de verdad (algunos navegadores siguen corriendo frames).
  game.events.on('hidden', () => {
    try {
      game.loop.sleep();
    } catch (e) {
      /* nada */
    }
  });
  game.events.on('visible', () => {
    try {
      game.loop.wake();
    } catch (e) {
      /* nada */
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.suspend();
    else audio.resume();
  });
  window.addEventListener('pagehide', () => audio.suspend());
  window.addEventListener('pageshow', () => {
    if (!document.hidden) audio.resume();
  });
}
