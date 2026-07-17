import { useEffect, useState, useRef } from "react";
import {
  getCurrentWeekNumber,
  getDayOfYear,
  getDatesFromWeekNumber,
} from "../utils/dateUtils";
import { createMoveHistory } from "../utils/moveHistory";
import {
  getNextDailyKey,
  moveIncompleteLines,
  moveLine,
  moveLines,
} from "../utils/noteUtils";
import { DailyNoteEditor } from "./DailyNoteEditor";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function formatDate(day, includeYear = false) {
  if (includeYear) {
    return `${day.getMonth() + 1}.${day.getDate()}.${day.getFullYear()}`;
  }
  return `${day.getMonth() + 1}.${day.getDate()}`;
}

function buildNoteKeys(dates, currentWeek, currentMonth) {
  const keys = [];
  for (let i = 0; i < 5; i++) {
    keys.push(formatDate(dates[i], true));
  }
  keys.push(`weekend-${currentWeek}`);
  keys.push(`this-week-${currentWeek}`);
  keys.push(`this-month-${currentMonth}`);
  keys.push(`next-month-${currentMonth}`);
  return keys;
}

function loadNotes(keys) {
  const notes = {};
  for (const key of keys) {
    notes[key] = localStorage.getItem(key) || "";
  }
  return notes;
}

function applyNoteValues(entries) {
  for (const [key, value] of Object.entries(entries)) {
    localStorage.setItem(key, value);
  }
}

function getMonthForWeek(weekNumber, dates, now) {
  const todayWeek = getCurrentWeekNumber(now);
  return weekNumber === todayWeek
    ? now.getMonth() + 1
    : dates[0].getMonth() + 1;
}

