import { getPending, subscribe, chooseAction, finishWatch, nextDay } from '../state/store.js';
import { availableFocuses, FOCUS } from '../engine/index.js';
import { eveningReport } from '../story/briefing.js';
import { currentDialogue } from './renderDialogue.js';

const STYLE = `
#decision .actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-top: 8px; }
#decision .action { border: 1px solid rgba(255, 255, 255, 0.18); padding: 8px; }
#decision .action .good { color: #4cd07a; font-size: 0.95rem; margin: 6px 0 0; }
#decision .action .cost { color: #ff4d2e; font-size: 0.95rem; margin: 2px 0 0; }
#decision .action .reason { color: #ffb02e; font-size: 0.95rem; margin: 4px 0 0; }
#decision .action details { font-size: 0.9rem; color: #c9b4a6; margin-top: 4px; }
#decision .report-list { list-style: none; padding: 0; margin: 8px 0; }
#decision .report-list li { padding: 4px 0; font-size: 1.1rem; }
#decision .report-list li.up { color: #4cd07a; }
#decision .report-list li.down { color: #ffb02e; }
`;

// Runs once in the browser (not in the tests).
if (typeof document !== 'undefined' && !window.__dayReady) {
  window.__dayReady = true;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  // The three day buttons.
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('[data-action]');
    if (!el) return;
    const name = el.dataset.action;
    if (name !== 'choose-action' && name !== 'skip-watch' && name !== 'next-day') return;
    e.stopImmediatePropagation();
    if (name === 'choose-action') chooseAction(el.dataset.focus);
    else if (name === 'skip-watch') finishWatch();
    else nextDay();
    const next =
      document.querySelector('#dialogue:not([hidden]) button') ||
      document.querySelector('#decision button');
    if (next) next.focus({ preventScroll: true });
  });

  // While the crew works, wait a few seconds, then show the evening report.
  let watchTimer = null;
  subscribe((game) => {
    const watching = game.phase === 'colony' && game.day && game.day.stage === 'watch';
    if (watching && !watchTimer) {
      const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      watchTimer = setTimeout(() => {
        watchTimer = null;
        finishWatch();
      }, calm ? 600 : 2600);
    } else if (!watching && watchTimer) {
      clearTimeout(watchTimer);
      watchTimer = null;
    }
  });
}

// Draws the part of the day that is not a conversation. Returns true if it drew something.
export function renderDayPanel(game, el) {
  const stage = game.day && game.day.stage;

  if (stage === 'watch') {
    const focus = FOCUS[game.day.focus] || FOCUS.balanced;
    el.innerHTML = `
      <h2>The crew is working…</h2>
      <p>${focus.summary}</p>
      <p class="note">Watch the outpost.</p>
      <button data-action="skip-watch">Skip</button>`;
    return true;
  }

  if (stage === 'report') {
    const rep = eveningReport(game);
    const rows = rep.rows.length
      ? rep.rows.map((r) => `<li class="${r.good ? 'up' : 'down'}">${r.text}</li>`).join('')
      : '<li>Nothing changed much today.</li>';
    const notes = rep.notes.length
      ? `<ul>${rep.notes.map((n) => `<li>${n}</li>`).join('')}</ul>`
      : '';
    const button = rep.finished
      ? '<button class="primary" data-action="debrief">See the mission debrief</button>'
      : '<button class="primary" data-action="next-day">Next day</button>';
    el.innerHTML = `
      <h2>Evening report: day ${rep.day}</h2>
      <p>${rep.summary}</p>
      <ul class="report-list">${rows}</ul>
      ${notes}
      ${button}`;
    return true;
  }

  if (stage === 'play' && !game.state.finished && !getPending() && !currentDialogue(game)) {
    const cards = availableFocuses(game.state)
      .map(
        (f) => `
        <div class="action">
          <button data-action="choose-action" data-focus="${f.id}" ${f.enabled ? '' : 'disabled'}>${f.label}</button>
          <p class="good">+ ${f.benefit}</p>
          <p class="cost">- ${f.cost}</p>
          ${f.enabled ? '' : `<p class="reason">${f.reason}</p>`}
          <details><summary>Why?</summary>${f.why}</details>
        </div>`
      )
      .join('');
    el.innerHTML = `
      <h2>Day ${game.state.sol + 1}: what will the crew do today?</h2>
      <p class="note">Every choice has a cost. These numbers are game rules.</p>
      <div class="actions">${cards}</div>`;
    return true;
  }

  return false;
}