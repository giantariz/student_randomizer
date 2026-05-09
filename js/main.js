import { appData, session } from './state.js';
import { loadPersistedData, saveData, restoreOrInitSession, clearSrData } from './data.js';
import { initTheme } from './theme.js';
import { renderAll, registerStudentHandlers } from './render.js';
import { toggleAbsent, deleteStudent, initStudentEvents } from './students.js';
import { initClassEvents } from './classes.js';
import { initSessionEvents } from './session.js';
import { initGroupsEvents } from './groups.js';
import { initHistoryEvents } from './history.js';
import { initExportImportEvents } from './exportImport.js';
import { initMode, getMode, setSimpleState, applyExpertMode } from './mode.js';
import { initAuth, authState, signOut } from './auth.js';
import { hideAuthScreen } from './authScreen.js';
import { loadUserData, syncUpsertClass } from './syncFirestore.js';
import { showModal } from './modal.js';
import { toast } from './toast.js';

// Register student card handlers in render.js (avoids circular dependency)
registerStudentHandlers(toggleAbsent, deleteStudent);

async function init() {
  // initAuth resolves after the first onAuthStateChanged fires.
  // If the user is already logged in (session cookie), this will trigger
  // 'authchange' → authenticated, which handles everything.
  // If not logged in, authState.mode stays 'unauthenticated' and we fall through.
  await initAuth();

  initTheme();
  initMode();

  // Wire up all feature event listeners
  initClassEvents();
  initStudentEvents();
  initSessionEvents();
  initGroupsEvents();
  initHistoryEvents();
  initExportImportEvents();

  // For unauthenticated users, load from localStorage as before
  if (authState.mode === 'unauthenticated') {
    loadPersistedData();
    _ensureValidClass();
    renderAll();
    _updateSimpleState();
  }
  // authenticated/guest states are fully handled by handleAuthChange
}

// ── authchange event ─────────────────────────────────────────────────────────

document.addEventListener('authchange', async e => {
  const { mode } = e.detail;

  if (mode === 'authenticated') {
    // Show spinner until data loads (auth screen stays open)
    await loadUserData();

    hideAuthScreen();
    _ensureValidClass();
    applyExpertMode();

    // Guest migration: offer to transfer in-memory classes to Firestore (non-blocking)
    const guestClasses = authState.guestSnapshot.filter(c => c.students.length > 0 || c.name);
    if (guestClasses.length > 0) {
      _offerMigration(guestClasses);
    }

    // Update header
    document.getElementById('guest-banner').hidden = true;
    const userInfo = document.getElementById('auth-user-info');
    const emailEl  = document.getElementById('auth-user-email');
    userInfo.hidden = false;
    emailEl.textContent = authState.user?.email || authState.user?.displayName || '';

  } else if (mode === 'guest') {
    hideAuthScreen();
    // guest: in-memory only, don't load localStorage (saveData guard handles writes)
    appData.classes        = [];
    appData.sessionHistory = [];
    appData.currentClassId = null;
    applyExpertMode();

    document.getElementById('guest-banner').hidden = false;
    document.getElementById('auth-user-info').hidden = true;
    document.getElementById('btn-save-session').hidden = true;
    document.getElementById('btn-save-session-guest').hidden = false;

  } else if (mode === 'unauthenticated') {
    // Logged out — clear everything and return to landing
    appData.classes        = [];
    appData.sessionHistory = [];
    appData.currentClassId = null;
    clearSrData();

    document.getElementById('guest-banner').hidden = true;
    document.getElementById('auth-user-info').hidden = true;
    document.getElementById('btn-save-session').hidden = false;
    document.getElementById('btn-save-session-guest').hidden = true;

    // Return to simple mode landing
    import('./mode.js').then(({ applyMode: _applyMode }) => {
      document.body.setAttribute('data-mode', 'simple');
      document.body.setAttribute('data-simple-state', 'setup');
      localStorage.setItem('sr_mode', 'simple');
      renderAll();
    });
  }
});

// ── Logout button ─────────────────────────────────────────────────────────────

document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut();
});

// ── Guest banner "Σύνδεση" button ─────────────────────────────────────────────

document.getElementById('btn-guest-signin').addEventListener('click', () => {
  import('./authScreen.js').then(m => m.showAuthScreen());
});

// ── btn-save-session-guest ────────────────────────────────────────────────────

document.getElementById('btn-save-session-guest').addEventListener('click', () => {
  import('./authScreen.js').then(m => m.showAuthScreen());
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function _ensureValidClass() {
  if (appData.classes.length > 0) {
    const validClasses = appData.classes.filter(c => !c._temp);
    if (!appData.currentClassId || !validClasses.find(c => c.id === appData.currentClassId)) {
      appData.currentClassId = validClasses[0]?.id || null;
      saveData();
    }
    if (appData.currentClassId) restoreOrInitSession(appData.currentClassId);
  }
}

function _updateSimpleState() {
  if (getMode() === 'simple') {
    const hasStudents = appData.currentClassId &&
      appData.classes.find(c => c.id === appData.currentClassId)?.students.length > 0;
    setSimpleState(hasStudents ? 'active' : 'setup');
  }
}

function _offerMigration(guestClasses) {
  const count = guestClasses.length;
  const label = count === 1 ? '1 τάξη' : `${count} τάξεις`;
  showModal(`
    <h3>Μεταφορά δεδομένων</h3>
    <p>Έχεις δημιουργήσει ${label} ως επισκέπτης. Να μεταφερθούν στον λογαριασμό σου;</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="cancel">Όχι, απόρριψη</button>
      <button class="btn btn-primary" data-action="confirm">Ναι, μεταφορά</button>
    </div>
  `, (modal, close) => {
    modal.querySelector('[data-action=cancel]').onclick = close;
    modal.querySelector('[data-action=confirm]').onclick = () => {
      close();
      for (const cls of guestClasses) {
        if (!appData.classes.find(c => c.id === cls.id)) {
          appData.classes.push(cls);
        }
        syncUpsertClass(cls);
      }
      renderAll();
      toast(`${label} μεταφέρθηκαν!`, 'success');
    };
  });
}

init();
