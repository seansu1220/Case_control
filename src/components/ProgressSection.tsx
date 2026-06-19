/**
 * 案件進度管理區塊。
 *
 * 需求整併：
 * - 進度紀錄可選日期 + （選填）時間 + 內容，可新增多筆即時更新案件進度。
 * - 原「處理 / 結果 / 狀態」併入此處，皆以進度紀錄表達。
 * - 結案也併入此處：選日期/時間、寫結案備註、勾選確認後結案；
 *   結案會新增一筆標記為「結案」的進度紀錄，並鎖定案件（僅報稅可改）。
 * - 管理者可重新開啟已結案案件。
 */
import { useState } from 'react';
import {
  addProgressEntry,
  closeCaseWithEntry,
  deleteProgressEntry,
  reopenCase,
} from '../services/caseService';
import type { CaseRecord } from '../types/case';
import type { AppUser } from '../types/user';
import { Badge, Button, ErrorBanner } from './ui';

interface ProgressSectionProps {
  caseRecord: CaseRecord;
  currentUser: AppUser;
  /** 目前使用者是否為負責律師或管理者（可編輯/結案）。 */
  isOwnerOrAdmin: boolean;
  /** 是否為管理者（可重新開啟案件）。 */
  isAdmin: boolean;
}

/** 取得今天的 yyyy-MM-dd 字串（供日期欄位預設值）。 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 進度紀錄排序鍵：日期 + 時間（新到舊）。 */
function sortKey(entry: { date: string; time?: string }): string {
  return `${entry.date} ${entry.time ?? ''}`;
}

export function ProgressSection({
  caseRecord,
  currentUser,
  isOwnerOrAdmin,
  isAdmin,
}: ProgressSectionProps) {
  const isClosed = caseRecord.closed;
  // 進度可新增/刪除的條件：未結案且具編輯權限。
  const editable = isOwnerOrAdmin && !isClosed;

  const [date, setDate] = useState(today());
  const [time, setTime] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 結案面板狀態。
  const [closing, setClosing] = useState(false);
  const [closeDate, setCloseDate] = useState(today());
  const [closeTime, setCloseTime] = useState('');
  const [closeNote, setCloseNote] = useState('');

  const sorted = [...caseRecord.progressEntries].sort((a, b) =>
    sortKey(b).localeCompare(sortKey(a)),
  );

  async function handleAdd() {
    if (!content.trim()) {
      setError('請填寫進度內容。');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addProgressEntry(caseRecord, { date, time: time || undefined, content: content.trim() }, currentUser);
      setContent('');
      setTime('');
      setDate(today());
    } catch (err) {
      setError(`新增進度失敗：${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!window.confirm('確定刪除這筆進度紀錄？')) return;
    try {
      await deleteProgressEntry(caseRecord, entryId);
    } catch (err) {
      setError(`刪除進度失敗：${(err as Error).message}`);
    }
  }

  async function handleConfirmClose() {
    if (!closeDate) {
      setError('結案日期為必填。');
      return;
    }
    if (!window.confirm('結案後除「報稅」外將無法再修改，確定結案？')) return;
    setSaving(true);
    setError(null);
    try {
      await closeCaseWithEntry(
        caseRecord,
        { date: closeDate, time: closeTime || undefined, note: closeNote.trim() },
        currentUser,
      );
      setClosing(false);
    } catch (err) {
      setError(`結案失敗：${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleReopen() {
    if (!window.confirm('確定重新開啟此案件？')) return;
    setError(null);
    try {
      await reopenCase(caseRecord.id);
    } catch (err) {
      setError(`重新開啟失敗：${(err as Error).message}`);
    }
  }

  return (
    <div className="space-y-4">
      {/* 新增進度（未結案且可編輯時） */}
      {editable && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-40">
            <label className="mb-1 block text-sm font-medium text-slate-700">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div className="sm:w-28">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              時間<span className="ml-1 text-xs text-slate-400">選填</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">目前進度</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="例如：律見 / 已遞辯護意旨狀 / 開庭結果…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
          </div>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? '處理中…' : '新增進度'}
          </Button>
        </div>
      )}

      <ErrorBanner message={error} />

      {/* 進度時間軸 */}
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400">尚無進度紀錄。</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {sorted.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
              <span className="w-28 shrink-0 font-mono text-sm text-slate-500">
                {entry.date}
                {entry.time && <span className="ml-1">{entry.time}</span>}
              </span>
              <span className="flex-1 whitespace-pre-wrap text-sm text-slate-700">
                {entry.closing && <Badge tone="green">結案</Badge>}{' '}
                {entry.content}
              </span>
              {editable && (
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="shrink-0 text-xs text-red-500 hover:underline"
                >
                  刪除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 結案 / 重新開啟 */}
      {!isClosed && isOwnerOrAdmin && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          {!closing ? (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={false}
                onChange={() => setClosing(true)}
              />
              結案（勾選後填寫結案資訊）
            </label>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">結案資訊</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="sm:w-40">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    結案日期<span className="ml-0.5 text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div className="sm:w-28">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    時間<span className="ml-1 text-xs text-slate-400">選填</span>
                  </label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  結案備註<span className="ml-1 text-xs text-slate-400">選填</span>
                </label>
                <textarea
                  rows={2}
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  placeholder="例如：判決確定 / 撤回起訴 / 和解成立…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setClosing(false)} disabled={saving}>
                  取消
                </Button>
                <Button variant="danger" onClick={handleConfirmClose} disabled={saving}>
                  {saving ? '結案中…' : '確認結案'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isClosed && isAdmin && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={handleReopen}>
            重新開啟案件
          </Button>
        </div>
      )}
    </div>
  );
}
