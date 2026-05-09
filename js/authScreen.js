import { setGuestMode, signInWithGoogle, signInWithEmail, signUpWithEmail } from './auth.js';
import { toast } from './toast.js';

const FIREBASE_ERRORS = {
  'auth/user-not-found':       'Δεν βρέθηκε λογαριασμός με αυτό το email.',
  'auth/wrong-password':       'Λάθος κωδικός.',
  'auth/invalid-credential':   'Λάθος email ή κωδικός.',
  'auth/email-already-in-use': 'Αυτό το email χρησιμοποιείται ήδη.',
  'auth/weak-password':        'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.',
  'auth/invalid-email':        'Μη έγκυρο email.',
  'auth/popup-closed-by-user': 'Η σύνδεση με Google ακυρώθηκε.',
  'auth/cancelled-popup-request': '',
};

export function showAuthScreen() {
  const el = document.getElementById('auth-screen');
  el.innerHTML = _buildHTML();
  el.hidden = false;
  _bindEvents(el);
}

export function hideAuthScreen() {
  const el = document.getElementById('auth-screen');
  el.hidden = true;
  el.innerHTML = '';
}

function _buildHTML() {
  return `
    <div class="auth-screen-backdrop">
      <div class="auth-card">
        <div class="auth-card-icon">🔐</div>
        <h2 class="auth-card-title">Advanced Mode</h2>
        <p class="auth-card-subtitle">Επίλεξε πώς θέλεις να συνεχίσεις</p>

        <div class="auth-options">
          <button class="auth-option-btn auth-option-guest" id="auth-btn-guest">
            <span class="auth-option-icon">👤</span>
            <div>
              <div class="auth-option-label">Επισκέπτης</div>
              <div class="auth-option-desc">Χωρίς αποθήκευση δεδομένων</div>
            </div>
          </button>

          <button class="auth-option-btn auth-option-google" id="auth-btn-google">
            <span class="auth-option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            </span>
            <div>
              <div class="auth-option-label">Σύνδεση με Google</div>
              <div class="auth-option-desc">Χρησιμοποίησε το Google account σου</div>
            </div>
          </button>

          <button class="auth-option-btn auth-option-email" id="auth-btn-email-toggle">
            <span class="auth-option-icon">✉️</span>
            <div>
              <div class="auth-option-label">Email &amp; Κωδικός</div>
              <div class="auth-option-desc">Σύνδεση ή Εγγραφή με email</div>
            </div>
            <span class="auth-option-chevron" id="email-chevron">▾</span>
          </button>

          <!-- Inline email form (hidden by default) -->
          <div id="auth-email-form" class="auth-email-form" hidden>
            <div class="auth-tabs">
              <button class="auth-tab active" data-tab="login">Σύνδεση</button>
              <button class="auth-tab" data-tab="register">Εγγραφή</button>
            </div>
            <input type="email"    id="auth-email"    class="auth-input" placeholder="Email" autocomplete="email">
            <input type="password" id="auth-password" class="auth-input" placeholder="Κωδικός" autocomplete="current-password">
            <div id="auth-error" class="auth-error" hidden></div>
            <button class="btn btn-primary auth-submit-btn" id="auth-btn-submit">Σύνδεση</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function _bindEvents(el) {
  // Guest
  el.querySelector('#auth-btn-guest').addEventListener('click', () => {
    setGuestMode();
    // hideAuthScreen() will be called by main.js authchange handler
  });

  // Google
  el.querySelector('#auth-btn-google').addEventListener('click', async () => {
    const btn = el.querySelector('#auth-btn-google');
    btn.disabled = true;
    try {
      await signInWithGoogle();
    } catch (err) {
      _showError(el, err.code);
      btn.disabled = false;
    }
  });

  // Email form toggle
  el.querySelector('#auth-btn-email-toggle').addEventListener('click', () => {
    const form    = el.querySelector('#auth-email-form');
    const chevron = el.querySelector('#email-chevron');
    form.hidden   = !form.hidden;
    chevron.textContent = form.hidden ? '▾' : '▴';
  });

  // Tab switching (Σύνδεση / Εγγραφή)
  let currentTab = 'login';
  el.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      const submitBtn = el.querySelector('#auth-btn-submit');
      submitBtn.textContent = currentTab === 'login' ? 'Σύνδεση' : 'Εγγραφή';
      el.querySelector('#auth-error').hidden = true;
      const pwInput = el.querySelector('#auth-password');
      pwInput.autocomplete = currentTab === 'login' ? 'current-password' : 'new-password';
    });
  });

  // Submit
  el.querySelector('#auth-btn-submit').addEventListener('click', async () => {
    const email    = el.querySelector('#auth-email').value.trim();
    const password = el.querySelector('#auth-password').value;
    const btn      = el.querySelector('#auth-btn-submit');

    if (!email || !password) {
      _showError(el, null, 'Συμπλήρωσε email και κωδικό.');
      return;
    }

    btn.disabled = true;
    btn.textContent = '...';
    try {
      if (currentTab === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      _showError(el, err.code);
      btn.disabled = false;
      btn.textContent = currentTab === 'login' ? 'Σύνδεση' : 'Εγγραφή';
    }
  });

  // Enter key on password field
  el.querySelector('#auth-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') el.querySelector('#auth-btn-submit').click();
  });
}

function _showError(el, code, fallback) {
  const msg = (code && FIREBASE_ERRORS[code]) || fallback || 'Σφάλμα σύνδεσης. Δοκίμασε ξανά.';
  if (!msg) return; // suppress empty messages (e.g. cancelled popup)
  const errEl = el.querySelector('#auth-error');
  errEl.textContent = msg;
  errEl.hidden = false;
}
