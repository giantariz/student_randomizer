// ── State ──────────────────────────────────────────────────────────────────────

const _storedType = localStorage.getItem('sr-picker-type');
let _type        = _storedType === 'candy' ? 'kino' : (_storedType || 'neon');
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
  // Λιγότερες ορατές εναλλαγές, με ίδιο συνολικό παράθυρο διάρκειας όπως πριν (~3.3-7s).
  BASE_STEPS: 18, RANDOM_EXTRA: 10,
  DURATION_MIN_MS: 3320, DURATION_MAX_MS: 7040, SLOWDOWN_POWER: 1.7,
  WINNER_GLOW_DURATION_MS: 1200,
};

const KINO_CFG = {
  // Λιγότερες ορατές εναλλαγές, με ίδιο συνολικό παράθυρο διάρκειας όπως πριν (~3.7-8s).
  BASE_STEPS: 22, RANDOM_EXTRA: 12,
  DURATION_MIN_MS: 3691, DURATION_MAX_MS: 7993, SLOWDOWN_POWER: 1.55,
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
// forcedWinner: optional pre-selected winner (for fair mode weighted pick)
export function spinPicker(availableStudents, onWinner, forcedWinner = null) {
  clearTimeout(_timer);
  if (_type === 'neon') {
    _spinNeonOverlay(availableStudents, onWinner, forcedWinner);
  } else {
    _spinKinoOverlay(availableStudents, onWinner, forcedWinner);
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
      <div class="picker-thumb picker-thumb-kino">
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

function _randomDuration({ DURATION_MIN_MS, DURATION_MAX_MS }) {
  return DURATION_MIN_MS + Math.random() * (DURATION_MAX_MS - DURATION_MIN_MS);
}

function _buildStepDelays(totalSteps, totalDuration, slowdownPower) {
  const transitions = Math.max(totalSteps - 1, 1);
  const weights = Array.from({ length: transitions }, (_, i) => {
    const progress = (i + 1) / transitions;
    return 0.65 + Math.pow(progress, slowdownPower) * 1.35;
  });
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  return weights.map(weight => totalDuration * weight / weightSum);
}

function _shuffleIndexes(count) {
  const indexes = Array.from({ length: count }, (_, i) => i);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes;
}

function _buildRandomKinoPath(cardCount, totalSteps) {
  if (cardCount <= 1) return Array.from({ length: totalSteps }, () => 0);

  const path = [];
  let remaining = [];
  let previous = -1;

  while (path.length < totalSteps) {
    if (!remaining.length) remaining = _shuffleIndexes(cardCount);

    if (remaining[0] === previous) {
      if (remaining.length > 1) {
        [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
      } else {
        remaining = _shuffleIndexes(cardCount).filter(index => index !== previous);
      }
    }

    const next = remaining.shift();
    path.push(next);
    previous = next;
  }

  return path;
}

function _fitKinoCardNames(grid) {
  const names = Array.from(grid.querySelectorAll('.picker-overlay-card .name'));
  names.forEach(nameEl => {
    nameEl.style.fontSize = '';

    let size = parseFloat(getComputedStyle(nameEl).fontSize);
    const minSize = 14;

    while (_kinoNameOverflows(nameEl) && size > minSize) {
      size -= 1;
      nameEl.style.fontSize = `${size}px`;
    }
  });
}

function _kinoNameOverflows(nameEl) {
  const style = getComputedStyle(nameEl);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.15;
  const maxTwoLineHeight = Math.ceil(lineHeight * 2);

  return nameEl.scrollWidth > nameEl.clientWidth
      || nameEl.scrollHeight > maxTwoLineHeight;
}

// ── Neon Pulse overlay ─────────────────────────────────────────────────────────

function _spinNeonOverlay(students, onWinner, forcedWinner) {
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
  const stepDelays = _buildStepDelays(
    totalSteps,
    _randomDuration(NEON_CFG),
    NEON_CFG.SLOWDOWN_POWER
  );

  function tick() {
    textEl.textContent = students[Math.floor(Math.random() * students.length)].name;
    step++;
    if (step < totalSteps) {
      _timer = setTimeout(tick, stepDelays[step - 1]);
    } else {
      const winner = forcedWinner || students[Math.floor(Math.random() * students.length)];
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

// ── Kino overlay ──────────────────────────────────────────────────────────

function _spinKinoOverlay(students, onWinner, forcedWinner) {
  if (!students.length) return;

  // Fallback: if updatePickerDisplay hasn't been called yet, use available students
  const allStudents = _allStudents.length > 0 ? _allStudents : students;

  const overlay = _createOverlay();
  const wrap = document.createElement('div');
  wrap.className = 'picker-overlay-kino-wrap';

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
  _fitKinoCardNames(grid);

  const availableCards = students
    .map(s => grid.querySelector(`.picker-overlay-card[data-id="${s.id}"]`))
    .filter(Boolean);

  let current = 0;
  let step    = 0;
  const totalSteps = KINO_CFG.BASE_STEPS + Math.floor(Math.random() * KINO_CFG.RANDOM_EXTRA);
  const stepDelays = _buildStepDelays(
    totalSteps,
    _randomDuration(KINO_CFG),
    KINO_CFG.SLOWDOWN_POWER
  );
  const randomPath = _buildRandomKinoPath(availableCards.length, totalSteps);

  function tick() {
    availableCards.forEach(c => c.classList.remove('picker-active'));
    current = randomPath[step];
    availableCards[current].classList.add('picker-active');

    step++;
    if (step < totalSteps) {
      _timer = setTimeout(tick, stepDelays[step - 1]);
    } else {
      let winner;
      if (forcedWinner) {
        winner = forcedWinner;
        availableCards.forEach(c => c.classList.remove('picker-active'));
        const forcedCard = availableCards.find(c => c.dataset.id === forcedWinner.id);
        if (forcedCard) forcedCard.classList.add('picker-active', 'picker-winner');
        else availableCards[current].classList.add('picker-winner');
      } else {
        const winnerId = availableCards[current].dataset.id;
        winner         = students.find(s => s.id === winnerId);
        availableCards[current].classList.add('picker-winner');
      }
      label.textContent = '🎉 Επελέγη:';
      _timer = setTimeout(() => _makeCloseable(overlay), 1200);
      onWinner(winner);
    }
  }
  tick();
}
