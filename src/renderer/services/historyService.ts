// src/renderer/services/historyService.ts

type Snapshot = Record<string, string>;

let undoStack: Snapshot[] = [];
let redoStack: Snapshot[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isRestoring = false;

// Listeners for UI updates (to enable/disable buttons)
const listeners: (() => void)[] = [];

export function subscribeToHistory(listener: () => void) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

function notifyListeners() {
  listeners.forEach((l) => l());
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}

function captureSnapshot(): Snapshot {
  const snapshot: Snapshot = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('insacc_') && 
        key !== 'insacc_supabase_url' && 
        key !== 'insacc_supabase_key' && 
        key !== 'insacc_supabase_enabled' && 
        key !== 'insacc_supabase_status' &&
        !key.startsWith('insacc_dirty_')) {
      snapshot[key] = localStorage.getItem(key) || '';
    }
  }
  return snapshot;
}

export function initHistory() {
  if (undoStack.length === 0) {
    undoStack.push(captureSnapshot());
    notifyListeners();
  }
}

export function scheduleSnapshot() {
  if (isRestoring) return; // Don't take snapshots while we are restoring state
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    const newSnapshot = captureSnapshot();
    
    // Check if anything actually changed from the last snapshot
    const lastSnapshot = undoStack[undoStack.length - 1];
    if (lastSnapshot) {
      const keys1 = Object.keys(newSnapshot);
      const keys2 = Object.keys(lastSnapshot);
      let isSame = keys1.length === keys2.length;
      if (isSame) {
        for (const key of keys1) {
          if (newSnapshot[key] !== lastSnapshot[key]) {
            isSame = false;
            break;
          }
        }
      }
      if (isSame) return; // Nothing changed
    }

    undoStack.push(newSnapshot);
    if (undoStack.length > 50) { // Limit history to 50 items
      undoStack.shift();
    }
    
    // If we took a new action, invalidate the redo stack
    redoStack = [];
    notifyListeners();
  }, 2000); // 2 second debounce
}

export function undo() {
  if (undoStack.length <= 1) return; // Need at least current state + 1 history
  
  if (debounceTimer) {
    clearTimeout(debounceTimer); // Cancel pending snapshots
  }

  isRestoring = true;
  
  const currentSnapshot = undoStack.pop();
  if (currentSnapshot) {
    redoStack.push(currentSnapshot);
  }
  
  const targetSnapshot = undoStack[undoStack.length - 1];
  applySnapshot(targetSnapshot);
  
  isRestoring = false;
  notifyListeners();
}

export function redo() {
  if (redoStack.length === 0) return;
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  isRestoring = true;
  
  const targetSnapshot = redoStack.pop();
  if (targetSnapshot) {
    undoStack.push(targetSnapshot);
    applySnapshot(targetSnapshot);
  }
  
  isRestoring = false;
  notifyListeners();
}

function applySnapshot(snapshot: Snapshot) {
  // Clear current insacc_ keys that might not exist in the snapshot
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('insacc_') && 
        key !== 'insacc_supabase_url' && 
        key !== 'insacc_supabase_key' && 
        key !== 'insacc_supabase_enabled' && 
        key !== 'insacc_supabase_status' &&
        !key.startsWith('insacc_dirty_')) {
      if (!(key in snapshot)) {
        keysToRemove.push(key);
      }
    }
  }
  
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
    // Dispatch a dummy event for deletion (if needed by components)
    // Most components handle defaults on undefined/null
  }

  for (const [key, value] of Object.entries(snapshot)) {
    const currentVal = localStorage.getItem(key);
    if (currentVal !== value) {
      localStorage.setItem(key, value);
      
      // Attempt to parse so we can dispatch the event
      let parsedValue = null;
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        parsedValue = value;
      }
      
      // Tell lazyPersistedState to update its React state and push to backend
      window.dispatchEvent(new CustomEvent('insacc-history-sync', { 
        detail: { key, value: parsedValue } 
      }));
    }
  }
}