function PlanArea({ weekNumber }) {
  const now = new Date();
  const todayDOY = getDayOfYear(now);
  const dates = getDatesFromWeekNumber(weekNumber);
  const currentMonth = getMonthForWeek(weekNumber, dates, now);
  const noteKeys = buildNoteKeys(dates, weekNumber, currentMonth);

  const [notes, setNotes] = useState(() => loadNotes(noteKeys));
  const [contextMenu, setContextMenu] = useState(null);
  const moveHistoryRef = useRef(createMoveHistory());

  useEffect(() => {
    const nextDates = getDatesFromWeekNumber(weekNumber);
    const nextMonth = getMonthForWeek(weekNumber, nextDates, new Date());
    moveHistoryRef.current.clear();
    setNotes(loadNotes(buildNoteKeys(nextDates, weekNumber, nextMonth)));
  }, [weekNumber]);

  function handleInput(key, value) {
    moveHistoryRef.current.recordEdit();
    localStorage.setItem(key, value);
    setNotes((prev) => ({ ...prev, [key]: value }));
  }

  function getDestinationKey(dayIndex) {
    return getNextDailyKey(dayIndex, noteKeys, dates[0]);
  }

  function writeNotes(entries) {
    applyNoteValues(entries);
    setNotes((prev) => ({ ...prev, ...entries }));
  }

  function moveItems(dayIndex, transform) {
    const sourceKey = noteKeys[dayIndex];
    const destinationKey = getDestinationKey(dayIndex);
    const source = notes[sourceKey] ?? localStorage.getItem(sourceKey) ?? "";
    const destination =
      notes[destinationKey] ?? localStorage.getItem(destinationKey) ?? "";
    const result = transform(source, destination);

    if (!result.moved) return;

    moveHistoryRef.current.recordMove({
      sourceKey,
      destinationKey,
      beforeSource: source,
      beforeDestination: destination,
      afterSource: result.source,
      afterDestination: result.destination,
    });

    writeNotes({
      [sourceKey]: result.source,
      [destinationKey]: result.destination,
    });
  }

  function undoMove(canEditorUndo) {
    const entry = moveHistoryRef.current.undo(canEditorUndo);
    if (!entry) return false;

    writeNotes({
      [entry.sourceKey]: entry.beforeSource,
      [entry.destinationKey]: entry.beforeDestination,
    });
    return true;
  }

  function redoMove(canEditorRedo) {
    const entry = moveHistoryRef.current.redo(canEditorRedo);
    if (!entry) return false;

    writeNotes({
      [entry.sourceKey]: entry.afterSource,
      [entry.destinationKey]: entry.afterDestination,
    });
    return true;
  }

  function handleContextMenu(event, dayIndex) {
    event.preventDefault();
    setContextMenu({
      dayIndex,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 216)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 52)),
    });
  }

  function renderDailyNote(name, dayIndex, today, dateLabel) {
    const key = noteKeys[dayIndex];
    return (
      <section
        key={key}
        className={noteClasses(today)}
        onContextMenu={(event) => handleContextMenu(event, dayIndex)}
      >
        <h2 className={headingClasses(today)}>
          {name}
          {dateLabel && <span className="text-[darkgrey]">{dateLabel}</span>}
        </h2>
        <DailyNoteEditor
          id={key}
          value={notes[key] ?? ""}
          today={today}
          autoFocus={today}
          onChange={(value) => handleInput(key, value)}
          onMoveLine={(lineIndex) => moveItems(
            dayIndex,
            (source, destination) => moveLine(source, destination, lineIndex),
          )}
          onMoveLines={(lineIndices) => moveItems(
            dayIndex,
            (source, destination) => moveLines(source, destination, lineIndices),
          )}
          onUndoMove={undoMove}
          onRedoMove={redoMove}
        />
      </section>
    );
  }

  function isToday(dateIndex) {
    return getDayOfYear(dates[dateIndex]) === todayDOY;
  }

  function isWeekend() {
    return (
      getDayOfYear(dates[5]) === todayDOY || getDayOfYear(dates[6]) === todayDOY
    );
  }

  function noteClasses(today) {
    return `flex flex-col overflow-hidden rounded-lg ${today ? "bg-(--color-today-bg) text-(--color-today-text)" : "bg-(--color-day-bg) text-(--color-day-text)"} focus-within:shadow-[0_0_2px_2px_var(--color-focus)]`;
  }

  function headingClasses(today) {
    return `flex justify-between border-b p-2 text-xs font-normal uppercase tracking-wide ${today ? "border-(--color-today-border)" : "border-(--color-day-border)"}`;
  }

  function textareaClasses(today) {
    return `grow resize-none border-0 bg-transparent p-2 font-[inherit] leading-normal focus:outline-none ${today ? "text-(--color-today-text)" : "text-(--color-day-text)"}`;
  }

  return (
    <div className="grid size-full grid-cols-6 grid-rows-[66%_1fr_auto] gap-2">
      {DAY_NAMES.map((name, i) => {
        const today = isToday(i);
        return renderDailyNote(name, i, today, formatDate(dates[i]));
      })}

      {(() => {
        const today = isWeekend();
        const weekendLabel = `${formatDate(dates[5])}-${formatDate(dates[6])}`;
        return renderDailyNote("Weekend", 5, today, weekendLabel);
      })()}

      <label
        htmlFor={noteKeys[6]}
        className={`${noteClasses(false)} col-span-2`}
      >
        <span className={headingClasses(false)}>This Week</span>
        <textarea
          id={noteKeys[6]}
          spellCheck={false}
          className={textareaClasses(false)}
          value={notes[noteKeys[6]]}
          onChange={(e) => handleInput(noteKeys[6], e.target.value)}
        />
      </label>

      <label
        htmlFor={noteKeys[7]}
        className={`${noteClasses(false)} col-span-2`}
      >
        <span className={headingClasses(false)}>This month</span>
        <textarea
          id={noteKeys[7]}
          spellCheck={false}
          className={textareaClasses(false)}
          value={notes[noteKeys[7]]}
          onChange={(e) => handleInput(noteKeys[7], e.target.value)}
        />
      </label>

      <label
        htmlFor={noteKeys[8]}
        className={`${noteClasses(false)} col-span-2`}
      >
        <span className={headingClasses(false)}>Next month</span>
        <textarea
          id={noteKeys[8]}
          spellCheck={false}
          className={textareaClasses(false)}
          value={notes[noteKeys[8]]}
          onChange={(e) => handleInput(noteKeys[8], e.target.value)}
        />
      </label>
      {contextMenu && (
        <>
          <button
            type="button"
            aria-label="Close move menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            role="menu"
            className="fixed z-50 min-w-52 rounded-lg border border-(--color-menu-border) bg-(--color-menu-bg) p-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setContextMenu(null);
            }}
          >
            <button
              type="button"
              role="menuitem"
              autoFocus
              className="w-full cursor-pointer rounded-lg px-3 py-2 text-left leading-normal text-(--color-menu-text) hover:bg-(--color-menu-hover) focus:bg-(--color-menu-hover) focus:outline-none"
              onClick={() => {
                moveItems(contextMenu.dayIndex, moveIncompleteLines);
                setContextMenu(null);
              }}
            >
              Move incomplete to next day
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export { PlanArea };
