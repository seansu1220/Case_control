# 案件管理系統 規格書（SPEC）

> 版本：v1.0　建立日期：2026-06-19 ～ 2026-06-20
> 對應原始碼倉庫：<https://github.com/seansu1220/Case_control>

律師事務所案件管理網頁系統。提供帳號權限分級、案件 CRUD、進度管理、結案鎖定，
資料存於 Firebase 雲端，桌機 / 平板 / 手機皆可使用並即時同步。

---

## 1. 系統概述

| 項目 | 內容 |
| --- | --- |
| 目的 | 取代 Excel 人工管理，提供多人多裝置、權限可控的案件管理 |
| 使用者 | 事務所律師（一般使用者）與管理者 |
| 核心價值 | 律師只看自己案件、結案後鎖定防誤改、雲端即時同步 |
| 資料來源 | 蘇律師案件總表.xlsx（案件總表 + 法扶案件，共 95 筆已匯入） |

---

## 2. 技術架構

| 層級 | 技術 |
| --- | --- |
| 前端框架 | React 19 + TypeScript |
| 建置工具 | Vite 6 |
| 樣式 | Tailwind CSS 4（響應式） |
| 路由 | React Router 7 |
| 驗證 | Firebase Authentication（Email/密碼、Google） |
| 資料庫 | Cloud Firestore（NoSQL，即時同步） |
| 部署 | Firebase Hosting（免費網域 `xxx.web.app`） |
| 匯入工具 | Python 3 + openpyxl + firebase-admin |

### 架構原則（呼應 CLAUDE.md）
- **職責分離**：UI（components/pages）↔ 業務邏輯（services）↔ 狀態（hooks/context）分層，services 不依賴 React。
- **型別先行**：跨模組資料結構先定義於 `src/types`。
- **配置驅動**：案件欄位、選項、常數集中於 `src/config`，調整規則不動邏輯。
- **安全在資料庫層**：權限由 Firestore Security Rules 強制，非僅前端。

---

## 3. 功能規格

### 3.1 帳號與登入
- **註冊**：Email + 密碼（至少 6 碼）+ 姓名。註冊後預設角色為「律師」。
- **登入**：Email/密碼，或 **Google 一鍵登入**。
- **帳號連結**：同一 email 的 Google 與密碼帳號，於 Firebase 設定「以相同 email 連結帳號」後視為同一帳號。
- **個人改名**：右上角姓名 → 個人設定，可改「姓名」（同時作為顯示名稱與案件負責律師名），不可自行改角色。

### 3.2 權限角色
| 角色 | 說明 |
| --- | --- |
| 律師 lawyer | 只能讀 / 編輯 / 刪除自己負責的案件 |
| 管理者 admin | 可讀全部案件、指派負責律師、重開結案案件、管理使用者 |

- 第一位管理者由 Firebase 主控台手動將 `role` 設為 `admin`（安全規則禁止自我提權）。

### 3.3 案件管理
- **新增**：依設定檔欄位填寫；律師自動指派給自己，管理者可指定他人。
- **列表**：搜尋（當事人 / 案號 / 案由 / 對造）、「顯示已結案」開關；管理者多顯示「負責律師」欄。
- **編輯**：未結案時可改所有欄位。
- **刪除**：本人或管理者，需二次確認。

### 3.4 進度管理
- 每筆案件可新增多筆進度紀錄，每筆 = **日期（日期選擇器）+ 進度內容**。
- 依日期由新到舊顯示，可刪除單筆。
- 結案後鎖定，不可新增 / 刪除。

### 3.5 結案與報稅
- 「結案」勾選後二次確認 → 案件鎖定。
- **結案後：除「報稅」欄位外，所有欄位與進度皆不可修改。**
- 「報稅」結案後仍可調整（已申報 / 未申報 / 免申報）。
- 重新開啟案件：僅限管理者。

### 3.6 使用者管理（限管理者）
- 列出所有使用者，顯示姓名 / Email / 律師姓名 / **案件數（總數、進行中、結案）** / 角色 / 狀態。
- 可調整他人角色（律師 ↔ 管理者）、律師姓名、啟用 / 停用帳號。

### 3.7 路由
| 路徑 | 頁面 | 權限 |
| --- | --- | --- |
| `/login`、`/register` | 登入 / 註冊 | 公開 |
| `/` | 案件列表 | 需登入 |
| `/cases/new` | 新增案件 | 需登入 |
| `/cases/:caseId` | 案件詳情 | 需登入（僅本人 / 管理者） |
| `/profile` | 個人設定 | 需登入 |
| `/users` | 使用者管理 | 限管理者 |

---

## 4. 資料模型（Firestore）

### 4.1 `users/{uid}`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| uid | string | 帳號 ID（同文件 ID） |
| email | string | 登入 email |
| displayName | string | 顯示名稱 |
| lawyerName | string | 律師姓名（案件負責律師對應，預設同 displayName） |
| role | 'admin' \| 'lawyer' | 角色 |
| active | boolean | 是否啟用 |
| createdAt | timestamp | 建立時間 |

