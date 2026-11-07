import { getPending, getPendingQuestion, advanceDialogue } from '../state/store.js';
import { introLines, replyLines, SPEAKERS } from '../story/dialogue.js';
import { portraitUrl } from './portraits.js';

// The look of the dialogue box lives here, so it works even if style.css is missing it.
const STYLE = `
.view .dialogue { position: absolute; left: 8px; right: 8px; top: 8px; z-index: 20; display: flex; gap: 12px; align-items: center; background: rgba(14, 18, 48, 0.95); border: 2px solid #ff7a2f; box-shadow: 4px 4px 0 #000; padding: 10px 12px; }
.view .dialogue[hidden] { display: none !important; }
.view .dialogue .portrait { width: 72px; height: 72px; flex: none; image-rendering: pixelated; border: 2px solid #ff7a2f; background: #14100e; }
.view .dialogue .said { flex: 1; }
.view .dialogue .said strong { color: #ff7a2f; font-size: 1rem; }
.view .dialogue .said p { font-size: 1.2rem; line-height: 1.4; margin: 4px 0 0; }
.view .dialogue .count { color: #c9b4a6; font-size: 0.9rem; }
.view .dialogue button { flex: none; }
@media (max-width: 600px) {
  .view .dialogue { flex-wrap: wrap; }
  .view .dialogue .portrait { width: 56px; height: 56px; }
  .view .dialogue .said p { font-size: 1.05rem; }
}
`;

// Runs once in the browser (not in the tests): adds the styles and the Next button's click.
if (typeof document !== 'undefined' && !window.__dialogueReady) {
  window.__dialogueReady = true;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-action="dialogue-next"]');
    if (!btn) return;
    e.stopImmediatePropagation(); // so another handler cannot also advance the line
    advanceDialogue();
    const next =
      document.querySelector('#dialogue:not([hidden]) button') ||
      document.querySelector('#decision button');
    if (next) next.focus({ preventScroll: true });
  });
}

// The line that should be on screen right now, or null.
export function currentDialogue(game) {
  if (game.phase !== 'colony' || !game.story) return null;

  if (game.story.reply) {
    const { eventId, optionId, index } = game.story.reply;
    const lines = replyLines(eventId, optionId, game);
    if (lines[index]) return { kind: 'reply', line: lines[index], index, total: lines.length };
  }

  const pending = getPending();
  if (pending && !getPendingQuestion() && !game.story.introDone[pending.id]) {
    const lines = introLines(pending.id, game, pending);
    const index = game.story.introIndex;
    if (lines[index]) return { kind: 'intro', line: lines[index], index, total: lines.length };
  }
  return null;
}

export function renderDialogue(game) {
  const el = document.getElementById('dialogue');
  if (!el) return;
  const d = currentDialogue(game);
  if (!d) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  const last = d.index === d.total - 1;
  el.hidden = false;
  el.innerHTML = `
    <img class="portrait" src="${portraitUrl(d.line.who)}" alt="">
    <div class="said">
      <strong>${SPEAKERS[d.line.who] || ''}</strong>
      <p>${d.line.text}</p>
      <span class="count">${d.index + 1} of ${d.total}</span>
    </div>
    <button class="primary" data-action="dialogue-next">${last ? 'Got it' : 'Next'}</button>`;
}