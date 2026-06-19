# 變更紀錄（CHANGELOG）

本檔透過 git 同步，供多台電腦查閱歷史紀錄。

## 2026-06-19 — 報稅年度、列表報稅顯示、批次重新指派負責律師

### 問題描述
1. 新增/編輯案件需可選擇「報稅年度」。
2. 列表需顯示報稅年度與是否已報稅。
3. 需能將所有案件的負責律師批次改為指定對象。

### 設計決策
- 報稅年度以民國年存字串（如「113」）；選項自今年+1 起往前 7 年動態產生，免過期。
- 是否已報稅由 taxStatus 推導徽章：已申報→已報稅、免申報→免申報、其餘→未報稅。
- 批次指派採「客戶端管理者執行」：UsersPage 提供工具，選對象後以 writeBatch
  分批更新所有案件的 responsibleLawyerUid/Name（安全規則允許管理者寫入全部案件），
  免服務金鑰；對象從現有使用者清單選取以確保 UID 正確。

### 修改的檔案與內容
- `types/case.ts`：新增 taxYear。
- `config/caseOptions.ts`：新增 TAX_YEAR_OPTIONS（民國年動態產生）。
- `config/caseFields.ts`：新增報稅年度欄位（select、結案後可改、列表顯示）。
- `services/caseService.ts`：mapping 加 taxYear；新增 reassignAllCases（writeBatch）。
- `pages/CaseListPage.tsx`：新增「報稅」徽章欄（是否已報稅）；報稅年度隨欄位顯示。
- `pages/UsersPage.tsx`：新增「批次重新指派負責律師」卡片。

## 2026-06-19 — Google 登入強制選擇帳號

### 問題描述
以 Google 登入過一次後，再按 Google 登入會自動沿用同一帳號，
不跳出選擇畫面，無法切換到其他 Google 帳號。

### 修改的檔案與內容
- `services/authService.ts`：`loginWithGoogle` 的 provider 設定
  `setCustomParameters({ prompt: 'select_account' })`，每次登入皆顯示選擇帳號畫面。

## 2026-06-19 — 列表欄序/固定表頭、報稅語意、地院詞彙化、移除遷移

### 問題描述
1. 列表「日期/類型/當事人」需完整顯示不截斷；欄序調整為
   日期→類型→當事人→案由→目前進度→其他；被截斷者滑鼠移上顯示完整內容。
2. 列表向下捲動時表頭列需固定。
3. 報稅狀態改為：已申報、免申報、未申報（未填亦視為未申報）。
4. 移除「舊資料遷移」功能（已不需要）。
5. 「地院/地檢」改為與類型相同的詞彙管理形式。

### 修改的檔案與內容
- `config/caseFields.ts`：新增 listFull 旗標（日期/類型/當事人完整顯示）；
  court 改為詞彙型 select（vocabKey: court、可自訂）；VocabularyKey 加 court。
- `config/caseOptions.ts`：TAX_STATUS_OPTIONS 調整為 ''/已申報/免申報/未申報。
- `services/vocabularyService.ts`：VOCABULARY_DEFAULTS / LABELS / defaultVocabularyMap
  加入 court（地院/地檢，種子為空，由管理者新增）。
- `pages/CaseListPage.tsx`：欄序拆為「進度前/後」兩段並於中間插入目前進度；
  listFull 欄完整顯示、其餘截斷加 title 提示；表頭 sticky 固定、容器改
  max-h + overflow-auto；報稅篩選未申報含未填；地院選項併入詞彙。
- `pages/VocabularyAdminPage.tsx`：移除舊資料遷移卡片（地院詞彙編輯自動出現）。
- 刪除 `services/migrationService.ts`。

## 2026-06-19 — 欄位精簡、法扶旗標、列表版面與多條件篩選

### 問題描述
1. 對造、案號的輸入框過大，改為一般單行輸入。
2. 移除「日程/理由」欄位。
3. 列表每格大小調整：目前進度最大，案號等次要欄位縮小。
4. 列表左右捲動改善：拖曳捲動後放開不應誤觸進入案件（加可拖動）。
5. 新增案件時可勾選「是否為法扶案件」。
6. 案件列表新增多條件篩選：收件日區間、類型（多選）、負責律師、
   地院/地檢（多選）、法扶/非法扶、報稅狀態；未選即視為全部。

