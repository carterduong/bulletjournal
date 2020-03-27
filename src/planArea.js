import { LitElement, html, css } from 'lit-element/lit-element.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';

export default class planArea extends LitElement {
  static get properties() {
    return {
      now: { type: Date },
      currentWeek: { type: Number },
      currentMonth: { type: Number },
      currentYear: { type: Number },
      dates: { type: Array },
      notes: { type: Array } // [0-5] days, [6] this week, [7] this month, [8] next month
    }
  }

  constructor() {
    super();
    let now = new Date();
    this.now = now;
    this.currentWeek = now.getCurrentWeekNumber();
    this.currentMonth = now.getMonth() + 1;
    this.currentYear = now.getFullYear();
    this.dates = now.getDatesFromWeekNumber(this.currentWeek);
    this.notes = Array(9).fill('', 0, 9).map((item, index) => {
      let date = this.dates[index];
      let dateString = '';

      if (index < 5) {
        dateString = `${date.getMonth() + 1}.${date.getDate()}.${date.getFullYear()}`;
      } else if (index == 5) {
        dateString = `weekend-${this.currentWeek}`;
      } else if (index == 6) {
        dateString = `this-week-${this.currentWeek}`;
      } else if (index == 7) {
        dateString = `this-month-${this.currentMonth}`;
      } else if (index == 8) {
        dateString = `next-month-${this.currentMonth}`;
      }
      return localStorage.getItem(dateString);
    });
  }

  render() {
    return html`
      <label for="${this.printDate(this.dates[0], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[0].getDOY() ? 'date' : undefined)}">
        <span class="heading">Monday<span class="date">${this.printDate(this.dates[0])}</span></span>
        <textarea
          id="${this.printDate(this.dates[0], true)}"
          spellcheck="false" 
          autofocus="${ifDefined(this.now.getDOY() == this.dates[0].getDOY() ? 'true' : undefined)}"
          @input="${this.saveInput}">${this.notes[0]}</textarea>
      </label>
      <label for="${this.printDate(this.dates[1], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[1].getDOY() ? 'date' : undefined)}">
        <span class="heading">Tuesday<span class="date">${this.printDate(this.dates[1])}</span></span>
        <textarea
          id="${this.printDate(this.dates[1], true)}" 
          spellcheck="false" 
          autofocus="${ifDefined(this.now.getDOY() == this.dates[1].getDOY() ? 'true' : undefined)}"
          @input="${this.saveInput}">${this.notes[1]}</textarea>
      </label>
      <label for="${this.printDate(this.dates[2], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[2].getDOY() ? 'date' : undefined)}">
        <span class="heading">Wednesday<span class="date">${this.printDate(this.dates[2])}</span></span>
        <textarea
          id="${this.printDate(this.dates[2], true)}"
          spellcheck="false" 
          autofocus="${ifDefined(this.now.getDOY() == this.dates[2].getDOY() ? 'true' : undefined)}"
          @input="${this.saveInput}">${this.notes[2]}</textarea>
      </label>
      <label for="${this.printDate(this.dates[3], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[3].getDOY() ? 'date' : undefined)}">
        <span class="heading">Thursday<span class="date">${this.printDate(this.dates[3])}</span></span>
        <textarea
          id="${this.printDate(this.dates[3], true)}"
          spellcheck="false" 
          autofocus="${this.now.getDOY() == this.dates[3].getDOY() ? 'true' : 'false'}"
          @input="${this.saveInput}">${this.notes[3]}</textarea>
      </label>
      <label for="${this.printDate(this.dates[4], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[4].getDOY() ? 'date' : undefined)}">
        <span class="heading">Friday <span class="date">${this.printDate(this.dates[4])}</span></span>
        <textarea
          id="${this.printDate(this.dates[4], true)}"
          spellcheck="false" 
          autofocus="${this.now.getDOY() == this.dates[4].getDOY() ? 'true' : 'false'}"
          @input="${this.saveInput}">${this.notes[4]}</textarea>
      </label>
      <label for="weekend-${this.currentWeek}" class="notes weekend">
        <span class="heading">Weekend</span>
        <textarea
          id="weekend-${this.currentWeek}"
          spellcheck="false" 
          @input="${this.saveInput}">${this.notes[5]}</textarea>
      </label>

      <label for="this-week-${this.currentWeek}" class="notes week">
        <span class="heading">This Week</span>
        <textarea
          id="this-week-${this.currentWeek}"
          spellcheck="false"
          @input="${this.saveInput}">${this.notes[6]}</textarea>
      </label>
      <label for="this-month-${this.currentMonth}" class="notes month">
        <span class="heading">This month</span>
        <textarea
          id="this-month-${this.currentMonth}"
          spellcheck="false"
          @input="${this.saveInput}">${this.notes[7]}</textarea>
      </label>
      <label for="next-month-${this.currentMonth}" class="notes month">
        <span class="heading">Next month</span>
          <textarea
            id="next-month-${this.currentMonth}"
            spellcheck="false"
            @input="${this.saveInput}">${this.notes[8]}</textarea>
      </label>
    `
  }

  saveInput(e) {
    let el = e.composedPath()[0];
    localStorage.setItem(el.id, el.value);
  }

  printDate(day, displayYear = false) {
    let dateString;
    displayYear ? 
      dateString = `${day.getMonth() + 1}.${day.getDate()}.${day.getFullYear()}` : 
      dateString = `${day.getMonth() + 1}.${day.getDate()}`;
    return dateString;
  }

  // hightlightCurrentDay() {
  //   if (document.visibilityState != 'visible') { return; }

  //   const days  = Array.from(document.querySelectorAll(".day"));
  //   var today = new Date();
  //   console.log(days);

  //   days.forEach((day, index) => {
  //     unhighlightDay(day);
  //     if (index === today.getDay() - 1) {
  //       highlightDay(day, (today.getMonth() + 1) + "." + (today.getDate()));
  //     }
  //   });
  // } 

  // highlightDay(day, dateString) {
  //   day.setAttribute("aria-current", "date");

  //   let span = document.createElement("span");
  //   span.innerHTML = dateString;

  //   day.querySelector("textarea").setAttribute("autofocus", true);
  //   day.querySelector("textarea").focus();
  //   day.querySelector(".heading").append(span);
  // }

  static get styles() {
    return css`
      .plan {
        padding: 1rem;
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        grid-template-rows: 66% auto;
        grid-gap: .5rem;
        flex-basis: 100%;
      }

      .heading {
        border-bottom: 1px solid var(--color-day-border);
        font-weight: 400;
        padding: .5rem;
        display: flex;
        justify-content: space-between;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: .05em;
      }

      .notes {
        background: var(--color-day-background);
        display: flex;
        flex-direction: column;
        color: var(--color-day-text);
      }

      .notes:focus-within {
        box-shadow: var(--color-focus) 0 0 2px 2px;
      }

      .notes[aria-current] .heading {
        background: var(--color-today-background);
        border-color: var(--color-today-border);
        color: var(--color-today-text);
      }

      .notes[aria-current] textarea {
        background: var(--color-today-background);
        color: var(--color-today-text);
      }

      .week {
        grid-column: span 2;
      }

      .month {
        grid-column: span 2;
      }

      textarea {
        flex-grow: 1;
        border: 0;
        resize: none;
        background: none;
        font: inherit;
        padding: .5rem;
        line-height: 1.5em;
        color: var(--color-day-text);
      }

      textarea:focus {
        outline: 0;
      }

      .date {
        color: darkgrey;
      }
    `;
  }
}
