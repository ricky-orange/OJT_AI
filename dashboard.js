(function () {
  'use strict';
  const content = document.getElementById('dashboard-content');
  const frame = document.getElementById('stats-frame');
  const button = document.getElementById('refresh');
  const categories = window.OJT_CATEGORIES;
  let requestId = '';
  let timer;
  const scriptUrl = (window.OJT_CONFIG.scriptUrl || '').trim();
  const validUrl = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(scriptUrl);
  const percent = n => `${Math.max(0, Math.min(100, Number(n) || 0))}%`;
  const number = n => Number(n || 0).toLocaleString('zh-TW');
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function load() {
    clearTimeout(timer);
    if (!validUrl) { content.className = 'empty-state'; content.textContent = '尚未設定 Google 試算表接收網址。'; return; }
    requestId = crypto.randomUUID();
    content.className = 'loading-panel';
    content.textContent = '正在讀取 Google 試算表資料…';
    button.disabled = true;
    const url = new URL(scriptUrl);
    url.searchParams.set('view', 'stats');
    url.searchParams.set('requestId', requestId);
    frame.src = url.toString();
    timer = setTimeout(() => { button.disabled = false; content.className = 'empty-state'; content.textContent = '資料讀取逾時，請按「更新資料」重試。'; }, 20000);
  }

  function bar(label, count, total, tone) {
    const p = total ? Math.round(count / total * 100) : 0;
    return `<div class="chart-row"><span>${label}</span><div class="bar-track" aria-label="${label} ${p}%"><div class="bar-fill ${tone}" style="width:${p}%"></div></div><strong>${count}</strong></div>`;
  }

  function render(data) {
    const attempts = Number(data.attempts) || 0;
    const participants = Number(data.participants) || 0;
    if (!participants) { content.className = 'empty-state'; content.textContent = '目前尚無可統計的測驗紀錄。完成測驗後，資料會顯示在這裡。'; return; }
    const kpis = [
      ['參與人數', number(participants), '依員工編號去重'],
      ['累積作答', number(attempts), '含重複測驗'],
      ['及格率', percent(data.passRate), `${number(data.passed)} 人及格`],
      ['平均分數', `${number(data.averageScore)} 分`, '各人最近一次成績']
    ];
    const buckets = Array.isArray(data.buckets) ? data.buckets : [0, 0, 0];
    const rates = Array.isArray(data.questionRates) ? data.questionRates : [];
    const categoryRates = Array.isArray(data.categoryRates) ? data.categoryRates : [];
    const lowestRate = Math.min(...categoryRates.map(item => Number(item.rate) || 0));
    const uniqueLowest = categoryRates.filter(item => Number(item.rate) === lowestRate).length === 1 && lowestRate < 100;
    const categoryHtml = categoryRates.map(item => {
      const isLowest = uniqueLowest && Number(item.rate) === lowestRate;
      const questions = Array.isArray(item.questions) ? item.questions : [];
      return `<article class="category-card ${isLowest ? 'needs-review' : ''}"><div class="category-head"><h3>${escapeHtml(item.label)}</h3>${isLowest ? '<span class="focus-badge">優先複習</span>' : ''}</div><strong class="category-rate">${percent(item.rate)}</strong><p class="category-detail">${number(item.correct)}／${number(item.total)} 題次答對 · 第 ${questions.join('、')} 題</p><div class="bar-track"><div class="bar-fill ${isLowest ? 'mid' : ''}" style="width:${percent(item.rate)}"></div></div></article>`;
    }).join('');
    const labelByQuestion = {};
    categories.forEach(category => category.questions.forEach(q => { labelByQuestion[q] = category.label; }));
    const questionHtml = window.OJT_QUIZ.map((q, i) => `<div class="question-item"><div class="question-row"><strong>第 ${i + 1} 題</strong><div class="bar-track"><div class="bar-fill" style="width:${percent(rates[i])}"></div></div><strong>${percent(rates[i])}</strong></div><span class="topic-tag">${escapeHtml(labelByQuestion[i + 1] || '')}</span><span class="question-text">${escapeHtml(q.question)}</span></div>`).join('');
    content.className = '';
    content.innerHTML = `<div class="kpi-grid">${kpis.map(k => `<div class="kpi"><span class="kpi-label">${k[0]}</span><strong class="kpi-number">${k[1]}</strong><span class="kpi-note">${k[2]}</span></div>`).join('')}</div><section class="chart-panel category-panel"><h2>各類型答對率</h2><p class="chart-intro">每位同仁最近一次作答計入統計。答對率最低的類型標示為「優先複習」。</p><div class="category-grid">${categoryHtml}</div></section><div class="dashboard-grid"><section class="chart-panel"><h2>成績分布</h2><p class="chart-intro">每人最近一次作答；右側數字為人數。</p>${bar('80–100 分', Number(buckets[2]) || 0, participants, '')}${bar('60–79 分', Number(buckets[1]) || 0, participants, 'mid')}${bar('0–59 分', Number(buckets[0]) || 0, participants, 'low')}</section><section class="chart-panel"><h2>學習概況</h2><p class="chart-intro">同一位同仁可重測；統計及格率與平均分數時，只取最後一次作答。</p><div class="overview-stat"><span>及格</span><strong>${number(data.passed)} / ${number(participants)} 人</strong></div><div class="bar-track"><div class="bar-fill" style="width:${percent(data.passRate)}"></div></div><p class="dashboard-note">及格標準：12 題中至少答對 10 題。總作答次數包含重測紀錄。</p></section><section class="chart-panel question-panel"><h2>各題答對率</h2><p class="chart-intro">每題都標示所屬類型，方便追查需要複習的主題。</p><div class="question-grid">${questionHtml}</div></section></div><p class="dashboard-note">此頁只顯示彙總數字，不提供員工編號、個人答案或個別成績。TEST-CODEX 測試資料不列入統計。</p>`;
  }

  window.addEventListener('message', event => {
    if (!/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(event.origin)) return;
    const data = event.data;
    if (!data || data.source !== 'ojt-ai-stats' || data.requestId !== requestId) return;
    clearTimeout(timer);
    button.disabled = false;
    if (data.ok === true) render(data);
    else { content.className = 'empty-state'; content.textContent = '目前無法讀取成績統計，請稍後重試。'; }
  });
  button.addEventListener('click', load);
  load();
})();
