/**
 * 詞彙清單業務邏輯：類型、委任範圍等可由管理者增刪改的選項。
 *
 * 資料存於 Firestore `vocabularies/{key}` 文件，欄位 `values: string[]`。
 * - 任何登入者可讀，並可「新增」選項（供律師選「其他」時加入常用清單）。
 * - 重新命名 / 刪除選項僅限管理者（安全規則把關）。
 */
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../config/constants';
import type { VocabularyKey } from '../config/caseFields';
import { CASE_TYPE_OPTIONS, MANDATE_SCOPE_OPTIONS } from '../config/caseOptions';

/** 各詞彙清單的預設種子值（首次建立時寫入）。 */
export const VOCABULARY_DEFAULTS: Record<VocabularyKey, readonly string[]> = {
  caseType: CASE_TYPE_OPTIONS,
  mandateScope: MANDATE_SCOPE_OPTIONS,
};

/** 詞彙清單顯示名稱（管理頁用）。 */
export const VOCABULARY_LABELS: Record<VocabularyKey, string> = {
  caseType: '案件類型',
  mandateScope: '委任範圍',
};

/** 所有詞彙清單鍵。 */
export const VOCABULARY_KEYS = Object.keys(VOCABULARY_DEFAULTS) as VocabularyKey[];

/** 一份完整的詞彙對照（鍵 → 選項陣列）。 */
export type VocabularyMap = Record<VocabularyKey, string[]>;

/** 以預設種子建立一份初始對照（Firestore 尚無資料時的後備）。 */
export function defaultVocabularyMap(): VocabularyMap {
  return {
    caseType: [...VOCABULARY_DEFAULTS.caseType],
    mandateScope: [...VOCABULARY_DEFAULTS.mandateScope],
  };
}

/**
 * 訂閱所有詞彙清單的即時更新。
 * Firestore 尚未建立的清單，會以預設種子值填補，確保畫面永遠有選項可選。
 * @returns 取消訂閱函式
 */
export function subscribeVocabularies(
  onData: (map: VocabularyMap) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.vocabularies),
    (snapshot) => {
      const map = defaultVocabularyMap();
      for (const docSnap of snapshot.docs) {
        const key = docSnap.id as VocabularyKey;
        if (!(key in map)) continue;
        const values = docSnap.data().values;
        if (Array.isArray(values)) map[key] = values as string[];
      }
      onData(map);
    },
    (error) => onError(new Error(`讀取詞彙清單失敗：${error.message}`)),
  );
}

/** 新增一個選項值（不存在才加入；任何登入者可用，供「其他」加入常用清單）。 */
export async function addVocabularyValue(key: VocabularyKey, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('選項內容不可空白。');
  // 以 merge + arrayUnion 確保文件不存在時自動建立、存在時去重附加。
  await setDoc(
    doc(db, COLLECTIONS.vocabularies, key),
    { values: arrayUnion(trimmed), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** 刪除一個選項值（限管理者）。已使用該值的案件不受影響，僅清單不再提供。 */
export async function removeVocabularyValue(key: VocabularyKey, value: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.vocabularies, key), {
    values: arrayRemove(value),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 將整份選項清單覆寫（用於重新命名 / 排序；限管理者）。
 * 傳入去除空白與重複後的完整陣列。
 */
export async function setVocabularyValues(key: VocabularyKey, values: string[]): Promise<void> {
  const cleaned = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
  await setDoc(
    doc(db, COLLECTIONS.vocabularies, key),
    { values: cleaned, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
