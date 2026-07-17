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
  panelHeight: number,
  numberOfWeeks: number,
): number {
  if (panelHeight <= 0) return 1;
  const index = Math.round(scrollTop / panelHeight);
  return clampWeek(index + 1, numberOfWeeks);
}

function canScrollInDirection(element: HTMLElement, deltaY: number): boolean {
  if (deltaY === 0) return false;
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const scrollable =
    (overflowY === "auto" || overflowY === "scroll") &&
    element.scrollHeight > element.clientHeight + 1;
  if (!scrollable) return false;

  if (deltaY > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }
  return element.scrollTop > 1;
}

function nestedScrollableAllowsWheel(
  target: EventTarget | null,
  scroller: HTMLElement,
  deltaY: number,
): boolean {
  if (!(target instanceof Element)) return false;
  let node: Element | null = target;
  while (node && node !== scroller) {
    if (node instanceof HTMLElement && canScrollInDirection(node, deltaY)) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

const WeekScroller = forwardRef<WeekScrollerHandle, WeekScrollerProps>(
  function WeekScroller({ selectedWeek, onWeekChange }, ref) {
    const numberOfWeeks = getNumberOfWeeks(new Date());
    const scrollerRef = useRef<HTMLDivElement>(null);
    const selectedWeekRef = useRef(selectedWeek);
    const panelHeightRef = useRef(0);
    const onWeekChangeRef = useRef(onWeekChange);
    const ignoreScrollSyncRef = useRef(false);
    const wheelLockRef = useRef(false);
    const frameRef = useRef(0);
    const unlockTimerRef = useRef(0);
    const [panelHeight, setPanelHeight] = useState(0);

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

      const top = (clampWeek(week, numberOfWeeks) - 1) * height;
      ignoreScrollSyncRef.current = true;
      scroller.scrollTo({ top, behavior });

      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = 0;
      }

      const unlock = () => {
        ignoreScrollSyncRef.current = false;
        wheelLockRef.current = false;
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
      unlockTimerRef.current = window.setTimeout(unlock, 450);
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

    // Non-passive wheel listener so we can preventDefault and step one week
    // per gesture (CSS snap alone lets large wheel deltas skip weeks).
    useEffect(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const onWheel = (event: WheelEvent) => {
        if (panelHeightRef.current <= 0) return;
        if (
          nestedScrollableAllowsWheel(event.target, scroller, event.deltaY)
        ) {
          return;
        }

        event.preventDefault();
        if (wheelLockRef.current || event.deltaY === 0) return;

        const direction = event.deltaY > 0 ? 1 : -1;
        const next = clampWeek(
          selectedWeekRef.current + direction,
          numberOfWeeks,
        );
        if (next === selectedWeekRef.current) return;

        wheelLockRef.current = true;
        onWeekChangeRef.current(next);
        scrollToWeek(next, "smooth");
      };

      scroller.addEventListener("wheel", onWheel, { passive: false });
      return () => scroller.removeEventListener("wheel", onWheel);
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
        const height = panelHeightRef.current || scroller.clientHeight;
        const week = weekFromScrollTop(
          scroller.scrollTop,
          height,
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
        {panelHeight > 0 &&
          weeks.map((week) => {
            const isMounted = Math.abs(week - selectedWeek) <= MOUNT_RADIUS;
            return (
              <div
                key={week}
                data-week={week}
                className="box-border w-full min-h-0 shrink-0 snap-start snap-always overflow-hidden"
                style={{ height: panelHeight }}
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
