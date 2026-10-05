/**
 * Google 試算表 → 擴充功能 → Apps Script。部署方式見 README.md。
 * 只需修改下列兩個設定；請勿把含個資的試算表設成公開共用。
 */
var SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';
var SHEET_NAME = '測驗紀錄';
var SITE_ORIGIN = 'https://ricky-orange.github.io';
var ANSWER_KEY = ['B', 'D', 'B', 'C', 'B', 'D', 'B', 'A', 'C', 'B', 'C', 'B'];
var HEADERS = ['伺服器時間', '員工編號', '作答識別碼', '分數', '答對題數', '結果', '作答秒數', '第1題', '第2題', '第3題', '第4題', '第5題', '第6題', '第7題', '第8題', '第9題', '第10題', '第11題', '第12題'];

function setupSheet() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#dfeee5');
    sheet.getRange('A:A').setNumberFormat('yyyy/mm/dd hh:mm:ss');
    sheet.getRange('B:C').setNumberFormat('@');
  }
  return sheet;
}

function doGet() {
  return HtmlService.createHtmlOutput('AI 教育訓練測驗接收端已啟用。');
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
    var duration = Number(p.durationSeconds);
    if (!isFinite(duration) || duration < 0 || duration > 86400) throw new Error('Invalid duration');

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var sheet = setupSheet();
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var previousIds = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
        for (var i = 0; i < previousIds.length; i++) {
          if (previousIds[i][0] === id) return response_(id, true);
        }
      }
      var correct = 0;
      for (var q = 0; q < ANSWER_KEY.length; q++) if (answers.charAt(q) === ANSWER_KEY[q]) correct++;
      var score = Math.round(correct / 12 * 100);
      // 避免試算表將員工編號當作公式執行。
      var safeParticipant = /^[=+\-@]/.test(participant) ? "'" + participant : participant;
      sheet.appendRow([new Date(), safeParticipant, id, score, correct, correct >= 10 ? '及格' : '未及格', Math.round(duration)].concat(answers.split('')));
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
  var payload = JSON.stringify({ source: 'ojt-ai-sheet', attemptId: id, ok: ok }).replace(/</g, '\\u003c');
  var origin = JSON.stringify(SITE_ORIGIN);
  var html = '<!doctype html><html><body><script>window.top.postMessage(' + payload + ',' + origin + ');</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
