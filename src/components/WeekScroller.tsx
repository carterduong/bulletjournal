import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type UIEvent,
} from "react";
import { getNumberOfWeeks } from "../utils/dateUtils";
import { PlanArea } from "./PlanArea";

/** How many weeks on each side of the active week keep a live PlanArea mounted. */
const MOUNT_RADIUS = 1;

type WeekScrollerProps = {
  selectedWeek: number;
  onWeekChange: (week: number) => void;
};

export type WeekScrollerHandle = {
  scrollToWeek: (week: number, behavior?: ScrollBehavior) => void;
};

function clampWeek(week: number, numberOfWeeks: number): number {
  return Math.min(numberOfWeeks, Math.max(1, week));
}

function weekFromScrollTop(
  scrollTop: number,
  clientHeight: number,
  numberOfWeeks: number,
): number {
  if (clientHeight <= 0) return 1;
  const index = Math.round(scrollTop / clientHeight);
  return clampWeek(index + 1, numberOfWeeks);
}

const WeekScroller = forwardRef<WeekScrollerHandle, WeekScrollerProps>(
  function WeekScroller({ selectedWeek, onWeekChange }, ref) {
    const numberOfWeeks = getNumberOfWeeks(new Date());
    const scrollerRef = useRef<HTMLDivElement>(null);
    const selectedWeekRef = useRef(selectedWeek);
    const ignoreScrollSyncRef = useRef(false);
    const frameRef = useRef(0);
    const unlockTimerRef = useRef(0);

    selectedWeekRef.current = selectedWeek;

    function scrollToWeek(
      week: number,
      behavior: ScrollBehavior = "smooth",
    ) {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const top = (clampWeek(week, numberOfWeeks) - 1) * scroller.clientHeight;
      ignoreScrollSyncRef.current = true;
      scroller.scrollTo({ top, behavior });

      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = 0;
      }

      const unlock = () => {
        ignoreScrollSyncRef.current = false;
        scroller.removeEventListener("scrollend", unlock);
        if (unlockTimerRef.current) {
          window.clearTimeout(unlockTimerRef.current);
          unlockTimerRef.current = 0;
        }
      };

      if (behavior === "instant") {
        requestAnimationFrame(unlock);
        return;
      }

      scroller.addEventListener("scrollend", unlock, { once: true });
      unlockTimerRef.current = window.setTimeout(unlock, 500);
    }

    useImperativeHandle(ref, () => ({ scrollToWeek }), [numberOfWeeks]);

    useLayoutEffect(() => {
      scrollToWeek(selectedWeekRef.current, "instant");
    }, []);

    useEffect(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      function syncHeight() {
        const el = scrollerRef.current;
        if (!el) return;
        const nextTop = (selectedWeekRef.current - 1) * el.clientHeight;
        if (Math.abs(el.scrollTop - nextTop) > 1) {
          scrollToWeek(selectedWeekRef.current, "instant");
        }
      }

      const observer = new ResizeObserver(syncHeight);
      observer.observe(scroller);
      return () => observer.disconnect();
    }, [numberOfWeeks]);

    useEffect(() => {
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current);
      };
    }, []);

    function handleScroll(event: UIEvent<HTMLDivElement>) {
      if (ignoreScrollSyncRef.current) return;
      const scroller = event.currentTarget;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const week = weekFromScrollTop(
          scroller.scrollTop,
          scroller.clientHeight,
          numberOfWeeks,
        );
        if (week !== selectedWeekRef.current) {
          onWeekChange(week);
        }
      });
    }

    const weeks = Array.from({ length: numberOfWeeks }, (_, i) => i + 1);

    return (
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain snap-y snap-mandatory"
        onScroll={handleScroll}
      >
        {weeks.map((week) => {
          const isMounted = Math.abs(week - selectedWeek) <= MOUNT_RADIUS;
          return (
            <div
              key={week}
              data-week={week}
              className="box-border h-full snap-start snap-always"
            >
              {isMounted ? (
                <PlanArea weekNumber={week} />
              ) : (
                <div className="size-full" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    );
  },
);

export { WeekScroller };
