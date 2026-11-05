import { CONFIG } from '../engine/index.js';
import { getPending, getPendingQuestion, getScreen } from '../state/store.js';
import { renderTitle, renderStory } from './renderTitle.js';
import { questionHtml } from './quiz.js';
import { renderPrep } from './renderPrep.js';
import { cardHtml, sourcesHtml } from './science.js';
import { renderDebrief } from './renderDebrief.js';

const $ = (id) => document.getElementById(id);
const pct = (v, max = 100) => Math.max(0, Math.min(100, Math.round((v / max) * 100)));
const tone = (p) => (p >= 60 ? 'ok' : p >= 30 ? 'warn' : 'bad');
const toneLabel = (p) => (p >= 60 ? 'Good' : p >= 30 ? 'Low' : 'Danger');

const SYSTEM_NAMES = {
  lifeSupport: 'Life support',
  protection: 'Radiation shield',
  greenhouse: 'Greenhouse',
  research: 'Research',
};
const EFFECT_TO_SYSTEM = {
  o2: 'lifeSupport',
  water: 'lifeSupport',
  food: 'greenhouse',
  lifeSupport: 'lifeSupport',
  protection: 'protection',
  greenhouse: 'greenhouse',
  research: 'research',
};
const EXPLAIN = {
  'underpowered:lifeSupport': 'Life support is short on power, so air and water are made more slowly.',
  'underpowered:protection': 'The radiation shield is short on power, so more radiation gets in.',
  'underpowered:greenhouse': 'The greenhouse is short on power, so the crops are shrinking. Less food will grow later.',
  'underpowered:research': 'Research is waiting for power, so it is slowing down.',
  'empty:o2': 'The oxygen ran out! The crew is in danger.',
  'empty:water': 'The water ran out! The crew is in danger.',
  'empty:food': 'The food ran out! The crew is getting weak.',
  'over-limit:protection': 'The crew has had too much radiation. Health is dropping.',
  'burst:protection': 'A burst of radiation from the solar storm reached the outpost. Your shielding and your choice decided how much got through.',
};
const DETAIL = {
  lifeSupport: (s) => `Air ${pct(s.stocks.o2)}% · Water ${pct(s.stocks.water)}%`,
  protection: (s) => `Radiation: ${Math.round(s.protection.exposure)} of ${CONFIG.exposureLimit}`,
  greenhouse: (s) => `Crops ${Math.round(s.crops)}% · Food ${Math.round(s.stocks.food)}%`,
  research: (s) => `Progress ${Math.round(s.research)}%`,
};

function meter(label, value) {
  return `
    <div class="meter" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}">
      <div class="meter-head"><span>${label}</span><strong>${value}% · ${toneLabel(value)}</strong></div>
      <div class="meter-bar"><span class="fill ${tone(value)}" style="width:${value}%"></span></div>
    </div>`;
}

function powerStatus(game, id) {
  if (!game.lastDay) return { text: 'Ready', tone: 'ok' };
  const e = game.lastDay.effects.find((x) => x.kind === 'underpowered' && x.system === id);
  if (!e) return { text: 'Full power', tone: 'ok' };
  return e.ratio <= 0 ? { text: 'No power', tone: 'bad' } : { text: 'Low power', tone: 'warn' };
}

function explanations(game) {
  if (!game.lastDay) return [];
  const seen = new Set();
  const lines = [];
  for (const e of game.lastDay.effects) {
    const text = EXPLAIN[`${e.kind}:${e.system}`];
    if (text && !seen.has(text)) {
      seen.add(text);
      lines.push(text);
    }
  }
  return lines;
}

function renderTop(game) {
  const s = game.state;
  const day = Math.min(s.sol + 1, CONFIG.missionSols);
  $('topbar').innerHTML = `
    <div class="brand"><h1>HUMANITIES</h1><p>Mars outpost trainer</p></div>
    <div class="day"><span>Day</span><strong>${day} / ${CONFIG.missionSols}</strong></div>
    <div class="meters">
      ${meter('Power (battery)', pct(s.power.battery, s.power.batteryMax))}
      ${meter('Air & water', pct(Math.min(s.stocks.o2, s.stocks.water), CONFIG.stockMax))}
      ${meter('Radiation safety', 100 - pct(s.protection.exposure, CONFIG.exposureLimit))}
      ${meter('Crew health', Math.round(s.health))}
    </div>`;
}

function renderEnv(game) {
  const s = game.state;
  const sunlight = 100 - Math.round(s.env.dustLoss * 100);
  $('env').innerHTML = `
    <h2>Outpost conditions</h2>
    <dl>
      <dt>Sunlight reaching the panels</dt>
      <dd>${sunlight}% <span class="tag">game rule</span></dd>
      <dt>Crew size</dt>
      <dd>${s.crew} <span class="tag">game rule</span></dd>
      <dt>Radiation shield strength</dt>
      <dd>${Math.round(s.protection.shielding * 100)}% <span class="tag">game rule</span></dd>
      <dt>Power from solar panels</dt>
      <dd>${s.power.generation} units <span class="tag">game rule</span></dd>
    </dl>
    <p class="note">These numbers are game rules. The solar storm event is based on a real NASA measurement.</p>
    ${sourcesHtml()}`;
}

