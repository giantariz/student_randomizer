import { appData } from './state.js';
import { createQuickClass } from './students.js';
import { renderAll } from './render.js';
import { toast } from './toast.js';

const STORAGE_KEY = 'sr_mode';

export function initMode() {
  const saved = localStorage.getItem(STORAGE_KEY) || 'simple';
  applyMode(saved);

  document.getElementById('btn-mode-toggle').addEventListener('click', toggleMode);

  document.getElementById('btn-simple-start').addEventListener('click', startSimpleSession);
  document.getElementById('btn-count-plus').addEventListener('click', () => adjustCount(1));
  document.getElementById('btn-count-minus').addEventListener('click', () => adjustCount(-1));
  document.getElementById('simple-count').addEventListener('keydown', e => {
    if (e.key === 'Enter') startSimpleSession();
  });

  document.getElementById('btn-change-count').addEventListener('click', () => {
    // Go back to setup screen without destroying the session
    setSimpleState('setup');
  });
}

export function getMode() {
  return document.body.getAttribute('data-mode') || 'simple';
}

export function setSimpleState(state) {
  document.body.setAttribute('data-simple-state', state);
}

function applyMode(mode) {
  document.body.setAttribute('data-mode', mode);
  localStorage.setItem(STORAGE_KEY, mode);
  updateToggleLabel(mode);

  if (mode === 'simple') {
    // Determine whether to show setup or active screen
    const hasStudents = appData.currentClassId &&
      appData.classes.find(c => c.id === appData.currentClassId)?.students.length > 0;
    setSimpleState(hasStudents ? 'active' : 'setup');
  }
}

function toggleMode() {
  const current = getMode();
  const next = current === 'simple' ? 'expert' : 'simple';
  applyMode(next);
  renderAll();
  toast(next === 'expert' ? '🔧 Expert Mode ενεργό' : '✅ Απλή Προβολή ενεργή', 'info');
}

function updateToggleLabel(mode) {
  const btn = document.getElementById('btn-mode-toggle');
  if (btn) btn.textContent = mode === 'simple' ? '🔧 Expert Mode' : '← Απλή Προβολή';
}

function startSimpleSession() {
  const n = parseInt(document.getElementById('simple-count').value);
  if (!n || n < 1 || n > 200) {
    toast('Δώσε αριθμό από 1 έως 200', 'error');
    return;
  }
  createQuickClass(n, null);
  setSimpleState('active');
}

function adjustCount(delta) {
  const inp = document.getElementById('simple-count');
  const current = parseInt(inp.value) || 20;
  inp.value = Math.max(1, Math.min(200, current + delta));
}
