const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'pretest-quiz.js'), 'utf8'), context);

test('課前測題目、答案與四類標籤完整', () => {
  const quiz = context.window.OJT_QUIZ;
  assert.equal(quiz.length, 12);
  quiz.forEach(item => { assert.equal(item.options.length, 4); assert.ok(item.question); assert.equal(item.answer, undefined); });
  assert.equal(context.window.OJT_SCORE, undefined);
  const numbers = context.window.OJT_CATEGORIES.flatMap(category => category.questions);
  assert.deepEqual([...numbers].sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1));
});
