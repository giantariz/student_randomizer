// Shared mutable app state — imported by reference in all modules

export const appData = {
  exportVersion: 1,
  currentClassId: null,
  classes: [],
  sessionHistory: []
};

export const session = {
  classId: null,
  pool: [],
  called: [],
  absent: [],
  history: [],    // entries: { studentId, time, pickedAt, roundNumber }
  startedAt: null,
  roundNumber: 1
};

export let isPickingInProgress = false;
export function setPickingInProgress(val) { isPickingInProgress = val; }

export let simpleUniqueMode = true;
export function setSimpleUniqueMode(val) { simpleUniqueMode = val; }

export let fairMode = false;
export function setFairMode(val) { fairMode = val; }

export function getCurrentClass() {
  return appData.classes.find(c => c.id === appData.currentClassId) || null;
}

export function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now();
}

export function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
