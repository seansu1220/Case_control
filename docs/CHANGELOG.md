# 變更紀錄（CHANGELOG）

本檔透過 git 同步，供多台電腦查閱歷史紀錄。

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
