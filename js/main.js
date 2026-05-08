import { appData, session } from './state.js';
import { loadPersistedData, saveData, restoreOrInitSession } from './data.js';
import { initTheme } from './theme.js';
import { renderAll, registerStudentHandlers } from './render.js';
import { toggleAbsent, deleteStudent, initStudentEvents } from './students.js';
import { initClassEvents } from './classes.js';
import { initSessionEvents } from './session.js';
import { initGroupsEvents } from './groups.js';
import { initHistoryEvents } from './history.js';
import { initExportImportEvents } from './exportImport.js';
import { initMode, getMode, setSimpleState } from './mode.js';

// Register student card handlers in render.js (avoids circular dependency)
registerStudentHandlers(toggleAbsent, deleteStudent);

function init() {
  loadPersistedData();
  initTheme();
  initMode();

  // Wire up all feature event listeners
  initClassEvents();
  initStudentEvents();
  initSessionEvents();
  initGroupsEvents();
  initHistoryEvents();
  initExportImportEvents();

  // Ensure valid currentClassId
  if (appData.classes.length > 0) {
    const validClasses = appData.classes.filter(c => !c._temp);
    if (!appData.currentClassId || !validClasses.find(c => c.id === appData.currentClassId)) {
      appData.currentClassId = validClasses[0]?.id || null;
      saveData();
    }
    if (appData.currentClassId) restoreOrInitSession(appData.currentClassId);
  }

  renderAll();

  // After render, update simple mode state based on loaded data
  if (getMode() === 'simple') {
    const hasStudents = appData.currentClassId &&
      appData.classes.find(c => c.id === appData.currentClassId)?.students.length > 0;
    setSimpleState(hasStudents ? 'active' : 'setup');
  }
}

init();
