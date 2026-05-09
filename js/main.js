import { appData, session } from './state.js';
import { loadPersistedData, saveData, restoreOrInitSession, clearSrData } from './data.js';
import { initTheme } from './theme.js';
import { renderAll, registerStudentHandlers } from './render.js';
import { toggleAbsent, deleteStudent, initStudentEvents } from './students.js';
import { initClassEvents } from './classes.js';
import { initSessionEvents } from './session.js';
import { initGroupsEvents } from './groups.js';
import { initHistoryEvents } from './history.js';
import { applyExpertMode } from './mode.js';
import { initAuth, authState, signOut } from './auth.js';
import { showAuthScreen, hideAuthScreen } from './authScreen.js';
import { loadUserData, syncUpsertClass } from './syncFirestore.js';
import { showModal } from './modal.js';
import { toast } from './toast.js';

// Register student card handlers in render.js (avoids circular dependency)
registerStudentHandlers(toggleAbsent, deleteStudent);

async function init() {
  // initAuth resolves after the first onAuthStateChanged fires.
  // If the user is already logged in (session cookie), this will trigger
  // 'authchange' → authenticated, which handles everything.
  // If not logged in, we show the auth screen immediately.
  await initAuth();

  initTheme();

  // Wire up all feature event listeners
  initClassEvents();
  initStudentEvents();
  initSessionEvents();
  initGroupsEvents();
  initHistoryEvents();

  // Advanced mode always requires auth — show the screen for unauthenticated visitors
  if (authState.mode === 'unauthenticated') {
    showAuthScreen();
  }
  // authenticated/guest states are fully handled by handleAuthChange
}

// ── authchange event ─────────────────────────────────────────────────────────

document.addEventListener('authchange', async e => {
  const { mode } = e.detail;

  if (mode === 'authenticated') {
    // Update header immediately so guest banner hides without waiting for data load
    document.getElementById('guest-banner').hidden = true;
    const userInfo = document.getElementById('auth-user-info');
    const emailEl  = document.getElementById('auth-user-email');
    userInfo.hidden = false;
    emailEl.textContent = authState.user?.email || authState.user?.displayName || '';

    // Load data (auth screen stays open as overlay while loading)
    await loadUserData();

    hideAuthScreen();
    _ensureValidClass();
    applyExpertMode();

    // Guest migration: offer to transfer in-memory classes to Firestore (non-blocking)
    const guestClasses = authState.guestSnapshot.filter(c => c.students.length > 0 || c.name);
    if (guestClasses.length > 0) {
      _offerMigration(guestClasses);
    }

  } else if (mode === 'guest') {
    hideAuthScreen();
    // guest: in-memory only, don't load localStorage (saveData guard handles writes)
    appData.classes        = [];
    appData.sessionHistory = [];
    appData.currentClassId = null;
    applyExpertMode();

    document.getElementById('guest-banner').hidden = false;
    document.getElementById('auth-user-info').hidden = true;

  } else if (mode === 'unauthenticated') {
    // Logged out — clear everything and redirect to landing page
    clearSrData();
    window.location.href = 'index.html';
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
