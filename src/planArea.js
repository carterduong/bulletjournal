import { LitElement, html, css } from 'lit-element/lit-element.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { live } from 'lit-html/directives/live.js';
import weekSelector from './weekSelector.js';

export default class planArea extends LitElement {
  static get properties() {
    return {
      now: { type: Date },
      currentWeek: { type: Number },
      currentMonth: { type: Number },
      currentYear: { type: Number },
      dates: { type: Array },
      notes: { type: Object }, // [0-5] days, [6] this week, [7] this month, [8] next month
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
    this.fetchNotes();
  }

  render() {
    return html`
      <label for="${this.printDate(this.dates[0], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[0].getDOY() ? 'date' : undefined)}">
        <span class="heading">Monday<span class="date">${this.printDate(this.dates[0])}</span></span>
        <textarea
          id="${this.printDate(this.dates[0], true)}"
          spellcheck="false" 
          autofocus="${ifDefined(this.now.getDOY() == this.dates[0].getDOY() ? 'true' : undefined)}"
          @input="${this.saveInput}"
          .value="${this.notes[Object.keys(this.notes)[0]]}"></textarea>
      </label>
      <label for="${this.printDate(this.dates[1], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[1].getDOY() ? 'date' : undefined)}">
        <span class="heading">Tuesday<span class="date">${this.printDate(this.dates[1])}</span></span>
        <textarea
          id="${this.printDate(this.dates[1], true)}" 
          spellcheck="false" 
          autofocus="${ifDefined(this.now.getDOY() == this.dates[1].getDOY() ? 'true' : undefined)}"
          @input="${this.saveInput}"
          .value="${this.notes[Object.keys(this.notes)[1]]}"></textarea>
      </label>
      <label for="${this.printDate(this.dates[2], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[2].getDOY() ? 'date' : undefined)}">
        <span class="heading">Wednesday<span class="date">${this.printDate(this.dates[2])}</span></span>
        <textarea
          id="${this.printDate(this.dates[2], true)}"
          spellcheck="false" 
          autofocus="${ifDefined(this.now.getDOY() == this.dates[2].getDOY() ? 'true' : undefined)}"
          @input="${this.saveInput}"
          .value="${this.notes[Object.keys(this.notes)[2]]}"></textarea>
      </label>
      <label for="${this.printDate(this.dates[3], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[3].getDOY() ? 'date' : undefined)}">
        <span class="heading">Thursday<span class="date">${this.printDate(this.dates[3])}</span></span>
        <textarea
          id="${this.printDate(this.dates[3], true)}"
          spellcheck="false" 
          autofocus="${ifDefined(this.now.getDOY() == this.dates[3].getDOY() ? 'true' : undefined)}"
          @input="${this.saveInput}"
          .value="${this.notes[Object.keys(this.notes)[3]]}"></textarea>
      </label>
      <label for="${this.printDate(this.dates[4], true)}" class="notes day" aria-current="${ifDefined(this.now.getDOY() == this.dates[4].getDOY() ? 'date' : undefined)}">
        <span class="heading">Friday <span class="date">${this.printDate(this.dates[4])}</span></span>
        <textarea
          id="${this.printDate(this.dates[4], true)}"
          spellcheck="false" 
          autofocus="${ifDefined(this.now.getDOY() == this.dates[4].getDOY() ? 'true' : undefined)}"
          @input="${this.saveInput}"
          .value="${this.notes[Object.keys(this.notes)[4]]}"></textarea>
      </label>
      <label
        for="weekend-${this.currentWeek}"
        class="notes weekend" 
        aria-current="${ifDefined(this.now.getDOY() == this.dates[5].getDOY() || this.now.getDOY() == this.dates[6].getDOY()? 'date' : undefined)}">
        <span class="heading">Weekend</span>
        <textarea
          id="weekend-${this.currentWeek}"
          spellcheck="false" 
          autofocus="${ifDefined(this.now.getDOY() == this.dates[5].getDOY() ||
                                 this.now.getDOY() == this.dates[6].getDOY() ? 'true' : undefined)}"
          @input="${this.saveInput}"
          .value="${this.notes[Object.keys(this.notes)[5]]}"></textarea>
      </label>

      <label for="this-week-${this.currentWeek}" class="notes week">
        <span class="heading">This Week</span>
        <textarea
          id="this-week-${this.currentWeek}"
          spellcheck="false"
          @input="${this.saveInput}"
          .value="${this.notes[Object.keys(this.notes)[6]]}"></textarea>
      </label>
      <label for="this-month-${this.currentMonth}" class="notes month">
        <span class="heading">This month</span>
        <textarea
          id="this-month-${this.currentMonth}"
          spellcheck="false"
          @input="${this.saveInput}"
          .value="${this.notes[Object.keys(this.notes)[7]]}"></textarea>
      </label>
      <label for="next-month-${this.currentMonth}" class="notes month">
        <span class="heading">Next month</span>
          <textarea
            id="next-month-${this.currentMonth}"
            spellcheck="false"
            @input="${this.saveInput}"
            .value="${this.notes[Object.keys(this.notes)[8]]}"></textarea>
      </label>
      <week-selector @week-clicked=${this.updateWeek}></week-selector>
    `
  }

  /* Update IDs and set current week according to it's Monday */
  updateWeek(event) {
    let clickedWeek = event.detail.week;
    this.currentWeek = clickedWeek;
    this.dates = new Date().getDatesFromWeekNumber(clickedWeek);
    clickedWeek == this.now.getCurrentWeekNumber() ? 
      this.currentMonth = this.now.getMonth() + 1 :
      this.currentMonth = this.dates[0].getMonth() + 1;
    this.fetchNotes();
  }
  
  fetchNotes() {
    this.notes = {};

    for (let index = 0; index < 9; index++) {
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
      
      this.notes[dateString] = localStorage.getItem(dateString);
    }
    // console.log(this.notes);
  }

  saveInput(event) {
    let el = event.composedPath()[0];
    localStorage.setItem(el.id, el.value);
    this.notes[el.id] = el.value;
  }

  printDate(day, displayYear = false) {
    let dateString;
    displayYear ? 
      dateString = `${day.getMonth() + 1}.${day.getDate()}.${day.getFullYear()}` : 
      dateString = `${day.getMonth() + 1}.${day.getDate()}`;
    return dateString;
  }

  static get styles() {
    return css`
      week-selector {
        display: flex;
        justify-content: space-between;
        grid-column: span 6 / auto;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
      } 
      
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
