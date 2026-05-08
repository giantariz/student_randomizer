export function startFlickerReveal(candidates, chosen, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const card = document.createElement('div');
  card.className = 'overlay-card';
  card.innerHTML = `
    <div class="overlay-label">Επιλέγω...</div>
    <div class="overlay-name" id="flicker-name">...</div>
    <div class="overlay-sub">κλικ για κλείσιμο</div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const nameEl = card.querySelector('#flicker-name');
  const labelEl = card.querySelector('.overlay-label');
  const DURATION = 1000;
  const start = Date.now();
  let done = false;

  playPickSound();

  function tick() {
    const elapsed = Date.now() - start;
    if (elapsed >= DURATION) {
      if (!done) {
        done = true;
        nameEl.textContent = chosen.name;
        labelEl.textContent = '🎉 Επελέγη:';
        card.style.animation = 'pop-in 0.3s cubic-bezier(0.34,1.56,0.64,1)';
        onDone();
        overlay.addEventListener('click', () => overlay.remove());
        card.querySelector('.overlay-sub').textContent = 'Κλικ οπουδήποτε για κλείσιμο';
      }
      return;
    }
    const progress = elapsed / DURATION;
    const delay = 40 + progress * progress * 460;
    const rnd = candidates[Math.floor(Math.random() * candidates.length)];
    nameEl.textContent = rnd.name;
    setTimeout(tick, delay);
  }
  tick();
}

export function playPickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    g.connect(ctx.destination);
    [440, 550, 660, 880].forEach((freq, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      o.connect(g);
      o.start(ctx.currentTime + i * 0.08);
      o.stop(ctx.currentTime + i * 0.08 + 0.15);
    });
  } catch {}
}
