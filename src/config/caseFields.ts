/**
 * 案件欄位定義（配置驅動）。
 *
 * 表單與列表畫面皆從這份定義產生，新增/調整欄位只改這裡，
 * 不需動到表單元件與列表元件的程式碼。
 */
import type { CaseRecord } from '../types/case';
import { TAX_STATUS_OPTIONS } from './caseOptions';

/** 欄位輸入類型。 */
export type FieldInputType = 'text' | 'textarea' | 'date' | 'datetime' | 'select' | 'tel';

/** 詞彙清單鍵（對應 Firestore vocabularies/{key}）。 */
export type VocabularyKey = 'caseType' | 'mandateScope';

/**
 * 可由「字串型」表單欄位編輯的案件鍵（排除系統欄位、進度紀錄與布林旗標）。
 * legalAid 為布林值，於頁面以獨立 checkbox 處理，不走 CASE_FIELDS。
 */
export type EditableCaseKey = Exclude<
  keyof CaseRecord,
  | 'id'
  | 'progressEntries'
  | 'closed'
  | 'closedAt'
  | 'createdByUid'
  | 'createdAt'
  | 'updatedAt'
  | 'responsibleLawyerUid'
  | 'responsibleLawyerName'
  | 'legalAid'
>;

/** 單一欄位的定義。 */
export interface FieldDef {
  key: EditableCaseKey;
  label: string;
  inputType: FieldInputType;
  /** select 類型的固定選項（詞彙型欄位改用 vocabKey 動態載入）。 */
  options?: readonly string[];
  /** 詞彙型 select 對應的清單鍵；有此值時選項來自 Firestore，可動態增減。 */
  vocabKey?: VocabularyKey;
  /** select 是否允許「其他」手動輸入自訂值。 */
  allowCustom?: boolean;
  /** 是否必填。 */
  required?: boolean;
  /** 是否在案件列表（表格）顯示。 */
  showInList?: boolean;
  /** 列表欄位的寬度上限樣式（控制各格大小，重要欄寬、次要欄窄）。 */
  listWidthClass?: string;
  /**
   * 結案後是否仍可編輯。
   * 依需求：結案後僅「報稅」可改，其餘鎖定。
   */
  editableAfterClosed?: boolean;
}

/**
 * 案件所有可編輯欄位定義，順序即表單呈現順序。
 *
 * 註：原「處理 / 結果 / 狀態」已併入進度管理，不在此列。
 */
export const CASE_FIELDS: FieldDef[] = [
  { key: 'receiptDate', label: '收件日', inputType: 'date', showInList: true, listWidthClass: 'max-w-[6rem]' },
  { key: 'caseType', label: '類型', inputType: 'select', vocabKey: 'caseType', allowCustom: true, required: true, showInList: true, listWidthClass: 'max-w-[5rem]' },
  { key: 'client', label: '當事人', inputType: 'text', required: true, showInList: true, listWidthClass: 'max-w-[8rem]' },
  { key: 'opposingParty', label: '對造', inputType: 'text' },
  { key: 'caseReason', label: '案由', inputType: 'text', showInList: true, listWidthClass: 'max-w-[11rem]' },
  { key: 'phone', label: '電話', inputType: 'tel' },
  { key: 'caseNumber', label: '案號', inputType: 'text', showInList: true, listWidthClass: 'max-w-[6rem]' },
  { key: 'address', label: '住址', inputType: 'textarea' },
  { key: 'court', label: '地院/地檢', inputType: 'text', showInList: true, listWidthClass: 'max-w-[7rem]' },
  { key: 'mandateDate', label: '委任狀遞出時間', inputType: 'datetime' },
  { key: 'mandateScope', label: '委任範圍', inputType: 'select', vocabKey: 'mandateScope', allowCustom: true },
  {
    key: 'taxStatus',
    label: '報稅',
    inputType: 'select',
    options: TAX_STATUS_OPTIONS,
    editableAfterClosed: true,
  },
];

/** 列表顯示用的欄位子集。 */
export const LIST_FIELDS: FieldDef[] = CASE_FIELDS.filter((field) => field.showInList);

/** 建立空白案件草稿（所有欄位預設空字串）。 */
export function createEmptyCaseValues(): Record<EditableCaseKey, string> {
  const values = {} as Record<EditableCaseKey, string>;
  for (const field of CASE_FIELDS) {
    values[field.key] = '';
  }
  return values;
}

/** 從案件記錄抽出可編輯欄位的值（供編輯表單初始化）。 */
export function extractEditableValues(record: CaseRecord): Record<EditableCaseKey, string> {
  const values = createEmptyCaseValues();
  for (const field of CASE_FIELDS) {
    values[field.key] = record[field.key] ?? '';
  }
  return values;
}
