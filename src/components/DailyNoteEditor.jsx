import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  EditorContent,
  useEditor,
} from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { UndoRedo } from '@tiptap/extensions';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { documentToNote, noteToDocument } from '../utils/noteUtils';

const selectionStateKey = new PluginKey('selectionState');

function getSelectedLineIndices(state) {
  const { from, to } = state.selection;
  if (from === to) return [];

  const indices = [];
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

function createParagraphNodeView({ editor, extension, getPos, node }) {
  const dom = document.createElement('div');
  const contentDOM = document.createElement('span');
  const hoverButton = document.createElement('button');
  const selectionButton = document.createElement('button');
  let currentNode = node;

  dom.className = 'group relative min-h-5 pr-7';
  dom.dataset.nodeViewWrapper = '';
  contentDOM.className = 'block min-h-5';
  contentDOM.dataset.nodeViewContent = '';

  function setupButton(button, label) {
    button.type = 'button';
    button.contentEditable = 'false';
    button.ariaLabel = label;
    button.title = label;
    button.className = 'absolute right-0 bottom-0 flex size-5 cursor-pointer items-center justify-center rounded-sm bg-(--color-action-bg) text-xs text-(--color-action-text) hover:bg-(--color-action-hover) focus:outline-none';
    button.textContent = '→';
  }

  setupButton(hoverButton, 'Move item to next day');
  hoverButton.className += ' opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100';

  setupButton(selectionButton, 'Move selected lines to next day');

  function getLineIndex() {
    const position = getPos();
    let lineIndex = 0;
    editor.state.doc.forEach((_, offset, index) => {
      if (offset === position) lineIndex = index;
    });
    return lineIndex;
  }

  function handleMoveLine() {
    extension.options.onMoveLine(getLineIndex());
  }

  function handleMoveSelection() {
    const selectedIndices = getSelectedLineIndices(editor.state);
    if (selectedIndices.length > 1) {
      extension.options.onMoveLines(selectedIndices);
    }
  }

  function handleMouseDown(event) {
    event.preventDefault();
    handleMoveLine();
  }

  function handleClick(event) {
    if (event.detail === 0) handleMoveLine();
  }

  function handleSelectionMouseDown(event) {
    event.preventDefault();
    handleMoveSelection();
  }

  function handleSelectionClick(event) {
    if (event.detail === 0) handleMoveSelection();
  }

  function syncButtons() {
    const hasContent = currentNode.textContent !== '';
    const selectedIndices = getSelectedLineIndices(editor.state);
    const lineIndex = getLineIndex();
    const isLastSelected = selectedIndices.length > 1 &&
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

  hoverButton.addEventListener('mousedown', handleMouseDown);
  hoverButton.addEventListener('click', handleClick);
  selectionButton.addEventListener('mousedown', handleSelectionMouseDown);
  selectionButton.addEventListener('click', handleSelectionClick);
  dom.append(contentDOM);
  syncButtons();

  const unsubscribe = extension.options.subscribeToSelection(syncButtons);

  return {
    dom,
    contentDOM,
    update(nextNode) {
      if (nextNode.type !== currentNode.type) return false;
      currentNode = nextNode;
      syncButtons();
      return true;
    },
    destroy() {
      hoverButton.removeEventListener('mousedown', handleMouseDown);
      hoverButton.removeEventListener('click', handleClick);
      selectionButton.removeEventListener('mousedown', handleSelectionMouseDown);
      selectionButton.removeEventListener('click', handleSelectionClick);
      unsubscribe();
    },
  };
}

const MoveableParagraph = Paragraph.extend({
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

export default function DailyNoteEditor({
  id,
  value,
  onChange,
  onMoveLine,
  onMoveLines,
  autoFocus = false,
  today = false,
}) {
  const onChangeRef = useRef(onChange);
  const onMoveLineRef = useRef(onMoveLine);
  const onMoveLinesRef = useRef(onMoveLines);
  onChangeRef.current = onChange;
  onMoveLineRef.current = onMoveLine;
  onMoveLinesRef.current = onMoveLines;

  const selectionListenersRef = useRef(new Set());

  const subscribeToSelection = useCallback((listener) => {
    selectionListenersRef.current.add(listener);
    return () => selectionListenersRef.current.delete(listener);
  }, []);

  const notifySelectionChange = useCallback(() => {
    selectionListenersRef.current.forEach((listener) => listener());
  }, []);

  const extensions = useMemo(() => [
    Document,
    Text,
    UndoRedo,
    MoveableParagraph.configure({
      onMoveLine: (lineIndex) => onMoveLineRef.current(lineIndex),
      onMoveLines: (lineIndices) => onMoveLinesRef.current(lineIndices),
      subscribeToSelection,
    }),
  ], [subscribeToSelection]);

  const editor = useEditor({
    extensions,
    content: noteToDocument(value),
    editorProps: {
      attributes: {
        class: 'min-h-full cursor-text whitespace-pre-wrap break-words focus:outline-none',
        'aria-label': 'Daily notes',
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChangeRef.current(documentToNote(updatedEditor.getJSON()));
    },
    onSelectionUpdate: () => {
      notifySelectionChange();
    },
  }, []);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (documentToNote(editor.getJSON()) === value) return;
    editor.commands.setContent(noteToDocument(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (autoFocus && editor && !editor.isDestroyed) {
      editor.commands.focus('start');
    }
  }, [autoFocus, editor]);

  return (
    <EditorContent
      id={id}
      editor={editor}
      className={`min-h-0 grow overflow-y-auto p-2 leading-normal [&_.ProseMirror]:min-h-full ${
        today ? 'text-(--color-today-text)' : 'text-(--color-day-text)'
      }`}
    />
  );
}
