/**
 * 案件相關型別。
 * 對應 Firestore `cases/{caseId}` 文件。
 *
 * 欄位來源：蘇律師案件總表.xlsx（案件總表 + 法扶案件兩分頁合併），
 * 另加上「負責律師」「結案」「進度紀錄」等系統欄位。
 */

/** 單筆進度紀錄：使用者選一個日期（可加時間）+ 填寫當下進度。 */
export interface ProgressEntry {
  /** 前端產生的唯一 ID（用於 React key 與刪除）。 */
  id: string;
  /** 進度日期（yyyy-MM-dd）。 */
  date: string;
  /** 進度時間（HH:mm），選填；空字串代表只記日期。 */
  time?: string;
  /** 進度內容描述。 */
  content: string;
  /** 是否為「結案」紀錄（結案時自動產生的那筆，內容即結案備註）。 */
  closing?: boolean;
  /** 紀錄建立時間（ISO 字串）。 */
  createdAt: string;
  /** 紀錄建立者的 uid。 */
  createdByUid: string;
}

/**
 * 案件本體。
 *
 * 注意：以下「來自 Excel」的欄位多為自由文字（含歷史資料），
 * 不強制格式；新案件的進度則改用結構化的 progressEntries。
 */
export interface CaseRecord {
  /** Firestore 文件 ID。 */
  id: string;

  // ── 來自 Excel 的案件欄位 ──
  /** 收件日（yyyy-MM-dd，日期選擇器）。 */
  receiptDate: string;
  /** 類型（刑、民 等；選項存於 vocabularies/caseType）。 */
  caseType: string;
  /** 是否為法扶案件（與類型獨立的旗標，供標示與篩選）。 */
  legalAid: boolean;
  /** 當事人。 */
  client: string;
  /** 對造。 */
  opposingParty: string;
  /** 案由。 */
  caseReason: string;
  /** 聯絡電話。 */
  phone: string;
  /** 案號。 */
  caseNumber: string;
  /** 住址。 */
  address: string;
  /** 地院 / 地檢。 */
  court: string;
  /** 委任狀遞出時間（yyyy-MM-dd 或 yyyy-MM-dd HH:mm；日期必填、時間選填）。 */
  mandateDate: string;
  /** 委任範圍（選項存於 vocabularies/mandateScope）。 */
  mandateScope: string;
  /** 報稅（結案後仍可修改的唯一欄位）。 */
  taxStatus: string;
  // 註：原「處理 / 結果 / 狀態」欄位已併入進度管理（progressEntries），不再為獨立欄位。

  // ── 系統欄位 ──
  /** 負責律師的 uid（權限判斷依據）。 */
  responsibleLawyerUid: string;
  /** 負責律師姓名（顯示用快取）。 */
  responsibleLawyerName: string;
  /** 進度紀錄列表（依日期排序顯示）。 */
  progressEntries: ProgressEntry[];
  /** 是否已結案；結案後僅 taxStatus 可改。 */
  closed: boolean;
  /** 結案時間（ISO 字串），未結案為 null。 */
  closedAt: string | null;
  /** 建立者 uid。 */
  createdByUid: string;
  /** 建立時間（ISO 字串）。 */
  createdAt: string;
  /** 最後更新時間（ISO 字串）。 */
  updatedAt: string;
}

/**
 * 新增案件時的輸入（不含系統自動填入的 id / 時間戳 / 結案狀態）。
 * 負責律師預設為目前登入者，管理者可指定他人。
 */
export type CaseDraft = Omit<
  CaseRecord,
  'id' | 'progressEntries' | 'closed' | 'closedAt' | 'createdByUid' | 'createdAt' | 'updatedAt'
>;