### 設計決策
- **法扶改為獨立布林旗標 legalAid**（與類型字串解耦），舊資料若未存此值，
  由類型是否含「法扶」自動推斷，免再次遷移。
- **拖曳捲動**：於列表容器以滑鼠拖曳水平捲動，並記錄位移量；位移超過門檻
  即視為拖曳，放開時不觸發進入案件，解決「拖完就跳進案件」問題。
- **欄寬配置驅動**：FieldDef 新增 listWidthClass，於設定檔調整各欄寬度。

### 修改的檔案與內容
- `types/case.ts`：移除 schedule；新增 legalAid。
- `config/caseFields.ts`：對造/案號改 text；移除日程/理由欄；EditableCaseKey
  排除 legalAid；新增 listWidthClass 並設定各欄寬度。
- `services/caseService.ts`：mapping 移除 schedule、新增 legalAid（含推斷）。
- `pages/NewCasePage.tsx`、`CaseDetailPage.tsx`：新增「是否為法扶案件」勾選、
  詳情頁加法扶徽章。
- `pages/CaseListPage.tsx`：欄寬調整、目前進度最寬、法扶標記；拖曳捲動與防誤觸；
  新增篩選面板（日期區間/類型多選/律師/地院多選/法扶/報稅）。

## 2026-06-19 — 新增「所有人」角色、逐人案件可見性、列表進度欄

### 問題描述
1. 角色需擴為三級：所有人 / 管理者 / 律師；「所有人」擁有管理者全部權限，
   且不可被任何人修改權限或刪除。
2. 使用者管理頁需可逐人設定「是否可看其他律師案件」，預設可看，由管理者/所有人調整。
3. 首頁案件列表需顯示目前處理進度。
4. 詞彙管理不應出現「其他」（或至少不可刪除），以免刪掉後無法再自訂。

### 設計決策
- **owner（所有人）角色**：`isAdmin` 改為「管理者或所有人」，owner 自動承襲管理者
  所有權限。owner 僅能於 Firebase 主控台手動指派；使用者管理頁該列完全鎖定，
  角色下拉只提供律師/管理者。安全規則禁止任何人修改/刪除 owner，亦禁止將他人提權為 owner。
- **viewAllCases 旗標**（預設 true）：律師可否看其他律師案件。管理者/所有人不受限。
  案件查詢與安全規則的讀取條件皆依此旗標；編輯/刪除仍限案件負責人與管理者。
- **「其他」改為下拉內建入口**（SelectWithCustom 提供），不存入詞彙清單，
  種子移除、顯示與新增皆過濾，避免被刪除後無法自訂。

### 修改的檔案與內容
- `config/constants.ts`：ROLES 新增 owner；新增 ADMIN_ROLES。
- `types/user.ts`：UserRole 加 owner；AppUser 加 viewAllCases。
- `services/authService.ts`：建立使用者時寫入 viewAllCases=true；profile 對應預設。
- `services/userService.ts`：listUsers 對應 viewAllCases；新增 updateUserViewAllCases。
- `context/authContext.ts`、`AuthProvider.tsx`：isAdmin 含 owner、新增 isOwner。
- `pages/UsersPage.tsx`：owner 列鎖定（角色徽章、姓名純文字、狀態鎖定）、
  新增「可看全部案件」欄（僅律師可調）。
- `services/caseService.ts`：subscribeCases 依 viewAllCases 決定查詢全部或自己。
- `firebase/firestore.rules`：isAdmin 含 owner；users 更新/刪除保護 owner、
  禁止提權為 owner；cases 讀取新增 viewAllCases 條件。
- `config/caseOptions.ts`：移除種子中的「其他」，新增 CUSTOM_OPTION_LABEL。
- `services/vocabularyService.ts`：讀取與新增皆過濾「其他」。
- `pages/CaseListPage.tsx`：新增「目前進度」欄（顯示最新一筆進度）。

### 後續動作（提醒使用者）
- 如需「所有人」帳號，請於 Firebase 主控台將該帳號 users 文件的 role 設為 `owner`。

## 2026-06-19 — 日期選擇器、可自訂詞彙、進度管理整併結案

