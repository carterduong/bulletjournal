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

/** px/s — above this, settle prefers the week in the fling direction. */
const FLING_VELOCITY = 900;

/** Spring settle — snappy cover-flow style. */
const SPRING_STIFFNESS = 320;
const SPRING_DAMPING = 34;
const SPRING_MAX_DT = 0.032;

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

function weekFromScrollPosition(
  scrollTop: number,
  panelHeight: number,
  numberOfWeeks: number,
  velocity = 0,
): number {
  if (panelHeight <= 0) return 1;
  const progress = scrollTop / panelHeight;

  let index: number;
  if (velocity > FLING_VELOCITY) {
    // Flinging down: commit forward once you've edged into the next week.
    index = Math.ceil(progress - 0.08);
  } else if (velocity < -FLING_VELOCITY) {
    index = Math.floor(progress + 0.08);
  } else {
    // Resting / slow drag: halfway threshold.
    index = Math.round(progress);
  }

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
    const springFrameRef = useRef(0);
    const velocityRef = useRef(0);
    const lastScrollTopRef = useRef(0);
    const lastScrollTimeRef = useRef(0);
    const [panelHeight, setPanelHeight] = useState(0);
    const [mountWeek, setMountWeek] = useState(selectedWeek);

    selectedWeekRef.current = selectedWeek;
    panelHeightRef.current = panelHeight;
    onWeekChangeRef.current = onWeekChange;

    function cancelSpring() {
      if (springFrameRef.current) {
        cancelAnimationFrame(springFrameRef.current);
        springFrameRef.current = 0;
      }
    }

    function springTo(top: number) {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      cancelSpring();
      ignoreScrollSyncRef.current = true;

      let position = scroller.scrollTop;
      let velocity = velocityRef.current * 0.35;
      let last = performance.now();

      const step = (now: number) => {
        const dt = Math.min((now - last) / 1000, SPRING_MAX_DT);
        last = now;

        const springForce = -SPRING_STIFFNESS * (position - top);
        const damperForce = -SPRING_DAMPING * velocity;
        velocity += (springForce + damperForce) * dt;
        position += velocity * dt;
        scroller.scrollTop = position;

        if (Math.abs(position - top) < 0.6 && Math.abs(velocity) < 12) {
          scroller.scrollTop = top;
          velocityRef.current = 0;
          springFrameRef.current = 0;
          ignoreScrollSyncRef.current = false;
          return;
        }

        springFrameRef.current = requestAnimationFrame(step);
      };

      springFrameRef.current = requestAnimationFrame(step);
    }

    function scrollToWeek(
      week: number,
      behavior: ScrollBehavior = "smooth",
    ) {
      const scroller = scrollerRef.current;
      const height = panelHeightRef.current || scroller?.clientHeight || 0;
      if (!scroller || height <= 0) return;

      const next = clampWeek(week, numberOfWeeks);
      const top = (next - 1) * height;
      setMountWeek(next);

      if (behavior === "instant") {
        cancelSpring();
        ignoreScrollSyncRef.current = true;
        scroller.scrollTop = top;
        velocityRef.current = 0;
        lastScrollTopRef.current = top;
        requestAnimationFrame(() => {
          ignoreScrollSyncRef.current = false;
        });
        return;
      }

      springTo(top);
    }

    function settleToNearestWeek() {
      const scroller = scrollerRef.current;
      const height = panelHeightRef.current || scroller?.clientHeight || 0;
      if (!scroller || height <= 0 || ignoreScrollSyncRef.current) return;

      const week = weekFromScrollPosition(
        scroller.scrollTop,
        height,
        numberOfWeeks,
        velocityRef.current,
      );
      setMountWeek(week);
      if (week !== selectedWeekRef.current) {
        onWeekChangeRef.current(week);
      }

      const top = (week - 1) * height;
      if (Math.abs(scroller.scrollTop - top) > 1) {
        springTo(top);
      } else {
        scroller.scrollTop = top;
        velocityRef.current = 0;
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

      // Interrupt an in-flight spring when the user grabs the scroller again.
      const onPointerDown = () => {
        if (!springFrameRef.current) return;
        cancelSpring();
        ignoreScrollSyncRef.current = false;
        velocityRef.current = 0;
        lastScrollTopRef.current = scroller.scrollTop;
        lastScrollTimeRef.current = performance.now();
      };

      const onScrollEnd = () => {
        settleRef.current();
      };

      scroller.addEventListener("pointerdown", onPointerDown);
      scroller.addEventListener("scrollend", onScrollEnd);
      return () => {
        scroller.removeEventListener("pointerdown", onPointerDown);
        scroller.removeEventListener("scrollend", onScrollEnd);
      };
    }, []);

    useEffect(() => {
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        cancelSpring();
      };
    }, []);

    function handleScroll(event: UIEvent<HTMLDivElement>) {
      if (ignoreScrollSyncRef.current) return;
      const scroller = event.currentTarget;
      const now = performance.now();
      const lastTime = lastScrollTimeRef.current;
      const lastTop = lastScrollTopRef.current;

      if (lastTime > 0) {
        const dt = (now - lastTime) / 1000;
        if (dt > 0 && dt < 0.1) {
          velocityRef.current = (scroller.scrollTop - lastTop) / dt;
        }
      }
      lastScrollTopRef.current = scroller.scrollTop;
      lastScrollTimeRef.current = now;

      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const height = panelHeightRef.current || scroller.clientHeight;
        // Preview the nearest week while dragging; spring commit happens on scrollend.
        const week = weekFromScrollPosition(
          scroller.scrollTop,
          height,
          numberOfWeeks,
          0,
        );
        setMountWeek((prev) => (prev === week ? prev : week));
        if (week !== selectedWeekRef.current) {
          onWeekChangeRef.current(week);
        }
      });
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
