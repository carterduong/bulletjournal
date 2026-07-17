/**
 * Coordinates cross-day move undo/redo with per-editor TipTap history.
 *
 * Moves are recorded on a stack. Cmd+Z prefers that stack while the latest
 * user action was a move, so an item hopped across many days can be fully
 * rewound. After the user edits text, TipTap undo takes priority again.
 */

export type MoveHistoryEntry = {
  sourceKey: string;
  destinationKey: string;
  beforeSource: string;
  beforeDestination: string;
  afterSource: string;
  afterDestination: string;
};

type LastAction = "edit" | "move";

export function createMoveHistory() {
  let undoStack: MoveHistoryEntry[] = [];
  let redoStack: MoveHistoryEntry[] = [];
  let lastAction: LastAction = "edit";

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

    recordMove(entry: MoveHistoryEntry) {
      undoStack.push(entry);
      redoStack = [];
      lastAction = "move";
    },

    recordEdit() {
      lastAction = "edit";
      redoStack = [];
    },

    clear() {
      undoStack = [];
      redoStack = [];
      lastAction = "edit";
    },

    /**
     * @returns move entry to restore, or null to let the editor undo
     */
    undo(canEditorUndo: boolean): MoveHistoryEntry | null {
      if (undoStack.length === 0) return null;
      if (lastAction !== "move" && canEditorUndo) return null;

      const entry = undoStack.pop()!;
      redoStack.push(entry);
      lastAction = "move";
      return entry;
    },

    /**
     * @returns move entry to reapply, or null to let the editor redo
     */
    redo(canEditorRedo: boolean): MoveHistoryEntry | null {
      if (redoStack.length === 0) return null;
      if (lastAction !== "move" && canEditorRedo) return null;

      const entry = redoStack.pop()!;
      undoStack.push(entry);
      lastAction = "move";
      return entry;
    },
  };
}
