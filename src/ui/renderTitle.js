import { sourcesHtml } from './science.js';
import { getStoryStep } from '../state/store.js';

export const STORY = [
  {
    title: 'The year is 2045',
    text: 'A crew is getting ready to fly to Mars. This is a made-up story. You are the outpost planner, and the crew is counting on you.',
  },
  {
    title: 'Pack the rocket',
    text: 'First, on Earth, you choose gear. You have a limited budget and cargo mass. Every item helps something, but it also costs something.',
  },
  {
    title: 'Then comes Mars',
    text: 'On Mars, storms will test your plan. You decide where the power goes. The game uses simple rules, plus one real measurement from NASA.',
  },
];

export function titleHtml() {
  return `
    <section class="panel hero">
      <h1>HUMANITIES</h1>
      <p class="tagline">Prepare. Decide. Survive on Mars.</p>
      <button class="primary" data-action="start-story">Start mission</button>
      <button data-action="skip-intro">Skip the story</button>
      <p class="note">An independent learning game. It is not made by, affiliated with, or endorsed by NASA. It uses simple game rules and one published NASA measurement.</p>
    </section>
    <section class="panel">
      <h2>How to play</h2>
      <ol>
        <li><strong>Pack:</strong> spend your budget and cargo mass on gear for the outpost.</li>
        <li><strong>Survive:</strong> end each day, watch the meters, and keep power flowing to what matters most.</li>
        <li><strong>Decide:</strong> when storms come, choose what to protect. Every choice has a cost.</li>
        <li><strong>Learn:</strong> the debrief shows what led to what, and what would have happened if you chose differently.</li>
      </ol>
    </section>
    <section class="panel">
      <h2>Credits and sources</h2>
      <ul>
        <li>Real data: NASA/JPL release about the May 2024 solar storm at Mars (see the sources below).</li>
        <li>Game engine: Phaser (MIT license). Build tool: Vite (MIT license).</li>
        <li>Heading font: Press Start 2P by CodeMan38 (SIL Open Font License).</li>
      </ul>
      ${sourcesHtml()}
    </section>`;
}

export function storyHtml(step) {
  const s = STORY[step];
  const last = step === STORY.length - 1;
  return `
    <section class="panel hero">
      <p class="note">Story ${step + 1} of ${STORY.length}</p>
      <h1>${s.title}</h1>
      <p class="tagline">${s.text}</p>
      <button class="primary" data-action="story-next">${last ? 'Go to Earth preparation' : 'Next'}</button>
      <button data-action="skip-intro">Skip</button>
    </section>`;
}

export function renderTitle() {
  document.getElementById('title').innerHTML = titleHtml();
}

export function renderStory() {
  document.getElementById('story').innerHTML = storyHtml(getStoryStep());
}