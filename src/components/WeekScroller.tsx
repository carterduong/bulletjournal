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

/** Quiet period after the last scroll event before we snap to a week. */
const SCROLL_SETTLE_MS = 140;

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
  // Before halfway → keep current week; past halfway → next week.
  const index = Math.round(scrollTop / panelHeight);
  return clampWeek(index + 1, numberOfWeeks);
}

const WeekScroller = forwardRef<WeekScrollerHandle, WeekScrollerProps>(
  function WeekScroller({ selectedWeek, onWeekChange }, ref) {
    const numberOfWeeks = getNumberOfWeeks(new Date());
    const scrollerRef = useRef<HTMLDivElement>(null);
    const selectedWeekRef = useRef(selectedWeek);
    const panelHeightRef = useRef(0);
    const onWeekChangeRef = useRef(onWeekChange);
    const ignoreScrollSyncRef = useRef(false);
    const frameRef = useRef(0);
    const settleTimerRef = useRef(0);
    const scrollUnlockTimerRef = useRef(0);
    const [panelHeight, setPanelHeight] = useState(0);
    const [mountWeek, setMountWeek] = useState(selectedWeek);

    selectedWeekRef.current = selectedWeek;
    panelHeightRef.current = panelHeight;
    onWeekChangeRef.current = onWeekChange;

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

      const unlock = () => {
        ignoreScrollSyncRef.current = false;
        scroller.removeEventListener("scrollend", unlock);
        if (scrollUnlockTimerRef.current) {
          window.clearTimeout(scrollUnlockTimerRef.current);
          scrollUnlockTimerRef.current = 0;
        }
      };

      if (behavior === "instant") {
        requestAnimationFrame(unlock);
        return;
      }

      scroller.addEventListener("scrollend", unlock, { once: true });
      scrollUnlockTimerRef.current = window.setTimeout(unlock, 500);
    }

    function settleToNearestWeek() {
      const scroller = scrollerRef.current;
      const height = panelHeightRef.current || scroller?.clientHeight || 0;
      if (!scroller || height <= 0 || ignoreScrollSyncRef.current) return;

      const week = weekFromScrollTop(
        scroller.scrollTop,
        height,
        numberOfWeeks,
      );
      setMountWeek(week);
      if (week !== selectedWeekRef.current) {
        onWeekChangeRef.current(week);
      }

      const top = (week - 1) * height;
      if (Math.abs(scroller.scrollTop - top) > 1) {
        scrollToWeek(week, "smooth");
      }
    }

    const settleRef = useRef(settleToNearestWeek);
    settleRef.current = settleToNearestWeek;

    const scrollToWeekRef = useRef(scrollToWeek);
    scrollToWeekRef.current = scrollToWeek;

    useImperativeHandle(
      ref,
      () => ({
        scrollToWeek: (week, behavior) =>
          scrollToWeekRef.current(week, behavior),
      }),
      [],
    );

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
      scrollToWeekRef.current(selectedWeekRef.current, "instant");
    }, [panelHeight]);

    useEffect(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const onScrollEnd = () => {
        if (settleTimerRef.current) {
          window.clearTimeout(settleTimerRef.current);
          settleTimerRef.current = 0;
        }
        settleRef.current();
      };

      scroller.addEventListener("scrollend", onScrollEnd);
      return () => scroller.removeEventListener("scrollend", onScrollEnd);
    }, []);

    useEffect(() => {
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
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
          onWeekChangeRef.current(week);
        }
      });

      // Fallback when scrollend is missing or delayed (some wheel devices).
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = 0;
        settleRef.current();
      }, SCROLL_SETTLE_MS);
    }

    const weeks = Array.from({ length: numberOfWeeks }, (_, i) => i + 1);

    return (
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [overflow-anchor:none]"
        onScroll={handleScroll}
      >
        {panelHeight > 0 &&
          weeks.map((week) => {
            const isMounted = Math.abs(week - mountWeek) <= MOUNT_RADIUS;
            return (
              <div
                key={week}
                data-week={week}
                className="box-border w-full min-h-0 shrink-0 overflow-hidden [overflow-anchor:none]"
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
