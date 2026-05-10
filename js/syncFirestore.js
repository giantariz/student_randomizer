import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

import { db, auth } from './firebase.js';
import { authState } from './auth.js';
import { appData } from './state.js';
import { toast } from './toast.js';

export function syncEnabled() {
  return authState.mode === 'authenticated';
}

function _uid() {
  return auth.currentUser?.uid;
}

function _classRef(classId) {
  return doc(db, 'users', _uid(), 'classes', classId);
}

function _historyRef(historyId) {
  return doc(db, 'users', _uid(), 'sessionHistory', historyId);
}

// ── Load all user data from Firestore into appData ──────────────────────────

export async function loadUserData() {
  const uid = _uid();
  if (!uid) return;

  try {
    // Load classes (students are stored as an array field inside each class doc)
    const classesSnap = await getDocs(collection(db, 'users', uid, 'classes'));
    const classes = [];
    classesSnap.forEach(d => {
      const data = d.data();
      classes.push({
        id:       d.id,
        name:     data.name,
        students: data.students || [],
      });
    });

    // Load session history
    const histSnap = await getDocs(collection(db, 'users', uid, 'sessionHistory'));
    const sessionHistory = [];
    histSnap.forEach(d => {
      const data = d.data();
      sessionHistory.push({
        id:             d.id,
        date:           data.sessionDate,
        classId:        data.classId || null,
        className:      data.className,
        calledStudents: data.calledStudents || [],
        calls:          data.calls          || [],
        absentStudents: data.absentStudents || [],
        mode:           data.mode           || 'unique',
        pickerType:     data.pickerType     || 'neon',
        totalRounds:    data.totalRounds    || 1,
        startedAt:      data.startedAt      || null,
        endedAt:        data.endedAt        || null,
        durationSec:    data.durationSec    || null,
      });
    });

    // Merge into appData (keep any in-memory temp classes from simple mode)
    const tempClasses = appData.classes.filter(c => c._temp);
    appData.classes        = [...classes, ...tempClasses];
    appData.sessionHistory = sessionHistory;

    // Set currentClassId to first persisted class if not already valid
    const validIds = classes.map(c => c.id);
    if (!validIds.includes(appData.currentClassId)) {
      appData.currentClassId = validIds[0] ?? null;
    }
  } catch (err) {
    toast('Σφάλμα φόρτωσης δεδομένων: ' + err.message, 'error');
  }
}

// ── Class sync ───────────────────────────────────────────────────────────────

export async function syncUpsertClass(cls) {
  if (!syncEnabled() || !cls) return;
  try {
    await setDoc(_classRef(cls.id), {
      name:      cls.name,
      students:  cls.students.map(s => ({
        id:         s.id,
        name:       s.name,
        totalCalls: s.totalCalls || 0,
        position:   s.position   || 0,
      })),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    toast('Σφάλμα αποθήκευσης τάξης: ' + err.message, 'error');
  }
}

export async function syncDeleteClass(classId) {
  if (!syncEnabled() || !classId) return;
  try {
    await deleteDoc(_classRef(classId));
  } catch (err) {
    toast('Σφάλμα διαγραφής τάξης: ' + err.message, 'error');
  }
}

// ── Session history sync ─────────────────────────────────────────────────────

export async function syncUpsertSessionHistory(entry) {
  if (!syncEnabled() || !entry) return;
  try {
    await setDoc(_historyRef(entry.id), {
      classId:        entry.classId || null,
      className:      entry.className,
      calledStudents: entry.calledStudents || [],
      calls:          entry.calls || [],
      absentStudents: entry.absentStudents || [],
      mode:           entry.mode || 'unique',
      pickerType:     entry.pickerType || 'neon',
      totalRounds:    entry.totalRounds || 1,
      startedAt:      entry.startedAt || null,
      endedAt:        entry.endedAt   || null,
      durationSec:    entry.durationSec || null,
      sessionDate:    entry.date,
      createdAt:      serverTimestamp(),
    });
  } catch (err) {
    toast('Σφάλμα αποθήκευσης ιστορικού: ' + err.message, 'error');
  }
}
