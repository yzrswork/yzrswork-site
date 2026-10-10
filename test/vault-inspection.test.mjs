import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const base = new URL('../public/junkyard/lab/vault-inspection/', import.meta.url);
const html = readFileSync(new URL('index.html', base), 'utf8');
const script = readFileSync(new URL('app.js', base), 'utf8');
const correctAnswers = [false, false, false, true, false, false, false, false, true, false];

function game() {
  class Element {
    constructor() { this.dataset = {}; this.style = {}; this.children = []; this.attributes = {}; this.listeners = {}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key]; }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(type, handler) { this.listeners[type] = handler; }
    scrollIntoView() {}
    querySelector() { return new Element(); }
    click() { this.listeners.click?.({ currentTarget: this }); }
  }
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
  const buttons = [true, false].map(value => { const button = new Element(); button.dataset.answer = String(value); return button; });
  let pending = [];
  vm.runInNewContext(script, {
    document: { createElement: () => new Element(), getElementById: id => elements[id], querySelectorAll: () => buttons, body: { classList: { toggle() {} } }, addEventListener() {} },
    window: { matchMedia: () => ({ matches: false }), setTimeout: callback => { pending.push(callback); return callback; }, clearTimeout: callback => { pending = pending.filter(item => item !== callback); } },
  });
  return { elements, buttons, flush: () => { const callbacks = pending; pending = []; callbacks.forEach(callback => callback()); } };
}

function play(instance, expectedScore) {
  const { elements: e, buttons, flush } = instance;
  e.startButton.click();
  const expected = [];
  correctAnswers.forEach((correct, index) => {
    const selected = index < expectedScore ? correct : !correct;
    const question = e.questionText.textContent;
    const button = buttons[selected ? 0 : 1];
    button.click();
    // Dispatch even a disabled button's listener to exercise the phase guard.
    button.click();
    buttons[selected ? 1 : 0].click();
    expected.push({ question, selected, correct, explanation: e.explanation.textContent, note: e.vaultNote.textContent });
    e.continueButton.click();
    e.continueButton.click();
    assert.equal(e.vault.dataset.phase, 'traversing');
    e.traversalButton.click();
    assert.equal(e.vault.dataset.phase, 'traversing');
    flush();
    e.traversalButton.click();
    e.traversalButton.click();
  });
  assert.equal(e.vault.dataset.phase, 'result');
  assert.equal(e.scoreValue.textContent, String(expectedScore));
  assert.equal(e.reviewList.children.length, 10);
  assert.equal(e.reviewList.children.filter(detail => detail.dataset.correct === 'true').length, expectedScore);
  expected.forEach((answer, index) => {
    const detail = e.reviewList.children[index];
    assert.match(detail.children[0].textContent, new RegExp(`^Q${index + 1} /`));
    assert.ok(detail.children[0].textContent.endsWith(answer.selected === answer.correct ? '— 正解' : '— 不正解'));
    assert.equal(detail.children[1].textContent, answer.question);
    assert.equal(detail.children[2].textContent, `自分の回答：${answer.selected ? '○' : '×'}　／　正解：${answer.correct ? '○' : '×'}`);
    assert.equal(detail.children[3].textContent, answer.explanation);
    assert.equal(detail.children[4].children[1].textContent, answer.note);
  });
  if (expectedScore === 10) {
    assert.equal(e.reviewFilter.hidden, true);
    assert.match(e.reviewStatus.textContent, /全問正解/);
  } else {
    e.reviewFilter.click();
    assert.equal(e.reviewFilter.getAttribute('aria-pressed'), 'true');
    const visible = e.reviewList.children.filter(detail => !detail.hidden);
    assert.equal(visible.length, 10 - expectedScore);
    assert.ok(visible.every(detail => detail.open && detail.dataset.correct === 'false'));
    e.reviewFilter.click();
    assert.ok(e.reviewList.children.every(detail => !detail.hidden && !detail.open));
  }
}

for (const score of [0, 9, 10]) {
  test(`${score}/10: score, all answer details, duplicate input and mistake filter`, () => play(game(), score));
}
test('restart clears history and a second play cannot inherit previous answers', () => {
  const instance = game();
  play(instance, 0);
  instance.elements.reviewFilter.click();
  instance.elements.restartButton.click();
  assert.equal(instance.elements.vault.dataset.phase, 'intro');
  assert.equal(instance.elements.reviewList.children.length, 0);
  assert.equal(instance.elements.reviewFilter.getAttribute('aria-pressed'), 'false');
  play(instance, 10);
});
