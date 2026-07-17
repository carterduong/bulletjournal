import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type UIEvent,
} from "react";
import { getNumberOfWeeks } from "../utils/dateUtils";
import { PlanArea } from "./PlanArea";

/** How many weeks on each side of the scroll-centered week stay mounted. */
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
  panelHeight: number,
  numberOfWeeks: number,
): number {
  if (panelHeight <= 0) return 1;
  // Nearest week: before halfway, stay on the current week; past halfway,
  // advance. Matches mandatory scroll-snap settling.
  const index = Math.round(scrollTop / panelHeight);
  return clampWeek(index + 1, numberOfWeeks);
}

const WeekScroller = forwardRef<WeekScrollerHandle, WeekScrollerProps>(
  function WeekScroller({ selectedWeek, onWeekChange }, ref) {
    const numberOfWeeks = getNumberOfWeeks(new Date());
    const scrollerRef = useRef<HTMLDivElement>(null);
    const selectedWeekRef = useRef(selectedWeek);
    const panelHeightRef = useRef(0);
    const ignoreScrollSyncRef = useRef(false);
    const frameRef = useRef(0);
    const scrollUnlockTimerRef = useRef(0);
    const [panelHeight, setPanelHeight] = useState(0);
    // Mount window follows the scroll-centered week so panels stay ready
    // without waiting on parent state.
    const [mountWeek, setMountWeek] = useState(selectedWeek);

    selectedWeekRef.current = selectedWeek;
    panelHeightRef.current = panelHeight;

    function scrollToWeek(
      week: number,
      behavior: ScrollBehavior = "smooth",
    ) {
      const scroller = scrollerRef.current;
      const height = panelHeightRef.current || scroller?.clientHeight || 0;
      if (!scroller || height <= 0) return;

      const next = clampWeek(week, numberOfWeeks);
      const top = (next - 1) * height;
      ignoreScrollSyncRef.current = true;
      setMountWeek(next);
      scroller.scrollTo({ top, behavior });

      if (scrollUnlockTimerRef.current) {
        window.clearTimeout(scrollUnlockTimerRef.current);
        scrollUnlockTimerRef.current = 0;
      }

      const unlockScrollSync = () => {
        ignoreScrollSyncRef.current = false;
        scroller.removeEventListener("scrollend", unlockScrollSync);
        if (scrollUnlockTimerRef.current) {
          window.clearTimeout(scrollUnlockTimerRef.current);
          scrollUnlockTimerRef.current = 0;
        }
      };

      if (behavior === "instant") {
        requestAnimationFrame(unlockScrollSync);
        return;
      }

      scroller.addEventListener("scrollend", unlockScrollSync, { once: true });
      scrollUnlockTimerRef.current = window.setTimeout(unlockScrollSync, 500);
    }

    useImperativeHandle(ref, () => ({ scrollToWeek }), [numberOfWeeks]);

    useLayoutEffect(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const updateHeight = () => {
        const nextHeight = scroller.clientHeight;
        setPanelHeight((prev) => (prev === nextHeight ? prev : nextHeight));
      };

      updateHeight();
      const observer = new ResizeObserver(updateHeight);
      observer.observe(scroller);
      return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
      if (panelHeight <= 0) return;
      scrollToWeek(selectedWeekRef.current, "instant");
    }, [panelHeight]);

    useEffect(() => {
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        if (scrollUnlockTimerRef.current) {
          window.clearTimeout(scrollUnlockTimerRef.current);
        }
      };
    }, []);

    function handleScroll(event: UIEvent<HTMLDivElement>) {
      if (ignoreScrollSyncRef.current) return;
      const scroller = event.currentTarget;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const height = panelHeightRef.current || scroller.clientHeight;
        const week = weekFromScrollTop(
          scroller.scrollTop,
          height,
          numberOfWeeks,
        );
        setMountWeek((prev) => (prev === week ? prev : week));
        if (week !== selectedWeekRef.current) {
          onWeekChange(week);
        }
      });
    }

    const weeks = Array.from({ length: numberOfWeeks }, (_, i) => i + 1);

    return (
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain snap-y snap-mandatory [overflow-anchor:none]"
        onScroll={handleScroll}
      >
        {panelHeight > 0 &&
          weeks.map((week) => {
            const isMounted = Math.abs(week - mountWeek) <= MOUNT_RADIUS;
            return (
              <div
                key={week}
                data-week={week}
                className="box-border w-full min-h-0 shrink-0 snap-start snap-always overflow-hidden [overflow-anchor:none]"
                style={{ height: panelHeight }}
              >
                {isMounted ? (
                  <PlanArea
                    weekNumber={week}
                    active={week === selectedWeek}
                  />
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
