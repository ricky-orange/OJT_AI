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
  const signed = n => `${Number(n) > 0 ? '+' : ''}${Number(n) || 0}`;

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
    const comparison = data.comparison || {};
    const paired = Number(comparison.paired) || 0;
    const comparisonKpis = [
      ['完成配對', `${number(paired)} 人`, `前測 ${number(comparison.preParticipants)} 人 · 後測 ${number(comparison.postParticipants)} 人`],
      ['平均進步', paired ? `${signed(comparison.averageGain)} 分` : '—', '同一批學員的課後平均分數減課前平均分數'],
      ['有進步比例', paired ? percent(comparison.improvementRate) : '—', paired ? `${number(comparison.improved)} 人進步` : '等待前後測配對'],
      ['配對學員平均分數', paired ? `${number(comparison.preAverage)} → ${number(comparison.postAverage)}` : '—', '課前 → 課後']
    ];
    const comparedCategories = Array.isArray(comparison.categoryRates) ? comparison.categoryRates : [];
    const comparedCategoryHtml = comparedCategories.map(item => `<div class="compare-category"><div class="compare-category-title"><strong>${escapeHtml(item.label)}</strong><span class="${Number(item.change) > 0 ? 'gain-positive' : Number(item.change) < 0 ? 'gain-negative' : ''}">${signed(item.change)} 個百分點</span></div><div class="compare-bars"><span>課前</span><div class="bar-track"><div class="bar-fill pre-fill" style="width:${percent(item.pre)}"></div></div><strong>${percent(item.pre)}</strong><span>課後</span><div class="bar-track"><div class="bar-fill" style="width:${percent(item.post)}"></div></div><strong>${percent(item.post)}</strong></div></div>`).join('');
    const comparisonHtml = `<section class="comparison-section"><h2>前後測成效比較</h2><p class="chart-intro">相同員工編號配對，取最早一次課前測及其後最近一次會後測；只比較完成配對的學員。分數差以「分」表示，答對率差以「百分點」表示。</p><div class="kpi-grid">${comparisonKpis.map(k => `<div class="kpi"><span class="kpi-label">${k[0]}</span><strong class="kpi-number">${k[1]}</strong><span class="kpi-note">${k[2]}</span></div>`).join('')}</div>${paired ? `<div class="comparison-grid"><section class="chart-panel"><h3>各類型答對率變化</h3><p class="chart-intro">前後題目不同，依相同主題比較配對學員的答對率。</p>${comparedCategoryHtml}</section><section class="chart-panel"><h3>進步人數</h3><div class="movement"><div><strong class="gain-positive">${number(comparison.improved)}</strong><span>進步</span></div><div><strong>${number(comparison.unchanged)}</strong><span>持平</span></div><div><strong class="gain-negative">${number(comparison.declined)}</strong><span>退步</span></div></div><p class="dashboard-note">進步、持平與退步依答對題數比較；每題等分。前後測答對題數相同視為持平。</p></section></div>` : `<div class="empty-state">目前尚無可配對的前後測紀錄。請確認學員兩次使用相同員工編號，且課前測早於會後測。</div>`}</section>`;
    if (!participants) { content.className = ''; content.innerHTML = comparisonHtml + '<div class="empty-state">目前尚無可統計的會後測紀錄。</div>'; return; }
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
    content.innerHTML = `${comparisonHtml}<h2 class="section-title">會後測概況</h2><div class="kpi-grid">${kpis.map(k => `<div class="kpi"><span class="kpi-label">${k[0]}</span><strong class="kpi-number">${k[1]}</strong><span class="kpi-note">${k[2]}</span></div>`).join('')}</div><section class="chart-panel category-panel"><h2>各類型答對率</h2><p class="chart-intro">每位同仁最近一次作答計入統計。答對率最低的類型標示為「優先複習」。</p><div class="category-grid">${categoryHtml}</div></section><div class="dashboard-grid"><section class="chart-panel"><h2>成績分布</h2><p class="chart-intro">每人最近一次作答；右側數字為人數。</p>${bar('80–100 分', Number(buckets[2]) || 0, participants, '')}${bar('60–79 分', Number(buckets[1]) || 0, participants, 'mid')}${bar('0–59 分', Number(buckets[0]) || 0, participants, 'low')}</section><section class="chart-panel"><h2>學習概況</h2><p class="chart-intro">同一位同仁可重測；統計及格率與平均分數時，只取最後一次作答。</p><div class="overview-stat"><span>及格</span><strong>${number(data.passed)} / ${number(participants)} 人</strong></div><div class="bar-track"><div class="bar-fill" style="width:${percent(data.passRate)}"></div></div><p class="dashboard-note">及格標準：12 題中至少答對 10 題。總作答次數包含重測紀錄。</p></section><section class="chart-panel question-panel"><h2>各題答對率</h2><p class="chart-intro">每題都標示所屬類型，方便追查需要複習的主題。</p><div class="question-grid">${questionHtml}</div></section></div><p class="dashboard-note">此頁只顯示彙總數字，不提供員工編號、個人答案或個別成績。TEST-CODEX 測試資料不列入統計。</p>`;
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
