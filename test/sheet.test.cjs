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
      getValues: () => rows.slice(args[0] - 1, args[0] - 1 + args[2]).map(row => [row[args[1] - 1]])
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
