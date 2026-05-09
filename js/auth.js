import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';

import { auth } from './firebase.js';
import { appData } from './state.js';

export const authState = {
  mode: 'unauthenticated', // 'unauthenticated' | 'guest' | 'authenticated'
  user: null,
  guestSnapshot: [],       // classes captured before login for migration
};

export function getAuthMode() {
  return authState.mode;
}

export function initAuth() {
  return new Promise(resolve => {
    // Fires once immediately with current session (or null), then on every change.
    onAuthStateChanged(auth, user => {
      if (user) {
        // Capture any guest data before overwriting mode
        authState.guestSnapshot = appData.classes.filter(c => !c._temp).map(c => ({
          ...c,
          students: [...c.students],
        }));
        authState.mode = 'authenticated';
        authState.user = user;
        _fireAuthChange('authenticated');
      } else {
        // Only reset if we were authenticated (not guest or unauthenticated)
        if (authState.mode === 'authenticated') {
          authState.mode = 'unauthenticated';
          authState.user = null;
          authState.guestSnapshot = [];
          _fireAuthChange('unauthenticated');
        }
      }
      resolve(); // resolves on first call so initAuth() can be awaited
    });
  });
}

export function setGuestMode() {
  authState.guestSnapshot = [];
  authState.mode = 'guest';
  authState.user = null;
  _fireAuthChange('guest');
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
  // onAuthStateChanged handles the rest
}

export async function signInWithEmail(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email, password) {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  authState.mode = 'unauthenticated';
  authState.user = null;
  authState.guestSnapshot = [];
  await firebaseSignOut(auth);
  // onAuthStateChanged will NOT re-fire 'unauthenticated' because we already set it above
  _fireAuthChange('unauthenticated');
}

function _fireAuthChange(mode) {
  document.dispatchEvent(new CustomEvent('authchange', { detail: { mode } }));
}
