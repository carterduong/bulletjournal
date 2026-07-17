import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { getNumberOfWeeks } from "../utils/dateUtils";
import { PlanArea } from "./PlanArea";

/** How many weeks on each side of the selected week stay mounted. */
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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'textarea, input, select, [contenteditable="true"], .ProseMirror',
    ),
  );
}

const WeekScroller = forwardRef<WeekScrollerHandle, WeekScrollerProps>(
  function WeekScroller({ selectedWeek, onWeekChange }, ref) {
    const numberOfWeeks = getNumberOfWeeks(new Date());
    const startIndex = clampWeek(selectedWeek, numberOfWeeks) - 1;

    const plugins = useMemo(
      () => [WheelGesturesPlugin({ forceWheelAxis: "y" })],
      [],
    );

    const [emblaRef, emblaApi] = useEmblaCarousel(
      {
        axis: "y",
        align: "start",
        containScroll: false,
        skipSnaps: false,
        duration: 20,
        startIndex,
        watchDrag: (_api, event) => !isEditableTarget(event.target),
      },
      plugins,
    );

    const [mountWeek, setMountWeek] = useState(selectedWeek);

    const scrollToWeek = useCallback(
      (week: number, behavior: ScrollBehavior = "smooth") => {
        if (!emblaApi) return;
        const index = clampWeek(week, numberOfWeeks) - 1;
        emblaApi.scrollTo(index, behavior === "instant");
      },
      [emblaApi, numberOfWeeks],
    );

    useImperativeHandle(ref, () => ({ scrollToWeek }), [scrollToWeek]);

    useEffect(() => {
      if (!emblaApi) return;

      const onSelect = () => {
        const week = emblaApi.selectedScrollSnap() + 1;
        setMountWeek(week);
        onWeekChange(week);
      };

      onSelect();
      emblaApi.on("select", onSelect);
      return () => {
        emblaApi.off("select", onSelect);
      };
    }, [emblaApi, onWeekChange]);

    // External week changes (WeekSelector) drive the carousel.
    useEffect(() => {
      if (!emblaApi) return;
      const index = clampWeek(selectedWeek, numberOfWeeks) - 1;
      if (emblaApi.selectedScrollSnap() === index) {
        setMountWeek(selectedWeek);
        return;
      }
      emblaApi.scrollTo(index);
      setMountWeek(selectedWeek);
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
      </div>
    );
  },
);

export { WeekScroller };
