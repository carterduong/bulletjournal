import { useEffect, useMemo, useRef, useCallback } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, NodeViewRendererProps } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { UndoRedo } from "@tiptap/extensions";
import { documentToNote, noteToDocument } from "../utils/noteUtils";

function setEditorContent(editor: Editor, value: string) {
  editor
    .chain()
    .command(({ tr }) => {
      tr.setMeta("addToHistory", false);
      return true;
    })
    .setContent(noteToDocument(value), { emitUpdate: false })
    .run();
}

type MoveAwareUndoRedoOptions = {
  onUndoMove: (canEditorUndo: boolean) => boolean;
  onRedoMove: (canEditorRedo: boolean) => boolean;
};

const MoveAwareUndoRedo = UndoRedo.extend<MoveAwareUndoRedoOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      onUndoMove: () => false,
      onRedoMove: () => false,
    };
  },

  addKeyboardShortcuts() {
    return {
      // Prefer the shared move stack when the latest action was a move, so
      // Cmd+Z rewinds cross-day hops instead of applying stale per-editor history.
      "Mod-z": () => {
        if (this.options.onUndoMove(this.editor.can().undo())) return true;
        return this.editor.commands.undo();
      },
      "Shift-Mod-z": () => {
        if (this.options.onRedoMove(this.editor.can().redo())) return true;
        return this.editor.commands.redo();
      },
      "Mod-y": () => {
        if (this.options.onRedoMove(this.editor.can().redo())) return true;
        return this.editor.commands.redo();
      },
      // Russian keyboard layouts
      "Mod-я": () => {
        if (this.options.onUndoMove(this.editor.can().undo())) return true;
        return this.editor.commands.undo();
      },
      "Shift-Mod-я": () => {
        if (this.options.onRedoMove(this.editor.can().redo())) return true;
        return this.editor.commands.redo();
      },
    };
  },
});

type MoveableParagraphOptions = {
  HTMLAttributes?: Record<string, unknown>;
  onMoveLine: (lineIndex: number) => void;
  onMoveLines: (lineIndices: number[]) => void;
  subscribeToSelection: (listener: () => void) => () => void;
};

type DailyNoteEditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onMoveLine: (lineIndex: number) => void;
  onMoveLines: (lineIndices: number[]) => void;
  onUndoMove?: (canEditorUndo: boolean) => boolean;
  onRedoMove?: (canEditorRedo: boolean) => boolean;
  autoFocus?: boolean;
  today?: boolean;
};

function getSelectedLineIndices(state: EditorState): number[] {
  const { from, to } = state.selection;
  if (from === to) return [];

  const indices: number[] = [];
  let index = 0;
  state.doc.forEach((node, pos) => {
    const nodeEnd = pos + node.nodeSize;
    if (pos < to && nodeEnd > from) {
      indices.push(index);
    }
    index++;
  });

  return indices.length > 1 ? indices : [];
}

function createParagraphNodeView({
  editor,
  extension,
  getPos,
  node,
}: NodeViewRendererProps) {
  const options = extension.options as MoveableParagraphOptions;
  const typedEditor = editor as Editor;
  const dom = document.createElement("div");
  const contentDOM = document.createElement("span");
  const hoverButton = document.createElement("button");
  const selectionButton = document.createElement("button");
  let currentNode: ProseMirrorNode = node;

  dom.className = "group relative min-h-5 pr-7";
  dom.dataset.nodeViewWrapper = "";
  contentDOM.className = "block min-h-5";
  contentDOM.dataset.nodeViewContent = "";

  function setupButton(button: HTMLButtonElement, label: string) {
    button.type = "button";
    button.contentEditable = "false";
    button.ariaLabel = label;
    button.title = label;
    button.className =
      "absolute right-0 bottom-0 flex size-5 cursor-pointer items-center justify-center rounded-sm bg-(--color-action-bg) text-xs text-(--color-action-text) hover:bg-(--color-action-hover) focus:outline-none";
    button.textContent = "→";
  }

  setupButton(hoverButton, "Move item to next day");
  hoverButton.className +=
    " opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100";

  setupButton(selectionButton, "Move selected lines to next day");

  function getLineIndex() {
    const position = getPos();
    let lineIndex = 0;
    if (typeof position !== "number") return lineIndex;
    typedEditor.state.doc.forEach((_, offset, index) => {
      if (offset === position) lineIndex = index;
    });
    return lineIndex;
  }

  function handleMoveLine() {
    options.onMoveLine(getLineIndex());
  }

  function handleMoveSelection() {
    const selectedIndices = getSelectedLineIndices(typedEditor.state);
    if (selectedIndices.length > 1) {
      options.onMoveLines(selectedIndices);
    }
  }

  function handleMouseDown(event: MouseEvent) {
    event.preventDefault();
    handleMoveLine();
  }

  function handleClick(event: MouseEvent) {
    if (event.detail === 0) handleMoveLine();
  }

  function handleSelectionMouseDown(event: MouseEvent) {
    event.preventDefault();
    handleMoveSelection();
  }

  function handleSelectionClick(event: MouseEvent) {
    if (event.detail === 0) handleMoveSelection();
  }

  function syncButtons() {
    const hasContent = currentNode.textContent !== "";
    const selectedIndices = getSelectedLineIndices(typedEditor.state);
    const lineIndex = getLineIndex();
    const isLastSelected =
      selectedIndices.length > 1 &&
      selectedIndices[selectedIndices.length - 1] === lineIndex;
    const isInSelection = selectedIndices.includes(lineIndex);

    if (isLastSelected) {
      if (hoverButton.parentNode) hoverButton.remove();
      if (!selectionButton.parentNode) dom.append(selectionButton);
    } else if (hasContent && !isInSelection) {
      if (selectionButton.parentNode) selectionButton.remove();
      if (!hoverButton.parentNode) dom.append(hoverButton);
    } else {
      if (hoverButton.parentNode) hoverButton.remove();
      if (selectionButton.parentNode) selectionButton.remove();
    }
  }

  hoverButton.addEventListener("mousedown", handleMouseDown);
  hoverButton.addEventListener("click", handleClick);
  selectionButton.addEventListener("mousedown", handleSelectionMouseDown);
  selectionButton.addEventListener("click", handleSelectionClick);
  dom.append(contentDOM);
  syncButtons();

  const unsubscribe = options.subscribeToSelection(syncButtons);

  return {
    dom,
    contentDOM,
    update(nextNode: ProseMirrorNode) {
      if (nextNode.type !== currentNode.type) return false;
      currentNode = nextNode;
      syncButtons();
      return true;
    },
    destroy() {
      hoverButton.removeEventListener("mousedown", handleMouseDown);
      hoverButton.removeEventListener("click", handleClick);
      selectionButton.removeEventListener(
        "mousedown",
        handleSelectionMouseDown,
      );
      selectionButton.removeEventListener("click", handleSelectionClick);
      unsubscribe();
    },
  };
}

