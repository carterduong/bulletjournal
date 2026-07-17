import { useState } from "react";
import PlanArea from "./components/PlanArea";
import WeekSelector from "./components/WeekSelector";
import { getCurrentWeekNumber } from "./utils/dateUtils";

export default function App() {
  const [weekNumber, setWeekNumber] = useState(() =>
    getCurrentWeekNumber(new Date()),
  );

  return (
    <div className="size-full flex flex-col gap-2 p-4">
      <div className="flex-1">
        <PlanArea weekNumber={weekNumber} />
      </div>
      <div className="flex-none">
        <WeekSelector selectedWeek={weekNumber} onWeekClick={setWeekNumber} />
      </div>
    </div>
  );
}