function renderSystems(game) {
  const s = game.state;
  const hit = new Set(game.lastDay ? game.lastDay.effects.map((e) => EFFECT_TO_SYSTEM[e.system]) : []);
  const tiles = Object.keys(SYSTEM_NAMES)
    .map((id) => {
      const st = powerStatus(game, id);
      return `
        <div class="tile ${hit.has(id) ? 'hit' : ''}" data-system="${id}">
          <strong>${SYSTEM_NAMES[id]}</strong>
          <span class="status ${st.tone}">${st.text}</span>
          <small>${DETAIL[id](s)}</small>
        </div>`;
    })
    .join('');
  $('systems').innerHTML = `<h2>Outpost systems</h2><div class="tiles">${tiles}</div>`;
}

function renderAlerts(game) {
  const pending = getPending();
  const parts = [];
  if (pending) {
    parts.push(`<div class="alert bad"><strong>Warning: ${pending.title}</strong><br>It arrives tomorrow.</div>`);
  }
  if (game.lastDay) {
    for (const id of game.lastDay.activeEvents) {
      const ev = game.events.find((e) => e.id === id);
      const detail = ev.burst
        ? 'A burst of radiation reached the outpost.'
        : `Sunlight is down by ${Math.round((ev.dustLoss ?? 0) * 100)}%.`;
      parts.push(`<div class="alert bad"><strong>${ev.title}</strong><br>${detail}</div>`);
    }
  }
  if (!parts.length) parts.push('<p class="note">No alerts. All is calm.</p>');
  $('alerts').innerHTML = `<h2>Mission alerts</h2>${parts.join('')}`;
}

function renderDecision(game) {
  const s = game.state;
  const el = $('decision');

  if (s.finished) {
    el.innerHTML = `
      <h2>${s.alive ? 'Mission complete!' : 'Mission failed'}</h2>
      <p>${s.alive ? `The crew survived all ${s.sol} days.` : `The crew lasted ${s.sol} days.`}</p>
      <ul>
        <li>Crew health: ${Math.round(s.health)}%</li>
        <li>Research: ${Math.round(s.research)}%</li>
        <li>Food left: ${Math.round(s.stocks.food)}%</li>
        <li>Radiation: ${Math.round(s.protection.exposure)} of ${CONFIG.exposureLimit}</li>
      </ul>
        <button class="primary" data-action="debrief">See the mission debrief</button>`;
    return;
  }

   const pending = getPending();
  if (pending) {
    const question = getPendingQuestion();
    if (question) {
      el.innerHTML = `
        <h2>Prediction time: ${pending.title}</h2>
        <p class="note">Guess first. You will see how you did after the mission.</p>
        ${questionHtml(question)}`;
      return;
    }
    const options = pending.options.map(
        (o) => `
        <div class="option">
          <button data-option="${o.id}">${o.label}</button>
          <p class="good">+ ${o.benefit}</p>
          <p class="cost">- ${o.cost}</p>
          <details><summary>Why?</summary>${o.why}</details>
        </div>`
      )
      .join('');
    el.innerHTML = `
      <h2>Engineering decision: ${pending.title}</h2>
      <p>${pending.prompt}</p>
      ${pending.cardId ? cardHtml(pending.cardId) : ''}
      <div class="options">${options}</div>`;
    return;
  }

  const lines = explanations(game);
  const happened = game.lastDay
    ? lines.length
      ? `<ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>`
      : '<p>All systems ran well yesterday.</p>'
    : '<p>You are the outpost planner. Press End Day to run the next day and watch the meters.</p>';
  el.innerHTML = `
    <h2>Day ${s.sol + 1}</h2>
    ${game.lastDay ? '<p class="note">What happened yesterday:</p>' : ''}
    ${happened}
    <button class="primary" data-action="end-day">End day</button>`;
}

const VIEW_NAMES = {
  title: 'Humanities title screen',
  story: 'Story introduction',
  prep: 'Earth preparation',
  colony: 'Mars outpost',
  debrief: 'Mission debrief',
};
let lastView = '';

export function renderAll(game) {
  const view = getScreen() || game.phase;
  for (const id of ['title', 'story', 'prep', 'debrief']) {
    document.getElementById(id).hidden = view !== id;
  }
  document.getElementById('app').hidden = view !== 'colony';

  if (view === 'title') renderTitle();
  else if (view === 'story') renderStory();
  else if (view === 'prep') renderPrep(game);
  else if (view === 'debrief') renderDebrief(game);
  else {
    renderTop(game);
    renderEnv(game);
    renderSystems(game);
    renderAlerts(game);
    renderDecision(game);
  }

  if (view !== lastView) {
    $('announce').textContent = VIEW_NAMES[view] || '';
    lastView = view;
  }
}