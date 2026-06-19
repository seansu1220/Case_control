# 變更紀錄（CHANGELOG）

本檔透過 git 同步，供多台電腦查閱歷史紀錄。

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
