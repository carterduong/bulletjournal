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

/** Minimum time a wheel gesture stays locked after stepping a week. */
const WHEEL_LOCK_MS = 500;

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
  if (overflowY !== "auto" && overflowY !== "scroll") return false;

  // Ignore sub-pixel / padding phantom overflow from min-height:100% editors.
  const maxScroll = element.scrollHeight - element.clientHeight;
  if (maxScroll < 8) return false;

  if (deltaY > 0) {
    return element.scrollTop < maxScroll - 1;
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
    const wheelLockedRef = useRef(false);
    const wheelLockTimerRef = useRef(0);
    const frameRef = useRef(0);
    const scrollUnlockTimerRef = useRef(0);
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
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const releaseWheelLock = () => {
        wheelLockedRef.current = false;
        if (wheelLockTimerRef.current) {
          window.clearTimeout(wheelLockTimerRef.current);
          wheelLockTimerRef.current = 0;
        }
      };

      const onWheel = (event: WheelEvent) => {
        if (panelHeightRef.current <= 0) return;
        if (
          nestedScrollableAllowsWheel(event.target, scroller, event.deltaY)
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        if (event.deltaY === 0 || wheelLockedRef.current) return;

        const direction = event.deltaY > 0 ? 1 : -1;
        const next = clampWeek(
          selectedWeekRef.current + direction,
          numberOfWeeks,
        );
        if (next === selectedWeekRef.current) return;

        wheelLockedRef.current = true;
        selectedWeekRef.current = next;
        onWeekChangeRef.current(next);
        scrollToWeek(next, "smooth");

        // Keep the lock for the full animation window so a single trackpad
        // gesture cannot step multiple weeks as scrollend fires early.
        wheelLockTimerRef.current = window.setTimeout(
          releaseWheelLock,
          WHEEL_LOCK_MS,
        );
      };

      scroller.addEventListener("wheel", onWheel, {
        passive: false,
        capture: true,
      });
      return () => {
        scroller.removeEventListener("wheel", onWheel, { capture: true });
        releaseWheelLock();
      };
    }, [numberOfWeeks]);

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
            const isMounted = Math.abs(week - selectedWeek) <= MOUNT_RADIUS;
            return (
              <div
                key={week}
                data-week={week}
                className="box-border w-full min-h-0 shrink-0 snap-start snap-always overflow-hidden [overflow-anchor:none]"
                style={{ height: panelHeight }}
              >
                {isMounted ? (
                  <PlanArea weekNumber={week} active={week === selectedWeek} />
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