### 問題描述
使用者提出五項調整：
1. 收件日改用日期選擇器（同進度管理）。
2. 類型 / 委任範圍選「其他」可手動輸入，並可選擇加入共用選項清單。
3. 首頁新增「詞彙管理」可增刪改查這些選項。
4. 委任狀遞出時間改日期選擇器，且可加「時間」（日期必填、時間選填）。
5. 處理 / 結果 / 狀態併入進度管理，結案也併入（可選時間、寫備註、勾選結案）。

### 設計決策
- **詞彙改存 Firestore**（新增 `vocabularies` 集合，文件 `caseType` / `mandateScope`，
  欄位 `values: string[]`），才能由管理者動態增減並跨裝置即時同步。
  種子值沿用原 `caseOptions.ts`；安全規則：任何登入者可讀、可「新增」選項
  （數量增加），改名 / 刪除限管理者。
- **詞彙管理權限**：管理者可完整 CRUD；律師僅能透過「其他 → 加入常用選項」附加。
- **舊資料一次性遷移**採「客戶端管理者執行」（免服務金鑰）：以 schemaVersion=2
  控制冪等，可重複執行。轉換民國日期→西元、把處理/結果/狀態各轉一筆進度紀錄、
  並以既有資料初始化詞彙清單。
- **結案併入進度**：結案時新增一筆標記 `closing` 的進度紀錄（內容為結案備註），
  並設定 `closed` 與 `closedAt`（取所選日期時間）。重新開啟仍限管理者。

### 修改的檔案與內容
- 型別 `types/case.ts`：`ProgressEntry` 加 `time?` / `closing?`；移除案件層
  `handling` / `result` / `status`；`receiptDate` / `mandateDate` 改為日期(時間)格式。
- 設定 `config/caseFields.ts`：新增 `datetime` 輸入型別與 `vocabKey` / `allowCustom`
  欄位屬性；收件日→`date`、委任狀→`datetime`、類型/委任範圍→詞彙型 select；移除舊三欄。
- 新增 `services/vocabularyService.ts`、`hooks/useVocabularies.ts`：詞彙讀寫與訂閱。
- 新增 `components/SelectWithCustom.tsx`：可選「其他」自訂並加入清單的下拉。
- `components/CaseForm.tsx`：動態選項、日期/日期時間渲染。
- `components/ProgressSection.tsx`：進度加時間欄；整併結案流程與管理者重新開啟。
- `services/caseService.ts`：`addProgressEntry` 支援時間、新增 `closeCaseWithEntry`、
  移除舊欄 mapping。
- 新增 `services/migrationService.ts` 與 `pages/VocabularyAdminPage.tsx`（含遷移按鈕）；
  `App.tsx` 加 `/vocabularies` 路由、`Layout.tsx` 加導覽（皆限管理者）。
- `firebase/firestore.rules`：新增 `vocabularies` 集合規則。
- 頁面 `CaseDetailPage.tsx` / `NewCasePage.tsx`：串接詞彙與新結案流程。

### 後續動作（提醒使用者）
- 部署後請管理者登入 → 「詞彙管理」→「執行遷移」一次，轉換既有 95 筆案件。

## 2026-06-19 — 首次部署上線（Firebase Hosting）

### 問題描述
於新電腦 clone 專案後，需正式部署至 Firebase，讓網站可從任何裝置開啟。

### 處理內容
- 新電腦補回未進版控的 `.env`（Firebase 網頁設定碼，專案 `case-test-e2dff`）。
- `npm install` 安裝前端依賴；`npx firebase-tools login` 登入。
- 部署 Firestore 安全規則：`firebase deploy --only firestore:rules`。
- `npm run build` 產生 dist；`firebase deploy --only hosting` 部署。
- 確認 https://case-test-e2dff.web.app 回傳 HTTP 200、標題「案件管理系統」，正式上線。

### 備註
- 後續更新網站：改完程式跑 `npm run deploy`（build + 全部 deploy）。
- 提醒首位管理者需於 Firebase 主控台手動將自身 `role` 改為 `admin`。

## 2026-06-20 — 匯入 95 筆歷史案件、建立規格書

### 問題描述
需將既有 Excel 案件匯入雲端，並彙整完整系統規格文件。