### 4.2 `cases/{caseId}`
**來自 Excel 的欄位**（皆字串）：
| 欄位 | 中文 |
| --- | --- |
| receiptDate | 收件日 |
| caseType | 類型（刑/民/刑(法扶)/附民/家事/勞/行政…） |
| client | 當事人 |
| opposingParty | 對造 |
| caseReason | 案由 |
| phone | 電話 |
| caseNumber | 案號 |
| address | 住址 |
| handling | 處理 |
| schedule | 日程/理由 |
| court | 地院/地檢 |
| mandateDate | 委任狀遞出時間 |
| mandateScope | 委任範圍 |
| result | 結果 |
| status | 狀態 |
| taxStatus | 報稅（結案後唯一可改欄位） |

**系統欄位**：
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| responsibleLawyerUid | string | 負責律師 uid（權限判斷依據） |
| responsibleLawyerName | string | 負責律師姓名（顯示快取） |
| progressEntries | array | 進度紀錄陣列（見下） |
| closed | boolean | 是否結案 |
| closedAt | timestamp \| null | 結案時間 |
| createdByUid | string | 建立者 uid |
| createdAt / updatedAt | timestamp | 建立 / 更新時間 |

**progressEntries 項目**：`{ id, date (yyyy-MM-dd), content, createdAt, createdByUid }`

---

## 5. 權限矩陣與安全規則

| 操作 | 律師 | 管理者 |
| --- | --- | --- |
| 讀案件 | 僅自己負責 | 全部 |
| 新增案件 | 指派給自己 | 可指派他人 |
| 編輯案件（未結案） | 自己的 | 全部 |
| 編輯案件（已結案） | 僅報稅 | 僅報稅 |
| 重新開啟案件 | ❌ | ✅ |
| 刪除案件 | 自己的 | 全部 |
| 改自己姓名 | ✅ | ✅ |
| 改他人角色/狀態 | ❌ | ✅ |
| 使用者管理頁 | ❌ | ✅ |

規則重點（`firebase/firestore.rules`）：
- `users` 建立：只能建自己的、角色強制 lawyer、active true（防自我提權）。
- `users` 更新：本人僅能改 displayName/lawyerName；角色/狀態僅管理者。
- `cases` 讀/刪：本人或管理者。
- `cases` 更新：未結案本人可改；已結案僅 `taxStatus`（+updatedAt）可改；管理者不受限。

---

## 6. 目錄結構

```
Case_Control/
├─ src/
│  ├─ types/        型別（user.ts、case.ts）
│  ├─ config/       設定（constants、caseOptions、caseFields）
│  ├─ lib/          firebase.ts 初始化
│  ├─ services/     業務邏輯（authService、userService、caseService）
│  ├─ hooks/        useAuth、useCases
│  ├─ context/      authContext、AuthProvider
│  ├─ components/   Layout、ProtectedRoute、CaseForm、ProgressSection、
│  │                GoogleSignInButton、ui
│  └─ pages/        Login、Register、CaseList、NewCase、CaseDetail、
│                   Profile、Users
├─ firebase/        firestore.rules、firestore.indexes.json
├─ tools/           import_cases.py、requirements.txt
├─ data/            蘇律師案件總表.xlsx（不進版控）
├─ docs/            SPEC.md（本檔）、CHANGELOG.md
├─ firebase.json / .firebaserc   Firebase 部署設定
├─ 啟動案件管理系統.bat            一鍵啟動（雙擊自動開瀏覽器）
└─ 其餘：package.json、vite/tsconfig、index.html、.env（不進版控）
```

---

## 7. 環境設定與部署

### 本機開發
1. 複製 `.env.example` 為 `.env`，填入 Firebase 網頁設定碼。
2. `npm install` → `npm run dev`（或雙擊「啟動案件管理系統.bat」）。

### 安全規則
於 Firebase 主控台 Firestore → 規則貼上 `firebase/firestore.rules` 並發布；
或 `npx firebase-tools deploy --only firestore:rules`。

### 部署上線
`npm run build` → `npx firebase-tools deploy --only hosting`，
取得 `https://<專案ID>.web.app`，任何裝置可用。

### 快取策略
Vite 對 JS/CSS 加內容雜湊；`firebase.json` 設定 index.html 不快取、雜湊資產長期快取，
確保更新後使用者一律取得最新版本。

### 匯入既有案件
```
python tools/import_cases.py --owner-email <登入email> --owner-name 蘇翊瑄 --dry-run
python tools/import_cases.py --owner-email <登入email> --owner-name 蘇翊瑄
```
需 `serviceAccountKey.json`（Firebase 服務帳戶私密金鑰，不進版控）。

---

## 8. 已知限制與未來工作

- 現以 Firestore「測試模式」開發；**正式存放當事人資料前，務必部署安全規則**。
- Google 登入已串接；如需停用密碼註冊、限定網域可再調整。
- 報表 / 匯出、案件附件上傳、進度通知等為未來可擴充項目。
- 主程式 JS 包約 740KB（含 Firebase SDK），如需可再做 code-splitting。

---

## 9. 目前狀態（2026-06-20）

- ✅ 系統功能完成、可本機執行
- ✅ Firebase 專案 `case-test-e2dff`，Email + Google 登入已啟用
- ✅ 95 筆歷史案件已匯入，負責律師全為「蘇翊瑄」
- ✅ 程式碼已推送 GitHub
- ⏳ 待辦：部署安全規則（如仍為測試模式）、部署 Hosting 上線供多裝置使用
