/**
 * Coordinates cross-day move undo/redo with per-editor TipTap history.
 *
 * Moves are recorded on a stack. Cmd+Z prefers that stack while the latest
 * user action was a move, so an item hopped across many days can be fully
 * rewound. After the user edits text, TipTap undo takes priority again.
 */

export function createMoveHistory() {
  let undoStack = [];
  let redoStack = [];
  /** @type {'edit' | 'move'} */
  let lastAction = 'edit';

  return {
    get undoLength() {
      return undoStack.length;
    },

    get redoLength() {
      return redoStack.length;
    },

    get lastAction() {
      return lastAction;
    },

    recordMove(entry) {
      undoStack.push(entry);
      redoStack = [];
      lastAction = 'move';
    },

    recordEdit() {
      lastAction = 'edit';
      redoStack = [];
    },

    clear() {
      undoStack = [];
      redoStack = [];
      lastAction = 'edit';
    },

    /**
     * @param {boolean} canEditorUndo
     * @returns {object | null} move entry to restore, or null to let the editor undo
     */
    undo(canEditorUndo) {
      if (undoStack.length === 0) return null;
      if (lastAction !== 'move' && canEditorUndo) return null;

      const entry = undoStack.pop();
      redoStack.push(entry);
      lastAction = 'move';
      return entry;
    },

    /**
     * @param {boolean} canEditorRedo
     * @returns {object | null} move entry to reapply, or null to let the editor redo
     */
    redo(canEditorRedo) {
      if (redoStack.length === 0) return null;
      if (lastAction !== 'move' && canEditorRedo) return null;

      const entry = redoStack.pop();
      undoStack.push(entry);
      lastAction = 'move';
      return entry;
    },
  };
}
