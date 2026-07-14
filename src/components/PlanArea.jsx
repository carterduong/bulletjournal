import { useState, useCallback } from 'react';
import { getCurrentWeekNumber, getDayOfYear, getDatesFromWeekNumber } from '../utils/dateUtils';
import WeekSelector from './WeekSelector';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
    notes[key] = localStorage.getItem(key) || '';
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

  const handleWeekClick = useCallback((week) => {
    const newDates = getDatesFromWeekNumber(week);
    const month = week === initialWeek
      ? now.getMonth() + 1
      : newDates[0].getMonth() + 1;

    setCurrentWeek(week);
    setCurrentMonth(month);
    setDates(newDates);

    const keys = buildNoteKeys(newDates, week, month);
    setNotes(loadNotes(keys));
  }, [initialWeek]);

  function handleInput(key, value) {
    localStorage.setItem(key, value);
    setNotes((prev) => ({ ...prev, [key]: value }));
  }

  const noteKeys = buildNoteKeys(dates, currentWeek, currentMonth);

  function isToday(dateIndex) {
    return getDayOfYear(dates[dateIndex]) === todayDOY;
  }

  function isWeekend() {
    return getDayOfYear(dates[5]) === todayDOY || getDayOfYear(dates[6]) === todayDOY;
  }

  const noteBase = 'flex flex-col bg-(--color-day-bg) text-(--color-day-text) focus-within:shadow-[0_0_2px_2px_var(--color-focus)]';
  const todayHeading = 'bg-(--color-today-bg) border-(--color-today-border) text-(--color-today-text)';
  const todayTextarea = 'bg-(--color-today-bg) text-(--color-today-text)';

  return (
    <>
      <div className="grid flex-1 grid-cols-6 grid-rows-[66%_calc(34%-1rem)] gap-2 p-4">
        {DAY_NAMES.map((name, i) => (
          <label
            key={noteKeys[i]}
            htmlFor={noteKeys[i]}
            className={noteBase}
          >
            <span className={`flex justify-between border-b p-2 text-xs font-normal uppercase tracking-wide ${isToday(i) ? todayHeading : 'border-(--color-day-border)'}`}>
              {name}
              <span className="text-gray-400">{formatDate(dates[i])}</span>
            </span>
            <textarea
              id={noteKeys[i]}
              spellCheck={false}
              autoFocus={isToday(i)}
              className={`grow resize-none border-0 bg-transparent p-2 font-inherit leading-normal text-(--color-day-text) focus:outline-none ${isToday(i) ? todayTextarea : ''}`}
              value={notes[noteKeys[i]]}
              onChange={(e) => handleInput(noteKeys[i], e.target.value)}
            />
          </label>
        ))}

        <label
          htmlFor={noteKeys[5]}
          className={noteBase}
        >
          <span className={`flex justify-between border-b p-2 text-xs font-normal uppercase tracking-wide ${isWeekend() ? todayHeading : 'border-(--color-day-border)'}`}>
            Weekend
          </span>
          <textarea
            id={noteKeys[5]}
            spellCheck={false}
            autoFocus={isWeekend()}
            className={`grow resize-none border-0 bg-transparent p-2 font-inherit leading-normal text-(--color-day-text) focus:outline-none ${isWeekend() ? todayTextarea : ''}`}
            value={notes[noteKeys[5]]}
            onChange={(e) => handleInput(noteKeys[5], e.target.value)}
          />
        </label>

        <label htmlFor={noteKeys[6]} className={`${noteBase} col-span-2`}>
          <span className="flex justify-between border-b border-(--color-day-border) p-2 text-xs font-normal uppercase tracking-wide">
            This Week
          </span>
          <textarea
            id={noteKeys[6]}
            spellCheck={false}
            className="grow resize-none border-0 bg-transparent p-2 font-inherit leading-normal text-(--color-day-text) focus:outline-none"
            value={notes[noteKeys[6]]}
            onChange={(e) => handleInput(noteKeys[6], e.target.value)}
          />
        </label>

        <label htmlFor={noteKeys[7]} className={`${noteBase} col-span-2`}>
          <span className="flex justify-between border-b border-(--color-day-border) p-2 text-xs font-normal uppercase tracking-wide">
            This month
          </span>
          <textarea
            id={noteKeys[7]}
            spellCheck={false}
            className="grow resize-none border-0 bg-transparent p-2 font-inherit leading-normal text-(--color-day-text) focus:outline-none"
            value={notes[noteKeys[7]]}
            onChange={(e) => handleInput(noteKeys[7], e.target.value)}
          />
        </label>

        <label htmlFor={noteKeys[8]} className={`${noteBase} col-span-2`}>
          <span className="flex justify-between border-b border-(--color-day-border) p-2 text-xs font-normal uppercase tracking-wide">
            Next month
          </span>
          <textarea
            id={noteKeys[8]}
            spellCheck={false}
            className="grow resize-none border-0 bg-transparent p-2 font-inherit leading-normal text-(--color-day-text) focus:outline-none"
            value={notes[noteKeys[8]]}
            onChange={(e) => handleInput(noteKeys[8], e.target.value)}
          />
        </label>
      </div>

      <WeekSelector onWeekClick={handleWeekClick} />
    </>
  );
}
