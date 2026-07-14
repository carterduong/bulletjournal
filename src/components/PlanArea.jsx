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

  return (
    <>
      <div className="plan">
        {DAY_NAMES.map((name, i) => (
          <label
            key={noteKeys[i]}
            htmlFor={noteKeys[i]}
            className="notes day"
            aria-current={isToday(i) ? 'date' : undefined}
          >
            <span className="heading">
              {name}
              <span className="date">{formatDate(dates[i])}</span>
            </span>
            <textarea
              id={noteKeys[i]}
              spellCheck={false}
              autoFocus={isToday(i)}
              value={notes[noteKeys[i]]}
              onChange={(e) => handleInput(noteKeys[i], e.target.value)}
            />
          </label>
        ))}

        <label
          htmlFor={noteKeys[5]}
          className="notes weekend"
          aria-current={isWeekend() ? 'date' : undefined}
        >
          <span className="heading">Weekend</span>
          <textarea
            id={noteKeys[5]}
            spellCheck={false}
            autoFocus={isWeekend()}
            value={notes[noteKeys[5]]}
            onChange={(e) => handleInput(noteKeys[5], e.target.value)}
          />
        </label>

        <label htmlFor={noteKeys[6]} className="notes week">
          <span className="heading">This Week</span>
          <textarea
            id={noteKeys[6]}
            spellCheck={false}
            value={notes[noteKeys[6]]}
            onChange={(e) => handleInput(noteKeys[6], e.target.value)}
          />
        </label>

        <label htmlFor={noteKeys[7]} className="notes month">
          <span className="heading">This month</span>
          <textarea
            id={noteKeys[7]}
            spellCheck={false}
            value={notes[noteKeys[7]]}
            onChange={(e) => handleInput(noteKeys[7], e.target.value)}
          />
        </label>

        <label htmlFor={noteKeys[8]} className="notes month">
          <span className="heading">Next month</span>
          <textarea
            id={noteKeys[8]}
            spellCheck={false}
            value={notes[noteKeys[8]]}
            onChange={(e) => handleInput(noteKeys[8], e.target.value)}
          />
        </label>
      </div>

      <WeekSelector onWeekClick={handleWeekClick} />
    </>
  );
}
