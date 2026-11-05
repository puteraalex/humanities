export function questionHtml(q) {
  const buttons = q.options
    .map((o) => `<button data-answer="${q.id}|${o.id}">${o.text}</button>`)
    .join('');
  return `
    <div class="quiz" role="group" aria-labelledby="${q.id}-label">
      <p id="${q.id}-label"><strong>${q.prompt}</strong></p>
      <div class="choices">${buttons}</div>
    </div>`;
}