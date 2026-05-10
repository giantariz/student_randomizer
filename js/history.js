import { appData, escHtml } from './state.js';
import { toast } from './toast.js';
import { showModal } from './modal.js';
import { saveData } from './data.js';

export function initHistoryEvents() {
  document.getElementById('btn-show-history').addEventListener('click', () => {
    if (appData.sessionHistory.length === 0) {
      toast('Δεν υπάρχει αποθηκευμένο ιστορικό', 'info');
      return;
    }
    const entriesHtml = appData.sessionHistory.map(e => {
      const metaParts = [];
      if (e.mode) metaParts.push(e.mode === 'unique' ? '🔒 Μοναδικές' : '🔁 Επαναλήψεις');
      if (e.pickerType) metaParts.push(e.pickerType === 'neon' ? '⚡ Neon' : '🍬 Candy');
      if (e.totalRounds && e.totalRounds > 1) metaParts.push(`${e.totalRounds} γύροι`);
      if (e.durationSec) {
        const m = Math.floor(e.durationSec / 60);
        const s = e.durationSec % 60;
        metaParts.push(m > 0 ? `${m}λ ${s}δ` : `${s}δ`);
      }
      const absentStr = e.absentStudents && e.absentStudents.length
        ? `<div style="color:var(--text2);font-size:12px;margin-top:4px;">⚫ Απόντες: ${escHtml(e.absentStudents.map(a => a.name).join(', '))}</div>`
        : '';
      return `
      <div class="log-entry">
        <div class="log-entry-header">
          <span class="log-entry-date">${escHtml(e.date)}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="log-entry-class">${escHtml(e.className)}</span>
            <button class="btn btn-secondary btn-icon" style="height:28px;font-size:12px;" data-delete-log="${e.id}">🗑️</button>
          </div>
        </div>
        ${metaParts.length ? `<div style="color:var(--text2);font-size:12px;margin-bottom:4px;">${metaParts.join(' · ')}</div>` : ''}
        <div class="log-entry-students">${escHtml(e.calledStudents.join(', '))}</div>
        ${absentStr}
      </div>
    `;
    }).join('');

    showModal(`
      <h3>📋 Ιστορικό Sessions</h3>
      <div style="max-height:400px;overflow-y:auto;margin-top:12px;" id="log-container">${entriesHtml}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="cancel">Κλείσιμο</button>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-action=cancel]').onclick = close;
      modal.querySelector('#log-container').addEventListener('click', e => {
        const id = e.target.dataset.deleteLog;
        if (!id) return;
        appData.sessionHistory = appData.sessionHistory.filter(en => en.id !== id);
        saveData();
        e.target.closest('.log-entry').remove();
        toast('Καταχώρηση διαγράφηκε', 'info');
      });
    });
  });
}
