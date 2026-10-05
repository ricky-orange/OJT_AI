const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadBackend() {
  const rows = [];
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: row => rows.push(row),
    setFrozenRows: () => {},
    getRange: (...args) => ({
      setFontWeight: () => ({ setBackground: () => {} }),
      setNumberFormat: () => {},
      getValues: () => rows.slice(args[0] - 1, args[0] - 1 + args[2]).map(row => row.slice(args[1] - 1, args[1] - 1 + (args[3] || 1)))
    })
  };
  const context = {
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }), flush: () => {} },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    HtmlService: { XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }, createHtmlOutput: html => ({ html, setXFrameOptionsMode() { return this; } }) },
    console, Date, JSON, String, Number, Math, isFinite
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), context);
  return { context, rows };
}

test('試算表端重新計分、記錄每次作答，重送同一識別碼不重複', () => {
  const { context, rows } = loadBackend();
  const attemptId = '123e4567-e89b-42d3-a456-426614174000';
  const response = context.doPost({ parameter: { attemptId, participant: 'A001', answers: 'BDBCBDBACBCB', durationSeconds: '120' } });
  assert.match(response.html, /"ok":true/);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][3], 100);
  assert.equal(rows[1][5], '及格');
  context.doPost({ parameter: { attemptId, participant: 'A001', answers: 'AAAAAAAAAAAA', durationSeconds: '1' } });
  assert.equal(rows.length, 2);
  context.doPost({ parameter: { attemptId: '123e4567-e89b-42d3-a456-426614174001', participant: 'A001', answers: 'AAAAAAAAAAAA', durationSeconds: '90' } });
  assert.equal(rows.length, 3);
  assert.equal(rows[2][5], '未及格');
});

test('無效資料不寫入', () => {
  const { context, rows } = loadBackend();
  const response = context.doPost({ parameter: { attemptId: 'invalid', participant: '=1+1', answers: 'AAAAAAAAAAAA', durationSeconds: '10' } });
  assert.match(response.html, /"ok":false/);
  assert.equal(rows.length, 0);
});

test('儀表板只回傳彙總資料，重測取每人最近一次，測試列不計入', () => {
  const { context } = loadBackend();
  function send(id, participant, answers) {
    context.doPost({ parameter: { attemptId: id, participant, answers, durationSeconds: '60' } });
  }
  send('123e4567-e89b-42d3-a456-426614174001', 'A001', 'AAAAAAAAAAAA');
  send('123e4567-e89b-42d3-a456-426614174002', 'A001', 'BDBCBDBACBCB');
  send('123e4567-e89b-42d3-a456-426614174003', 'A002', 'AAAAAAAAAAAA');
  send('123e4567-e89b-42d3-a456-426614174004', 'TEST-CODEX-WEB', 'BDBCBDBACBCB');
  const result = context.buildStats_();
  assert.equal(result.attempts, 3);
  assert.equal(result.participants, 2);
  assert.equal(result.passed, 1);
  assert.equal(result.passRate, 50);
  assert.equal(result.questionRates.length, 12);
  assert.equal(JSON.stringify(result).includes('A001'), false);
  const response = context.doGet({ parameter: { view: 'stats', requestId: '123e4567-e89b-42d3-a456-426614174005' } });
  assert.match(response.html, /ojt-ai-stats/);
  assert.doesNotMatch(response.html, /A001/);
});
