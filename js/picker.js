// ── Picker state ──────────────────────────────────────────────────────────────

let _type  = localStorage.getItem('sr-picker-type') || 'neon'; // 'neon' | 'candy'
let _timer = null;

const NEON_CFG = {
  BASE_STEPS: 26,
  RANDOM_EXTRA: 16,
  INITIAL_DELAY_MS: 52,
  SLOWDOWN_THRESHOLD: 0.65,
  FAST_INCREMENT: 4,
  SLOW_INCREMENT: 20,
  WINNER_GLOW_DURATION_MS: 1200,
};

const CANDY_CFG = {
  BASE_STEPS: 32,
  RANDOM_EXTRA: 20,
  INITIAL_DELAY_MS: 48,
  RANDOM_JUMP: 3,
  SLOWDOWN_THRESHOLD: 0.68,
  FAST_INCREMENT: 3,
  SLOW_INCREMENT: 16,
};

// ── Init ──────────────────────────────────────────────────────────────────────

export function initPicker() {
  const radios = document.querySelectorAll('[name="picker-type"]');
  radios.forEach(r => {
    if (r.value === _type) r.checked = true;
    r.addEventListener('change', () => {
      _type = r.value;
      localStorage.setItem('sr-picker-type', _type);
      _renderPickerBody([]);
    });
  });
  _renderPickerBody([]);
}

// ── Display update (called on every renderAll) ────────────────────────────────

export function updatePickerDisplay(allStudents, calledIds, absentIds) {
  if (_type === 'candy') {
    _renderCandyChips(allStudents, calledIds, absentIds);
  }
  // Neon: display is static between spins — nothing to update
}

// ── Spin ──────────────────────────────────────────────────────────────────────

// availableStudents: array of { id, name } eligible for selection
// onWinner(student): called with the winning student object
export function spinPicker(availableStudents, onWinner) {
  clearTimeout(_timer);
  if (_type === 'neon') {
    _spinNeon(availableStudents, onWinner);
  } else {
    _spinCandy(availableStudents, onWinner);
  }
}

// ── Internal: render ─────────────────────────────────────────────────────────

function _renderPickerBody(allStudents) {
  const container = document.getElementById('picker-display');
  if (!container) return;
  if (_type === 'neon') {
    container.innerHTML = `
      <div class="neon-display" id="neon-display">
        <span class="neon-text" id="neon-text">—</span>
      </div>`;
  } else {
    container.innerHTML = `<div class="candy-grid" id="candy-grid"></div>`;
    _renderCandyChips(allStudents, [], []);
  }
}

function _renderCandyChips(allStudents, calledIds, absentIds) {
  const grid = document.getElementById('candy-grid');
  if (!grid) return;
  grid.innerHTML = '';
  allStudents.forEach(s => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.id = s.id;
    if (absentIds.includes(s.id)) chip.classList.add('absent');
    else if (calledIds.includes(s.id)) chip.classList.add('called');
    chip.textContent = s.name;
    grid.appendChild(chip);
  });
}

// ── Internal: Neon Pulse ──────────────────────────────────────────────────────

function _spinNeon(students, onWinner) {
  const display = document.getElementById('neon-display');
  const text    = document.getElementById('neon-text');

  if (!display || !text || students.length === 0) {
    if (students.length > 0) onWinner(students[Math.floor(Math.random() * students.length)]);
    return;
  }

  display.classList.add('running');
  display.classList.remove('winner-glow');

  let step = 0;
  const totalSteps = NEON_CFG.BASE_STEPS + Math.floor(Math.random() * NEON_CFG.RANDOM_EXTRA);
  let delay = NEON_CFG.INITIAL_DELAY_MS;

  function tick() {
    text.textContent = students[Math.floor(Math.random() * students.length)].name;
    step++;
    delay += step > totalSteps * NEON_CFG.SLOWDOWN_THRESHOLD
      ? NEON_CFG.SLOW_INCREMENT
      : NEON_CFG.FAST_INCREMENT;

    if (step < totalSteps) {
      _timer = setTimeout(tick, delay);
    } else {
      const winner = students[Math.floor(Math.random() * students.length)];
      text.textContent = winner.name;
      display.classList.remove('running');
      display.classList.add('winner-glow');
      _timer = setTimeout(
        () => display.classList.remove('winner-glow'),
        NEON_CFG.WINNER_GLOW_DURATION_MS
      );
      onWinner(winner);
    }
  }
  tick();
}

// ── Internal: Candy Pop ───────────────────────────────────────────────────────

function _spinCandy(students, onWinner) {
  const availableChips = students
    .map(s => document.querySelector(`#candy-grid .chip[data-id="${s.id}"]`))
    .filter(Boolean);

  if (availableChips.length === 0 || students.length === 0) {
    if (students.length > 0) onWinner(students[Math.floor(Math.random() * students.length)]);
    return;
  }

  // Clear any previous active state
  document.querySelectorAll('#candy-grid .chip').forEach(c => c.classList.remove('active'));

  let current = 0;
  let step    = 0;
  const totalSteps = CANDY_CFG.BASE_STEPS + Math.floor(Math.random() * CANDY_CFG.RANDOM_EXTRA);
  let delay = CANDY_CFG.INITIAL_DELAY_MS;

  function tick() {
    availableChips.forEach(c => c.classList.remove('active'));
    current = (current + 1 + Math.floor(Math.random() * CANDY_CFG.RANDOM_JUMP))
              % availableChips.length;
    availableChips[current].classList.add('active');

    step++;
    delay += step > totalSteps * CANDY_CFG.SLOWDOWN_THRESHOLD
      ? CANDY_CFG.SLOW_INCREMENT
      : CANDY_CFG.FAST_INCREMENT;

    if (step < totalSteps) {
      _timer = setTimeout(tick, delay);
    } else {
      const winnerId = availableChips[current].dataset.id;
      const winner   = students.find(s => s.id === winnerId);
      onWinner(winner);
    }
  }
  tick();
}
