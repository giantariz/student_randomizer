import { appData, session, getCurrentClass, uuid, escHtml } from './state.js';
import { saveData, initSessionForClass, restoreOrInitSession, clearSessionStorage } from './data.js';
import { renderAll } from './render.js';
import { toast } from './toast.js';
import { showModal, confirmDialog } from './modal.js';
import { syncUpsertClass, syncDeleteClass, syncEnabled } from './syncFirestore.js';
import { saveCurrentSessionHistory } from './session.js';

export function initClassEvents() {
  document.getElementById('class-select').addEventListener('change', e => {
    switchClass(e.target.value);
  });

  document.getElementById('btn-new-class').addEventListener('click', () => {
    showModal(`
      <h3>Νέο Τμήμα</h3>
      <input type="text" class="input-text" id="new-class-name" placeholder="π.χ. Α1 - Δίκτυα" style="width:100%">
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
        <button class="btn btn-primary" data-action="confirm">Δημιουργία</button>
      </div>
    `, (modal, close) => {
      const inp = modal.querySelector('#new-class-name');
      inp.focus();
      const create = () => {
        const name = inp.value.trim();
        if (!name) { inp.focus(); return; }
        const cls = { id: uuid(), name, students: [] };
        appData.classes.push(cls);
        appData.currentClassId = cls.id;
        saveData();
        if (syncEnabled()) syncUpsertClass(cls);
        initSessionForClass(cls.id);
        close();
        renderAll();
        toast(`Τμήμα "${name}" δημιουργήθηκε!`, 'success');
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') create(); });
      modal.querySelector('[data-action=cancel]').onclick = close;
      modal.querySelector('[data-action=confirm]').onclick = create;
    });
  });

  document.getElementById('btn-rename-class').addEventListener('click', () => {
    const cls = getCurrentClass();
    if (!cls) { toast('Δεν υπάρχει τμήμα', 'error'); return; }
    showModal(`
      <h3>Μετονομασία Τμήματος</h3>
      <input type="text" class="input-text" id="rename-input" value="${escHtml(cls.name)}" style="width:100%">
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
        <button class="btn btn-primary" data-action="confirm">Αποθήκευση</button>
      </div>
    `, (modal, close) => {
      const inp = modal.querySelector('#rename-input');
      inp.focus(); inp.select();
      const save = () => {
        const name = inp.value.trim();
        if (!name) return;
        cls.name = name;
        saveData();
        if (syncEnabled()) syncUpsertClass(cls);
        close();
        renderAll();
        toast(`Μετονομάστηκε σε "${name}"`, 'success');
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
      modal.querySelector('[data-action=cancel]').onclick = close;
      modal.querySelector('[data-action=confirm]').onclick = save;
    });
  });

  document.getElementById('btn-delete-class').addEventListener('click', () => {
    const cls = getCurrentClass();
    if (!cls) return;
    confirmDialog(
      `Διαγραφή τμήματος "<strong>${escHtml(cls.name)}</strong>"; Δεν μπορεί να αναιρεθεί.`,
      () => {
        const deletedId = cls.id;
        appData.classes = appData.classes.filter(c => c.id !== cls.id);
        appData.currentClassId = appData.classes[0]?.id || null;
        saveData();
        if (syncEnabled()) syncDeleteClass(deletedId);
        clearSessionStorage();
        if (appData.currentClassId) restoreOrInitSession(appData.currentClassId);
        else {
          session.classId = null;
          session.pool    = [];
          session.called  = [];
          session.absent  = [];
          session.history = [];
        }
        renderAll();
        toast('Τμήμα διαγράφηκε', 'error');
      },
      'Διαγραφή'
    );
  });
}

function switchClass(classId) {
  saveCurrentSessionHistory();
  appData.currentClassId = classId;
  saveData();
  restoreOrInitSession(classId);
  renderAll();
}
