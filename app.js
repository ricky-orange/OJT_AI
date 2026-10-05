(function () {
  "use strict";
  const app = document.getElementById("app");
  const config = window.OJT_CONFIG;
  const quiz = window.OJT_QUIZ;
  const pretest = document.body.dataset.assessment === "pre";
  const categoryFor = (number) => window.OJT_CATEGORIES.find(category => category.questions.includes(number))?.label || '';
  const letters = ["A", "B", "C", "D"];
  const state = { participant: "", answers: Array(12).fill(""), index: 0, startedAt: 0, attemptId: "", sent: false, submitting: false };
  let pending = null;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const scriptReady = () => /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(config.scriptUrl.trim());

  function intro() {
    app.innerHTML = `<p class="eyebrow">AI OFFICE ESSENTIALS</p><h1 class="hero-title">${pretest ? "上課前，<br>先看看目前的理解。" : "把學到的，<br>變成工作判斷。"}</h1><p class="lead">${pretest ? "12 題單選，了解你對生成式 AI、詢價整理與資訊安全的現有認識。課前測驗不設及格門檻。" : "12 題單選，檢視生成式 AI、詢價整理與資訊安全的學習成果。"}</p><div class="hero-art" aria-hidden="true"><span>✦</span><span>→</span><span>✓</span></div><div class="meta-row"><span class="pill">12 題單選</span><span class="pill">${pretest ? "不設及格門檻" : "答對 10 題及格"}</span><span class="pill">${pretest ? "約 5–8 分鐘" : "可重複測驗"}</span></div><section class="panel"><label class="field-label" for="participant">${escapeHtml(config.participantLabel)}</label><input id="participant" type="text" maxlength="80" autocomplete="off" placeholder="請輸入${escapeHtml(config.participantLabel)}" required><p class="help">${pretest ? "請使用與課後測相同的員工編號，以便比較學習前後的成績。送出後暫不顯示分數與正解。" : "每次作答都會另存一筆成績。請使用同一識別資料，方便後續查看歷次紀錄。"}</p><p class="error" id="intro-error" role="alert"></p><button class="btn btn-primary" id="start" type="button" style="width:100%;margin-top:18px">開始測驗 →</button></section>`;
    const input = document.getElementById("participant");
    input.value = state.participant;
    document.getElementById("start").onclick = () => {
      const participant = input.value.trim();
      if (!participant || participant.length > 80) { document.getElementById("intro-error").textContent = `請輸入${config.participantLabel}。`; input.focus(); return; }
      state.participant = participant;
      state.answers = Array(12).fill("");
      state.index = 0;
      state.startedAt = Date.now();
      state.attemptId = crypto.randomUUID();
      state.sent = false;
      question();
    };
  }

  function question() {
    const index = state.index;
    const item = quiz[index];
    const choices = item.options.map((option, n) => `<label class="choice"><input type="radio" name="answer" value="${letters[n]}" ${state.answers[index] === letters[n] ? "checked" : ""}><span class="choice-letter">${letters[n]}.</span><span>${escapeHtml(option)}</span></label>`).join("");
    app.innerHTML = `<div class="progress-row"><span>第 ${index + 1} 題／共 12 題</span><span>${Math.round(index / 12 * 100)}% 已完成</span></div><div class="progress-track" aria-hidden="true"><div class="progress-fill" style="width:${index / 12 * 100}%"></div></div><p class="eyebrow">QUESTION ${String(index + 1).padStart(2, "0")} <span class="quiz-topic">${escapeHtml(categoryFor(index + 1))}</span></p><h1 class="question-title">${escapeHtml(item.question)}</h1><div class="choices" role="radiogroup" aria-label="第 ${index + 1} 題選項">${choices}</div><p class="error" id="question-error" role="alert"></p><div class="actions"><button class="btn btn-secondary" id="back" type="button">${index === 0 ? "返回首頁" : "上一題"}</button><button class="btn btn-primary" id="next" type="button">${index === 11 ? "檢查答案" : "下一題 →"}</button></div>`;
    document.querySelectorAll('input[name="answer"]').forEach((input) => { input.onchange = () => { state.answers[index] = input.value; document.getElementById("question-error").textContent = ""; }; });
    document.getElementById("back").onclick = () => { if (index === 0) intro(); else { state.index--; question(); } };
    document.getElementById("next").onclick = () => { if (!state.answers[index]) { document.getElementById("question-error").textContent = "請先選擇一個答案。"; return; } if (index === 11) review(); else { state.index++; question(); } };
  }

  function review() {
    app.innerHTML = `<p class="eyebrow">READY TO SUBMIT</p><h1 class="review-title">確認答案，送出測驗</h1><p class="lead">${pretest ? "送出後會將本次作答記錄到 Google 試算表，暫不顯示分數與正解。" : "送出後會顯示成績與正確答案，並將這次作答記錄到 Google 試算表。"}</p><ol class="review-list">${quiz.map((_, i) => `<li><a href="#q${i + 1}" data-question="${i}">第 ${i + 1} 題 · 點此修改</a><strong>${escapeHtml(state.answers[i] || "未答")}</strong></li>`).join("")}</ol><div class="actions"><button class="btn btn-secondary" id="review-back" type="button">返回修改</button><button class="btn btn-primary" id="submit" type="button">${pretest ? "送出課前測" : "送出並查看成績"}</button></div>`;
    document.querySelectorAll("[data-question]").forEach((link) => { link.onclick = (event) => { event.preventDefault(); state.index = Number(link.dataset.question); question(); }; });
    document.getElementById("review-back").onclick = () => { state.index = 11; question(); };
    document.getElementById("submit").onclick = submit;
  }

  function submit() {
    if (state.answers.some((a) => !letters.includes(a)) || state.submitting) return;
    result("sending");
    if (!scriptReady()) { result("setup"); return; }
    state.submitting = true;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = config.scriptUrl.trim();
    form.target = "sheet-submit-frame";
    form.hidden = true;
    const data = { attemptId: state.attemptId, participant: state.participant, answers: state.answers.join(""), durationSeconds: String(Math.round((Date.now() - state.startedAt) / 1000)), assessment: pretest ? "pre" : "post", website: "" };
    for (const [key, value] of Object.entries(data)) { const input = document.createElement("input"); input.name = key; input.value = value; form.append(input); }
    document.body.append(form);
    pending = setTimeout(() => { pending = null; state.submitting = false; result("timeout"); }, 20000);
    form.submit();
    form.remove();
  }

  function result(status) {
    if (pretest) { pretestResult(status); return; }
    const grade = window.OJT_SCORE(state.answers);
    const statusMarkup = status === "saved" ? `<div class="status ok" role="status">✓ 成績已記錄到 Google 試算表。</div>` : status === "sending" ? `<div class="status warn" role="status"><span class="loading"></span>正在記錄成績，請稍候…</div>` : status === "setup" ? `<div class="status warn" role="status">網站尚未連接 Google 試算表。請網站管理者依 README 完成設定；目前這次成績僅顯示於本頁。</div>` : `<div class="status warn" role="status">尚未收到 Google 試算表確認。請檢查網路後按「重新送出成績」；同一次測驗不會重複記錄。</div>`;
    app.innerHTML = `<p class="eyebrow">YOUR RESULT</p><div class="score-circle ${grade.passed ? "" : "fail"}"><span class="score-number">${grade.score}</span><span class="score-unit">分</span></div><h1 class="result-heading">${grade.passed ? "測驗通過！" : "再試一次，你可以的"}</h1><p class="result-detail">答對 ${grade.correct}／12 題 · ${grade.passed ? "達到 80 分及格標準" : "至少答對 10 題即可及格"}</p>${statusMarkup}<div class="actions">${status === "timeout" ? '<button class="btn btn-secondary" id="retry-send" type="button">重新送出成績</button>' : ""}<button class="btn btn-primary" id="again" type="button">再測驗一次</button></div><section class="answer-review"><h2>逐題檢視</h2>${quiz.map((item, i) => { const correct = state.answers[i] === item.answer; return `<details><summary>第 ${i + 1} 題 · <span class="${correct ? "right" : "wrong"}">${correct ? "答對" : "答錯"}</span></summary><p>${escapeHtml(item.question)}</p><p>你的答案：${escapeHtml(state.answers[i])}．${escapeHtml(item.options[letters.indexOf(state.answers[i])])}</p><p class="right">正確答案：${item.answer}．${escapeHtml(item.options[letters.indexOf(item.answer)])}</p></details>`; }).join("")}</section>`;
    document.getElementById("again").onclick = () => { if (pending) { clearTimeout(pending); pending = null; } state.submitting = false; intro(); };
    const retry = document.getElementById("retry-send"); if (retry) retry.onclick = submit;
  }

  function pretestResult(status) {
    const statusMarkup = status === "saved" ? `<div class="status ok" role="status">✓ 課前測作答已記錄到 Google 試算表。</div>` : status === "sending" ? `<div class="status warn" role="status"><span class="loading"></span>正在記錄作答，請稍候…</div>` : status === "setup" ? `<div class="status warn" role="status">網站尚未連接 Google 試算表，請聯絡管理者。這次作答尚未記錄。</div>` : `<div class="status warn" role="status">尚未收到 Google 試算表確認。請檢查網路後按「重新送出」；同一次作答不會重複記錄。</div>`;
    app.innerHTML = `<p class="eyebrow">PRE-COURSE CHECK</p><h1 class="result-heading">${status === "saved" ? "課前測完成" : "正在確認作答紀錄"}</h1><p class="result-detail">課前測用於了解學習起點，不設及格門檻；分數與正解暫不公開。</p>${statusMarkup}<div class="actions">${status === "timeout" ? '<button class="btn btn-secondary" id="retry-send" type="button">重新送出</button>' : ""}${status === "saved" ? '<button class="btn btn-primary" id="again" type="button">返回首頁</button>' : ""}</div>`;
    const again = document.getElementById("again"); if (again) again.onclick = intro;
    const retry = document.getElementById("retry-send"); if (retry) retry.onclick = submit;
  }

  window.addEventListener("message", (event) => {
    if (!/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(event.origin)) return;
    const data = event.data;
    if (!data || data.source !== "ojt-ai-sheet" || data.attemptId !== state.attemptId || !state.submitting) return;
    if (pending) clearTimeout(pending);
    pending = null;
    state.submitting = false;
    state.sent = data.ok === true;
    result(state.sent ? "saved" : "timeout");
  });
  intro();
})();
