import { useRef, useState } from "react";
import {
  WeekScroller,
  type WeekScrollerHandle,
} from "./components/WeekScroller";
import { WeekSelector } from "./components/WeekSelector";
import { getCurrentWeekNumber } from "./utils/dateUtils";

export default function App() {
  const [weekNumber, setWeekNumber] = useState(() =>
    getCurrentWeekNumber(new Date()),
  );
  const scrollerRef = useRef<WeekScrollerHandle>(null);

  function handleWeekClick(week: number) {
    setWeekNumber(week);
    scrollerRef.current?.scrollToWeek(week, "smooth");
  }

  return (
    <div className="flex size-full min-h-0 flex-col gap-2 p-4">
      <WeekScroller
        ref={scrollerRef}
        selectedWeek={weekNumber}
        onWeekChange={setWeekNumber}
      />
      <div className="flex-none">
        <WeekSelector selectedWeek={weekNumber} onWeekClick={handleWeekClick} />
      </div>
    </div>
  );
}
