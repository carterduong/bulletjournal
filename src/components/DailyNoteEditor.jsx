import { useEffect, useMemo, useRef } from 'react';
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { UndoRedo } from '@tiptap/extensions';
import { documentToNote, noteToDocument } from '../utils/noteUtils';

function ParagraphWithMoveAction({ editor, extension, getPos, node }) {
  function handleMove() {
    const position = getPos();
    let lineIndex = 0;

    editor.state.doc.forEach((_, offset, index) => {
      if (offset === position) lineIndex = index;
    });

    extension.options.onMoveLine(lineIndex);
  }

  return (
    <NodeViewWrapper className="group relative min-h-5 pr-7">
      <NodeViewContent as="span" className="block min-h-5" />
      {node.textContent !== '' && (
        <button
          type="button"
          contentEditable={false}
          aria-label="Move item to next day"
          title="Move to next day"
          className="absolute right-0 bottom-0 flex size-5 cursor-pointer items-center justify-center rounded-sm bg-(--color-action-bg) text-xs text-(--color-action-text) opacity-0 transition-opacity group-hover:opacity-100 hover:bg-(--color-action-hover) focus:opacity-100 focus:outline-none"
          onMouseDown={(event) => {
            event.preventDefault();
            handleMove();
          }}
          onClick={(event) => {
            if (event.detail === 0) handleMove();
          }}
        >
          →
        </button>
      )}
    </NodeViewWrapper>
  );
}

const MoveableParagraph = Paragraph.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      onMoveLine: () => {},
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ParagraphWithMoveAction);
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
