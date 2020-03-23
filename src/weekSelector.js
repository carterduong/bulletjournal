import { LitElement, html, css } from 'lit-element/lit-element.js';

export default class weekSelector extends LitElement {
  static get properties() {
    return {
      currentWeek: { type: Number },
      currentYear: { type: Number },
      numberOfWeeks: { type: Number },
      startDay: { type: Number },
      dateOfYear: { type: Number },
      weeksArray: { type: Array },
      percentage: { type: Number }
    };
  }

  constructor() {
    super();
    let now = new Date();
    this.currentWeek = now.getCurrentWeekNumber();
    this.currentYear = now.getFullYear();
    this.numberOfWeeks = now.getNumberofWeeks();
    this.startDay = new Date(this.currentYear, 0, 1).getDay();
    this.dateOfYear = now.getDOY();
    this.weeksArray = [ ...Array(this.numberOfWeeks).keys() ].map( i => i + 1 ); // fill an array with week numbers
    this.percentage = this.currentWeek / 52 * 100 | 0 + '%';
    // console.log(`${this.currentWeek} ${this.currentYear} ${this.numberOfWeeks} weeks, startDay: ${this.startDay}`);
  }

  render() {
    return html`
      <ol>
        ${this.weeksArray.map( i => html`
          <li class=${i == this.currentWeek ? 'current-week' : i < this.currentWeek ? 'past-week' : 'future-week'}>
            ${i == this.currentWeek ? i + '*' : i}
          </li>
        ` )}
      </ol> 
      <span id="percentage">${this.percentage}%</span>
    `;
  }

  static get styles() {
    return css`
      ol,
      span {
        margin: 0;
        padding: 0 1rem 1rem 1rem;
      }

      ol {
        list-style: none;
        cursor: pointer;
      }

      li {
        font-variant-numeric: tabular-nums;
        font-size: 0.75rem;
        // display: block;
        display: inline;
      }

      li:hover {
        color: black;
      }

      .past-week,
      .future-week {
        color: lightgray;
      }

      .current-week {
        color: black;
      }

      #percentage {
        font-size: 0.75rem;
      }
    `;
  }
}
