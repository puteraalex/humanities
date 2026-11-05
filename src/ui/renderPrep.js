import { totals, canAdd } from '../campaign/index.js';

const REASONS = {
  'over-budget': 'Not enough budget',
  'over-mass': 'Too heavy for the rocket',
  'max-quantity': 'Maximum reached',
};

function bar(label, used, max, unit) {
  const p = Math.min(100, Math.round((used / max) * 100));
  const tone = p >= 90 ? 'warn' : 'ok';
  return `
    <div class="meter" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${used}">
      <div class="meter-head"><span>${label}</span><strong>${used} / ${max} ${unit}</strong></div>
      <div class="meter-bar"><span class="fill ${tone}" style="width:${p}%"></span></div>
    </div>`;
}

export function renderPrep(game) {
  const c = game.campaign;
  const t = totals(c, game.items);

  const cards = game.items
    .map((item) => {
      const owned = c.loadout.filter((id) => id === item.id).length;
      const check = canAdd(c, item.id, game.items);
      return `
        <article class="item">
          <h3>${item.name} ${owned ? `<span class="qty">x${owned}</span>` : ''}</h3>
          <p class="stats">Cost ${item.cost} · Mass ${item.mass}</p>
          <p>${item.description}</p>
          <p class="good">+ ${item.benefit}</p>
          <p class="cost">- ${item.tradeoff}</p>
          <div class="row">
            <button data-buy="${item.id}" ${check.ok ? '' : 'disabled'} aria-label="Buy ${item.name}">Buy</button>
            ${owned ? `<button data-sell="${item.id}" aria-label="Remove one ${item.name}">Remove</button>` : ''}
          </div>
          ${check.ok ? '' : `<small class="reason">${REASONS[check.reason] || ''}</small>`}
        </article>`;
    })
    .join('');

  const counts = {};
  for (const id of c.loadout) counts[id] = (counts[id] || 0) + 1;
  const list = Object.keys(counts)
    .map((id) => `<li>${game.items.find((i) => i.id === id).name} x${counts[id]}</li>`)
    .join('');

  document.getElementById('prep').innerHTML = `
    <section class="panel prep-head">
      <h1>HUMANITIES</h1>
      <p>Step 1: Earth preparation. Fill your rocket. You have a limited budget and cargo mass, and your choices decide how your outpost handles problems on Mars.</p>
    </section>
    <section class="panel limits">
      ${bar('Budget used', t.cost, c.budgetTotal, 'coins')}
      ${bar('Cargo mass used', t.mass, c.massLimit, 'mass')}
    </section>
    <section class="panel">
      <h2>Equipment</h2>
      <div class="items">${cards}</div>
      <p class="note">All costs, masses and effects are game rules, not real spacecraft specs.</p>
    </section>
    <section class="panel">
      <h2>Your cargo</h2>
      ${list ? `<ul>${list}</ul>` : '<p class="note">Nothing yet. A bare outpost will struggle when trouble comes.</p>'}
      <button class="primary" data-action="launch">Launch mission</button>
    </section>`;
}