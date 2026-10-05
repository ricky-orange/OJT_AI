const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('儀表板讀取 Apps Script 彙總資料並顯示 KPI，不渲染個人識別碼', () => {
  const content = { className: '', textContent: '', innerHTML: '' };
  const frame = { src: '' };
  const button = { disabled: false, addEventListener() {} };
  let onMessage;
  const context = {
    document: { getElementById(id) { return { 'dashboard-content': content, 'stats-frame': frame, refresh: button }[id]; } },
    window: { OJT_CONFIG: { scriptUrl: 'https://script.google.com/macros/s/TEST/exec' }, OJT_QUIZ: Array.from({ length: 12 }, (_, i) => ({ question: `第${i + 1}題` })), OJT_CATEGORIES: [{label:'AI 基礎與導入',questions:[1,3]},{label:'工作方式與提示詞',questions:[4,5,6]},{label:'詢價整理與查核',questions:[2,7,8]},{label:'資料安全與對外發信',questions:[9,10,11,12]}], addEventListener(type, handler) { if (type === 'message') onMessage = handler; } },
    crypto: { randomUUID: () => '123e4567-e89b-42d3-a456-426614174005' },
    URL, Number, String, Array, Math, setTimeout: () => 1, clearTimeout: () => {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8'), context);
  assert.match(frame.src, /view=stats/);
  onMessage({ origin: 'https://script.googleusercontent.com', data: { source: 'ojt-ai-stats', requestId: '123e4567-e89b-42d3-a456-426614174005', ok: true, attempts: 18, participants: 12, passed: 10, passRate: 83, averageScore: 87, buckets: [1, 1, 10], questionRates: Array(12).fill(75), categoryRates: [{label:'AI 基礎與導入',questions:[1,3],rate:50,correct:12,total:24},{label:'工作方式與提示詞',questions:[4,5,6],rate:80,correct:29,total:36},{label:'詢價整理與查核',questions:[2,7,8],rate:85,correct:31,total:36},{label:'資料安全與對外發信',questions:[9,10,11,12],rate:90,correct:43,total:48}], participant: 'SECRET001' } });
  assert.match(content.innerHTML, /參與人數/);
  assert.match(content.innerHTML, /83%/);
  assert.match(content.innerHTML, /第12題/);
  assert.match(content.innerHTML, /各類型答對率/);
  assert.match(content.innerHTML, /優先複習/);
  assert.match(content.innerHTML, /資料安全與對外發信/);
  assert.doesNotMatch(content.innerHTML, /SECRET001/);
  assert.equal(button.disabled, false);
});
