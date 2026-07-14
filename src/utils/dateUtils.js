export function getCurrentWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 5 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function getNumberOfWeeks(date) {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1).getDay();
  const dec31 = new Date(year, 11, 31).getDay();
  return jan1 === 4 || dec31 === 4 ? 53 : 52;
}

export function isLeapYear(date) {
  const year = date.getFullYear();
  if ((year & 3) !== 0) return false;
  return year % 100 !== 0 || year % 400 === 0;
}

export function getDayOfYear(date) {
  const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const mn = date.getMonth();
  const dn = date.getDate();
  let dayOfYear = dayCount[mn] + dn;
  if (mn > 1 && isLeapYear(date)) dayOfYear++;
  return dayOfYear;
}

export function getDatesFromWeekNumber(weekNumber) {
  const currentYear = new Date().getFullYear();
  const jan1 = new Date(currentYear, 0, 1);
  let dayNumber = 1;
  for (let i = 1; i < weekNumber; i++) {
    dayNumber += 7;
  }
  dayNumber -= jan1.getDay() - 1;

  return Array(7)
    .fill()
    .map((_, index) => {
      const day = new Date(jan1.getFullYear(), 0, 1);
      day.setDate(dayNumber + index);
      return day;
    });
}
