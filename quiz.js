window.OJT_QUIZ = Object.freeze([
  { question: "下列對生成式 AI 的說明，何者正確？", options: ["AI 就是指生成式 AI", "生成式 AI 是 AI 的一種類型，擅長產生文字、圖片等內容", "只要程式有條件判斷，就是生成式 AI", "生成式 AI 已取代所有舊的 AI 方法"], answer: "B" },
  { question: "AI 在詢價整理結果中寫出原信沒有提供的交期，應如何處理？", options: ["AI 語氣肯定就可以採用", "另一個 AI 也給出相同交期就可以採用", "沿用完成範例中的交期", "回到原信核對；沒有依據就移除，並列為待追問資訊"], answer: "D" },
  { question: "公司推廣 AI 的主要目的為何？", options: ["逐步以 AI 取代業務同仁", "減少重複工作，讓同仁更專注於專業判斷", "讓每一封客戶郵件都由 AI 自動回覆", "讓 AI 做所有工作"], answer: "B" },
  { question: "下列哪個要求比較屬於「對話討論」？", options: ["「把所有詢價信整理成表格並交付檔案。」", "「請直接寄出追問信。」", "「這封詢價信還缺哪些資訊？我們先討論要追問什麼。」", "「請自行決定是否報價。」"], answer: "C" },
  { question: "把工作委派給 Agent 前，「先定義驗收」是指什麼？", options: ["先選一個看起來最聰明的工具", "先說清楚交付成果、正確依據與完成標準", "讓 Agent 完成後要進行驗收工作", "先要求 Agent 執行所有可用工具"], answer: "B" },
  { question: "新增的完整 PROMPT 範例包含哪六個要素？", options: ["標題、圖片、顏色、字型、動畫、頁碼", "問題、答案、分數、排名、時間、獎勵", "客戶、價格、數量、日期、工程、業務", "角色、背景、任務、格式、限制、查核標準"], answer: "D" },
  { question: "整理本次詢價時，「完成範例」的正確用途是什麼？", options: ["引用複製範例中的客戶名稱與數量", "參考欄位、格式及填寫方式，內容仍依本次詢價信填寫", "用範例內容補齊原信沒有提供的資料", "與本次詢價信一起作為原始資料來源"], answer: "B" },
  { question: "詢價信未提供「提供業務」「是否報」「數量」時，表格應如何呈現？", options: ["三個欄位留白，另列缺漏及待確認對象", "三個欄位都填入「已確認」", "請 AI 依常見情況推測", "複製上一筆案件的資料"], answer: "A" },
  { question: "教材中特別指出，下列哪項資料不得直接輸入 AI？", options: ["公開的產品介紹", "通用的報價說明草稿", "完整客戶報價比較表", "教學用的虛構詢價信範例"], answer: "C" },
  { question: "Agent 已完成給客戶的追問信草稿，寄送前必須做什麼？", options: ["只檢查錯字，其他交給 Agent", "由使用者確認收件人、信件內容與附件，再允許寄送", "只要表格正確，就讓 Agent 自動寄出", "先寄出，再請客戶協助檢查"], answer: "B" },
  { question: "去識別化工具完成自動偵測後，下一步應怎麼做？", options: ["直接把輸出交給 AI，因為系統已自動處理", "把完整資料拆成多次輸入 AI", "人工檢查有無漏掉識別資訊或其他機密內容，再判斷資料能否使用", "將替換代碼與對照資料一起交給 AI"], answer: "C" },
  { question: "去識別化資料的「代碼與原文對照資料」應如何處理？", options: ["與處理後文件一起交給 AI，方便它理解", "分開保管，不與處理後文件一起交給 AI", "放在追問信附件中，方便客戶查閱", "只要使用公司帳號，就可以公開分享"], answer: "B" }
]);
window.OJT_SCORE = function (answers) {
  const correct = window.OJT_QUIZ.reduce((sum, item, index) => sum + (answers[index] === item.answer ? 1 : 0), 0);
  return { correct, total: 12, score: Math.round(correct / 12 * 100), passed: correct >= 10 };
};

window.OJT_CATEGORIES = Object.freeze([
  { label: "AI 基礎與導入", questions: [1, 3] },
  { label: "工作方式與提示詞", questions: [4, 5, 6] },
  { label: "詢價整理與查核", questions: [2, 7, 8] },
  { label: "資料安全與對外發信", questions: [9, 10, 11, 12] }
]);
