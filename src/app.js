import { LitElement, html, css } from 'lit-element/lit-element.js';
import weekSelector from './weekSelector.js';

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

/* 
// returns an array of dates returned from a week number
getDaysFromWeekNumber(weekNumber) {
  return Array(Dates...) // [Date, Date, Date, Date, Date, Date, Date]
}
*/

// Update sidebar and notes
function onWeekClick(weekNumber) {
  // sidebar
  let oldWeek = document.getElementById(currentWeekNumber);
  oldWeek.classList = "";

  if (weekNumber < currentWeekNumber) {
    oldWeek.classList.add('future-week'); 
  } else if (weekNumber > currentWeekNumber) {
    oldWeek.classList.add('past-week');
  } else {
    oldWeek.classList.add('current-week');
  }

  let clickedWeek = document.getElementById(weekNumber);
  clickedWeek.classList.add('current-week');
  currentWeekNumber = weekNumber;
}

function updateDates(currentWeek, days) {
  for (let [index, day] of days.entries()) {
    day.id = `w${currentWeek}d${index}`;
  }
}

function updateNoteIds(weekNumber) {
  notes.forEach(note => {
  });
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
customElements.define('week-selector', weekSelector);

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
// document.getElementById('percentage').textContent = `${(currentWeekNumber / 52 * 100 | 0) + '%'}`;
updateDates(currentWeekNumber, days);

// if ('content' in document.createElement('template')) {
//   let template = document.querySelector('#weekrow');
//   let menu = document.querySelector('.weeks');

//   for (let i = 0; i < 52; i++) {
//     var clone = template.content.cloneNode(true);
//     var li = clone.querySelectorAll("li")[0];
//     li.id =`${i + 1}`;
//     li.textContent = `${i + 1}`;
//     li.onclick = () => {
//       onWeekClick(i + 1);
//     };
//     menu.appendChild(clone);

//     if (i < currentWeekNumber - 1) {
//       li.classList.add('past-week')
//     } else if (i == currentWeekNumber - 1) {
//       li.classList.add('current-week')
//       li.textContent = li.textContent + '*';
//     } else {
//       li.classList.add('future-week');
//     }
//   }
// }