### 修改的檔案與內容
- 執行 `tools/import_cases.py`，以 `--owner-email seansu1220@gmail.com --owner-name 蘇翊瑄`
  將 95 筆案件（案件總表 92 + 法扶 3）匯入 Firestore，負責律師全為「蘇翊瑄」。
  類型分布：刑 55、民 22、家事 7、附民 5、刑(法扶) 3、行政 2、勞 1；皆未結案。
- 新增 `docs/SPEC.md`：完整系統規格書（架構、功能、資料模型、權限、部署）。
- `README.md`：加上規格書連結。

### 備註
- 匯入採 firebase-admin（服務金鑰），不受測試模式/安全規則限制。
- 提醒：正式存放當事人資料前應部署安全規則；服務金鑰用畢應妥善保管，不進版控。

## 2026-06-20 — 新增一鍵啟動批次檔

### 問題描述
使用者希望雙擊即可開啟系統，不用手動輸入指令。

### 根本原因 / 設計決策
- 採 Windows `.bat`：走 cmd 不受 PowerShell 執行原則限制，且可雙擊執行。
- 新增 npm `start` 腳本（`vite --open`），啟動後自動開啟瀏覽器。
- 批次檔首次執行會自動 `npm install`（呼應 CLAUDE.md 首次執行自動安裝依賴）。

### 修改的檔案與內容
- `package.json`：新增 `"start": "vite --open"`。
- 新增 `啟動案件管理系統.bat`：切換工作目錄、檢查/安裝套件、啟動並自動開瀏覽器。

## 2026-06-20 — 個人改名功能與管理頁案件數統計

### 問題描述
1. Google 登入帶入的名稱可能非本名，使用者需能自行改名。
2. 使用者管理頁需顯示每位律師的案件數。

### 修改的檔案與內容
- `firebase/firestore.rules`：users 更新規則放寬——本人可改自己的
  `displayName` / `lawyerName`（仍禁止自行變更 role/active）。
- `src/services/userService.ts`：新增 `updateOwnProfile`。
- `src/services/caseService.ts`：新增 `fetchCaseCountsByLawyer`（統計每位律師
  總數/進行中/已結案）。
- `src/context/authContext.ts`、`AuthProvider.tsx`：新增 `refreshUser`，改名後即時刷新。
- 新增 `src/pages/ProfilePage.tsx`（個人設定）、`App.tsx` 加 `/profile` 路由、
  `Layout.tsx` 右上角姓名可點進個人設定。
- `src/pages/UsersPage.tsx`：新增「案件數」欄位。

## 2026-06-19 — 快取策略與 Google 登入彈窗修正

### 問題描述
1. 修改後瀏覽器可能讀到舊快取，抓不到最新版本。
2. Google 登入時主控台出現 COOP 警告（window.closed/close 被封鎖）。

### 根本原因 / 設計決策
- Vite 建置已對 JS/CSS 加內容雜湊（檔名隨內容改變），但 `index.html` 若被快取會
  指向舊資產，故需讓 index.html 不快取、雜湊資產長期快取。
- Firebase `signInWithPopup` 需 `Cross-Origin-Opener-Policy: same-origin-allow-popups`
  才能正常操作彈出視窗，否則瀏覽器封鎖 window.closed/close 偵測並印出警告。

### 修改的檔案與內容
- `firebase.json`：hosting 新增 `headers`——index.html `no-cache`、
  雜湊資產 `max-age=31536000, immutable`、全站 `Cross-Origin-Opener-Policy`。
- `vite.config.ts`：dev server 加 `Cross-Origin-Opener-Policy` header（開發時同樣修正）。

## 2026-06-19 — 新增 Google 登入並支援與帳密連結

### 問題描述
需新增 Google 登入，並讓同一 email 的 Google 與 email/密碼帳號連結為同一帳號。

### 根本原因 / 設計決策
- 採 `signInWithPopup` + `GoogleAuthProvider`；帳號連結交由 Firebase 主控台設定
  「以相同 email 連結帳號」，同一 email 自動視為同一 uid，免寫複雜連結流程。
- 首次 Google 登入自動建立 users 文件（預設律師角色）；已存在則不覆寫，保留既有角色。

