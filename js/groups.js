import { session, getCurrentClass, escHtml, shuffleArr } from './state.js';
import { toast } from './toast.js';
import { showModal } from './modal.js';

export function initGroupsEvents() {
  document.getElementById('btn-groups').addEventListener('click', () => {
    const cls = getCurrentClass();
    if (!cls) return;
    const present = cls.students.filter(s => !session.absent.includes(s.id));
    if (present.length < 2) { toast('Χρειάζονται τουλάχιστον 2 παρόντες μαθητές', 'error'); return; }

    showModal(`
      <h3>👥 Δημιουργία Ομάδων</h3>
      <p>${present.length} παρόντες μαθητές.</p>
      <div style="display:flex;align-items:center;gap:12px;margin:16px 0;">
        <label style="font-weight:600;">Μέγεθος ομάδας:</label>
        <input type="number" id="group-size" min="2" max="${present.length}" value="${Math.min(4, present.length)}">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="cancel">Ακύρωση</button>
        <button class="btn btn-primary" data-action="confirm">Δημιουργία</button>
      </div>
    `, (modal, close) => {
      const inp = modal.querySelector('#group-size');
      inp.focus(); inp.select();
      modal.querySelector('[data-action=cancel]').onclick = close;
      modal.querySelector('[data-action=confirm]').onclick = () => {
        const size = parseInt(inp.value);
        if (!size || size < 2) { toast('Μέγεθος ≥ 2', 'error'); return; }
        if (size > present.length) { toast('Λίγοι μαθητές για αυτό το μέγεθος', 'error'); return; }
        close();
        showGroupsOverlay(present, size);
      };
    });
  });
}

function showGroupsOverlay(students, groupSize) {
  const shuffled = shuffleArr(students);
  const groups = [];
  for (let i = 0; i < shuffled.length; i += groupSize) {
    groups.push(shuffled.slice(i, i + groupSize));
  }

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.style.cursor = 'default';
  const groupsHtml = groups.map((g, i) => `
    <div class="group-card">
      <h4>Ομάδα ${i + 1}</h4>
      <ul>${g.map(s => `<li>${escHtml(s.name)}</li>`).join('')}</ul>
    </div>
  `).join('');
  overlay.innerHTML = `
    <div style="background:var(--surface);border-radius:24px;padding:32px;max-width:90vw;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);cursor:default;" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="font-size:22px;">👥 Ομάδες (${groups.length} ομάδες × ~${groupSize})</h2>
        <button class="btn btn-secondary btn-icon" id="close-groups">✕</button>
      </div>
      <div class="groups-grid">${groupsHtml}</div>
      <div style="text-align:center;margin-top:20px;color:var(--text2);font-size:13px;">Κλικ έξω ή ✕ για κλείσιμο</div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', () => overlay.remove());
  overlay.querySelector('#close-groups').addEventListener('click', () => overlay.remove());
}
