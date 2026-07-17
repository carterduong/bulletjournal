import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { getNumberOfWeeks } from "../utils/dateUtils";
import { PlanArea } from "./PlanArea";

/** How many weeks on each side of the scroll-centered week stay mounted. */
const MOUNT_RADIUS = 1;

/** px/s — deliberate flicks clear this during the gesture. */
const FLING_VELOCITY = 480;

/** How long a recorded fling remains valid after the last fast sample. */
const FLING_MEMORY_MS = 180;

/** Gap since last scroll sample that starts a new gesture. */
const GESTURE_GAP_MS = 180;

/**
 * Ignore scrollend while wheel/trackpad pulses are still arriving so we don't
 * settle between ticks and fight the gesture.
 */
const WHEEL_SCROLLEND_SUPPRESS_MS = 72;

/** Minimum travel (fraction of a week) before a fling may commit past halfway. */
const FLING_MIN_TRAVEL = 0.14;

/**
 * Settling ease duration range (ms). Short deliberate scrolls should feel
 * decisive, not like a second deceleration after browser inertia.
 */
const SETTLE_MS_MIN = 110;
const SETTLE_MS_MAX = 180;

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
  flingVelocity: number,
  gestureTravel: number,
): number {
  if (panelHeight <= 0) return 1;
  const progress = scrollTop / panelHeight;

  const flingCommit =
    Math.abs(flingVelocity) >= FLING_VELOCITY &&
    Math.abs(gestureTravel) >= panelHeight * FLING_MIN_TRAVEL &&
    Math.sign(flingVelocity) === Math.sign(gestureTravel || flingVelocity);

  let index: number;
  if (flingCommit) {
    // Clear flick: commit in the fling direction with a modest edge threshold.
    index =
      flingVelocity > 0
        ? Math.ceil(progress - 0.18)
        : Math.floor(progress + 0.18);
  } else {
    // Slow drag / ambiguous gesture: halfway snap-back / snap-forward.
    index = Math.round(progress);
  }

  return clampWeek(index + 1, numberOfWeeks);
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

const WeekScroller = forwardRef<WeekScrollerHandle, WeekScrollerProps>(
  function WeekScroller({ selectedWeek, onWeekChange }, ref) {
    const numberOfWeeks = getNumberOfWeeks(new Date());
    const scrollerRef = useRef<HTMLDivElement>(null);
    const selectedWeekRef = useRef(selectedWeek);
    const panelHeightRef = useRef(0);
    const onWeekChangeRef = useRef(onWeekChange);
    const settlingRef = useRef(false);
    const syncFrameRef = useRef(0);
    const settleFrameRef = useRef(0);
    const lastScrollTopRef = useRef(0);
    const lastScrollTimeRef = useRef(0);
    const gestureStartTopRef = useRef(0);
    const flingRef = useRef({ velocity: 0, at: 0 });
    const flingStreakRef = useRef(0);
    const lastWheelAtRef = useRef(0);
    const scrollEndRetryRef = useRef(0);
    const [panelHeight, setPanelHeight] = useState(0);
    const [mountWeek, setMountWeek] = useState(selectedWeek);

    selectedWeekRef.current = selectedWeek;
    panelHeightRef.current = panelHeight;
    onWeekChangeRef.current = onWeekChange;

    function cancelSettle() {
      if (settleFrameRef.current) {
        cancelAnimationFrame(settleFrameRef.current);
        settleFrameRef.current = 0;
      }
      settlingRef.current = false;
    }

    function clearScrollEndRetry() {
      if (scrollEndRetryRef.current) {
        window.clearTimeout(scrollEndRetryRef.current);
        scrollEndRetryRef.current = 0;
      }
    }

    /** User resumed control — drop any in-flight settle immediately. */
    function yieldToUser() {
      lastWheelAtRef.current = performance.now();
      clearScrollEndRetry();
      if (!settlingRef.current && !settleFrameRef.current) return;
      cancelSettle();
      const scroller = scrollerRef.current;
      if (scroller) {
        // New gesture begins at the interrupted position.
        gestureStartTopRef.current = scroller.scrollTop;
        lastScrollTopRef.current = scroller.scrollTop;
        lastScrollTimeRef.current = performance.now();
        flingRef.current = { velocity: 0, at: 0 };
        flingStreakRef.current = 0;
      }
    }

    function rememberedFlingVelocity(now = performance.now()): number {
      const { velocity, at } = flingRef.current;
      if (now - at > FLING_MEMORY_MS) return 0;
      return velocity;
    }

    function animateTo(top: number) {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      cancelSettle();

      const start = scroller.scrollTop;
      const distance = top - start;
      if (Math.abs(distance) < 1) {
        scroller.scrollTop = top;
        flingRef.current = { velocity: 0, at: 0 };
        flingStreakRef.current = 0;
        return;
      }

      const duration = Math.min(
        SETTLE_MS_MAX,
        Math.max(SETTLE_MS_MIN, Math.abs(distance) * 0.24),
      );

      settlingRef.current = true;
      const t0 = performance.now();

      const step = (now: number) => {
        if (!settlingRef.current) return;

        const t = Math.min(1, (now - t0) / duration);
        scroller.scrollTop = start + distance * easeOutCubic(t);

        if (t < 1) {
          settleFrameRef.current = requestAnimationFrame(step);
          return;
        }

        scroller.scrollTop = top;
        settleFrameRef.current = 0;
        settlingRef.current = false;
        flingRef.current = { velocity: 0, at: 0 };
        flingStreakRef.current = 0;
        gestureStartTopRef.current = top;
        lastScrollTopRef.current = top;
        lastScrollTimeRef.current = performance.now();
      };

      settleFrameRef.current = requestAnimationFrame(step);
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
      flingRef.current = { velocity: 0, at: 0 };
      flingStreakRef.current = 0;

      if (behavior === "instant") {
        cancelSettle();
        scroller.scrollTop = top;
        gestureStartTopRef.current = top;
        lastScrollTopRef.current = top;
        lastScrollTimeRef.current = performance.now();
        return;
      }

      animateTo(top);
    }

    function settleToNearestWeek() {
      const scroller = scrollerRef.current;
      const height = panelHeightRef.current || scroller?.clientHeight || 0;
      // Ignore scrollend events produced by our own settle animation.
      if (!scroller || height <= 0 || settlingRef.current) return;

      // Still receiving scroll samples (e.g. trackpad inertia) — wait.
      if (performance.now() - lastScrollTimeRef.current < 28) {
        clearScrollEndRetry();
        scrollEndRetryRef.current = window.setTimeout(() => {
          scrollEndRetryRef.current = 0;
          settleRef.current();
        }, 32);
        return;
      }

      const week = weekFromScrollPosition(
        scroller.scrollTop,
        height,
        numberOfWeeks,
        rememberedFlingVelocity(),
        scroller.scrollTop - gestureStartTopRef.current,
      );
      setMountWeek(week);
      if (week !== selectedWeekRef.current) {
        onWeekChangeRef.current(week);
      }

      const top = (week - 1) * height;
      if (Math.abs(scroller.scrollTop - top) > 1) {
        animateTo(top);
      } else {
        scroller.scrollTop = top;
        flingRef.current = { velocity: 0, at: 0 };
        flingStreakRef.current = 0;
        gestureStartTopRef.current = top;
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

      const onScroll = () => {
        if (settlingRef.current) return;

        const now = performance.now();
        const lastTime = lastScrollTimeRef.current;
        const lastTop = lastScrollTopRef.current;

        if (lastTime === 0 || now - lastTime > GESTURE_GAP_MS) {
          gestureStartTopRef.current =
            lastTime === 0 ? scroller.scrollTop : lastTop;
          flingRef.current = { velocity: 0, at: 0 };
          flingStreakRef.current = 0;
        }

        if (lastTime > 0) {
          const dt = (now - lastTime) / 1000;
          const frameDelta = scroller.scrollTop - lastTop;
          const height = panelHeightRef.current || scroller.clientHeight;
          // Ignore teleport-sized jumps so they don't look like flings.
          if (
            dt > 0 &&
            dt < 0.12 &&
            height > 0 &&
            Math.abs(frameDelta) < height * 0.2
          ) {
            const velocity = frameDelta / dt;
            if (Math.abs(velocity) >= FLING_VELOCITY) {
              flingStreakRef.current += 1;
              if (flingStreakRef.current >= 2) {
                flingRef.current = { velocity, at: now };
              }
            } else {
              flingStreakRef.current = 0;
            }
          }
        }

        lastScrollTopRef.current = scroller.scrollTop;
        lastScrollTimeRef.current = now;

        if (syncFrameRef.current) cancelAnimationFrame(syncFrameRef.current);
        syncFrameRef.current = requestAnimationFrame(() => {
          const height = panelHeightRef.current || scroller.clientHeight;
          const week = weekFromScrollPosition(
            scroller.scrollTop,
            height,
            numberOfWeeks,
            0,
            0,
          );
          setMountWeek((prev) => (prev === week ? prev : week));
          if (week !== selectedWeekRef.current) {
            onWeekChangeRef.current(week);
          }
        });
      };

      const onScrollEnd = () => {
        // Between mouse-wheel ticks / trackpad pulses, browsers may emit
        // scrollend early. Defer until the wheel stream has gone quiet.
        const sinceWheel = performance.now() - lastWheelAtRef.current;
        if (sinceWheel < WHEEL_SCROLLEND_SUPPRESS_MS) {
          clearScrollEndRetry();
          scrollEndRetryRef.current = window.setTimeout(() => {
            scrollEndRetryRef.current = 0;
            settleRef.current();
          }, WHEEL_SCROLLEND_SUPPRESS_MS - sinceWheel + 8);
          return;
        }
        clearScrollEndRetry();
        settleRef.current();
      };

      const onWheel = () => {
        yieldToUser();
      };

      scroller.addEventListener("scroll", onScroll, { passive: true });
      scroller.addEventListener("scrollend", onScrollEnd);
      scroller.addEventListener("wheel", onWheel, {
        capture: true,
        passive: true,
      });
      scroller.addEventListener("touchstart", yieldToUser, {
        capture: true,
        passive: true,
      });
      scroller.addEventListener("pointerdown", yieldToUser);

      return () => {
        scroller.removeEventListener("scroll", onScroll);
        scroller.removeEventListener("scrollend", onScrollEnd);
        scroller.removeEventListener("wheel", onWheel, true);
        scroller.removeEventListener("touchstart", yieldToUser, true);
        scroller.removeEventListener("pointerdown", yieldToUser);
        if (syncFrameRef.current) cancelAnimationFrame(syncFrameRef.current);
        clearScrollEndRetry();
      };
    }, [numberOfWeeks]);

    useEffect(() => {
      return () => {
        cancelSettle();
        clearScrollEndRetry();
      };
    }, []);

    const weeks = Array.from({ length: numberOfWeeks }, (_, i) => i + 1);

    return (
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [overflow-anchor:none]"
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
