/**
 * 案件業務邏輯：查詢、新增、刪除、進度管理、結案、報稅。
 *
 * 權限規則（律師只能看/刪自己的案件、管理者看全部）同時在
 * Firestore Security Rules 強制；此處的查詢條件僅為效能與一致性，
 * 不作為唯一的安全防線。
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS, ROLES } from '../config/constants';
import type { CaseDraft, CaseRecord, ProgressEntry } from '../types/case';
import type { AppUser } from '../types/user';

/** Firestore Timestamp / 字串 → ISO 字串。 */
function toIso(value: unknown): string {
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === 'string' ? value : '';
}

/** 將 Firestore 文件轉為強型別 CaseRecord。 */
function mapCaseDoc(snapshot: QueryDocumentSnapshot<DocumentData>): CaseRecord {
  return mapCaseData(snapshot.id, snapshot.data());
}

/** 由文件 ID 與原始資料組出強型別 CaseRecord。 */
function mapCaseData(id: string, data: DocumentData): CaseRecord {
  return {
    id,
    receiptDate: data.receiptDate ?? '',
    caseType: data.caseType ?? '',
    client: data.client ?? '',
    opposingParty: data.opposingParty ?? '',
    caseReason: data.caseReason ?? '',
    phone: data.phone ?? '',
    caseNumber: data.caseNumber ?? '',
    address: data.address ?? '',
    schedule: data.schedule ?? '',
    court: data.court ?? '',
    mandateDate: data.mandateDate ?? '',
    mandateScope: data.mandateScope ?? '',
    taxStatus: data.taxStatus ?? '',
    responsibleLawyerUid: data.responsibleLawyerUid ?? '',
    responsibleLawyerName: data.responsibleLawyerName ?? '',
    progressEntries: Array.isArray(data.progressEntries) ? (data.progressEntries as ProgressEntry[]) : [],
    closed: data.closed ?? false,
    closedAt: data.closedAt ? toIso(data.closedAt) : null,
    createdByUid: data.createdByUid ?? '',
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/** 依收件日（新到舊）排序的比較函式。 */
function byReceiptDateDesc(a: CaseRecord, b: CaseRecord): number {
  return (b.receiptDate || '').localeCompare(a.receiptDate || '');
}

/**
 * 訂閱案件即時更新。
 * - 管理者：所有案件
 * - 律師：僅 responsibleLawyerUid 等於自己的案件
 *
 * 為避免複合索引需求，排序於用戶端完成。
 * @returns 取消訂閱函式
 */
export function subscribeCases(
  user: AppUser,
  onData: (cases: CaseRecord[]) => void,
  onError: (error: Error) => void,
): () => void {
  const casesRef = collection(db, COLLECTIONS.cases);
  const casesQuery =
    user.role === ROLES.admin
      ? query(casesRef)
      : query(casesRef, where('responsibleLawyerUid', '==', user.uid));

  return onSnapshot(
    casesQuery,
    (snapshot) => {
      const cases = snapshot.docs.map(mapCaseDoc).sort(byReceiptDateDesc);
      onData(cases);
    },
    (error) => onError(new Error(`讀取案件失敗：${error.message}`)),
  );
}

/**
 * 訂閱單一案件的即時更新（詳情頁用）。
 * 若無權限或案件不存在，回傳 null 並交由頁面處理。
 * @returns 取消訂閱函式
 */
export function subscribeCase(
  caseId: string,
  onData: (record: CaseRecord | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, COLLECTIONS.cases, caseId),
    (snapshot: DocumentSnapshot<DocumentData>) => {
      onData(snapshot.exists() ? mapCaseData(snapshot.id, snapshot.data()) : null);
    },
    (error) => onError(new Error(`讀取案件失敗：${error.message}`)),
  );
}

/**
 * 統計每位律師的案件數（含未結案/已結案分項）。供管理者頁面顯示。
 * 需管理者權限（讀取全部案件）。
 * @returns 以 responsibleLawyerUid 為鍵的統計
 */
export async function fetchCaseCountsByLawyer(): Promise<
  Record<string, { total: number; open: number; closed: number }>
> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.cases));
  const counts: Record<string, { total: number; open: number; closed: number }> = {};
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const uid = data.responsibleLawyerUid ?? '';
    if (!counts[uid]) counts[uid] = { total: 0, open: 0, closed: 0 };
    counts[uid].total += 1;
    if (data.closed) counts[uid].closed += 1;
    else counts[uid].open += 1;
  }
  return counts;
}

