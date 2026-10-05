var PRETEST_CATEGORIES = [
  { label: 'AI 基礎與導入', questions: [1, 2] },
  { label: '工作方式與提示詞', questions: [3, 4, 5] },
  { label: '詢價整理與查核', questions: [6, 7, 8] },
  { label: '資料安全與對外發信', questions: [9, 10, 11, 12] }
];

function buildComparison_() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var pre = readAssessment_(spreadsheet.getSheetByName(PRETEST_SHEET_NAME), PRETEST_ANSWER_KEY, true);
  var post = readAssessment_(spreadsheet.getSheetByName(SHEET_NAME), ANSWER_KEY, false);
  var ids = Object.keys(pre.latest).filter(function (id) {
    return post.latest[id] && post.latest[id].timestamp >= pre.latest[id].timestamp;
  });
  var count = ids.length;
  var preSum = 0, postSum = 0, improved = 0, unchanged = 0, declined = 0;
  var categoryRates = CATEGORIES.map(function (category, index) {
    return { label: category.label, pre: 0, post: 0, preCorrect: 0, postCorrect: 0, total: count * category.questions.length };
  });
  ids.forEach(function (id) {
    var before = pre.latest[id], after = post.latest[id];
    preSum += before.score;
    postSum += after.score;
    if (after.correct > before.correct) improved++;
    else if (after.correct === before.correct) unchanged++;
    else declined++;
    categoryRates.forEach(function (rate, index) {
      PRETEST_CATEGORIES[index].questions.forEach(function (q) { if (before.answers[q - 1] === PRETEST_ANSWER_KEY[q - 1]) rate.preCorrect++; });
      CATEGORIES[index].questions.forEach(function (q) { if (after.answers[q - 1] === ANSWER_KEY[q - 1]) rate.postCorrect++; });
    });
  });
  categoryRates.forEach(function (rate) {
    rate.pre = rate.total ? Math.round(rate.preCorrect / rate.total * 100) : 0;
    rate.post = rate.total ? Math.round(rate.postCorrect / rate.total * 100) : 0;
    rate.change = rate.post - rate.pre;
  });
  return {
    preParticipants: pre.participants, postParticipants: post.participants, paired: count,
    preAverage: count ? Math.round(preSum / count) : 0,
    postAverage: count ? Math.round(postSum / count) : 0,
    averageGain: count ? Math.round((postSum - preSum) / count) : 0,
    improved: improved, unchanged: unchanged, declined: declined,
    improvementRate: count ? Math.round(improved / count * 100) : 0,
    categoryRates: categoryRates
  };
}

function readAssessment_(sheet, answerKey, first) {
  var latest = {}, attempts = 0;
  if (!sheet || sheet.getLastRow() < 2) return { latest: latest, participants: 0, attempts: 0 };
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  rows.forEach(function (row, index) {
    var id = String(row[1] || '').trim();
    var answers = row.slice(7, 19).map(function (value) { return String(value).toUpperCase(); });
    var timestamp = row[0] instanceof Date ? row[0].getTime() : new Date(row[0]).getTime();
    if (!id || id.indexOf('TEST-CODEX-') === 0 || answers.length !== 12 || answers.some(function (value) { return !/^[A-D]$/.test(value); }) || !isFinite(timestamp)) return;
    attempts++;
    var correct = answerKey.reduce(function (sum, answer, q) { return sum + (answers[q] === answer ? 1 : 0); }, 0);
    var record = { answers: answers, correct: correct, score: Math.round(correct / 12 * 100), timestamp: timestamp, index: index };
    if (!latest[id] || (first ? timestamp < latest[id].timestamp || timestamp === latest[id].timestamp && index < latest[id].index : timestamp > latest[id].timestamp || timestamp === latest[id].timestamp && index > latest[id].index)) latest[id] = record;
  });
  return { latest: latest, participants: Object.keys(latest).length, attempts: attempts };
}