const MoveableParagraph = Paragraph.extend<MoveableParagraphOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      onMoveLine: () => {},
      onMoveLines: () => {},
      subscribeToSelection: () => () => {},
    };
  },

  addNodeView() {
    return createParagraphNodeView;
  },
});

const DailyNoteEditor = ({
  id,
  value,
  onChange,
  onMoveLine,
  onMoveLines,
  onUndoMove,
  onRedoMove,
  autoFocus = false,
  today = false,
}: DailyNoteEditorProps) => {
  const onChangeRef = useRef(onChange);
  const onMoveLineRef = useRef(onMoveLine);
  const onMoveLinesRef = useRef(onMoveLines);
  const onUndoMoveRef = useRef(onUndoMove);
  const onRedoMoveRef = useRef(onRedoMove);
  onChangeRef.current = onChange;
  onMoveLineRef.current = onMoveLine;
  onMoveLinesRef.current = onMoveLines;
  onUndoMoveRef.current = onUndoMove;
  onRedoMoveRef.current = onRedoMove;

  const selectionListenersRef = useRef(new Set<() => void>());

  const subscribeToSelection = useCallback((listener: () => void) => {
    selectionListenersRef.current.add(listener);
    return () => {
      selectionListenersRef.current.delete(listener);
    };
  }, []);

  const notifySelectionChange = useCallback(() => {
    selectionListenersRef.current.forEach((listener) => listener());
  }, []);

  const extensions = useMemo(
    () => [
      Document,
      Text,
      MoveAwareUndoRedo.configure({
        onUndoMove: (canEditorUndo) =>
          onUndoMoveRef.current?.(canEditorUndo) ?? false,
        onRedoMove: (canEditorRedo) =>
          onRedoMoveRef.current?.(canEditorRedo) ?? false,
      }),
      MoveableParagraph.configure({
        onMoveLine: (lineIndex) => onMoveLineRef.current(lineIndex),
        onMoveLines: (lineIndices) => onMoveLinesRef.current(lineIndices),
        subscribeToSelection,
      }),
    ],
    [subscribeToSelection],
  );

  const editor = useEditor(
    {
      extensions,
      content: noteToDocument(value),
      editorProps: {
        attributes: {
          class:
            "min-h-full cursor-text whitespace-pre-wrap break-words focus:outline-none",
          "aria-label": "Daily notes",
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        onChangeRef.current(documentToNote(updatedEditor.getJSON()));
      },
      onSelectionUpdate: () => {
        notifySelectionChange();
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (documentToNote(editor.getJSON()) === value) return;
    // External updates (e.g. moves) must not create per-editor history entries,
    // otherwise Cmd+Z only restores the source day and leaves the destination copy.
    setEditorContent(editor, value);
  }, [editor, value]);

  useEffect(() => {
    if (autoFocus && editor && !editor.isDestroyed) {
      editor.commands.focus("start");
    }
  }, [autoFocus, editor]);

  return (
    <EditorContent
      id={id}
      editor={editor}
      className={`min-h-0 grow overflow-y-auto p-2 leading-normal [&_.ProseMirror]:min-h-full ${
        today ? "text-(--color-today-text)" : "text-(--color-day-text)"
      }`}
    />
  );
};

export { DailyNoteEditor };
