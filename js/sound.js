let _muted = localStorage.getItem('sr-muted') === 'true';
let _actx = null;

function _ctx() {
  if (!_actx || _actx.state === 'closed') {
    _actx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _actx;
}

export function isMuted() { return _muted; }

export function toggleMute() {
  _muted = !_muted;
  localStorage.setItem('sr-muted', _muted);
  return _muted;
}

export function initMuteButton() {
  const btn = document.getElementById('btn-mute');
  if (!btn) return;
  _syncBtn(btn);
  btn.addEventListener('click', () => {
    toggleMute();
    _syncBtn(btn);
  });
}

function _syncBtn(btn) {
  btn.textContent = _muted ? '🔇' : '🔊';
  btn.title = _muted ? 'Ενεργοποίηση ήχου' : 'Σίγαση';
}

// ── Neon mode ────────────────────────────────────────────────────────────────

// Short electronic blip on each name change during spin
export function playNeonTick() {
  if (_muted) return;
  try {
    const ctx = _ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(700, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(950, ctx.currentTime + 0.03);
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.04);
  } catch {}
}

// Ascending electronic chord when winner is revealed
export function playNeonWin() {
  if (_muted) return;
  try {
    const ctx = _ctx();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.28, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    master.connect(ctx.destination);
    [440, 554, 659, 880].forEach((freq, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
      o.connect(master);
      o.start(ctx.currentTime + i * 0.09);
      o.stop(ctx.currentTime + i * 0.09 + 0.22);
    });
  } catch {}
}

// ── Kino mode ────────────────────────────────────────────────────────────────

// Mechanical click on each card highlight during spin
export function playKinoTick() {
  if (_muted) return;
  try {
    const ctx = _ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(180 + Math.random() * 140, ctx.currentTime);
    g.gain.setValueAtTime(0.14, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.08);
  } catch {}
}

// Lottery-style fanfare when winner is revealed
export function playKinoWin() {
  if (_muted) return;
  try {
    const ctx = _ctx();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      g.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.38);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.38);
    });
  } catch {}
}
