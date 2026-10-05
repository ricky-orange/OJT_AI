/**
 * Google 試算表 → 擴充功能 → Apps Script。部署方式見 README.md。
 * 只需修改下列兩個設定；請勿把含個資的試算表設成公開共用。
 */
var SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';
var SHEET_NAME = '測驗紀錄';
var PRETEST_SHEET_NAME = '課前測紀錄';
var SITE_ORIGIN = 'https://ricky-orange.github.io';
var ANSWER_KEY = ['B', 'D', 'B', 'C', 'B', 'D', 'B', 'A', 'C', 'B', 'C', 'B'];
var PRETEST_ANSWER_KEY = ['B', 'B', 'A', 'C', 'B', 'C', 'B', 'C', 'C', 'B', 'B', 'C'];
var CATEGORIES = [
  { label: 'AI 基礎與導入', questions: [1, 3] },
  { label: '工作方式與提示詞', questions: [4, 5, 6] },
  { label: '詢價整理與查核', questions: [2, 7, 8] },
  { label: '資料安全與對外發信', questions: [9, 10, 11, 12] }
];
var HEADERS = ['伺服器時間', '員工編號', '作答識別碼', '分數', '答對題數', '結果', '作答秒數', '第1題', '第2題', '第3題', '第4題', '第5題', '第6題', '第7題', '第8題', '第9題', '第10題', '第11題', '第12題'];

function setupSheet(name) {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var targetName = name || SHEET_NAME;
  var sheet = spreadsheet.getSheetByName(targetName) || spreadsheet.insertSheet(targetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#dfeee5');
    sheet.getRange('A:A').setNumberFormat('yyyy/mm/dd hh:mm:ss');
    sheet.getRange('B:C').setNumberFormat('@');
  }
  return sheet;
}

function setupPretestSheet() {
  return setupSheet(PRETEST_SHEET_NAME);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.view === 'stats') {
    var requestId = String(e.parameter.requestId || '');
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return HtmlService.createHtmlOutput('Invalid request');
    try {
      var payload = buildStats_();
      payload.source = 'ojt-ai-stats';
      payload.requestId = requestId;
      payload.ok = true;
      return messageResponse_(payload);
    } catch (error) {
      console.error(error);
      return messageResponse_({ source: 'ojt-ai-stats', requestId: requestId, ok: false });
    }
  }
  return HtmlService.createHtmlOutput('AI 教育訓練測驗接收端已啟用。');
}

function buildStats_() {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return emptyStats_();
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  var attempts = 0;
  var latest = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var participant = String(row[1] || '').trim();
    var score = Number(row[3]);
    var answers = row.slice(7, 19).map(function (value) { return String(value).toUpperCase(); });
    if (!participant || participant.indexOf('TEST-CODEX-') === 0 || !isFinite(score) || answers.length !== 12 || answers.some(function (value) { return !/^[A-D]$/.test(value); })) continue;
    attempts++;
    var timestamp = row[0] instanceof Date ? row[0].getTime() : new Date(row[0]).getTime();
    if (!latest[participant] || timestamp >= latest[participant].timestamp || !isFinite(timestamp)) {
      latest[participant] = { score: score, answers: answers, timestamp: isFinite(timestamp) ? timestamp : i };
    }
  }
  var records = Object.keys(latest).map(function (key) { return latest[key]; });
  var participants = records.length;
  if (!participants) return emptyStats_();
  var passed = 0, scoreSum = 0, buckets = [0, 0, 0], correct = Array(12).fill(0);
  records.forEach(function (record) {
    scoreSum += record.score;
    if (record.score >= 80) passed++;
    buckets[record.score < 60 ? 0 : record.score < 80 ? 1 : 2]++;
    record.answers.forEach(function (answer, q) { if (answer === ANSWER_KEY[q]) correct[q]++; });
  });
  return {
    attempts: attempts,
    participants: participants,
    passRate: Math.round(passed / participants * 100),
    averageScore: Math.round(scoreSum / participants),
    passed: passed,
    buckets: buckets,
    questionRates: correct.map(function (count) { return Math.round(count / participants * 100); }),
    categoryRates: CATEGORIES.map(function (category) {
      var correctTotal = category.questions.reduce(function (sum, number) { return sum + correct[number - 1]; }, 0);
      var answerTotal = participants * category.questions.length;
      return { label: category.label, questions: category.questions, rate: Math.round(correctTotal / answerTotal * 100), correct: correctTotal, total: answerTotal };
    })
  };
}

function emptyStats_() {
  return { attempts: 0, participants: 0, passRate: 0, averageScore: 0, passed: 0, buckets: [0, 0, 0], questionRates: Array(12).fill(0), categoryRates: CATEGORIES.map(function (category) { return { label: category.label, questions: category.questions, rate: 0, correct: 0, total: 0 }; }) };
}

function doPost(e) {
  var id = String((e && e.parameter && e.parameter.attemptId) || '');
  try {
    var p = e && e.parameter ? e.parameter : {};
    if (p.website) throw new Error('Invalid request'); // 隱藏欄位，阻擋簡單機器人
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid attempt ID');
    var participant = String(p.participant || '').trim();
    if (!participant || participant.length > 80 || /[\r\n]/.test(participant)) throw new Error('Invalid participant');
    var answers = String(p.answers || '').toUpperCase();
    if (!/^[A-D]{12}$/.test(answers)) throw new Error('Invalid answers');
    var assessment = String(p.assessment || 'post');
    if (assessment !== 'pre' && assessment !== 'post') throw new Error('Invalid assessment');
    var duration = Number(p.durationSeconds);
    if (!isFinite(duration) || duration < 0 || duration > 86400) throw new Error('Invalid duration');

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var sheet = setupSheet(assessment === 'pre' ? PRETEST_SHEET_NAME : SHEET_NAME);
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var previousIds = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
        for (var i = 0; i < previousIds.length; i++) {
          if (previousIds[i][0] === id) return response_(id, true);
        }
      }
      var correct = 0;
      var answerKey = assessment === 'pre' ? PRETEST_ANSWER_KEY : ANSWER_KEY;
      for (var q = 0; q < answerKey.length; q++) if (answers.charAt(q) === answerKey[q]) correct++;
      var score = Math.round(correct / 12 * 100);
      // 避免試算表將員工編號當作公式執行。
      var safeParticipant = /^[=+\-@]/.test(participant) ? "'" + participant : participant;
      sheet.appendRow([new Date(), safeParticipant, id, score, correct, assessment === 'pre' ? '不設門檻' : correct >= 10 ? '及格' : '未及格', Math.round(duration)].concat(answers.split('')));
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    return response_(id, true);
  } catch (error) {
    console.error(error);
    return response_(id, false);
  }
}

function response_(id, ok) {
  return messageResponse_({ source: 'ojt-ai-sheet', attemptId: id, ok: ok });
}

function messageResponse_(data) {
  var payload = JSON.stringify(data).replace(/</g, '\\u003c');
  var origin = JSON.stringify(SITE_ORIGIN);
  var html = '<!doctype html><html><body><script>window.top.postMessage(' + payload + ',' + origin + ');</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
