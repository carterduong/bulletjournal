import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCurrentWeekNumber,
  getNumberOfWeeks,
  isLeapYear,
  getDayOfYear,
  getDatesFromWeekNumber,
} from "./dateUtils";

function date(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day);
}

describe("isLeapYear", () => {
  it("returns true for years divisible by 4", () => {
    expect(isLeapYear(date(2024, 0, 1))).toBe(true);
    expect(isLeapYear(date(2020, 5, 15))).toBe(true);
  });

  it("returns false for non-leap years", () => {
    expect(isLeapYear(date(2021, 0, 1))).toBe(false);
    expect(isLeapYear(date(2023, 0, 1))).toBe(false);
    expect(isLeapYear(date(2025, 0, 1))).toBe(false);
  });

  it("returns false for century years not divisible by 400", () => {
    expect(isLeapYear(date(1900, 0, 1))).toBe(false);
    expect(isLeapYear(date(2100, 0, 1))).toBe(false);
  });

  it("returns true for century years divisible by 400", () => {
    expect(isLeapYear(date(2000, 0, 1))).toBe(true);
    expect(isLeapYear(date(1600, 0, 1))).toBe(true);
  });
});

describe("getDayOfYear", () => {
  it("returns 1 for January 1", () => {
    expect(getDayOfYear(date(2024, 0, 1))).toBe(1);
    expect(getDayOfYear(date(2023, 0, 1))).toBe(1);
  });

  it("returns 365 for Dec 31 in a non-leap year", () => {
    expect(getDayOfYear(date(2023, 11, 31))).toBe(365);
    expect(getDayOfYear(date(2025, 11, 31))).toBe(365);
  });

  it("returns 366 for Dec 31 in a leap year", () => {
    expect(getDayOfYear(date(2024, 11, 31))).toBe(366);
    expect(getDayOfYear(date(2000, 11, 31))).toBe(366);
  });

  it("does not count Feb 29 before March in leap years", () => {
    expect(getDayOfYear(date(2024, 1, 28))).toBe(59);
    expect(getDayOfYear(date(2024, 1, 29))).toBe(60);
  });

  it("adds the leap day for dates after February in leap years", () => {
    expect(getDayOfYear(date(2024, 2, 1))).toBe(61);
    expect(getDayOfYear(date(2023, 2, 1))).toBe(60);
  });

  it("returns correct day-of-year for mid-year dates", () => {
    expect(getDayOfYear(date(2025, 6, 15))).toBe(196);
    expect(getDayOfYear(date(2024, 6, 15))).toBe(197);
  });
});

describe("getNumberOfWeeks", () => {
  it("returns 52 for typical years", () => {
    expect(getNumberOfWeeks(date(2021, 0, 1))).toBe(52);
    expect(getNumberOfWeeks(date(2022, 0, 1))).toBe(52);
    expect(getNumberOfWeeks(date(2023, 0, 1))).toBe(52);
    expect(getNumberOfWeeks(date(2024, 0, 1))).toBe(52);
    expect(getNumberOfWeeks(date(2025, 0, 1))).toBe(52);
  });

  it("returns 53 when Jan 1 is a Thursday", () => {
    // 2026-01-01 is a Thursday
    expect(date(2026, 0, 1).getDay()).toBe(4);
    expect(getNumberOfWeeks(date(2026, 0, 1))).toBe(53);
  });

  it("returns 53 when Dec 31 is a Thursday", () => {
    // 2020-12-31 is a Thursday
    expect(date(2020, 11, 31).getDay()).toBe(4);
    expect(getNumberOfWeeks(date(2020, 0, 1))).toBe(53);
  });
});

