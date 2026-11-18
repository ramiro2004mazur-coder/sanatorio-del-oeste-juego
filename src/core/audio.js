// Todo el sonido se sintetiza con Web Audio API. Si algo falla, el juego sigue mudo.
const MUTE_KEY = 'sanatorio-mute';

function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

// Musiquita chiptune: 4 compases en corcheas (null = silencio).
const LEAD = [
  72, null, 76, null, 79, null, 76, null,
  74, null, 77, null, 81, null, 77, null,
  72, null, 76, null, 79, 81, 79, 76,
  74, null, 71, null, 72, null, null, null,
  76, null, 79, null, 84, null, 79, null,
  77, null, 81, null, 77, null, 74, null,
  76, 77, 79, null, 76, null, 72, null,
  74, null, 79, null, 72, null, null, null,
];
const BASS = [
  48, null, 55, null, 48, null, 55, null,
  50, null, 57, null, 50, null, 57, null,
  48, null, 55, null, 48, null, 55, null,
  43, null, 50, null, 48, null, 43, null,
  48, null, 55, null, 48, null, 55, null,
  53, null, 57, null, 53, null, 57, null,
  48, null, 55, null, 48, null, 55, null,
  43, null, 50, null, 48, null, null, null,
];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.noiseBuf = null;
    this.muted = false;
    this.wantMusic = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.lastPlay = {};
    this.onMuteChange = null;
    try {
      this.muted = window.localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) {
      this.muted = false;
    }
  }

  // Se llama en cada toque/tecla: crea o reanuda el AudioContext (necesario en iOS).
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 0.55;
        this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.22;
        this.musicBus.connect(this.master);
        // Ruido blanco reutilizable para pasos/puertas.
        const len = Math.floor(this.ctx.sampleRate * 0.5);
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        // Truco iOS: reproducir un buffer vacío dentro del gesto.
        const b = this.ctx.createBuffer(1, 1, 22050);
        const s = this.ctx.createBufferSource();
        s.buffer = b;
        s.connect(this.ctx.destination);
        s.start(0);
      }
      if (this.ctx.state !== 'running' && !document.hidden) {
        const p = this.ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
      if (this.wantMusic && !this.musicTimer) this._startScheduler();
    } catch (e) {
      /* sin audio, sin drama */
    }
  }

  get ready() {
    return !!(this.ctx && this.ctx.state === 'running');
  }

  setMuted(m) {
    this.muted = !!m;
    try {
      window.localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch (e) {
      /* modo privado */
    }
    try {
      if (this.master && this.ctx) {
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setValueAtTime(this.muted ? 0 : 1, t);
      }
    } catch (e) {
      /* nada */
    }
    if (this.onMuteChange) this.onMuteChange(this.muted);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  suspend() {
    try {
      this._stopScheduler();
      if (this.ctx && this.ctx.state === 'running') {
        const p = this.ctx.suspend();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {
      /* nada */
    }
  }

  resume() {
    try {
      if (this.ctx && this.ctx.state !== 'running') {
        const p = this.ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
      if (this.ctx && this.wantMusic && !this.musicTimer) this._startScheduler();
    } catch (e) {
      /* nada */
    }
  }

  // ---------- primitivas ----------
  _tone(freq, dur, opts = {}) {
    const ctx = this.ctx;
    const type = opts.type || 'square';
    const vol = opts.vol == null ? 0.25 : opts.vol;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(opts.bus || this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise(dur, opts = {}) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.filter || 'lowpass';
    f.frequency.value = opts.freq || 800;
    const g = ctx.createGain();
    const vol = opts.vol == null ? 0.2 : opts.vol;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // ---------- efectos ----------
  play(name) {
    if (!this.ready || this.muted) return;
    const now = performance.now();
    const minGap = { step: 90, blip: 35, bump: 250 }[name] || 0;
    if (minGap && this.lastPlay[name] && now - this.lastPlay[name] < minGap) return;
    this.lastPlay[name] = now;
    try {
      switch (name) {
        case 'step':
          this._noise(0.05, { vol: 0.12, freq: 500 });
          break;
        case 'bump':
          this._tone(110, 0.08, { type: 'square', vol: 0.12 });
          break;
        case 'blip':
          this._tone(820 + Math.random() * 120, 0.035, { type: 'square', vol: 0.07 });
          break;
        case 'click':
          this._tone(660, 0.05, { type: 'square', vol: 0.15 });
          this._tone(990, 0.06, { type: 'square', vol: 0.12, delay: 0.04 });
          break;
        case 'door':
          this._noise(0.18, { vol: 0.18, freq: 1200, filter: 'bandpass' });
          this._tone(300, 0.1, { type: 'triangle', vol: 0.2, delay: 0.05 });
          this._tone(450, 0.12, { type: 'triangle', vol: 0.2, delay: 0.13 });
          break;
        case 'objective':
          this._tone(523, 0.08, { vol: 0.14 });
          this._tone(784, 0.12, { vol: 0.14, delay: 0.08 });
          break;
        case 'pain':
          // quejido + alarma corta
          this._tone(520, 0.35, { type: 'sawtooth', vol: 0.16, to: 260 });
          this._tone(880, 0.09, { type: 'square', vol: 0.09, delay: 0.38 });
          this._tone(880, 0.09, { type: 'square', vol: 0.09, delay: 0.52 });
          break;
        case 'murmur':
          this._tone(180 + Math.random() * 80, 0.18, { type: 'sawtooth', vol: 0.07, to: 140 });
          break;
        case 'shout':
          this._tone(700, 0.25, { type: 'square', vol: 0.12, to: 500 });
          break;
        case 'faint':
          this._tone(660, 1.3, { type: 'triangle', vol: 0.25, to: 70 });
          this._tone(440, 1.1, { type: 'square', vol: 0.08, to: 55, delay: 0.1 });
          this._noise(0.4, { vol: 0.25, freq: 300, delay: 1.2 });
          break;
        case 'buzzer':
          this._tone(98, 0.32, { type: 'sawtooth', vol: 0.3 });
          this._tone(92, 0.5, { type: 'sawtooth', vol: 0.3, delay: 0.36 });
          break;
        case 'jingle':
          [72, 76, 79, 84].forEach((n, i) =>
            this._tone(midi(n), 0.16, { vol: 0.18, delay: i * 0.11 }),
          );
          this._tone(midi(88), 0.4, { vol: 0.16, delay: 0.46 });
          break;
        case 'flip':
          this._tone(1200, 0.06, { type: 'square', vol: 0.09, to: 600 });
          this._tone(900, 0.1, { type: 'triangle', vol: 0.12, delay: 0.07 });
          break;
        case 'heal':
          [67, 72, 76, 79].forEach((n, i) =>
            this._tone(midi(n), 0.2, { type: 'triangle', vol: 0.2, delay: i * 0.09 }),
          );
          break;
        default:
          break;
      }
    } catch (e) {
      /* nada */
    }
  }

  // ---------- música ----------
  setMusic(on) {
    this.wantMusic = !!on;
    if (on) {
      if (this.ctx && !this.musicTimer && !document.hidden) this._startScheduler();
    } else {
      this._stopScheduler();
    }
  }

  _startScheduler() {
    if (!this.ctx || this.musicTimer) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this._schedule(), 90);
  }

  _stopScheduler() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _schedule() {
    try {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const eighth = 60 / 112 / 2;
      // Si nos quedamos atrás (pestaña dormida), saltamos en vez de amontonar notas.
      if (this.nextNoteTime < this.ctx.currentTime - 0.2) this.nextNoteTime = this.ctx.currentTime + 0.05;
      while (this.nextNoteTime < this.ctx.currentTime + 0.3) {
        const i = this.musicStep % LEAD.length;
        const t = this.nextNoteTime - this.ctx.currentTime;
        if (LEAD[i] != null)
          this._tone(midi(LEAD[i]), eighth * 0.85, { type: 'square', vol: 0.08, delay: t, bus: this.musicBus });
        if (BASS[i] != null)
          this._tone(midi(BASS[i]), eighth * 0.95, { type: 'triangle', vol: 0.22, delay: t, bus: this.musicBus });
        this.nextNoteTime += eighth;
        this.musicStep += 1;
      }
    } catch (e) {
      /* nada */
    }
  }
}

export const audio = new AudioEngine();
