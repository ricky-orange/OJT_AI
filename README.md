# AI 教育訓練會後小測驗

手機優先的 12 題單選測驗。每題沿用定稿內容，答對至少 10 題及格（10/12 換算為 83 分）；每次測驗在 Google 試算表新增一列，可重複作答。網站是 GitHub Pages 靜態頁面，試算表由 Google Apps Script Web App 接收。

## 啟用前準備

目前 `config.js` 的 `scriptUrl` 留空，網站會顯示測驗結果，但**不會寫入試算表**。依以下順序完成設定。

1. 在 Google 雲端硬碟建立一份新的 Google 試算表，建議命名「AI 教育訓練測驗紀錄」。這份表單包含員工編號與成績，僅分享給需要查看成績的管理者，**不要設成公開檢視**。
2. 複製試算表網址中 `/d/` 與 `/edit` 之間的 ID。例如 `https://docs.google.com/spreadsheets/d/這段是ID/edit`。
3. 在試算表選「擴充功能 → Apps Script」，刪除預設程式，貼上本專案 [`apps-script/Code.gs`](apps-script/Code.gs) 全部內容。將開頭的 `SPREADSHEET_ID` 改成剛才的 ID。`SITE_ORIGIN` 已設定為 `https://ricky-orange.github.io`；若網站未來改網域，需同步修改。
4. 在 Apps Script 上方函式選單選 `setupSheet`，按「執行」，完成 Google 授權。回到試算表，確認出現「測驗紀錄」工作表與標題列。
5. 在 Apps Script 按「部署 → 新增部署」，類型選「網頁應用程式」；「執行身分」選**我**；「誰可以存取」選**任何人**，按「部署」。複製以 `/exec` 結尾的網頁應用程式網址。這讓手機訪客無須登入你的 Google 帳號即可提交；試算表本身仍維持私密。
6. 編輯 [`config.js`](config.js)，把 `/exec` 網址填入 `scriptUrl` 引號內，儲存並推送到 GitHub。網址屬公開接收端，**不要**把密碼或 Google 憑證寫入這個檔案。
7. 到 GitHub 儲存庫 `Settings → Pages`，在 `Build and deployment` 選 `Deploy from a branch`，分支選 `main`、資料夾選 `/ (root)`，按 `Save`。部署完成後，網站位址是 <https://ricky-orange.github.io/OJT_AI/>。
8. 用手機開啟網站，填入**測試用員工編號**，完成一次測驗。成績畫面須顯示「成績已記錄到 Google 試算表」，並確認試算表新增一列。再重測一次，應新增第二列。確認後可刪除測試列。

若修改 Apps Script 程式，請在「部署 → 管理部署」編輯現有部署並建立新版本；只修改網站的 `config.js` 不需要重新部署 Apps Script。

## 資料與限制

試算表記錄伺服器時間、員工編號、作答識別碼、分數、答對題數、及格狀態、作答秒數，以及每題所選選項。相同作答識別碼重送時只存一列；重新開始測驗會得到新的識別碼。計分由 Apps Script 依答案重新計算。

此網站和 Apps Script 接收網址是公開的，表單驗證與防重送不等於身分驗證。若只允許公司同仁作答，需另外設計登入或限制存取方案。請勿在公開儲存庫放入試算表 ID、個資或憑證。

## 學習成效頁

[`dashboard.html`](dashboard.html) 會直接向同一個 Apps Script 部署讀取「測驗紀錄」頁籤的彙總數字，包括參與人數、累積作答、最近一次及格率、平均分數、成績分布與各題答對率。以員工編號辨識重測，每人的成績分析取最後一筆；`TEST-CODEX-` 開頭的測試列不列入統計。回傳資料不含員工編號或個人成績。

**啟用此頁需要更新 Apps Script 部署：**將專案最新的 [`apps-script/Code.gs`](apps-script/Code.gs) 內容複製到現有 Apps Script，**保留你已填妥的 `SPREADSHEET_ID`**，然後選「部署 → 管理部署 → 編輯」，版本選「新版本」並部署。`/exec` 網址若未變，`config.js` 不必更動；若產生新網址，請更新 `config.js`。開啟網站的「學習成效」入口並按「更新資料」即可重新讀取。

公開網站的彙總統計也可由任何知道網址的人查看。不要在公開頁面提供員工編號、個別成績、原始答題紀錄或試算表的分享連結。若需要管理者專屬的個人成績視圖，應另建具身分驗證的後台。

## 本機檢查

在專案根目錄執行 `node --test` 測試題目、計分與試算表接收邏輯。可用 `python -m http.server 8765` 預覽網站；未設定 Apps Script 時，可檢查畫面與計分，無法測試寫入 Google 試算表。