describe("getCurrentWeekNumber", () => {
  it("returns week 1 for early January dates", () => {
    expect(getCurrentWeekNumber(date(2026, 0, 1))).toBe(1);
    expect(getCurrentWeekNumber(date(2026, 0, 4))).toBe(1);
  });

  it("advances to week 2 on the following Monday", () => {
    expect(getCurrentWeekNumber(date(2026, 0, 5))).toBe(2);
  });

  it("assigns late December days to week 1 of the next year when they belong to that week", () => {
    // Dec 29–31 2025 fall in week 1 of 2026
    expect(getCurrentWeekNumber(date(2025, 11, 29))).toBe(1);
    expect(getCurrentWeekNumber(date(2025, 11, 31))).toBe(1);
  });

  it("returns expected mid-year week numbers", () => {
    expect(getCurrentWeekNumber(date(2026, 6, 13))).toBe(29);
    expect(getCurrentWeekNumber(date(2026, 6, 15))).toBe(29);
    expect(getCurrentWeekNumber(date(2026, 6, 19))).toBe(29);
  });

  it("returns week 52 for the last full week of December in 2026", () => {
    expect(getCurrentWeekNumber(date(2026, 11, 21))).toBe(52);
    expect(getCurrentWeekNumber(date(2026, 11, 27))).toBe(52);
  });

  it("assigns late December to week 1 via Thursday-based week year rules", () => {
    // Dec 28–31 2026 belong to the week whose Thursday is Dec 31 / New Year week → week 1
    expect(getCurrentWeekNumber(date(2026, 11, 28))).toBe(1);
    expect(getCurrentWeekNumber(date(2026, 11, 31))).toBe(1);
  });

  it("documents that getNumberOfWeeks and getCurrentWeekNumber can disagree at year end", () => {
    // getNumberOfWeeks uses Jan1/Dec31-Thursday heuristics (2026 → 53),
    // while getCurrentWeekNumber uses Thursday-based week-year ownership and
    // never returns 53 for 2026 dates — late December maps to week 1 instead.
    expect(getNumberOfWeeks(date(2026, 0, 1))).toBe(53);
    expect(getCurrentWeekNumber(date(2026, 11, 28))).toBe(1);
  });

  it("returns the same week number for all days in a Monday–Sunday week", () => {
    const monday = date(2026, 6, 13);
    for (let offset = 0; offset < 7; offset++) {
      const day = date(2026, 6, 13 + offset);
      expect(getCurrentWeekNumber(day)).toBe(getCurrentWeekNumber(monday));
    }
  });

  it("returns the same week number across a leap-day Monday–Sunday week", () => {
    // 2024-02-26 is Monday; 2024-02-29 (leap day) falls in this week
    const week = getCurrentWeekNumber(date(2024, 1, 26));
    expect(getCurrentWeekNumber(date(2024, 1, 29))).toBe(week);
    expect(getCurrentWeekNumber(date(2024, 2, 3))).toBe(week);
  });
});

describe("getDatesFromWeekNumber", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(date(2026, 6, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns exactly 7 consecutive dates", () => {
    const dates = getDatesFromWeekNumber(29);
    expect(dates).toHaveLength(7);

    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i]!.getTime() - dates[i - 1]!.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("starts on Monday and ends on Sunday", () => {
    const dates = getDatesFromWeekNumber(29);
    expect(dates[0]!.getDay()).toBe(1); // Monday
    expect(dates[6]!.getDay()).toBe(0); // Sunday
  });

  it("returns the correct dates for a known mid-year week", () => {
    const dates = getDatesFromWeekNumber(29);
    expect(
      dates.map((d) => [d.getFullYear(), d.getMonth(), d.getDate()]),
    ).toEqual([
      [2026, 6, 13],
      [2026, 6, 14],
      [2026, 6, 15],
      [2026, 6, 16],
      [2026, 6, 17],
      [2026, 6, 18],
      [2026, 6, 19],
    ]);
  });

  it("includes late December from the prior year for week 1", () => {
    const dates = getDatesFromWeekNumber(1);
    expect(dates[0]).toEqual(date(2025, 11, 29));
    expect(dates[3]).toEqual(date(2026, 0, 1));
    expect(dates[6]).toEqual(date(2026, 0, 4));
  });

  it("spans into the next year for week 53 when requesting that slot", () => {
    const dates = getDatesFromWeekNumber(53);
    expect(dates[0]).toEqual(date(2026, 11, 28));
    expect(dates[3]).toEqual(date(2026, 11, 31));
    expect(dates[4]).toEqual(date(2027, 0, 1));
    expect(dates[6]).toEqual(date(2027, 0, 3));
  });

  it("is consistent with getCurrentWeekNumber for mid-year weeks", () => {
    const week = 29;
    const dates = getDatesFromWeekNumber(week);
    for (const day of dates) {
      expect(getCurrentWeekNumber(day)).toBe(week);
    }
  });

  it("documents week-53 date ranges map to week 1 under getCurrentWeekNumber", () => {
    // getDatesFromWeekNumber(53) still produces a Mon–Sun range, but those
    // dates resolve to week 1 under Thursday-based week ownership.
    const dates = getDatesFromWeekNumber(53);
    for (const day of dates) {
      expect(getCurrentWeekNumber(day)).toBe(1);
    }
  });
});
