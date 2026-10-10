import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const base = new URL('../public/junkyard/lab/vault-inspection/', import.meta.url);
const source = readFileSync(new URL('app.js', base), 'utf8');
const html = readFileSync(new URL('index.html', base), 'utf8');
const sectors = runInNewContext(source.slice(source.indexOf('const sectors = ') + 16, source.indexOf('\n\n  const vault')) .replace(/;\s*$/, ''));

// Run the actual session/event code with a small DOM and deterministic clock.
function game() {
  class Element {
    constructor(tag = 'div') {
      this.tag = tag;
      this.dataset = {};
      this.children = [];
      this.listeners = {};
      this.attributes = {};
      this.style = {};
      this.hidden = false;
      this.disabled = false;
      this.open = false;
      this.textContent = '';
      this.classList = { toggle() {} };
    }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    click() { this.listeners.click?.({ currentTarget: this }); }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this.attributes[key]; }
    append(child) { this.children.push(child); }
    replaceChildren() { this.children = []; }
    querySelector(tag) { return this.children.find((child) => child.tag === tag); }
    scrollIntoView() {}
    focus() { this.focused = true; }
  }
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map((match) => [match[1], new Element()]));
  elements.vault.append(new Element('.world'));
  const buttons = [true, false].map((value) => {
    const button = new Element('button');
    button.dataset.answer = String(value);
    return button;
  });
  let nextTimer = 0;
  const timers = new Map();
  const document = {
    getElementById: (id) => elements[id],
    querySelectorAll: () => buttons,
    createElement: (tag) => new Element(tag),
    body: new Element(),
    addEventListener() {},
  };
  const window = {
    matchMedia: () => ({ matches: false }),
    setTimeout: (callback) => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: (id) => timers.delete(id),
  };
  runInNewContext(source, { document, window });
  const flush = () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } };
  const play = (correctCount) => {
    elements.startButton.click();
    sectors.forEach((sector, index) => {
      assert.equal(elements.vault.dataset.phase, 'question');
      const selected = index < correctCount ? sector.correct : !sector.correct;
      buttons[selected ? 0 : 1].click();
      buttons[selected ? 1 : 0].click(); // Queued second answer must do nothing.
      assert.equal(elements.vault.dataset.phase, 'answered');
      elements.continueButton.click();
      elements.continueButton.click();
      elements.traversalButton.click(); // Cannot advance before traversal is ready.
      assert.equal(elements.vault.dataset.phase, 'traversing');
      flush();
      elements.traversalButton.click();
      elements.traversalButton.click(); // Cannot skip a sector or repeat the result.
    });
  };
  return { elements, play };
}

for (const score of [0, 9, 10]) {
  test(`${score}/10: score, ten unique answers, source questions and explanations agree`, () => {
    const { elements: el, play } = game();
    play(score);
    assert.equal(el.vault.dataset.phase, 'result');
    assert.equal(el.scoreValue.textContent, String(score));
    assert.equal(el.reviewList.children.length, 10);
    assert.equal(el.reviewMistakesButton.hidden, score === 10);
    assert.match(el.reviewStatus.textContent, score === 10 ? /全問正解/ : new RegExp(`${10 - score}問`));
    el.reviewList.children.forEach((item, index) => {
      const sector = sectors[index];
      const correct = index < score;
      const selected = correct ? sector.correct : !sector.correct;
      assert.equal(item.dataset.correct, String(correct));
      assert.equal(item.children[0].textContent, `Q${index + 1} / ${sector.title} — ${correct ? '正解' : '不正解'}`);
      const paragraphs = item.children[1].children.map((p) => p.textContent);
      assert.deepEqual(paragraphs, [sector.question,
        `自分の回答：${selected ? '○' : '×'} / 正解：${sector.correct ? '○' : '×'}`,
        `解説：${sector.explanation}`, `VAULT NOTE：${sector.vaultNote}`]);
    });
    el.reviewMistakesButton.click();
    assert.equal(el.reviewList.children.filter((item) => item.open).length, 10 - score);
    if (score < 10) assert.equal(el.reviewList.children[score].children[0].focused, true);
  });
}

test('restart clears review and a second session cannot inherit answers or score', () => {
  const { elements: el, play } = game();
  play(9);
  el.reviewMistakesButton.click();
  el.restartButton.click();
  assert.equal(el.vault.dataset.phase, 'intro');
  assert.equal(el.reviewList.children.length, 0);
  assert.equal(el.reviewStatus.textContent, '');
  assert.equal(el.reviewMistakesButton.hidden, true);
  assert.equal(el.vault.dataset.sector, '0');
  play(0);
  assert.equal(el.scoreValue.textContent, '0');
  assert.equal(el.reviewList.children.length, 10);
  assert.ok(el.reviewList.children.every((item) => item.dataset.correct === 'false' && !item.open));
});

test('published canonical and relative asset routes stay unchanged; review uses native details', () => {
  assert.ok(html.includes('href="https://yzrswork.com/junkyard/lab/vault-inspection/"'));
  for (const file of ['app.js', 'style.css', 'visual.js', 'visual.css']) assert.ok(html.includes(`./${file}`));
  assert.ok(source.includes("document.createElement('details')"));
  assert.ok(source.includes("document.createElement('summary')"));
  assert.doesNotMatch(source, /localStorage|sessionStorage|fetch\(|sendBeacon/);
});
