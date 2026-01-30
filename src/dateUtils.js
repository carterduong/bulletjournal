/* Date prototype extensions - must load before any component that uses them */

Date.prototype.getCurrentWeekNumber = function () {
  var d = new Date(
    Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()),
  );
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 5 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

Date.prototype.getNumberofWeeks = function () {
  // ISO 8601: A year has 53 weeks if Jan 1 is Thursday,
  // or if Dec 31 is Thursday (which happens in leap years when Jan 1 is Wednesday)
  var year = this.getFullYear();
  var jan1 = new Date(year, 0, 1).getDay();
  var dec31 = new Date(year, 11, 31).getDay();
  // Thursday = 4
  return jan1 === 4 || dec31 === 4 ? 53 : 52;
};

Date.prototype.isLeapYear = function () {
  var year = this.getFullYear();
  if ((year & 3) != 0) return false;
  return year % 100 != 0 || year % 400 == 0;
};

// Get Day of Year
Date.prototype.getDOY = function () {
  var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  var mn = this.getMonth();
  var dn = this.getDate();
  var dayOfYear = dayCount[mn] + dn;
  if (mn > 1 && this.isLeapYear()) dayOfYear++;
  return dayOfYear;
};

/* Given a week number, return an array of Dates starting on that week's monday */
Date.prototype.getDatesFromWeekNumber = function (weekNumber) {
  const currentYear = new Date().getFullYear();
  let jan1 = new Date(currentYear, 0, 1);
  let dayNumber = 1;
  for (let i = 1; i < weekNumber; i++) {
    dayNumber += 7;
  }
  dayNumber -= jan1.getDay() - 1; // offset day of jan1, minus one to start on monday

  return Array(7)
    .fill()
    .map((item, index) => {
      let day = new Date(jan1.getFullYear(), 0, 1);
      day.setDate(dayNumber + index);
      return day;
    });
};
