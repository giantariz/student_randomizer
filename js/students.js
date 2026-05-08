import { appData, session, getCurrentClass, uuid } from './state.js';
import { saveData, saveSession, initSessionForClass } from './data.js';
import { renderAll } from './render.js';
import { toast } from './toast.js';
import { showModal } from './modal.js';

export function addStudent(cls, name) {
  const s = { id: uuid(), name, totalCalls: 0 };
  cls.students.push(s);
  session.pool.push(s.id);
  saveData();
  saveSession();
  renderAll();
}

export function deleteStudent(studentId) {
  const cls = getCurrentClass();
  if (!cls) return;
  cls.students = cls.students.filter(s => s.id !== studentId);
  session.pool    = session.pool.filter(id => id !== studentId);
  session.called  = session.called.filter(id => id !== studentId);
  session.absent  = session.absent.filter(id => id !== studentId);
  session.history = session.history.filter(h => h.studentId !== studentId);
  saveData();
  saveSession();
  renderAll();
}

export function toggleAbsent(studentId) {
  if (session.absent.includes(studentId)) {
    session.absent = session.absent.filter(id => id !== studentId);
    if (!session.called.includes(studentId)) session.pool.push(studentId);
    toast('Επέστρεψε στο pool', 'info');
  } else {
    session.absent.push(studentId);
    session.pool = session.pool.filter(id => id !== studentId);
    toast('Μαρκαρίστηκε ως απών', 'info');
  }
  saveSession();
  renderAll();
}

export function createQuickClass(n, saveName) {
  const students = Array.from({ length: n }, (_, i) => ({
    id: uuid(),
    name: `Μαθητής ${i + 1}`,
    totalCalls: 0
  }));

  // Remove any previous temp class
  appData.classes = appData.classes.filter(c => !c._temp);

  if (saveName) {
    const cls = { id: uuid(), name: saveName, students };
    appData.classes.push(cls);
    appData.currentClassId = cls.id;
    saveData();
    initSessionForClass(cls.id);
    renderAll();
    toast(`"${saveName}" με ${n} μαθητές δημιουργήθηκε!`, 'success');
  } else {
    const tempId = 'temp_' + uuid();
    const cls = { id: tempId, name: `Προσωρινό (${n} μαθητές)`, students, _temp: true };
    appData.classes.push(cls);
    appData.currentClassId = tempId;
    session.classId = tempId;
    session.pool    = students.map(s => s.id);
    session.called  = [];
    session.absent  = [];
    session.history = [];
    renderAll();
  }
}

