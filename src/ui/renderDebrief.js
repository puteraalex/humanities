import { buildDebrief, sessionTotals, VERDICT_TEXT } from '../campaign/index.js';
import { getSessionLog } from '../state/store.js';
import { cardHtml } from './science.js';
import { questionHtml } from './quiz.js';

const reviewItem = (x) => `<li>${x.text}${x.cardId ? cardHtml(x.cardId) : ''}</li>`;

function whatIfHtml(list) {
  if (!list.length) {
    return '<p class="note">No big events happened, so there is nothing to compare.</p>';
  }
  return list
    .map(
      (w) => `
      <h3>${w.title} (day ${w.day})</h3>
      <div class="scroll">
        <table>
          <caption class="note">Same storm days and same gear. Only this choice changes.</caption>
          <thead>
            <tr>
              <th scope="col">Choice</th><th scope="col">Survived?</th><th scope="col">Health</th>
              <th scope="col">Research</th><th scope="col">Radiation</th><th scope="col">Food</th>
            </tr>
          </thead>
          <tbody>
            ${w.options
              .map(
                (o) => `
              <tr class="${o.chosen ? 'mine' : ''}">
                <th scope="row">${o.label}${o.chosen ? ' (your choice)' : ''}</th>
                <td>${o.alive ? 'Yes' : 'No'}</td><td>${o.health}%</td>
                <td>${o.research}%</td><td>${o.exposure}</td><td>${o.food}%</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
    )
    .join('');
}

const answerRow = (label, x) =>
  x && x.answered
    ? `<p><strong>${label}:</strong> ${x.prompt}<br>
        You said: ${x.answerText}
        <span class="${x.correct ? 'right' : 'wrong'}">${x.correct ? 'Correct' : 'Not quite'}</span>
        ${x.correct ? '' : `<br>Better answer: ${x.correctText}`}
        <br><small>${x.explanation}</small></p>`
    : '';

function learningHtml(list) {
  if (!list.length) return '';
  const t = sessionTotals(getSessionLog());
  const blocks = list
    .map((l) => {
      if (l.post && !l.post.answered) {
        return `<h3>${l.title}</h3>${questionHtml(l.post)}
          ${l.pre ? '<p class="note">Your earlier prediction will show up after you answer.</p>' : ''}`;
      }
      return `<h3>${l.title}</h3>
        ${answerRow('Before', l.pre)}
        ${answerRow('After', l.post)}
        ${l.verdict ? `<p class="verdict">${VERDICT_TEXT[l.verdict]}</p>` : ''}`;
    })
    .join('');
  return `
    <section class="panel">
      <h2>Check what you learned</h2>
      ${blocks}
      <p class="note">This session: predictions before storms ${t.before.right} of ${t.before.total} right. Questions after: ${t.after.right} of ${t.after.total} right. This is just a fun check. It does not prove how well the game teaches.</p>
    </section>`;
}

export function renderDebrief(game) {
  const d = buildDebrief(game);
  const o = d.outcome;

  const trail = d.trail
    .map(
      (n) => `
      <li class="${n.kind}">
        <strong>${n.title}</strong>
        ${n.text ? `<br>${n.text}` : ''}
        ${n.because && n.because.length ? `<br><small>Because: ${n.because.join(' · ')}</small>` : ''}
        ${n.meta ? `<br><small>${n.meta}</small>` : ''}
      </li>`
    )
    .join('');

  document.getElementById('debrief').innerHTML = `
    <section class="panel prep-head">
      <h1>${o.alive ? 'Mission complete!' : 'Mission failed'}</h1>
      <p>${o.alive ? `The crew survived all ${o.sols} days.` : `The crew lasted ${o.sols} days.`} Here is why it happened.</p>
      <ul>
        <li>Crew health: ${o.health}% · Research: ${o.research}%</li>
        <li>Radiation: ${o.exposure} of 60 (the safe limit)</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Domino Trail: what led to what</h2>
      <ol class="trail">${trail}</ol>
    </section>

    <section class="panel cols">
      <div>
        <h2>What went well</h2>
        <ul>${d.wentWell.length ? d.wentWell.map(reviewItem).join('') : '<li>Nothing went well this time. Try again!</li>'}</ul>
      </div>
      <div>
        <h2>What could be better</h2>
        <ul>${d.improve.map(reviewItem).join('')}</ul>
      </div>
    </section>

    ${learningHtml(d.learning)}

    <section class="panel">
      <h2>Supplies</h2>
      <div class="scroll">
        <table>
          <thead><tr><th scope="col">Supply</th><th scope="col">Left at the end</th><th scope="col">Lowest it got</th></tr></thead>
          <tbody>
            <tr><th scope="row">Air</th><td>${d.left.o2}%</td><td>${d.lowest.o2}%</td></tr>
            <tr><th scope="row">Water</th><td>${d.left.water}%</td><td>${d.lowest.water}%</td></tr>
            <tr><th scope="row">Food</th><td>${d.left.food}%</td><td>${d.lowest.food}%</td></tr>
            <tr><th scope="row">Battery</th><td>${d.left.battery}</td><td>${d.lowest.battery}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>What if you chose differently?</h2>
      ${whatIfHtml(d.whatIf)}
    </section>

    <section class="panel">
      <button class="primary" data-action="retry-same">Try again with the same storm days</button>
      <button class="primary" data-action="restart">Play again with new storm days</button>
      <p class="note">This is a game. It does not predict what would happen to real astronauts. All numbers are game rules unless a card says they come from NASA.</p>
    </section>`;
}