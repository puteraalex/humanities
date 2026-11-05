import QUESTIONS from '../data/questions.json';

export const getQuestion = (id) => QUESTIONS.find((q) => q.id === id) ?? null;
export const questionFor = (eventId, when) =>
  QUESTIONS.find((q) => q.eventId === eventId && q.when === when) ?? null;

export const VERDICT_TEXT = {
  improved: 'Your answer got better after the mission.',
  confirmed: 'You got both right!',
  slipped: 'You got the first one right but missed this one. Read the explanation, then try another mission.',
  'still-learning': 'Both were tricky. Read the explanations, then try another mission.',
};

function describe(q, answer) {
  const answered = answer !== undefined;
  const text = (id) => q.options.find((o) => o.id === id)?.text ?? null;
  return {
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    explanation: q.explanation,
    answered,
    answer,
    correct: answered ? answer === q.correct : null,
    answerText: answered ? text(answer) : null,
    correctText: text(q.correct),
  };
}

export function verdict(pre, post) {
  if (!pre?.answered || !post?.answered) return null;
  if (!pre.correct && post.correct) return 'improved';
  if (pre.correct && post.correct) return 'confirmed';
  if (pre.correct && !post.correct) return 'slipped';
  return 'still-learning';
}

// For each event that really happened: the before/after questions and how the answers compare.
export function learningSummary(game) {
  const answers = game.answers || {};
  const happened = game.scenario.schedule.filter((s) => s.start <= game.state.sol);
  const out = [];
  for (const slot of happened) {
    const ev = game.events.find((e) => e.id === slot.eventId);
    const preQ = questionFor(slot.eventId, 'before');
    const postQ = questionFor(slot.eventId, 'after');
    if (!preQ && !postQ) continue;
    const pre = preQ ? describe(preQ, answers[preQ.id]) : null;
    const post = postQ ? describe(postQ, answers[postQ.id]) : null;
    out.push({ eventId: slot.eventId, title: ev.title, pre, post, verdict: verdict(pre, post) });
  }
  return out;
}

// Totals for the whole browser session.
export function sessionTotals(log) {
  const t = { before: { right: 0, total: 0 }, after: { right: 0, total: 0 } };
  for (const e of log) {
    t[e.when].total += 1;
    if (e.correct) t[e.when].right += 1;
  }
  return t;
}