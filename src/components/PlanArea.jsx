import { useState, useCallback } from "react";
import {
  getCurrentWeekNumber,
  getDayOfYear,
  getDatesFromWeekNumber,
} from "../utils/dateUtils";
import {
  getNextDailyKey,
  moveIncompleteLines,
  moveLine,
  moveLines,
} from "../utils/noteUtils";
import DailyNoteEditor from "./DailyNoteEditor";
import WeekSelector from "./WeekSelector";

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

export default function PlanArea() {
  const now = new Date();
  const todayDOY = getDayOfYear(now);
  const initialWeek = getCurrentWeekNumber(now);
  const initialMonth = now.getMonth() + 1;

  const [currentWeek, setCurrentWeek] = useState(initialWeek);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [dates, setDates] = useState(() => getDatesFromWeekNumber(initialWeek));
  const [notes, setNotes] = useState(() => {
    const d = getDatesFromWeekNumber(initialWeek);
    const keys = buildNoteKeys(d, initialWeek, initialMonth);
    return loadNotes(keys);
  });
  const [contextMenu, setContextMenu] = useState(null);

  const handleWeekClick = useCallback(
    (week) => {
      const newDates = getDatesFromWeekNumber(week);
      const month =
        week === initialWeek ? now.getMonth() + 1 : newDates[0].getMonth() + 1;

      setCurrentWeek(week);
      setCurrentMonth(month);
      setDates(newDates);

      const keys = buildNoteKeys(newDates, week, month);
      setNotes(loadNotes(keys));
    },
    [initialWeek],
  );

  function handleInput(key, value) {
    localStorage.setItem(key, value);
    setNotes((prev) => ({ ...prev, [key]: value }));
  }

  const noteKeys = buildNoteKeys(dates, currentWeek, currentMonth);

  function getDestinationKey(dayIndex) {
    return getNextDailyKey(dayIndex, noteKeys, dates[0]);
  }

  function moveItems(dayIndex, transform) {
    const sourceKey = noteKeys[dayIndex];
    const destinationKey = getDestinationKey(dayIndex);
    const source = notes[sourceKey] ?? localStorage.getItem(sourceKey) ?? "";
    const destination =
      notes[destinationKey] ?? localStorage.getItem(destinationKey) ?? "";
    const result = transform(source, destination);

    if (!result.moved) return;

    localStorage.setItem(sourceKey, result.source);
    localStorage.setItem(destinationKey, result.destination);
    setNotes((prev) => ({
      ...prev,
      [sourceKey]: result.source,
      [destinationKey]: result.destination,
    }));
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
          onMoveLine={(lineIndex) =>
            moveItems(dayIndex, (source, destination) =>
              moveLine(source, destination, lineIndex),
            )
          }
          onMoveLines={(lineIndices) =>
            moveItems(dayIndex, (source, destination) =>
              moveLines(source, destination, lineIndices),
            )
          }
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
    <div className="grid flex-1 grid-cols-6 grid-rows-[66%_1fr_auto] gap-2 p-4">
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
      <WeekSelector onWeekClick={handleWeekClick} />
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
