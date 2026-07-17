export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function getCurrentWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 5 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

export function getNumberOfWeeks(date: Date): number {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1).getDay();
  const dec31 = new Date(year, 11, 31).getDay();
  return jan1 === 4 || dec31 === 4 ? 53 : 52;
}

export function isLeapYear(date: Date): boolean {
  const year = date.getFullYear();
  if ((year & 3) !== 0) return false;
  return year % 100 !== 0 || year % 400 === 0;
}

export function getDayOfYear(date: Date): number {
  const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const mn = date.getMonth();
  const dn = date.getDate();
  let dayOfYear = dayCount[mn]! + dn;
  if (mn > 1 && isLeapYear(date)) dayOfYear++;
  return dayOfYear;
}

export function getDatesFromWeekNumber(weekNumber: number): Date[] {
  const currentYear = new Date().getFullYear();
  const jan1 = new Date(currentYear, 0, 1);
  let dayNumber = 1;
  for (let i = 1; i < weekNumber; i++) {
    dayNumber += 7;
  }
  dayNumber -= jan1.getDay() - 1;

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(jan1.getFullYear(), 0, 1);
    day.setDate(dayNumber + index);
    return day;
  });
}

export function formatDate(day: Date, includeYear = false): string {
  if (includeYear) {
    return `${getMonthForDay(day)}.${day.getDate()}.${day.getFullYear()}`;
  }
  return `${getMonthForDay(day)}.${day.getDate()}`;
}

export function getMonthForDay(day: Date): number {
  return day.getMonth() + 1;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getMonthForWeek(dates: Date[], now: Date): number {
  const todayInWeek = dates.some((day) => isSameCalendarDay(day, now));
  return todayInWeek ? getMonthForDay(now) : getMonthForDay(dates[0]!);
}
