import { appData, session, getCurrentClass, isPickingInProgress, setPickingInProgress, simpleUniqueMode, fairMode } from './state.js';
import { saveData, saveSession, initSessionForClass } from './data.js';
import { renderAll } from './render.js';
import { toast } from './toast.js';
import { confirmDialog } from './modal.js';
import { initPicker, spinPicker } from './picker.js';
import { syncUpsertClass, syncEnabled, syncUpsertSessionHistory } from './syncFirestore.js';
import { uuid } from './state.js';

export function saveCurrentSessionHistory() {
  const cls = getCurrentClass();
  if (!cls || session.history.length === 0) return;

  const pickerType = localStorage.getItem('sr-picker-type') || 'neon';
  const endedAt    = Date.now();
  const durationSec = session.startedAt
    ? Math.round((endedAt - session.startedAt) / 1000)
    : null;

  const entry = {
    id:            uuid(),
    date:          new Date().toLocaleDateString('el-GR'),
    classId:       cls.id,
    className:     cls.name,
    calledStudents: session.history.map(h => {
      const s = cls.students.find(st => st.id === h.studentId);
      return s?.name || '—';
    }),
    calls: session.history.map(h => {
      const s = cls.students.find(st => st.id === h.studentId);
      return {
        studentId:   h.studentId,
        name:        s?.name || '—',
        pickedAt:    h.pickedAt || h.time,
        roundNumber: h.roundNumber || 1,
        wasUndo:     h.wasUndo || false,
      };
    }),
    absentStudents: session.absent.map(id => {
      const s = cls.students.find(st => st.id === id);
      return { studentId: id, name: s?.name || '—' };
    }),
    mode:        simpleUniqueMode ? 'unique' : 'repeat',
    pickerType,
    totalRounds: session.roundNumber || 1,
    startedAt:   session.startedAt || null,
    endedAt,
    durationSec,
  };

  appData.sessionHistory.unshift(entry);
  if (appData.sessionHistory.length > 100) appData.sessionHistory.length = 100;
  saveData();
  if (syncEnabled()) syncUpsertSessionHistory(entry);
}

export function initSessionEvents() {
  initPicker();
  document.getElementById('btn-pick').addEventListener('click', pickStudent);

  document.getElementById('btn-undo').addEventListener('click', () => {
    if (session.history.length === 0) return;
    const last = session.history.pop();
    session.called = session.called.filter(id => id !== last.studentId);
    if (!session.absent.includes(last.studentId)) session.pool.push(last.studentId);
    const cls = getCurrentClass();
    const s = cls?.students.find(st => st.id === last.studentId);
    if (s && s.totalCalls > 0) s.totalCalls--;
    if (s) s.lastCalledAt = null;
    saveData();
    if (syncEnabled()) syncUpsertClass(getCurrentClass());
    saveSession();
    renderAll();
    toast('Αναίρεση: ' + (s?.name || '—') + ' επέστρεψε στο pool', 'info');
  });

  document.getElementById('btn-reset-session').addEventListener('click', () => {
    confirmDialog(
      'Επαναφορά session; Όλοι/ες οι μαθητές/ριες επιστρέφουν στο pool και το ιστορικό χάνεται.',
      () => {
        saveCurrentSessionHistory();
        initSessionForClass(appData.currentClassId);
        renderAll();
        toast('Session επαναφέρθηκε', 'info');
      },
      'Επαναφορά',
      false
    );
  });

  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });
}

function weightedRandom(students) {
  const weights = students.map(s => 1 / ((s.callsThisWeek || 0) + 1));
  const total   = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < students.length; i++) {
    r -= weights[i];
    if (r <= 0) return students[i];
  }
  return students[students.length - 1];
}

function pickStudent() {
  if (isPickingInProgress) return;
  const cls = getCurrentClass();
  if (!cls) return;

  let available;
  if (!simpleUniqueMode) {
    available = cls.students.filter(s => !session.absent.includes(s.id));
    if (available.length === 0) { toast('Δεν υπάρχουν διαθέσιμοι/ες μαθητές/ριες', 'error'); return; }
  } else {
    const availableIds = session.pool.filter(id => !session.absent.includes(id));
    if (availableIds.length === 0) {
      const nonAbsent = cls.students.filter(s => !session.absent.includes(s.id));
      if (nonAbsent.length === 0) { toast('Δεν υπάρχουν διαθέσιμοι/ες μαθητές/ριες', 'error'); return; }
      session.roundNumber = (session.roundNumber || 1) + 1;
      session.pool = nonAbsent.map(s => s.id);
      saveSession();
      _showRoundCompleteModal(nonAbsent);
      renderAll();
      return;
    }
    available = availableIds.map(id => cls.students.find(s => s.id === id)).filter(Boolean);
  }

  setPickingInProgress(true);
  document.getElementById('btn-pick').disabled = true;

  const preSelectedWinner = fairMode ? weightedRandom(available) : null;

  spinPicker(available, (winner) => {
    const winnerId = winner.id;
    const student  = cls.students.find(s => s.id === winnerId);
    if (!student) return;

    if (simpleUniqueMode) {
      session.pool = session.pool.filter(id => id !== winnerId);
      if (!session.called.includes(winnerId)) session.called.push(winnerId);
    }
    const now     = Date.now();
    const timeStr = new Date(now).toLocaleTimeString('el-GR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    session.history.push({
      studentId:   winnerId,
      time:        timeStr,
      pickedAt:    now,
      roundNumber: session.roundNumber || 1,
    });
    student.totalCalls++;
    student.lastCalledAt = now;
    _updateWeeklyCalls(student, now);
    saveData();
    if (syncEnabled()) syncUpsertClass(cls);
    saveSession();
    setPickingInProgress(false);
    renderAll();
    const chosenCard = document.querySelector(`.student-card[data-id="${winnerId}"]`);
    if (chosenCard) {
      chosenCard.classList.add('just-selected');
      setTimeout(() => chosenCard.classList.remove('just-selected'), 2500);
    }
  }, preSelectedWinner);
}

function _updateWeeklyCalls(student, now) {
  const oneWeek  = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;
  student.callsThisWeek  = (student.callsThisWeek  || 0) + 1;
  student.callsThisMonth = (student.callsThisMonth || 0) + 1;
  // Decay old week/month counts if lastCalledAt was long ago
  if (student._weekResetAt && now - student._weekResetAt > oneWeek) {
    student.callsThisWeek = 1;
    student._weekResetAt  = now;
  } else if (!student._weekResetAt) {
    student._weekResetAt = now;
  }
  if (student._monthResetAt && now - student._monthResetAt > oneMonth) {
    student.callsThisMonth = 1;
    student._monthResetAt  = now;
  } else if (!student._monthResetAt) {
    student._monthResetAt = now;
  }
}

function _showRoundCompleteModal(nonAbsent) {
  const roundJustFinished = (session.roundNumber || 1) - 1;
  import('./modal.js').then(({ showModal }) => {
    showModal(`
      <h3>🏁 Γύρος ${roundJustFinished} ολοκληρώθηκε!</h3>
      <p>Όλοι/ες οι παρόντες/παρούσες μαθητές/ριες κλήθηκαν. Ξεκινά ο Γύρος ${session.roundNumber}.</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="later">Αργότερα</button>
        <button class="btn btn-primary" data-action="pick-now">🎲 Επιλογή τώρα</button>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-action=later]').onclick = () => {
        close();
        toast(`🔄 Γύρος ${session.roundNumber} ξεκίνησε!`, 'info');
      };
      modal.querySelector('[data-action=pick-now]').onclick = () => {
        close();
        pickStudent();
      };
    });
  });
}
