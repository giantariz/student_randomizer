import { renderAll } from './render.js';

// Advanced mode is always in expert mode — no toggling needed.

export function initMode() {
  // No-op: advanced.html is always in expert mode.
}

export function getMode() {
  return 'expert';
}

export function setSimpleState() {
  // No-op: simple state only exists in simple.html.
}

export function applyExpertMode() {
  renderAll();
}
