import { useState } from 'react';
import { getCurrentWeekNumber, getNumberOfWeeks, getDayOfYear } from '../utils/dateUtils';

export default function WeekSelector({ onWeekClick }) {
  const now = new Date();
  const currentWeek = getCurrentWeekNumber(now);
  const currentYear = now.getFullYear();
  const numberOfWeeks = getNumberOfWeeks(now);
  const percentage = ((currentWeek / numberOfWeeks) * 100) | 0;
  const [highlightedWeek, setHighlightedWeek] = useState(currentWeek);

  const weeksArray = Array.from({ length: numberOfWeeks }, (_, i) => i + 1);

  function handleWeekClick(e) {
    const week = Number(e.target.id);
    setHighlightedWeek(week);
    onWeekClick(week);
  }

  return (
    <div className="week-selector">
      <span>
        <span id="current-year">{currentYear}</span>
      </span>

      <span className="week-list-wrapper">
        <ol>
          {weeksArray.map((i) => (
            <li
              key={i}
              className={i === highlightedWeek ? 'highlighted-week' : ''}
              id={i}
              onClick={handleWeekClick}
            >
              {String(i).padStart(2, '0')}
            </li>
          ))}
        </ol>
        <span id="percentage">{percentage}%</span>
      </span>
    </div>
  );
}
