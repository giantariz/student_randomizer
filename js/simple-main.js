import { initTheme } from './theme.js';
import { toast } from './toast.js';
import { confirmDialog } from './modal.js';
import { initPicker, spinPicker, updatePickerDisplay } from './picker.js';

// ── State (in-memory only, never persisted) ───────────────────────────────────

let students = [];
let pool     = [];
let called   = [];
let absent   = [];
let history  = [];
let uniqueMode = true;
let picking    = false;

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now();
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Session creation ──────────────────────────────────────────────────────────

function createSession(n) {
  students = Array.from({ length: n }, (_, i) => ({
    id: uuid(),
    name: `Μαθητής/ρια ${i + 1}`
  }));
  pool    = students.map(s => s.id);
  called  = [];
  absent  = [];
  history = [];
  picking = false;
  document.body.setAttribute('data-simple-state', 'active');
  renderAll();
}

// ── Pick student ──────────────────────────────────────────────────────────────

function pick() {
  if (picking) return;

  let available;
  if (!uniqueMode) {
    available = students.filter(s => !absent.includes(s.id));
    if (available.length === 0) { toast('Δεν υπάρχουν διαθέσιμοι/ες μαθητές/ριες', 'error'); return; }
  } else {
    const availableIds = pool.filter(id => !absent.includes(id));
    if (availableIds.length === 0) {
      const nonAbsent = students.filter(s => !absent.includes(s.id));
      if (nonAbsent.length === 0) { toast('Δεν υπάρχουν διαθέσιμοι/ες μαθητές/ριες', 'error'); return; }
      pool = nonAbsent.map(s => s.id);
      toast('🔄 Νέος γύρος! Όλοι/ες οι μαθητές/ριες επέστρεψαν.', 'info');
      renderAll();
      return;
    }
    available = availableIds.map(id => students.find(s => s.id === id));
  }

  picking = true;
  document.getElementById('btn-pick').disabled = true;

  spinPicker(available, (winner) => {
    const winnerId = winner.id;
    if (uniqueMode) {
      pool = pool.filter(id => id !== winnerId);
      if (!called.includes(winnerId)) called.push(winnerId);
    }
    const timeStr = new Date().toLocaleTimeString('el-GR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    history.push({ studentId: winnerId, name: winner.name, time: timeStr });
    picking = false;
    renderAll();
    const chosenCard = document.querySelector(`.student-card[data-id="${winnerId}"]`);
    if (chosenCard) {
      chosenCard.classList.add('just-selected');
      setTimeout(() => chosenCard.classList.remove('just-selected'), 2500);
    }
  });
}

// ── Undo ──────────────────────────────────────────────────────────────────────

function undo() {
  if (history.length === 0) return;
  const last = history.pop();
  called = called.filter(id => id !== last.studentId);
  if (!absent.includes(last.studentId)) pool.push(last.studentId);
  renderAll();
  toast('Αναίρεση: ' + last.name + ' επέστρεψε στο pool', 'info');
}

// ── Reset ─────────────────────────────────────────────────────────────────────

function resetSession() {
  confirmDialog(
    'Επαναφορά session; Όλοι/ες οι μαθητές/ριες επιστρέφουν στο pool και το ιστορικό χάνεται.',
    () => {
      pool    = students.map(s => s.id);
      called  = [];
      absent  = [];
      history = [];
      renderAll();
      toast('Session επαναφέρθηκε', 'info');
    },
    'Επαναφορά',
    false
  );
}

// ── Toggle absent ─────────────────────────────────────────────────────────────

function toggleAbsent(id) {
  if (absent.includes(id)) {
    absent = absent.filter(x => x !== id);
    if (!called.includes(id)) pool.push(id);
  } else {
    absent.push(id);
    pool = pool.filter(x => x !== id);
  }
  renderAll();
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderAll() {
  renderGrid();
  renderHistory();
  renderStats();
  renderButtons();
  updatePickerDisplay(students, called, absent);
}

function renderGrid() {
  const grid = document.getElementById('students-grid');
  grid.innerHTML = '';
  students.forEach(s => {
    const status = absent.includes(s.id) ? 'absent' : called.includes(s.id) ? 'called' : 'in-pool';
    const dots = { 'in-pool': '🟢', 'called': '🟠', 'absent': '⚫' };
    const card = document.createElement('div');
    card.className = `student-card ${status}`;
    card.dataset.id = s.id;
    card.innerHTML = `
      <span class="status-dot">${dots[status]}</span>
      <span class="name">${escHtml(s.name)}</span>
    `;
    card.addEventListener('click', () => toggleAbsent(s.id));
    grid.appendChild(card);
  });
}

function renderHistory() {
  const ul = document.getElementById('simple-history-list');
  const emptyMsg = '<li style="color:var(--text2);font-size:14px;">Κανένας/καμία μαθητής/ρια δεν έχει κληθεί ακόμα.</li>';
  if (history.length === 0) {
    ul.innerHTML = emptyMsg;
  } else {
    ul.innerHTML = history.map((h, i) => `
      <li>
        <span><span class="history-rank">${i + 1}.</span> ${escHtml(h.name)}</span>
        <span class="history-time">${h.time}</span>
      </li>
    `).join('');
  }
}

function renderStats() {
  document.getElementById('stats-badge').textContent =
    `${called.length} / ${students.length} επιλέχθηκαν`;
}

function renderButtons() {
  const available = uniqueMode
    ? pool.filter(id => !absent.includes(id)).length
    : students.filter(s => !absent.includes(s.id)).length;
  document.getElementById('btn-pick').disabled  = students.length === 0 || available === 0 || picking;
  document.getElementById('btn-undo').disabled  = history.length === 0;
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  initTheme();
  initPicker();

  // Setup phase
  document.getElementById('btn-simple-start').addEventListener('click', () => {
    const n = parseInt(document.getElementById('simple-count').value);
    if (!n || n < 1 || n > 200) { toast('Δώσε αριθμό από 1 έως 200', 'error'); return; }
    createSession(n);
  });
  document.getElementById('btn-count-plus').addEventListener('click', () => {
    const inp = document.getElementById('simple-count');
    inp.value = Math.min(200, (parseInt(inp.value) || 20) + 1);
  });
  document.getElementById('btn-count-minus').addEventListener('click', () => {
    const inp = document.getElementById('simple-count');
    inp.value = Math.max(1, (parseInt(inp.value) || 20) - 1);
  });
  document.getElementById('simple-count').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-simple-start').click();
  });

  // Active phase
  document.getElementById('btn-change-count').addEventListener('click', () => {
    document.body.setAttribute('data-simple-state', 'setup');
  });
  document.getElementById('btn-pick').addEventListener('click', pick);
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-reset-session').addEventListener('click', resetSession);

  // Unique mode toggle
  const chk    = document.getElementById('chk-unique');
  const notice = document.getElementById('repeat-notice');
  chk.addEventListener('change', () => {
    uniqueMode   = chk.checked;
    notice.hidden = chk.checked;
  });
}

init();
