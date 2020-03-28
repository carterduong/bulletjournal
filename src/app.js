import weekSelector from './weekSelector.js';
import planArea from './planArea.js';

const days  = Array.from(document.querySelectorAll(".day"));
const notes = Array.from(document.querySelectorAll("textarea"));

/* Event Listeners */
document.addEventListener("keydown", e => {
  if (e.metaKey === true && e.key === "s") {
    e.preventDefault();
  }
});

/* Methods */
Date.prototype.getCurrentWeekNumber = function() {
  var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
};

Date.prototype.getNumberofWeeks = function() {
  var d = new Date(new Date().getFullYear(), 11, 31);
  var first = new Date(d.getFullYear(),0,1);
  var dayms = 1000 * 60 * 60 * 24;
  var numday = ((d - first)/dayms)
  var weeks = Math.ceil((numday + first.getDay()+1) / 7) ; 
  return weeks
}

Date.prototype.isLeapYear = function() {
  var year = this.getFullYear();
  if((year & 3) != 0) return false;
  return ((year % 100) != 0 || (year % 400) == 0);
};

// Get Day of Year
Date.prototype.getDOY = function() {
  var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  var mn = this.getMonth();
  var dn = this.getDate();
  var dayOfYear = dayCount[mn] + dn;
  if(mn > 1 && this.isLeapYear()) dayOfYear++;
  return dayOfYear;
};

/* Given a week number, return an array of Dates starting on that week's monday */
Date.prototype.getDatesFromWeekNumber = function(weekNumber) {
  let jan1 = new Date(2020, 0, 1);
  let dayNumber = 1;
  for (let i = 1; i < weekNumber; i++) {
    dayNumber += 7;
  }
  dayNumber -= (jan1.getDay() - 1); // offset day of jan1, minus one to start on monday

  return Array(7).fill().map((item, index) => {
    let day = new Date(jan1.getFullYear(), 0, 1);
    day.setDate(dayNumber + index);
    return day;
  });
}

function updateDates(currentWeek, days) {
  for (let [index, day] of days.entries()) {
    day.id = `w${currentWeek}d${index}`;
  }
}

function hightlightCurrentDay() {
  if (document.visibilityState != 'visible') { return; }

  var today = new Date();

  days.forEach((day, index) => {
    unhighlightDay(day);
    if (index === today.getDay() - 1) {
      highlightDay(day, (today.getMonth() + 1) + "." + (today.getDate()));
    }
  });
}

function highlightDay(day, dateString) {
  day.setAttribute("aria-current", "date");

  let span = document.createElement("span");
  span.innerHTML = dateString;

  day.querySelector("textarea").setAttribute("autofocus", true);
  day.querySelector("textarea").focus();
  day.querySelector(".heading").append(span);
}

function unhighlightDay(day) {
  day.removeAttribute("aria-current");
  day.querySelector("textarea").removeAttribute("autofocus");
  let existingSpan = day.querySelector(".heading > span");
  if (existingSpan != null) { existingSpan.remove() }
}

/* Custom Elements */
customElements.define('plan-area', planArea);
customElements.define('week-selector', weekSelector);

// document.addEventListener('week-clicked', (e) => console.log(e))

/* Initial Setup */
hightlightCurrentDay();
document.addEventListener('visibilitychange', hightlightCurrentDay);

// handle note-taking
notes.forEach(note => {
  const id = note.id;

  // get initial html
  note.value = localStorage.getItem(id);

  // save changes
  note.addEventListener("input", e => {
    localStorage.setItem(id, note.value);
  });
});

let currentWeekNumber = new Date().getCurrentWeekNumber();
updateDates(currentWeekNumber, days);
