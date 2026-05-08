import { escHtml } from './state.js';

export function showModal(html, onReady) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  onReady(backdrop.querySelector('.modal'), close);
  return { backdrop, close };
}

export function confirmDialog(msg, onConfirm, confirmLabel = 'Διαγραφή', danger = true) {
  showModal(`
    <h3>Επιβεβαίωση</h3>
    <p>${msg}</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmLabel}</button>
    </div>
  `, (modal, close) => {
    modal.querySelector('[data-action=cancel]').onclick = close;
    modal.querySelector('[data-action=confirm]').onclick = () => { close(); onConfirm(); };
  });
}

export { escHtml };
