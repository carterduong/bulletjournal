import { useLayoutEffect, useRef } from 'react';
import { splitNote } from '../utils/noteUtils';

export default function DailyNoteEditor({
  id,
  value,
  onChange,
  onMoveLine,
  autoFocus = false,
  today = false,
}) {
  const itemRefs = useRef([]);
  const pendingFocus = useRef(null);
  const items = splitNote(value);

  useLayoutEffect(() => {
    for (const textarea of itemRefs.current) {
      if (!textarea) continue;
      textarea.style.height = '0';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 20)}px`;
    }

    if (!pendingFocus.current) return;
    const { index, offset } = pendingFocus.current;
    const textarea = itemRefs.current[index];
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(offset, offset);
    }
    pendingFocus.current = null;
  }, [value]);

  function updateItems(nextItems, focus) {
    if (focus) pendingFocus.current = focus;
    onChange(nextItems.join('\n'));
  }

  function handleItemChange(index, event) {
    const nextValue = event.target.value;
    const selectionStart = event.target.selectionStart;
    const replacement = nextValue.split('\n');
    const nextItems = [...items];
    nextItems.splice(index, 1, ...replacement);

    if (replacement.length > 1) {
      const textBeforeCaret = nextValue.slice(0, selectionStart);
      const focusIndex = textBeforeCaret.split('\n').length - 1;
      const lastBreak = textBeforeCaret.lastIndexOf('\n');
      updateItems(nextItems, {
        index: index + focusIndex,
        offset: selectionStart - lastBreak - 1,
      });
      return;
    }

    updateItems(nextItems);
  }

  function handleKeyDown(index, event) {
    const textarea = event.currentTarget;
    const atStart = textarea.selectionStart === 0 && textarea.selectionEnd === 0;
    const atEnd = textarea.selectionStart === items[index].length
      && textarea.selectionEnd === items[index].length;

    if (event.key === 'Backspace' && atStart && index > 0) {
      event.preventDefault();
      const offset = items[index - 1].length;
      const nextItems = [...items];
      nextItems.splice(index - 1, 2, items[index - 1] + items[index]);
      updateItems(nextItems, { index: index - 1, offset });
    } else if (event.key === 'Delete' && atEnd && index < items.length - 1) {
      event.preventDefault();
      const offset = items[index].length;
      const nextItems = [...items];
      nextItems.splice(index, 2, items[index] + items[index + 1]);
      updateItems(nextItems, { index, offset });
    }
  }

  return (
    <div
      id={id}
      className={`min-h-0 grow cursor-text overflow-y-auto p-2 leading-normal ${
        today ? 'text-(--color-today-text)' : 'text-(--color-day-text)'
      }`}
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        const lastIndex = items.length - 1;
        const textarea = itemRefs.current[lastIndex];
        if (textarea) {
          textarea.focus();
          const offset = items[lastIndex].length;
          textarea.setSelectionRange(offset, offset);
        }
      }}
    >
      {items.map((item, index) => (
        <div className="group relative min-h-5" key={index}>
          <textarea
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            aria-label={`Item ${index + 1}`}
            autoFocus={autoFocus && index === 0}
            rows={1}
            spellCheck={false}
            className="block w-full resize-none overflow-hidden border-0 bg-transparent py-0 pr-7 font-[inherit] leading-normal text-inherit focus:outline-none"
            value={item}
            onChange={(event) => handleItemChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
          />
          {item !== '' && (
            <button
              type="button"
              aria-label={`Move item ${index + 1} to next day`}
              title="Move to next day"
              className="absolute right-0 bottom-0 flex size-5 cursor-pointer items-center justify-center rounded-sm bg-(--color-action-bg) text-xs text-(--color-action-text) opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-(--color-action-hover)"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onMoveLine(index)}
            >
              →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