/** 新增案件，負責律師資訊與時間戳由系統填入。 */
export async function createCase(draft: CaseDraft, currentUser: AppUser): Promise<string> {
  const payload = {
    ...draft,
    progressEntries: [],
    closed: false,
    closedAt: null,
    createdByUid: currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const created = await addDoc(collection(db, COLLECTIONS.cases), payload);
  return created.id;
}

/** 更新案件可編輯欄位。 */
export async function updateCaseFields(
  caseId: string,
  fields: Partial<CaseDraft>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.cases, caseId), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

/** 刪除案件（權限由安全規則把關：律師僅能刪自己的）。 */
export async function deleteCase(caseId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.cases, caseId));
}

/** 依輸入組出一筆進度紀錄（time/closing 為選填）。 */
function buildProgressEntry(
  input: { date: string; time?: string; content: string; closing?: boolean },
  currentUser: AppUser,
): ProgressEntry {
  const entry: ProgressEntry = {
    id: crypto.randomUUID(),
    date: input.date,
    content: input.content,
    createdAt: new Date().toISOString(),
    createdByUid: currentUser.uid,
  };
  // 僅在有值時寫入選填欄位，避免 Firestore 存入 undefined。
  if (input.time) entry.time = input.time;
  if (input.closing) entry.closing = true;
  return entry;
}

/** 新增一筆進度紀錄（日期 + 內容，時間選填）。 */
export async function addProgressEntry(
  existing: CaseRecord,
  input: { date: string; time?: string; content: string },
  currentUser: AppUser,
): Promise<void> {
  const next = [...existing.progressEntries, buildProgressEntry(input, currentUser)];
  await updateDoc(doc(db, COLLECTIONS.cases, existing.id), {
    progressEntries: next,
    updatedAt: serverTimestamp(),
  });
}

/** 刪除一筆進度紀錄。 */
export async function deleteProgressEntry(existing: CaseRecord, entryId: string): Promise<void> {
  const next = existing.progressEntries.filter((entry) => entry.id !== entryId);
  await updateDoc(doc(db, COLLECTIONS.cases, existing.id), {
    progressEntries: next,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 結案：併入進度管理——同時新增一筆「結案」進度紀錄（日期/時間/備註），
 * 並標記 closed 與結案時間。結案後除「報稅」外不可再修改。
 */
export async function closeCaseWithEntry(
  existing: CaseRecord,
  input: { date: string; time?: string; note: string },
  currentUser: AppUser,
): Promise<void> {
  const entry = buildProgressEntry(
    { date: input.date, time: input.time, content: input.note || '（結案）', closing: true },
    currentUser,
  );
  // 結案時間取使用者所選日期（含時間，未填時間則以當日 00:00 計）。
  const closedAtIso = new Date(`${input.date}T${input.time || '00:00'}`).toISOString();
  await updateDoc(doc(db, COLLECTIONS.cases, existing.id), {
    progressEntries: [...existing.progressEntries, entry],
    closed: true,
    closedAt: closedAtIso,
    updatedAt: serverTimestamp(),
  });
}

/** 重新開啟案件（限管理者，安全規則把關）。 */
export async function reopenCase(caseId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.cases, caseId), {
    closed: false,
    closedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/** 更新報稅狀態（結案後仍允許）。 */
export async function updateTaxStatus(caseId: string, taxStatus: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.cases, caseId), {
    taxStatus,
    updatedAt: serverTimestamp(),
  });
}
