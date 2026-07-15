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

  function noteClasses(today) {
    return `flex flex-col ${today ? 'bg-(--color-today-bg) text-(--color-today-text)' : 'bg-(--color-day-bg) text-(--color-day-text)'} focus-within:shadow-[0_0_2px_2px_var(--color-focus)]`;
  }

  function headingClasses(today) {
    return `flex justify-between border-b p-2 text-xs font-normal uppercase tracking-wide ${today ? 'border-(--color-today-border)' : 'border-(--color-day-border)'}`;
  }

  function textareaClasses(today) {
    return `grow resize-none border-0 bg-transparent p-2 font-[inherit] leading-normal focus:outline-none ${today ? 'text-(--color-today-text)' : 'text-(--color-day-text)'}`;
  }

  return (
    <div className="grid flex-1 grid-cols-6 grid-rows-[66%_1fr_auto] gap-2 p-4">
        {DAY_NAMES.map((name, i) => {
          const today = isToday(i);
          return (
            <label
              key={noteKeys[i]}
              htmlFor={noteKeys[i]}
              className={noteClasses(today)}
            >
              <span className={headingClasses(today)}>
                {name}
                <span className="text-[darkgrey]">{formatDate(dates[i])}</span>
              </span>
              <textarea
                id={noteKeys[i]}
                spellCheck={false}
                autoFocus={today}
                className={textareaClasses(today)}
                value={notes[noteKeys[i]]}
                onChange={(e) => handleInput(noteKeys[i], e.target.value)}
              />
            </label>
          );
        })}

        {(() => {
          const today = isWeekend();
          return (
            <label
              htmlFor={noteKeys[5]}
              className={noteClasses(today)}
            >
              <span className={headingClasses(today)}>
                Weekend
              </span>
              <textarea
                id={noteKeys[5]}
                spellCheck={false}
                autoFocus={today}
                className={textareaClasses(today)}
                value={notes[noteKeys[5]]}
                onChange={(e) => handleInput(noteKeys[5], e.target.value)}
              />
            </label>
          );
        })()}

        <label htmlFor={noteKeys[6]} className={`${noteClasses(false)} col-span-2`}>
          <span className={headingClasses(false)}>
            This Week
          </span>
          <textarea
            id={noteKeys[6]}
            spellCheck={false}
            className={textareaClasses(false)}
            value={notes[noteKeys[6]]}
            onChange={(e) => handleInput(noteKeys[6], e.target.value)}
          />
        </label>

        <label htmlFor={noteKeys[7]} className={`${noteClasses(false)} col-span-2`}>
          <span className={headingClasses(false)}>
            This month
          </span>
          <textarea
            id={noteKeys[7]}
            spellCheck={false}
            className={textareaClasses(false)}
            value={notes[noteKeys[7]]}
            onChange={(e) => handleInput(noteKeys[7], e.target.value)}
          />
        </label>

        <label htmlFor={noteKeys[8]} className={`${noteClasses(false)} col-span-2`}>
          <span className={headingClasses(false)}>
            Next month
          </span>
          <textarea
            id={noteKeys[8]}
            spellCheck={false}
            className={textareaClasses(false)}
            value={notes[noteKeys[8]]}
            onChange={(e) => handleInput(noteKeys[8], e.target.value)}
          />
        </label>
      <WeekSelector onWeekClick={handleWeekClick} />
    </div>
  );
}