### 修改的檔案與內容
- `src/services/authService.ts`：新增 `loginWithGoogle`、`ensureUserDoc`，
  擴充 Google 相關錯誤訊息對應。
- 新增 `src/components/GoogleSignInButton.tsx`（含 Google 標誌）。
- `src/pages/LoginPage.tsx`、`RegisterPage.tsx`：加入分隔線與 Google 登入按鈕。

### 待設定（Firebase 主控台）
Authentication → 設定 → 使用者帳戶連結 → 選「以相同電子郵件地址連結帳戶」。

## 2026-06-19 — 根目錄分門別類整理

### 問題描述
專案根目錄檔案過多，需分類整理使結構清楚。

### 根本原因 / 設計決策
前端與 Firebase 工具鏈規定部分檔案須置於根目錄（package.json、vite.config.ts、
tsconfig*、index.html、.env、firebase.json、.firebaserc），強行搬移會破壞建置與部署，
故保留於根目錄；其餘可安全歸類者移入專屬資料夾。

### 修改的檔案與內容
- 新增 `firebase/`：移入 `firestore.rules`、`firestore.indexes.json`，
  並更新 `firebase.json` 的 `rules`/`indexes` 路徑。
- 新增 `data/`：移入當事人 Excel（仍由 .gitignore 排除）；
  更新 `tools/import_cases.py` 的 `--excel` 預設為 `data/蘇律師案件總表.xlsx`。
- `requirements.txt` 移入 `tools/`（僅匯入工具使用）；
  更新 `import_cases.py` 自動安裝的路徑參照。
- 更新 `README.md` 目錄結構說明。

## 2026-06-19 — 專案初版建立

### 問題描述
需從零建立律師案件管理網頁，需求包含：帳號登入/註冊與權限分級（管理者、律師）、
案件 CRUD（律師只能看/刪自己的）、案件進度管理、結案鎖定（僅報稅可改）、
跨裝置雲端同步、可部署至免費網域。

### 根本原因 / 設計決策
- **後端選用 Firebase**：Authentication 處理帳號、Firestore 即時跨裝置同步、
  Hosting 提供免費網域；權限可於安全規則（資料庫層）強制，符合需求且免費額度足夠。
- **前端 React + TypeScript + Vite + Tailwind**：符合 CLAUDE.md 型別先行、
  職責分離；響應式支援桌機/平板/手機。
- **法扶案件合併**為單一 `cases` 集合，以「類型」欄位（刑(法扶)）區分。
- **收件日 / 委任狀遞出時間改為文字欄位**：保留 Excel 民國日期格式（如 111.05.09），
  避免 HTML date 欄位無法顯示；日期選擇器僅用於「進度管理」。
- **第一位管理者採手動提權**：安全規則禁止自我提權為 admin，首位管理者於
  Firebase 主控台手動設定，杜絕權限漏洞。

### 新增的檔案與內容
- 專案骨架：`package.json`、`vite.config.ts`、`tsconfig*.json`、`index.html`、`.gitignore`、`.env.example`
- 型別：`src/types/user.ts`、`src/types/case.ts`
- 配置：`src/config/constants.ts`、`caseOptions.ts`、`caseFields.ts`
- Firebase：`src/lib/firebase.ts`
- 業務邏輯：`src/services/authService.ts`、`userService.ts`、`caseService.ts`
- 狀態/Hooks：`src/context/authContext.ts`、`AuthProvider.tsx`、`src/hooks/useAuth.ts`、`useCases.ts`
- UI：`src/App.tsx`、`main.tsx`、`components/`（Layout、ProtectedRoute、CaseForm、ProgressSection、ui）、
  `pages/`（Login、Register、CaseList、NewCase、CaseDetail、Users）
- 安全規則與部署：`firestore.rules`、`firestore.indexes.json`、`firebase.json`、`.firebaserc`
- 匯入工具：`tools/import_cases.py`、`requirements.txt`
- 文件：`README.md`、本 CHANGELOG

### 案件欄位（來源：蘇律師案件總表.xlsx）
收件日、類型、當事人、對造、案由、電話、案號、住址、處理、日程/理由、
地院/地檢、委任狀遞出時間、委任範圍、結果、狀態、報稅；
另加系統欄位：負責律師、進度紀錄、結案狀態、建立/更新時間。
