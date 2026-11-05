import { describe, it, expect } from 'vitest';
import EVENTS from '../src/data/events.json';
import QUESTIONS from '../src/data/questions.json';
import {
  startGame,
  getGame,
  getPending,
  getPendingQuestion,
  answerQuestion,
  pickOption,
  endDay,
  buy,
  launch,
  showDebrief,
  getSessionLog,
} from '../src/state/store.js';
import { buildDebrief } from '../src/campaign/index.js';

// A wrong answer id for a real question object.
const wrongOf = (q) => q.options.find((o) => o.id !== q.correct).id;
// The debrief only gives us a summary (post.correct is true/false), so look up the real question.
const wrongFor = (post) => wrongOf(QUESTIONS.find((q) => q.id === post.id));
const rightFor = (post) => QUESTIONS.find((q) => q.id === post.id).correct;

function playMission(preAnswer) {
  startGame(1);
  buy('solar-array');
  buy('battery-pack');
  launch();
  let guard = 0;
  while (!getGame().state.finished && guard++ < 100) {
    const q = getPendingQuestion();
    if (q) answerQuestion(q.id, preAnswer(q));
    const p = getPending();
    if (p) pickOption(p.options[0].id);
    endDay();
  }
  showDebrief();
}

describe('question data', () => {
  it('each event has a before and an after question on the same concept', () => {
    for (const ev of EVENTS) {
      const pre = QUESTIONS.find((q) => q.eventId === ev.id && q.when === 'before');
      const post = QUESTIONS.find((q) => q.eventId === ev.id && q.when === 'after');
      expect(pre).toBeDefined();
      expect(post).toBeDefined();
      expect(pre.concept).toBe(post.concept);
    }
  });

  it('has valid correct answers that are not always in the same place', () => {
    for (const q of QUESTIONS) {
      expect(q.options.some((o) => o.id === q.correct)).toBe(true);
      expect(q.explanation.length).toBeGreaterThan(20);
    }
    expect(new Set(QUESTIONS.map((q) => q.correct)).size).toBeGreaterThan(1);
  });
});

describe('asking questions', () => {
  it('asks the before question once, on the warning day', () => {
    startGame(1);
    buy('solar-array');
    launch();
    let guard = 0;
    while (!getPending() && guard++ < 30) endDay();
    const q = getPendingQuestion();
    expect(q).not.toBeNull();
    expect(answerQuestion(q.id, q.correct)).toBe(true);
    expect(getPendingQuestion()).toBeNull();
    expect(answerQuestion(q.id, wrongOf(q))).toBe(false);
  });

  it('does not allow after-questions during the mission', () => {
    startGame(1);
    launch();
    expect(answerQuestion('q-dust-post', 'a')).toBe(false);
  });
});

describe('before and after comparison', () => {
  it('says "slipped" when the first answer was right and the second wrong', () => {
    playMission((q) => q.correct);
    const learning = buildDebrief(getGame()).learning;
    expect(learning.length).toBe(2);
    for (const l of learning) {
      expect(l.post.answered).toBe(false);
      expect(answerQuestion(l.post.id, wrongFor(l.post))).toBe(true);
    }
    for (const l of buildDebrief(getGame()).learning) expect(l.verdict).toBe('slipped');
  });

  it('says "improved" when the first answer was wrong and the second right', () => {
    playMission(wrongOf);
    for (const l of buildDebrief(getGame()).learning) {
      answerQuestion(l.post.id, rightFor(l.post));
    }
    for (const l of buildDebrief(getGame()).learning) expect(l.verdict).toBe('improved');
  });

  it('records all answers in the session log for this attempt', () => {
    playMission((q) => q.correct);
    for (const l of buildDebrief(getGame()).learning) {
      answerQuestion(l.post.id, wrongFor(l.post));
    }
    const mine = getSessionLog().filter((e) => e.attempt === getGame().attempt);
    expect(mine.length).toBe(4);
    expect(mine.filter((e) => e.when === 'before').every((e) => e.correct)).toBe(true);
    expect(mine.filter((e) => e.when === 'after').every((e) => !e.correct)).toBe(true);
  });
});