import { useEffect, useMemo, useRef } from 'react';
import {
  EditorContent,
  useEditor,
} from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { UndoRedo } from '@tiptap/extensions';
import { documentToNote, noteToDocument } from '../utils/noteUtils';

function createParagraphNodeView({ editor, extension, getPos, node }) {
  const dom = document.createElement('div');
  const contentDOM = document.createElement('span');
  const button = document.createElement('button');
  let currentNode = node;

  dom.className = 'group relative min-h-5 pr-7';
  dom.dataset.nodeViewWrapper = '';
  contentDOM.className = 'block min-h-5';
  contentDOM.dataset.nodeViewContent = '';

  button.type = 'button';
  button.contentEditable = 'false';
  button.ariaLabel = 'Move item to next day';
  button.title = 'Move to next day';
  button.className = 'absolute right-0 bottom-0 flex size-5 cursor-pointer items-center justify-center rounded-sm bg-(--color-action-bg) text-xs text-(--color-action-text) opacity-0 transition-opacity group-hover:opacity-100 hover:bg-(--color-action-hover) focus:opacity-100 focus:outline-none';
  button.textContent = '→';

  function syncButton() {
    const shouldShow = currentNode.textContent !== '';
    if (shouldShow && !button.parentNode) dom.append(button);
    if (!shouldShow && button.parentNode) button.remove();
  }

  function handleMove() {
    const position = getPos();
    let lineIndex = 0;

    editor.state.doc.forEach((_, offset, index) => {
      if (offset === position) lineIndex = index;
    });

    extension.options.onMoveLine(lineIndex);
  }

  function handleMouseDown(event) {
    event.preventDefault();
    handleMove();
  }

  function handleClick(event) {
    if (event.detail === 0) handleMove();
  }

  button.addEventListener('mousedown', handleMouseDown);
  button.addEventListener('click', handleClick);
  dom.append(contentDOM);
  syncButton();

  return {
    dom,
    contentDOM,
    update(nextNode) {
      if (nextNode.type !== currentNode.type) return false;
      currentNode = nextNode;
      syncButton();
      return true;
    },
    destroy() {
      button.removeEventListener('mousedown', handleMouseDown);
      button.removeEventListener('click', handleClick);
    },
  };
}

const MoveableParagraph = Paragraph.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      onMoveLine: () => {},
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
  autoFocus = false,
  today = false,
}) {
  const onChangeRef = useRef(onChange);
  const onMoveLineRef = useRef(onMoveLine);
  onChangeRef.current = onChange;
  onMoveLineRef.current = onMoveLine;

  const extensions = useMemo(() => [
    Document,
    Text,
    UndoRedo,
    MoveableParagraph.configure({
      onMoveLine: (lineIndex) => onMoveLineRef.current(lineIndex),
    }),
  ], []);

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
