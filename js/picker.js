// ── State ──────────────────────────────────────────────────────────────────────

let _type        = localStorage.getItem('sr-picker-type') || 'neon';
let _timer       = null;
let _allStudents = [];
let _calledIds   = [];
let _absentIds   = [];

function _esc(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const NEON_CFG = {
  BASE_STEPS: 26, RANDOM_EXTRA: 16, INITIAL_DELAY_MS: 52,
  SLOWDOWN_THRESHOLD: 0.65, FAST_INCREMENT: 4, SLOW_INCREMENT: 20,
  WINNER_GLOW_DURATION_MS: 1200,
};

const CANDY_CFG = {
  BASE_STEPS: 32, RANDOM_EXTRA: 20, INITIAL_DELAY_MS: 48,
  RANDOM_JUMP: 3, SLOWDOWN_THRESHOLD: 0.68, FAST_INCREMENT: 3, SLOW_INCREMENT: 16,
};

// ── Public API ─────────────────────────────────────────────────────────────────

export function initPicker() {
  const radios = document.querySelectorAll('[name="picker-type"]');
  radios.forEach(r => {
    if (r.value === _type) r.checked = true;
    r.addEventListener('change', () => {
      _type = r.value;
      localStorage.setItem('sr-picker-type', _type);
      _renderThumb();
    });
  });
  _renderThumb();
}

// Store latest student state for use inside the overlay
export function updatePickerDisplay(allStudents, calledIds, absentIds) {
  _allStudents = allStudents;
  _calledIds   = calledIds;
  _absentIds   = absentIds;
}

// availableStudents: students eligible for selection this round
// onWinner(student): called as soon as the winner is determined
export function spinPicker(availableStudents, onWinner) {
  clearTimeout(_timer);
  if (_type === 'neon') {
    _spinNeonOverlay(availableStudents, onWinner);
  } else {
    _spinCandyOverlay(availableStudents, onWinner);
  }
}

// ── Thumbnail (left column / sidebar) ─────────────────────────────────────────

function _renderThumb() {
  const container = document.getElementById('picker-display');
  if (!container) return;
  if (_type === 'neon') {
    container.innerHTML = `
      <div class="picker-thumb picker-thumb-neon">
        <span class="picker-thumb-neon-text">Όνομα</span>
      </div>`;
  } else {
    const labels = ['Α1', 'Α2', 'Α3', 'Α4', 'Α5', 'Α6'];
    container.innerHTML = `
      <div class="picker-thumb picker-thumb-candy">
        ${labels.map((l, i) =>
          `<div class="picker-thumb-card${i === 2 ? ' picker-thumb-active' : ''}">${l}</div>`
        ).join('')}
      </div>`;
  }
}

// ── Overlay helpers ────────────────────────────────────────────────────────────

function _createOverlay() {
  const ov = document.createElement('div');
  ov.className = 'picker-overlay';
  return ov;
}

function _makeCloseable(overlay) {
  const hint = overlay.querySelector('.picker-overlay-hint');
  if (hint) hint.textContent = 'κλικ για κλείσιμο';
  overlay.addEventListener('click', () => overlay.remove(), { once: true });
  overlay.style.cursor = 'pointer';
}

// ── Neon Pulse overlay ─────────────────────────────────────────────────────────

function _spinNeonOverlay(students, onWinner) {
  if (!students.length) return;

  const overlay = _createOverlay();
  overlay.innerHTML = `
    <div class="picker-overlay-neon-wrap">
      <div class="picker-overlay-label" id="po-label">Επιλέγω...</div>
      <div class="neon-display picker-overlay-neon" id="po-neon">
        <span class="neon-text" id="po-neon-text">—</span>
      </div>
      <div class="picker-overlay-hint"></div>
    </div>`;
  document.body.appendChild(overlay);

  const display = overlay.querySelector('#po-neon');
  const textEl  = overlay.querySelector('#po-neon-text');
  const labelEl = overlay.querySelector('#po-label');
  display.classList.add('running');

  let step = 0;
  const totalSteps = NEON_CFG.BASE_STEPS + Math.floor(Math.random() * NEON_CFG.RANDOM_EXTRA);
  let delay = NEON_CFG.INITIAL_DELAY_MS;

  function tick() {
    textEl.textContent = students[Math.floor(Math.random() * students.length)].name;
    step++;
    delay += step > totalSteps * NEON_CFG.SLOWDOWN_THRESHOLD
      ? NEON_CFG.SLOW_INCREMENT : NEON_CFG.FAST_INCREMENT;
    if (step < totalSteps) {
      _timer = setTimeout(tick, delay);
    } else {
      const winner = students[Math.floor(Math.random() * students.length)];
      textEl.textContent = winner.name;
      display.classList.remove('running');
      display.classList.add('winner-glow');
      labelEl.textContent = '🎉 Επελέγη:';
      _timer = setTimeout(() => _makeCloseable(overlay), NEON_CFG.WINNER_GLOW_DURATION_MS);
      onWinner(winner);
    }
  }
  tick();
}

// ── Candy Pop overlay ──────────────────────────────────────────────────────────

function _spinCandyOverlay(students, onWinner) {
  if (!students.length) return;

  // Fallback: if updatePickerDisplay hasn't been called yet, use available students
  const allStudents = _allStudents.length > 0 ? _allStudents : students;

  const overlay = _createOverlay();
  const wrap = document.createElement('div');
  wrap.className = 'picker-overlay-candy-wrap';

  const label = document.createElement('div');
  label.className = 'picker-overlay-label';
  label.textContent = 'Επιλέγω...';
  wrap.appendChild(label);

  const grid = document.createElement('div');
  grid.className = 'students-grid picker-overlay-cards';

  const dots = { 'in-pool': '🟢', called: '🟠', absent: '⚫' };
  allStudents.forEach(s => {
    const status = _absentIds.includes(s.id) ? 'absent'
                 : _calledIds.includes(s.id)  ? 'called' : 'in-pool';
    const card = document.createElement('div');
    card.className = `student-card ${status} picker-overlay-card`;
    card.dataset.id = s.id;
    card.innerHTML = `
      <span class="status-dot">${dots[status]}</span>
      <span class="name">${_esc(s.name)}</span>`;
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  const hint = document.createElement('div');
  hint.className = 'picker-overlay-hint';
  wrap.appendChild(hint);

  overlay.appendChild(wrap);
  document.body.appendChild(overlay);

  const availableCards = students
    .map(s => grid.querySelector(`.picker-overlay-card[data-id="${s.id}"]`))
    .filter(Boolean);

  let current = 0;
  let step    = 0;
  const totalSteps = CANDY_CFG.BASE_STEPS + Math.floor(Math.random() * CANDY_CFG.RANDOM_EXTRA);
  let delay = CANDY_CFG.INITIAL_DELAY_MS;

  function tick() {
    availableCards.forEach(c => c.classList.remove('picker-active'));
    current = (current + 1 + Math.floor(Math.random() * CANDY_CFG.RANDOM_JUMP))
              % availableCards.length;
    availableCards[current].classList.add('picker-active');

    step++;
    delay += step > totalSteps * CANDY_CFG.SLOWDOWN_THRESHOLD
      ? CANDY_CFG.SLOW_INCREMENT : CANDY_CFG.FAST_INCREMENT;

    if (step < totalSteps) {
      _timer = setTimeout(tick, delay);
    } else {
      const winnerId = availableCards[current].dataset.id;
      const winner   = students.find(s => s.id === winnerId);
      label.textContent = '🎉 Επελέγη:';
      availableCards[current].classList.add('picker-winner');
      _timer = setTimeout(() => _makeCloseable(overlay), 1200);
      onWinner(winner);
    }
  }
  tick();
}
