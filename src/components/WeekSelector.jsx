import { useState } from 'react';
import { getCurrentWeekNumber, getNumberOfWeeks } from '../utils/dateUtils';

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
    <div className="col-span-6 flex select-none justify-between">
      <span>
        <span className="text-xs">{currentYear}</span>
      </span>

      <span className="flex flex-row gap-4">
        <ol className="m-0 list-none cursor-pointer p-0">
          {weeksArray.map((i) => (
            <li
              key={i}
              className={`inline px-[1px] text-xs tabular-nums ${i === highlightedWeek ? 'text-black dark:text-gray-300' : 'text-gray-300 hover:text-black dark:hover:text-gray-300'}`}
              id={i}
              onClick={handleWeekClick}
            >
              {String(i).padStart(2, '0')}
            </li>
          ))}
        </ol>
        <span className="text-xs">{percentage}%</span>
      </span>
    </div>
  );
}
