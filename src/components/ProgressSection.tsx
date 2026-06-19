/**
 * 案件進度管理區塊。
 * 需求：兩個輸入框（選日期 + 寫進度），可新增多筆紀錄；結案後鎖定不可再新增/刪除。
 */
import { useState } from 'react';
import { addProgressEntry, deleteProgressEntry } from '../services/caseService';
import type { CaseRecord } from '../types/case';
import type { AppUser } from '../types/user';
import { Button, ErrorBanner } from './ui';

interface ProgressSectionProps {
  caseRecord: CaseRecord;
  currentUser: AppUser;
  /** 結案後鎖定。 */
  locked: boolean;
}

/** 取得今天的 yyyy-MM-dd 字串（供日期欄位預設值）。 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProgressSection({ caseRecord, currentUser, locked }: ProgressSectionProps) {
  const [date, setDate] = useState(today());
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...caseRecord.progressEntries].sort((a, b) => b.date.localeCompare(a.date));

  async function handleAdd() {
    if (!content.trim()) {
      setError('請填寫進度內容。');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addProgressEntry(caseRecord, { date, content: content.trim() }, currentUser);
      setContent('');
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

  return (
    <div className="space-y-4">
      {!locked && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-44">
            <label className="mb-1 block text-sm font-medium text-slate-700">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">目前進度</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="例如：112.05.12 律見 / 已遞辯護意旨狀"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
          </div>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? '新增中…' : '新增進度'}
          </Button>
        </div>
      )}

      <ErrorBanner message={error} />

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400">尚無進度紀錄。</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {sorted.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
              <span className="w-24 shrink-0 font-mono text-sm text-slate-500">{entry.date}</span>
              <span className="flex-1 whitespace-pre-wrap text-sm text-slate-700">{entry.content}</span>
              {!locked && (
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
    </div>
  );
}
