import "./dateUtils.js"; // extend Date before any component uses it
import weekSelector from "./weekSelector.js";
import planArea from "./planArea.js";

const days = Array.from(document.querySelectorAll(".day"));
const notes = Array.from(document.querySelectorAll("textarea"));

/* Event Listeners */
document.addEventListener("keydown", (e) => {
  if (e.metaKey === true && e.key === "s") {
    e.preventDefault();
  }
});

function updateDates(currentWeek, days) {
  for (let [index, day] of days.entries()) {
    day.id = `w${currentWeek}d${index}`;
  }
}

function hightlightCurrentDay() {
  if (document.visibilityState != "visible") {
    return;
  }

  var today = new Date();

  days.forEach((day, index) => {
    unhighlightDay(day);
    if (index === today.getDay() - 1) {
      highlightDay(day, today.getMonth() + 1 + "." + today.getDate());
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
  if (existingSpan != null) {
    existingSpan.remove();
  }
}

/* Custom Elements */
customElements.define("plan-area", planArea);
customElements.define("week-selector", weekSelector);

// document.addEventListener('week-clicked', (e) => console.log(e))

/* Initial Setup */
hightlightCurrentDay();
document.addEventListener("visibilitychange", hightlightCurrentDay);

// handle note-taking
notes.forEach((note) => {
  const id = note.id;

  // get initial html
  note.value = localStorage.getItem(id);

  // save changes
  note.addEventListener("input", (e) => {
    localStorage.setItem(id, note.value);
  });
});

let currentWeekNumber = new Date().getCurrentWeekNumber();
updateDates(currentWeekNumber, days);
