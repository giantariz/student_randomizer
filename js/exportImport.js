import { appData, session } from './state.js';
import { saveData, clearSessionStorage, restoreOrInitSession } from './data.js';
import { renderAll } from './render.js';
import { toast } from './toast.js';
import { showModal } from './modal.js';

export function initExportImportEvents() {
  document.getElementById('btn-export-json').addEventListener('click', exportJson);
  document.getElementById('btn-import-json').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  document.getElementById('file-input').addEventListener('change', handleFileImport);
  document.getElementById('btn-export-csv').addEventListener('click', exportCsv);
}

function exportJson() {
  const toExport = {
    ...appData,
    classes: appData.classes.filter(c => !c._temp)
  };
  const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'randomizer_data.json');
  toast('Αρχείο αποθηκεύτηκε!', 'success');
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  const reader = new FileReader();
  reader.onload = ev => {
    let imported;
    try { imported = JSON.parse(ev.target.result); } catch {
      toast('Μη έγκυρο αρχείο JSON', 'error'); return;
    }
    if (!imported.classes) { toast('Μη έγκυρη μορφή αρχείου', 'error'); return; }

    showModal(`
      <h3>Εισαγωγή Δεδομένων</h3>
      <p>Βρέθηκαν <strong>${imported.classes.length}</strong> τμήματα. Τι θέλεις να κάνεις;</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
        <button class="btn btn-secondary" data-action="merge">Merge (συγχώνευση)</button>
        <button class="btn btn-danger" data-action="replace">Replace (αντικατάσταση)</button>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-action=cancel]').onclick = close;
      modal.querySelector('[data-action=merge]').onclick = () => {
        close();
        imported.classes.forEach(cls => {
          if (!appData.classes.find(c => c.id === cls.id)) appData.classes.push(cls);
        });
        if (imported.sessionHistory) {
          imported.sessionHistory.forEach(h => {
            if (!appData.sessionHistory.find(e => e.id === h.id)) appData.sessionHistory.push(h);
          });
        }
        saveData();
        renderAll();
        toast('Δεδομένα συγχωνεύτηκαν!', 'success');
      };
      modal.querySelector('[data-action=replace]').onclick = () => {
        close();
        Object.assign(appData, { ...imported, exportVersion: 1 });
        if (!appData.sessionHistory) appData.sessionHistory = [];
        appData.currentClassId = appData.classes[0]?.id || null;
        saveData();
        clearSessionStorage();
        if (appData.currentClassId) restoreOrInitSession(appData.currentClassId);
        renderAll();
        toast('Δεδομένα αντικαταστάθηκαν!', 'success');
      };
    });
  };
  reader.readAsText(file);
}

function exportCsv() {
  const cls = getCurrentClass_local();
  if (appData.sessionHistory.length === 0 && session.history.length === 0) {
    toast('Δεν υπάρχει ιστορικό για εξαγωγή', 'error');
    return;
  }
  const rows = [['Ημερομηνία', 'Τμήμα', 'Μαθητές/ριες που κλήθηκαν']];
  if (session.history.length > 0 && cls) {
    const names = session.history
      .map(h => cls.students.find(s => s.id === h.studentId)?.name)
      .filter(Boolean);
    rows.push([new Date().toLocaleDateString('el-GR'), cls.name, names.join('; ')]);
  }
  appData.sessionHistory.forEach(e => {
    rows.push([e.date, e.className, e.calledStudents.join('; ')]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, 'session_history.csv');
  toast('CSV εξήχθη!', 'success');
}

function getCurrentClass_local() {
  return appData.classes.find(c => c.id === appData.currentClassId) || null;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
