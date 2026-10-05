const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8'), context);
const quiz = context.window.OJT_QUIZ;

test('定稿的 12 題、選項及答案齊全', () => {
  assert.equal(quiz.length, 12);
  assert.equal(quiz.map(q => q.answer).join(''), 'BDBC BDBACBCB'.replaceAll(' ', ''));
  quiz.forEach(q => { assert.equal(q.options.length, 4); assert.ok(q.question); });
  assert.equal(quiz[2].question, '公司推廣 AI 的主要目的為何？');
  assert.equal(quiz[11].options[1], '分開保管，不與處理後文件一起交給 AI');
});

test('12 題中答對 10 題即及格', () => {
  const answers = quiz.map(q => q.answer);
  assert.equal(context.window.OJT_SCORE(answers).score, 100);
  answers[0] = 'A'; answers[1] = 'A';
  assert.equal(context.window.OJT_SCORE(answers).score, 83);
  assert.equal(context.window.OJT_SCORE(answers).passed, true);
  answers[2] = 'A';
  assert.equal(context.window.OJT_SCORE(answers).score, 75);
  assert.equal(context.window.OJT_SCORE(answers).passed, false);
});

test('四個類型涵蓋全部題目且不重複', () => {
  const numbers = context.window.OJT_CATEGORIES.flatMap(category => category.questions);
  assert.equal(numbers.length, 12);
  assert.deepEqual([...numbers].sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1));
});
