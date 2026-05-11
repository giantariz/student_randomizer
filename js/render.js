import { appData, session, getCurrentClass, escHtml, simpleUniqueMode } from './state.js';
import { updatePickerDisplay } from './picker.js';

// Registered by main.js to break circular dependency with students.js
let _toggleAbsent = () => {};
let _deleteStudent = () => {};

export function registerStudentHandlers(toggleAbsent, deleteStudent) {
  _toggleAbsent = toggleAbsent;
  _deleteStudent = deleteStudent;
}

export function renderAll() {
  renderClassSelect();
  renderStudentsGrid();
  renderStatsBadge();
  renderHistoryList();
  renderActionButtons();
  const cls = getCurrentClass();
  updatePickerDisplay(cls?.students || [], session.called, session.absent);
}

export function renderClassSelect() {
  const sel = document.getElementById('class-select');
  sel.innerHTML = '';
  if (appData.classes.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = '— Χωρίς τμήμα —';
    sel.appendChild(opt);
    return;
  }
  appData.classes.forEach(cls => {
    const opt = document.createElement('option');
    opt.value = cls.id;
    opt.textContent = cls.name;
    if (cls.id === appData.currentClassId) opt.selected = true;
    sel.appendChild(opt);
  });
}

export function renderStudentsGrid() {
  const grid = document.getElementById('students-grid');
  const cls = getCurrentClass();
  if (!cls || cls.students.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">👥</div>
        <p>Δεν υπάρχουν μαθητές/ριες. Πρόσθεσε τον/την πρώτο/η!</p>
      </div>`;
    return;
  }
  grid.innerHTML = '';
  const avgWeekCalls = _avgWeekCalls(cls.students);
  cls.students.forEach(s => {
    const status = getStudentStatus(s.id);
    const dots = { 'in-pool': '🟢', 'called': '🟠', 'absent': '⚫' };
    const fairDot = _fairnessDot(s, avgWeekCalls);
    const card = document.createElement('div');
    card.className = `student-card ${status}`;
    card.dataset.id = s.id;
    card.innerHTML = `
      <span class="status-dot">${dots[status]}</span>
      <span class="name">${escHtml(s.name)}</span>
      <span class="calls-badge" title="Σύνολο κλήσεων: ${s.totalCalls}&#10;Αυτή την εβδομάδα: ${s.callsThisWeek || 0}&#10;Αυτόν τον μήνα: ${s.callsThisMonth || 0}">×${s.totalCalls} ${fairDot}</span>
      <button class="delete-btn expert-only" data-delete="${s.id}" title="Διαγραφή">✕</button>
    `;
    card.addEventListener('click', e => {
      if (e.target.dataset.delete) return;
      _toggleAbsent(s.id);
    });
    card.querySelector('.delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      _deleteStudent(s.id);
    });
    grid.appendChild(card);
  });
}

export function renderStatsBadge() {
  const cls = getCurrentClass();
  if (!cls) {
    document.getElementById('stats-badge').textContent = '0 / 0 επιλέχθηκαν';
    return;
  }
  const called = session.called.length;
  const round  = session.roundNumber || 1;
  const roundLabel = simpleUniqueMode && round > 1 ? ` · Γύρος ${round}` : '';
  document.getElementById('stats-badge').textContent = `${called} / ${cls.students.length} επιλέχθηκαν${roundLabel}`;
}

export function renderHistoryList() {
  const cls = getCurrentClass();
  const emptyMsg = '<li style="color:var(--text2);font-size:14px;">Κανένας/καμία μαθητής/ρια δεν έχει κληθεί ακόμα.</li>';

  // Expert mode history (reverse order)
  const ul = document.getElementById('history-list');
  if (session.history.length === 0) {
    ul.innerHTML = emptyMsg;
  } else {
    ul.innerHTML = session.history.slice().reverse().map(h => {
      const s = cls?.students.find(st => st.id === h.studentId);
      return `<li>
        <span>${escHtml(s?.name || '—')}</span>
        <span class="history-time">${h.time}</span>
      </li>`;
    }).join('');
  }

  // Simple mode history (chronological order with rank)
  const sul = document.getElementById('simple-history-list');
  if (!sul) return;
  if (session.history.length === 0) {
    sul.innerHTML = emptyMsg;
  } else {
    sul.innerHTML = session.history.map((h, i) => {
      const s = cls?.students.find(st => st.id === h.studentId);
      return `<li>
        <span><span class="history-rank">${i + 1}.</span> ${escHtml(s?.name || '—')}</span>
        <span class="history-time">${h.time}</span>
      </li>`;
    }).join('');
  }
}

export function renderActionButtons() {
  const cls = getCurrentClass();
  const hasStudents = cls && cls.students.length > 0;
  const availablePool = session.pool.filter(id => !session.absent.includes(id));
  document.getElementById('btn-pick').disabled    = !hasStudents || availablePool.length === 0;
  document.getElementById('btn-groups').disabled  = !hasStudents;
  document.getElementById('btn-undo').disabled    = session.history.length === 0;
}

function getStudentStatus(studentId) {
  if (session.absent.includes(studentId)) return 'absent';
  if (session.called.includes(studentId))  return 'called';
  return 'in-pool';
}

function _avgWeekCalls(students) {
  if (!students.length) return 0;
  const total = students.reduce((sum, s) => sum + (s.callsThisWeek || 0), 0);
  return total / students.length;
}

function _fairnessDot(student, avg) {
  const w = student.callsThisWeek || 0;
  if (avg === 0) return '';
  if (w < avg * 0.7) return '🟢';
  if (w > avg * 1.3) return '🔴';
  return '🟠';
}
