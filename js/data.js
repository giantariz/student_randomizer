import { appData, session } from './state.js';
import { getAuthMode } from './auth.js';

export function loadPersistedData() {
  // Don't overwrite data already loaded from Firestore
  if (getAuthMode() === 'authenticated') return;
  try {
    const raw = localStorage.getItem('sr_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(appData, parsed);
      if (!appData.sessionHistory) appData.sessionHistory = [];
    }
  } catch {}
}

export function saveData() {
  // Guest mode: data lives in memory only — never write to localStorage
  if (getAuthMode() === 'guest') return;
  // Don't persist temp classes created in simple mode
  const toSave = {
    ...appData,
    classes: appData.classes.filter(c => !c._temp)
  };
  localStorage.setItem('sr_data', JSON.stringify(toSave));
}

export function clearSrData() {
  localStorage.removeItem('sr_data');
  localStorage.removeItem('sr_session');
}

export function loadSession() {
  try {
    const raw = localStorage.getItem('sr_session');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveSession() {
  localStorage.setItem('sr_session', JSON.stringify(session));
}

export function clearSessionStorage() {
  localStorage.removeItem('sr_session');
}

export function initSessionForClass(classId) {
  const cls = appData.classes.find(c => c.id === classId);
  if (!cls) return;
  session.classId = classId;
  session.pool = cls.students.map(s => s.id);
  session.called = [];
  session.absent = [];
  session.history = [];
  saveSession();
}

export function restoreOrInitSession(classId) {
  const saved = loadSession();
  if (saved && saved.classId === classId) {
    Object.assign(session, saved);
  } else {
    initSessionForClass(classId);
  }
}
