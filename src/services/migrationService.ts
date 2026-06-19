/**
 * 舊資料一次性遷移（由管理者於瀏覽器執行，透過已登入身分寫入，免服務金鑰）。
 *
 * 內容：
 *  1. 收件日 / 委任狀遞出時間：民國格式文字（111.05.09）→ 西元（2022-05-09，委任狀可含時間）。
 *  2. 處理 / 結果 / 狀態：非空者各轉為一筆進度紀錄，原欄位移除。
 *  3. 詞彙清單（類型 / 委任範圍）：以預設種子 + 既有案件出現過的值初始化。
 *
 * 以 schemaVersion 控制冪等：已為 2 的案件略過，可安全重複執行。
 */
import {
  collection,
  deleteField,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../config/constants';
import type { ProgressEntry } from '../types/case';
import type { AppUser } from '../types/user';
import { addVocabularyValue, VOCABULARY_DEFAULTS } from './vocabularyService';

const SCHEMA_VERSION = 2;

/** 遷移結果摘要。 */
export interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  dateConverted: number;
  entriesCreated: number;
  unparseableDates: string[];
}

/**
 * 民國/西元日期字串 → 西元 yyyy-MM-dd（可附帶 HH:mm）。
 * 無法解析時回傳 null（呼叫端保留原值）。
 */
export function normalizeDate(raw: string): string | null {
  const text = (raw ?? '').trim();
  if (!text) return '';
  // 已是西元 yyyy-MM-dd（可能含時間）→ 維持。
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text;

  const dateMatch = text.match(/(\d{2,4})[.\/\-年](\d{1,2})[.\/\-月](\d{1,2})/);
  if (!dateMatch) return null;

  let year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (year < 1000) year += 1911; // 民國 → 西元
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hh = String(Number(timeMatch[1])).padStart(2, '0');
    return `${iso} ${hh}:${timeMatch[2]}`;
  }
  return iso;
}

/** 取得某案件遷移時用於舊欄位的紀錄日期（收件日 → 建立日 → 今日）。 */
function fallbackEntryDate(data: DocumentData, normalizedReceipt: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(normalizedReceipt)) return normalizedReceipt.slice(0, 10);
  const created = data.createdAt;
  if (created && typeof created.toDate === 'function') {
    return created.toDate().toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

/** 執行遷移。回傳摘要供畫面顯示。 */
export async function runMigration(currentUser: AppUser): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    dateConverted: 0,
    entriesCreated: 0,
    unparseableDates: [],
  };

  // 蒐集案件中出現過的類型 / 委任範圍值，連同種子一起寫入詞彙清單。
  const caseTypeValues = new Set<string>(VOCABULARY_DEFAULTS.caseType);
  const mandateScopeValues = new Set<string>(VOCABULARY_DEFAULTS.mandateScope);

  const snapshot = await getDocs(collection(db, COLLECTIONS.cases));
  result.total = snapshot.size;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (typeof data.caseType === 'string' && data.caseType.trim()) caseTypeValues.add(data.caseType.trim());
    if (typeof data.mandateScope === 'string' && data.mandateScope.trim())
      mandateScopeValues.add(data.mandateScope.trim());

    if ((data.schemaVersion ?? 0) >= SCHEMA_VERSION) {
      result.skipped += 1;
      continue;
    }

    const update: Record<string, unknown> = { schemaVersion: SCHEMA_VERSION, updatedAt: serverTimestamp() };

    // 1. 日期正規化。
    const normReceipt = normalizeDate(data.receiptDate ?? '');
    if (normReceipt === null) {
      if ((data.receiptDate ?? '').trim()) result.unparseableDates.push(`收件日「${data.receiptDate}」`);
    } else if (normReceipt !== (data.receiptDate ?? '')) {
      update.receiptDate = normReceipt;
      if (normReceipt) result.dateConverted += 1;
    }

    const normMandate = normalizeDate(data.mandateDate ?? '');
    if (normMandate === null) {
      if ((data.mandateDate ?? '').trim()) result.unparseableDates.push(`委任狀時間「${data.mandateDate}」`);
    } else if (normMandate !== (data.mandateDate ?? '')) {
      update.mandateDate = normMandate;
    }

    // 2. 處理 / 結果 / 狀態 → 進度紀錄。
    const entryDate = fallbackEntryDate(data, normReceipt ?? '');
    const newEntries: ProgressEntry[] = [];
    const legacyFields: Array<[string, string]> = [
      ['處理', data.handling],
      ['結果', data.result],
      ['狀態', data.status],
    ];
    for (const [label, raw] of legacyFields) {
      const text = (raw ?? '').toString().trim();
      if (!text) continue;
      newEntries.push({
        id: crypto.randomUUID(),
        date: entryDate,
        content: `${label}：${text}`,
        createdAt: new Date().toISOString(),
        createdByUid: currentUser.uid,
      });
    }
    if (newEntries.length > 0) {
      const existing: ProgressEntry[] = Array.isArray(data.progressEntries) ? data.progressEntries : [];
      update.progressEntries = [...existing, ...newEntries];
      result.entriesCreated += newEntries.length;
    }
    // 移除舊欄位。
    update.handling = deleteField();
    update.result = deleteField();
    update.status = deleteField();

    await updateDoc(doc(db, COLLECTIONS.cases, docSnap.id), update);
    result.migrated += 1;
  }

  // 3. 初始化詞彙清單。
  for (const value of caseTypeValues) await addVocabularyValue('caseType', value);
  for (const value of mandateScopeValues) await addVocabularyValue('mandateScope', value);

  return result;
}
