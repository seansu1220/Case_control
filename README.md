# 案件管理系統（Case Control）

律師事務所案件管理網頁。支援帳號登入/註冊與權限分級、案件 CRUD、進度管理、結案鎖定，
資料存於 Firebase Firestore，桌機/平板/手機皆可使用、即時跨裝置同步。

## 功能總覽

| 功能 | 說明 |
| --- | --- |
| 帳號 | Email/密碼註冊、登入；角色分「管理者」與「律師」 |
| 權限 | 律師預設只看/刪自己負責的案件；管理者看全部並管理使用者 |
| 案件 | 新增、刪除（限自己的）、編輯，欄位沿用事務所 Excel 總表 |
| 進度管理 | 每筆案件可新增多筆「日期 + 進度內容」紀錄 |
| 結案 | 勾選結案並確認後鎖定，**僅「報稅」欄位仍可修改** |
| 跨裝置 | Firestore 即時同步，響應式介面 |

權限與「結案後不可修改」規則在 **Firestore 安全規則（資料庫層）** 強制，
不只靠前端，無法從瀏覽器繞過。

## 技術架構

- 前端：React + TypeScript + Vite + Tailwind CSS
- 後端：Firebase Authentication + Cloud Firestore
- 部署：Firebase Hosting（免費網域 `xxx.web.app`）

目錄結構（呼應 CLAUDE.md 的職責分離 / 型別先行 / 配置驅動）：

```
src/
  types/      型別定義（Case、User、ProgressEntry）
  config/     設定檔：案件欄位、選項、常數（調整規則只改這裡）
  lib/        firebase 初始化
  services/   業務邏輯（auth / cases / users），不依賴 UI
  hooks/      useAuth、useCases
  context/    驗證狀態 Provider
  components/  純 UI 元件
  pages/      頁面
tools/        Python 匯入工具
firestore.rules        資料庫安全規則
firebase.json          Hosting 與 Firestore 部署設定
```

---

## 一、初次設定

### 1. 建立 Firebase 專案
1. 用 Google 帳號登入 <https://console.firebase.google.com>，建立新專案。
2. **Authentication** → 開始使用 → 啟用「電子郵件/密碼」登入方式。
3. **Firestore Database** → 建立資料庫（正式版即可，規則之後會部署）。
4. 專案設定（齒輪）→ 一般 → 「你的應用程式」新增**網頁應用程式**，
   複製 SDK 設定碼。

### 2. 填入前端環境變數
複製 `.env.example` 為 `.env`，填入上一步的設定碼：

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. 安裝與本機啟動

```bash
npm install
npm run dev
```

瀏覽器開 <http://localhost:5173>。手機/平板可連同一區網的 `http://<你的電腦IP>:5173` 測試。

### 4. 設定第一位管理者
1. 在系統「註冊」一個帳號（預設角色為律師）。
2. Firebase 主控台 → Firestore → `users` 集合 → 找到該帳號 →
   將 `role` 由 `lawyer` 改為 `admin`。
3. 重新登入，即可在「使用者管理」頁調整其他人的角色。

---

## 二、部署安全規則與網站

需先安裝 Firebase CLI 並登入：

```bash
npm install -g firebase-tools   # 或用 npx firebase
firebase login
```

把 `.firebaserc` 內的 `請改成你的-firebase-專案-id` 換成實際專案 ID，然後：

```bash
firebase deploy --only firestore:rules   # 部署安全規則（重要！）
npm run build                            # 產生 dist/
firebase deploy --only hosting           # 部署網站
```

完成後即可用 `https://<專案ID>.web.app` 在任何裝置開啟。
（`npm run deploy` 可一次完成 build + 全部 deploy。）

---

## 三、匯入既有 Excel 案件

`tools/import_cases.py` 會把「蘇律師案件總表.xlsx」（含法扶分頁）匯入 Firestore。

> 註：該 Excel 實際約有 95 筆案件（案件總表 92 + 法扶 3），其餘列為空白。

步驟：
1. 請負責律師先在系統註冊帳號，於 Firebase → Authentication 複製其 **UID**。
2. Firebase 專案設定 → 服務帳戶 → 產生新的私密金鑰，下載為
   `serviceAccountKey.json` 放專案根目錄（已列入 .gitignore，勿進版控）。
3. 執行（首次會自動安裝 Python 依賴）：

```bash
# 先預覽不寫入
python tools/import_cases.py --owner-uid <UID> --owner-name 蘇律師 --dry-run
# 確認無誤後正式匯入
python tools/import_cases.py --owner-uid <UID> --owner-name 蘇律師
```

---

## 四、權限規則摘要

| 角色 | 案件讀取 | 新增 | 編輯 | 刪除 | 使用者管理 |
| --- | --- | --- | --- | --- | --- |
| 律師 | 僅自己負責的 | ✅（自己） | ✅（未結案） | ✅（自己的） | ❌ |
| 管理者 | 全部 | ✅（可指派他人） | ✅（含重開案件） | ✅ | ✅ |

結案後：任何人都僅能修改「報稅」欄位；重新開啟案件僅限管理者。
