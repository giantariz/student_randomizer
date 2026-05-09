import { appData, session, getCurrentClass, isPickingInProgress, setPickingInProgress, simpleUniqueMode } from './state.js';
import { saveData, saveSession, initSessionForClass } from './data.js';
import { renderAll } from './render.js';
import { toast } from './toast.js';
import { confirmDialog } from './modal.js';
import { startFlickerReveal } from './animation.js';
import { syncUpsertClass, syncEnabled } from './syncFirestore.js';

export function initSessionEvents() {
  document.getElementById('btn-pick').addEventListener('click', pickStudent);

  document.getElementById('btn-undo').addEventListener('click', () => {
    if (session.history.length === 0) return;
    const last = session.history.pop();
    session.called = session.called.filter(id => id !== last.studentId);
    if (!session.absent.includes(last.studentId)) session.pool.push(last.studentId);
    const cls = getCurrentClass();
    const s = cls?.students.find(st => st.id === last.studentId);
    if (s && s.totalCalls > 0) s.totalCalls--;
    saveData();
    if (syncEnabled()) syncUpsertClass(getCurrentClass());
    saveSession();
    renderAll();
    toast('Αναίρεση: ' + (s?.name || '—') + ' επέστρεψε στο pool', 'info');
  });

  document.getElementById('btn-reset-session').addEventListener('click', () => {
    confirmDialog(
      'Επαναφορά session; Όλοι οι μαθητές επιστρέφουν στο pool και το ιστορικό χάνεται.',
      () => {
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

function pickStudent() {
  if (isPickingInProgress) return;
  const cls = getCurrentClass();

  let chosen;
  if (!simpleUniqueMode) {
    // Repeat mode: pick from all non-absent students freely
    const nonAbsent = cls.students.filter(s => !session.absent.includes(s.id));
    if (nonAbsent.length === 0) { toast('Δεν υπάρχουν διαθέσιμοι μαθητές', 'error'); return; }
    chosen = nonAbsent[Math.floor(Math.random() * nonAbsent.length)].id;
  } else {
    // Unique mode: pick from pool only
    const available = session.pool.filter(id => !session.absent.includes(id));
    if (available.length === 0) {
      const nonAbsent = cls.students.filter(s => !session.absent.includes(s.id));
      if (nonAbsent.length === 0) { toast('Δεν υπάρχουν διαθέσιμοι μαθητές', 'error'); return; }
      session.pool = nonAbsent.map(s => s.id);
      saveSession();
      toast('🔄 Νέος γύρος! Όλοι οι μαθητές επέστρεψαν.', 'info');
      renderAll();
      return;
    }
    chosen = available[Math.floor(Math.random() * available.length)];
  }

  const student = cls.students.find(s => s.id === chosen);
  if (!student) return;

  setPickingInProgress(true);
  document.getElementById('btn-pick').disabled = true;

  startFlickerReveal(
    cls.students.filter(s => !session.absent.includes(s.id)),
    student,
    () => {
      if (simpleUniqueMode) {
        session.pool = session.pool.filter(id => id !== chosen);
        if (!session.called.includes(chosen)) session.called.push(chosen);
      }
      const timeStr = new Date().toLocaleTimeString('el-GR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      session.history.push({ studentId: chosen, time: timeStr });
      student.totalCalls++;
      saveData();
      if (syncEnabled()) syncUpsertClass(cls);
      saveSession();
      setPickingInProgress(false);
      renderAll();
      // Flash the chosen student's card green
      const chosenCard = document.querySelector(`.student-card[data-id="${chosen}"]`);
      if (chosenCard) {
        chosenCard.classList.add('just-selected');
        setTimeout(() => chosenCard.classList.remove('just-selected'), 2500);
      }
    }
  );
}