export function initStudentEvents() {
  document.getElementById('btn-add-student').addEventListener('click', addStudentFromInput);
  document.getElementById('new-student-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addStudentFromInput();
  });

  document.getElementById('btn-paste-list').addEventListener('click', () => {
    const cls = getCurrentClass();
    if (!cls) { toast('Δημιούργησε πρώτα ένα τμήμα', 'error'); return; }
    showModal(`
      <h3>Εισαγωγή Λίστας Μαθητών</h3>
      <p>Ένα όνομα ανά γραμμή:</p>
      <textarea id="paste-area" placeholder="Παπαδόπουλος Νίκος&#10;Γεωργίου Μαρία&#10;..."></textarea>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
        <button class="btn btn-primary" data-action="confirm">Εισαγωγή</button>
      </div>
    `, (modal, close) => {
      modal.querySelector('#paste-area').focus();
      modal.querySelector('[data-action=cancel]').onclick = close;
      modal.querySelector('[data-action=confirm]').onclick = () => {
        const names = modal.querySelector('#paste-area').value
          .split('\n').map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) { toast('Δεν βρέθηκαν ονόματα', 'error'); return; }
        close();
        if (cls.students.length > 0) {
          showModal(`
            <h3>Υπάρχουν ήδη μαθητές</h3>
            <p>Τι να κάνω με τους <strong>${cls.students.length}</strong> υπάρχοντες μαθητές;</p>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
              <button class="btn btn-secondary" data-action="merge">Merge (προσθήκη)</button>
              <button class="btn btn-danger" data-action="replace">Replace (αντικατάσταση)</button>
            </div>
          `, (modal2, close2) => {
            modal2.querySelector('[data-action=cancel]').onclick = close2;
            modal2.querySelector('[data-action=merge]').onclick = () => {
              close2();
              names.forEach(n => addStudent(cls, n));
              toast(`${names.length} μαθητές προστέθηκαν`, 'success');
            };
            modal2.querySelector('[data-action=replace]').onclick = () => {
              close2();
              cls.students = [];
              initSessionForClass(cls.id);
              saveData();
              names.forEach(n => addStudent(cls, n));
              toast(`Λίστα αντικαταστάθηκε με ${names.length} μαθητές`, 'success');
            };
          });
        } else {
          names.forEach(n => addStudent(cls, n));
          toast(`${names.length} μαθητές προστέθηκαν`, 'success');
        }
      };
    });
  });

  document.getElementById('btn-quick-mode').addEventListener('click', () => {
    showModal(`
      <h3>⚡ Γρήγορη Δημιουργία</h3>
      <p>Ο καθηγητής μοιράζει αριθμούς στους μαθητές. Το σύστημα επιλέγει "Μαθητής 7" κ.λπ.</p>
      <div style="display:flex;align-items:center;gap:12px;margin:16px 0;">
        <label style="font-weight:600;">Αριθμός μαθητών:</label>
        <input type="number" id="quick-count" min="1" max="100" value="20">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
        <button class="btn btn-primary" data-action="confirm">Δημιουργία</button>
      </div>
    `, (modal, close) => {
      const inp = modal.querySelector('#quick-count');
      inp.focus(); inp.select();
      modal.querySelector('[data-action=cancel]').onclick = close;
      modal.querySelector('[data-action=confirm]').onclick = () => {
        const n = parseInt(inp.value);
        if (!n || n < 1) { toast('Δώσε έγκυρο αριθμό', 'error'); return; }
        close();
        showModal(`
          <h3>Αποθήκευση ή Προσωρινή Χρήση;</h3>
          <p>Θέλεις να αποθηκεύσεις τη λίστα με ${n} μαθητές ή να τη χρησιμοποιήσεις μόνο τώρα;</p>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
            <button class="btn btn-secondary" data-action="temp">Μόνο τώρα</button>
            <button class="btn btn-primary" data-action="save">Αποθήκευση</button>
          </div>
        `, (modal2, close2) => {
          modal2.querySelector('[data-action=cancel]').onclick = close2;
          modal2.querySelector('[data-action=temp]').onclick = () => {
            close2();
            createQuickClass(n, null);
          };
          modal2.querySelector('[data-action=save]').onclick = () => {
            close2();
            showModal(`
              <h3>Όνομα Τμήματος</h3>
              <input type="text" class="input-text" id="quick-class-name" placeholder="π.χ. Β2 - Αριθμοί" style="width:100%" value="Τμήμα ${n} μαθητών">
              <div class="modal-footer">
                <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
                <button class="btn btn-primary" data-action="confirm">Δημιουργία</button>
              </div>
            `, (modal3, close3) => {
              const nameInp = modal3.querySelector('#quick-class-name');
              nameInp.focus(); nameInp.select();
              modal3.querySelector('[data-action=cancel]').onclick = close3;
              modal3.querySelector('[data-action=confirm]').onclick = () => {
                const name = nameInp.value.trim() || `Τμήμα ${n} μαθητών`;
                close3();
                createQuickClass(n, name);
              };
            });
          };
        });
      };
    });
  });
}

function addStudentFromInput() {
  const inp = document.getElementById('new-student-input');
  const name = inp.value.trim();
  if (!name) { inp.focus(); return; }
  const cls = getCurrentClass();
  if (!cls) { toast('Δημιούργησε πρώτα ένα τμήμα', 'error'); return; }
  addStudent(cls, name);
  inp.value = '';
  inp.focus();
}
