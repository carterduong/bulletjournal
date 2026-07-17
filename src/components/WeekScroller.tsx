import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import { getNumberOfWeeks } from "../utils/dateUtils";
import { PlanArea } from "./PlanArea";

/** How many weeks on each side of the mounted week keep a live PlanArea. */
const MOUNT_RADIUS = 1;

/** Ignore wheel deltas smaller than this (stray trackpad noise). */
const WHEEL_THRESHOLD = 8;

/** Quiet time after the last wheel event before another week step is allowed. */
const WHEEL_GESTURE_GAP_MS = 140;

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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'textarea, input, select, [contenteditable="true"], .ProseMirror',
    ),
  );
}

/** Walk up from the wheel target; true if a scrollable editor can still scroll. */
function nestedScrollableAllowsWheel(
  target: EventTarget | null,
  root: HTMLElement,
  deltaY: number,
): boolean {
  if (deltaY === 0 || !(target instanceof Element)) return false;
  let node: Element | null = target;
  while (node && node !== root) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      const scrollable =
        (overflowY === "auto" || overflowY === "scroll") &&
        node.scrollHeight - node.clientHeight > 8;
      if (scrollable) {
        const maxScroll = node.scrollHeight - node.clientHeight;
        if (deltaY > 0 ? node.scrollTop < maxScroll - 1 : node.scrollTop > 1) {
          return true;
        }
      }
    }
    node = node.parentElement;
  }
  return false;
}

const WeekScroller = forwardRef<WeekScrollerHandle, WeekScrollerProps>(
  function WeekScroller({ selectedWeek, onWeekChange }, ref) {
    const numberOfWeeks = getNumberOfWeeks(new Date());
    const startIndex = clampWeek(selectedWeek, numberOfWeeks) - 1;

    const [emblaRef, emblaApi] = useEmblaCarousel({
      axis: "y",
      align: "start",
      containScroll: false,
      skipSnaps: false,
      duration: 22,
      startIndex,
      dragThreshold: 12,
      watchDrag: (_api, event) => !isEditableTarget(event.target),
    });

    // Which week's PlanArea (± MOUNT_RADIUS) is mounted. Updated only when the
    // carousel is at rest so heavy TipTap editors never mount mid-animation.
    const [mountWeek, setMountWeek] = useState(selectedWeek);
    const dragStartIndexRef = useRef<number | null>(null);

    const scrollToWeek = useCallback(
      (week: number, behavior: ScrollBehavior = "smooth") => {
        if (!emblaApi) return;
        const index = clampWeek(week, numberOfWeeks) - 1;
        emblaApi.scrollTo(index, behavior === "instant");
      },
      [emblaApi, numberOfWeeks],
    );

    useImperativeHandle(ref, () => ({ scrollToWeek }), [scrollToWeek]);

    // Sync the WeekSelector highlight, clamp drags to one week, and defer
    // mounting neighbors until the carousel settles.
    useEffect(() => {
      if (!emblaApi) return;

      const onPointerDown = () => {
        dragStartIndexRef.current = emblaApi.selectedScrollSnap();
      };

      const onSelect = () => {
        const index = emblaApi.selectedScrollSnap();

        // A hard flick can target several weeks away — keep it to one.
        const dragStart = dragStartIndexRef.current;
        if (dragStart != null) {
          const delta = index - dragStart;
          if (Math.abs(delta) > 1) {
            emblaApi.scrollTo(dragStart + Math.sign(delta));
            return;
          }
        }

        onWeekChange(index + 1);
      };

      const onSettle = () => {
        dragStartIndexRef.current = null;
        setMountWeek(emblaApi.selectedScrollSnap() + 1);
      };

      onWeekChange(emblaApi.selectedScrollSnap() + 1);
      emblaApi.on("pointerDown", onPointerDown);
      emblaApi.on("select", onSelect);
      emblaApi.on("settle", onSettle);

      return () => {
        emblaApi.off("pointerDown", onPointerDown);
        emblaApi.off("select", onSelect);
        emblaApi.off("settle", onSettle);
      };
    }, [emblaApi, onWeekChange]);

    // One week per wheel/trackpad gesture; a hard scroll no longer skips weeks.
    useEffect(() => {
      if (!emblaApi) return;
      const root = emblaApi.rootNode();
      let locked = false;
      let unlockTimer = 0;

      const onWheel = (event: WheelEvent) => {
        if (nestedScrollableAllowsWheel(event.target, root, event.deltaY)) {
          return;
        }
        event.preventDefault();
        if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;

        window.clearTimeout(unlockTimer);
        unlockTimer = window.setTimeout(() => {
          locked = false;
        }, WHEEL_GESTURE_GAP_MS);

        if (locked) return;
        locked = true;
        if (event.deltaY > 0) emblaApi.scrollNext();
        else emblaApi.scrollPrev();
      };

      root.addEventListener("wheel", onWheel, { passive: false });
      return () => {
        root.removeEventListener("wheel", onWheel);
        window.clearTimeout(unlockTimer);
      };
    }, [emblaApi]);

    // External week changes (WeekSelector) drive the carousel. Only force a
    // scroll + mount for genuine jumps; natural scroll updates come back
    // through onSelect and settle, so we must not remount mid-animation here.
    useEffect(() => {
      if (!emblaApi) return;
      const index = clampWeek(selectedWeek, numberOfWeeks) - 1;
      if (emblaApi.selectedScrollSnap() !== index) {
        emblaApi.scrollTo(index);
        setMountWeek(selectedWeek);
      }
    }, [emblaApi, selectedWeek, numberOfWeeks]);

    const weeks = useMemo(
      () => Array.from({ length: numberOfWeeks }, (_, i) => i + 1),
      [numberOfWeeks],
    );

    return (
      <div className="min-h-0 flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full flex-col">
          {weeks.map((week) => {
            const isMounted = Math.abs(week - mountWeek) <= MOUNT_RADIUS;
            return (
              <div
                key={week}
                data-week={week}
                className="box-border min-h-0 w-full shrink-0 grow-0 basis-full overflow-hidden"
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
      </div>
    );
  },
);

export { WeekScroller };
