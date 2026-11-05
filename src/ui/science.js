import SOURCES from '../data/sources.json';
import CARDS from '../data/cards.json';

const KIND_LABEL = { measured: 'Real NASA measurement', 'game-rule': 'Game rule' };

const link = (s) =>
  s.url ? `<br><a href="${s.url}" target="_blank" rel="noopener">Open the source</a>` : '';

// A short science card shown with a decision.
export function cardHtml(cardId) {
  const card = CARDS.find((c) => c.id === cardId);
  if (!card) return '';
  const src = SOURCES.find((s) => s.id === card.sourceId);
  return `
    <aside class="card">
      <h3>${card.title} <span class="tag">${KIND_LABEL[card.kind]}</span></h3>
      <p>${card.text}</p>
      ${card.gameNote ? `<p class="note">${card.gameNote}</p>` : ''}
      ${src && src.url ? `<p class="note">Source: <a href="${src.url}" target="_blank" rel="noopener">${src.name}</a></p>` : ''}
    </aside>`;
}

// The in-game science reference list.
export function sourcesHtml() {
  const items = SOURCES.map(
    (s) => `
      <li>
        <strong>${s.name}</strong>
        <span class="tag">${KIND_LABEL[s.kind]}${s.archived ? ' · archived, not live' : ''}</span>
        ${link(s)}
        <br><em>What we used:</em> ${s.used}
        <br><em>How it affects the game:</em> ${s.affects}
        <br><em>Simplified:</em> ${s.simplified}
      </li>`
  ).join('');
  return `<details class="sources"><summary>Science sources</summary><ul>${items}</ul></details>`;
}