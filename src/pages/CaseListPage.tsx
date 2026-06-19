/** 案件列表頁：搜尋、篩選、進入詳情、新增。 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCases } from '../hooks/useCases';
import { LIST_FIELDS } from '../config/caseFields';
import type { CaseRecord } from '../types/case';
import { Badge, Button, CenteredSpinner, ErrorBanner } from '../components/ui';

/** 判斷案件是否符合關鍵字（比對當事人、案號、案由、對造）。 */
function matchesKeyword(record: CaseRecord, keyword: string): boolean {
  if (!keyword) return true;
  const haystack = [record.client, record.caseNumber, record.caseReason, record.opposingParty]
    .join(' ')
    .toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

export function CaseListPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { cases, loading, error } = useCases(user);
  const [keyword, setKeyword] = useState('');
  const [showClosed, setShowClosed] = useState(true);

  const filtered = useMemo(
    () =>
      cases.filter(
        (record) => matchesKeyword(record, keyword) && (showClosed || !record.closed),
      ),
    [cases, keyword, showClosed],
  );

  if (loading) return <CenteredSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">
          案件列表 <span className="text-sm font-normal text-slate-400">（{filtered.length} 筆）</span>
        </h1>
        <Link to="/cases/new">
          <Button>+ 新增案件</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="搜尋當事人 / 案號 / 案由 / 對造…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="min-w-[16rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="h-4 w-4"
          />
          顯示已結案
        </label>
      </div>

      <ErrorBanner message={error} />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-400">
          沒有符合的案件
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {LIST_FIELDS.map((field) => (
                  <th key={field.key} className="whitespace-nowrap px-4 py-3">
                    {field.label}
                  </th>
                ))}
                {isAdmin && <th className="whitespace-nowrap px-4 py-3">負責律師</th>}
                <th className="whitespace-nowrap px-4 py-3">結案</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => navigate(`/cases/${record.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  {LIST_FIELDS.map((field) => (
                    <td key={field.key} className="max-w-[14rem] truncate px-4 py-3 text-slate-700">
                      {record[field.key] || '—'}
                    </td>
                  ))}
                  {isAdmin && (
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {record.responsibleLawyerName || '—'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {record.closed ? <Badge tone="green">已結案</Badge> : <Badge tone="amber">進行中</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
