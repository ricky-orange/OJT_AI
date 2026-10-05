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
    window: { OJT_CONFIG: { scriptUrl: 'https://script.google.com/macros/s/TEST/exec' }, OJT_QUIZ: Array.from({ length: 12 }, (_, i) => ({ question: `第${i + 1}題` })), addEventListener(type, handler) { if (type === 'message') onMessage = handler; } },
    crypto: { randomUUID: () => '123e4567-e89b-42d3-a456-426614174005' },
    URL, Number, String, Array, Math, setTimeout: () => 1, clearTimeout: () => {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8'), context);
  assert.match(frame.src, /view=stats/);
  onMessage({ origin: 'https://script.googleusercontent.com', data: { source: 'ojt-ai-stats', requestId: '123e4567-e89b-42d3-a456-426614174005', ok: true, attempts: 18, participants: 12, passed: 10, passRate: 83, averageScore: 87, buckets: [1, 1, 10], questionRates: Array(12).fill(75), participant: 'SECRET001' } });
  assert.match(content.innerHTML, /參與人數/);
  assert.match(content.innerHTML, /83%/);
  assert.match(content.innerHTML, /第12題/);
  assert.doesNotMatch(content.innerHTML, /SECRET001/);
  assert.equal(button.disabled, false);
});
