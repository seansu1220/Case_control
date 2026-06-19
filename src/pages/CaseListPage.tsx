/** 案件列表頁：搜尋、多條件篩選、進入詳情、新增。 */
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCases } from '../hooks/useCases';
import { useVocabularies } from '../hooks/useVocabularies';
import { LIST_FIELDS, type FieldDef } from '../config/caseFields';
import { TAX_STATUS_OPTIONS } from '../config/caseOptions';
import type { CaseRecord } from '../types/case';
import { Badge, Button, Card, CenteredSpinner, ErrorBanner } from '../components/ui';

/** 判斷案件是否符合關鍵字（比對當事人、案號、案由、對造）。 */
function matchesKeyword(record: CaseRecord, keyword: string): boolean {
  if (!keyword) return true;
  const haystack = [record.client, record.caseNumber, record.caseReason, record.opposingParty]
    .join(' ')
    .toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

/** 取最新一筆進度（依日期+時間排序）的顯示文字，供列表「目前進度」欄。 */
function latestProgress(record: CaseRecord): string {
  if (record.progressEntries.length === 0) return '';
  const latest = [...record.progressEntries].sort((a, b) =>
    `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`),
  )[0];
  return `${latest.date}　${latest.content}`;
}

/** 由報稅狀態判斷顯示徽章（是否已報稅）。 */
function taxBadge(taxStatus: string): { label: string; tone: 'green' | 'slate' | 'amber' } {
  if (taxStatus === '已申報') return { label: '已報稅', tone: 'green' };
  if (taxStatus === '免申報') return { label: '免申報', tone: 'slate' };
  return { label: '未報稅', tone: 'amber' };
}

/** 取陣列中非空且去重的值，排序後回傳（供篩選選項）。 */
function distinctValues(cases: CaseRecord[], pick: (c: CaseRecord) => string): string[] {
  return Array.from(new Set(cases.map(pick).map((v) => v.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'zh-Hant'),
  );
}

type LegalAidFilter = 'all' | 'yes' | 'no';

// 列表欄位順序：日期→類型→當事人→案由→（目前進度）→其他（案號、地院/地檢）。
const PRE_PROGRESS_KEYS = ['receiptDate', 'caseType', 'client', 'caseReason'];
const PRE_FIELDS = LIST_FIELDS.filter((f) => PRE_PROGRESS_KEYS.includes(f.key));
const POST_FIELDS = LIST_FIELDS.filter((f) => !PRE_PROGRESS_KEYS.includes(f.key));

export function CaseListPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { cases, loading, error } = useCases(user);
  const { vocabularies } = useVocabularies();

  // 是否能看到多位律師的案件（決定是否顯示「負責律師」欄與篩選）。
  const canSeeOthers = isAdmin || user?.viewAllCases !== false;

  const [keyword, setKeyword] = useState('');
  const [showClosed, setShowClosed] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // 篩選條件。
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [courts, setCourts] = useState<string[]>([]);
  const [lawyer, setLawyer] = useState('');
  const [legalAidFilter, setLegalAidFilter] = useState<LegalAidFilter>('all');
  const [taxFilter, setTaxFilter] = useState('all'); // 'all' | '未填' | 報稅狀態值

  // 篩選選項來源。
  const typeOptions = useMemo(
    () =>
      Array.from(new Set([...vocabularies.caseType, ...distinctValues(cases, (c) => c.caseType)])).sort(
        (a, b) => a.localeCompare(b, 'zh-Hant'),
      ),
    [vocabularies.caseType, cases],
  );
  const courtOptions = useMemo(
    () =>
      Array.from(new Set([...vocabularies.court, ...distinctValues(cases, (c) => c.court)])).sort((a, b) =>
        a.localeCompare(b, 'zh-Hant'),
      ),
    [vocabularies.court, cases],
  );
  const lawyerOptions = useMemo(() => distinctValues(cases, (c) => c.responsibleLawyerName), [cases]);

  const filtered = useMemo(
    () =>
      cases.filter((record) => {
        if (!matchesKeyword(record, keyword)) return false;
        if (!showClosed && record.closed) return false;
        // 收件日區間（ISO 字串可直接比較）。
        if (dateFrom && (!record.receiptDate || record.receiptDate < dateFrom)) return false;
        if (dateTo && (!record.receiptDate || record.receiptDate.slice(0, 10) > dateTo)) return false;
        if (types.length > 0 && !types.includes(record.caseType)) return false;
        if (courts.length > 0 && !courts.includes(record.court)) return false;
        if (lawyer && record.responsibleLawyerName !== lawyer) return false;
        if (legalAidFilter === 'yes' && !record.legalAid) return false;
        if (legalAidFilter === 'no' && record.legalAid) return false;
        if (taxFilter !== 'all') {
          // 未申報：含未填（空字串）。
          if (taxFilter === '未申報') {
            if (record.taxStatus !== '未申報' && record.taxStatus !== '') return false;
          } else if (record.taxStatus !== taxFilter) {
            return false;
          }
        }
        return true;
      }),
    [cases, keyword, showClosed, dateFrom, dateTo, types, courts, lawyer, legalAidFilter, taxFilter],
  );

  const activeFilterCount =
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (types.length > 0 ? 1 : 0) +
    (courts.length > 0 ? 1 : 0) +
    (lawyer ? 1 : 0) +
    (legalAidFilter !== 'all' ? 1 : 0) +
    (taxFilter !== 'all' ? 1 : 0);

  function clearFilters() {
    setDateFrom('');
    setDateTo('');
    setTypes([]);
    setCourts([]);
    setLawyer('');
    setLegalAidFilter('all');
    setTaxFilter('all');
  }

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  // 拖動捲動：避免拖曳後放開誤觸進入案件。
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false });

  function onMouseDown(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.pageX, scrollLeft: el.scrollLeft, moved: false };
  }
  function onMouseMove(e: React.MouseEvent) {
    const el = scrollRef.current;
    const s = drag.current;
    if (!s.down || !el) return;
    const dx = e.pageX - s.startX;
    if (Math.abs(dx) > 5) s.moved = true;
    el.scrollLeft = s.scrollLeft - dx;
  }
  function endDrag() {
    drag.current.down = false;
  }
  function handleRowClick(id: string) {
    if (drag.current.moved) {
      drag.current.moved = false;
      return; // 剛剛是拖曳，不進入案件。
    }
    navigate(`/cases/${id}`);
  }

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
        <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>
          篩選{activeFilterCount > 0 ? `（${activeFilterCount}）` : ''}
        </Button>
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

      {showFilters && (
        <Card className="space-y-4">
          {/* 收件日區間 */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">收件日（起）</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">收件日（迄）</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            {canSeeOthers && lawyerOptions.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">負責律師</label>
                <select
                  value={lawyer}
                  onChange={(e) => setLawyer(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  <option value="">全部</option>
                  {lawyerOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">法扶</label>
              <select
                value={legalAidFilter}
                onChange={(e) => setLegalAidFilter(e.target.value as LegalAidFilter)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="all">全部</option>
                <option value="yes">法扶案件</option>
                <option value="no">非法扶案件</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">報稅狀態</label>
              <select
                value={taxFilter}
                onChange={(e) => setTaxFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="all">全部</option>
                {TAX_STATUS_OPTIONS.filter(Boolean).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 類型（可多選） */}
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">案件類型（可多選）</p>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((opt) => (
                <FilterChip key={opt} active={types.includes(opt)} onClick={() => toggle(types, setTypes, opt)}>
                  {opt}
                </FilterChip>
              ))}
            </div>
          </div>

          {/* 地院/地檢（可多選） */}
          {courtOptions.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">地院/地檢（可多選）</p>
              <div className="flex flex-wrap gap-2">
                {courtOptions.map((opt) => (
                  <FilterChip
                    key={opt}
                    active={courts.includes(opt)}
                    onClick={() => toggle(courts, setCourts, opt)}
                  >
                    {opt}
                  </FilterChip>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={clearFilters} disabled={activeFilterCount === 0}>
              清除篩選
            </Button>
          </div>
        </Card>
      )}

      <ErrorBanner message={error} />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-400">
          沒有符合的案件
        </p>
      ) : (
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          className="max-h-[70vh] cursor-grab overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm active:cursor-grabbing"
        >
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 select-none bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
              <tr>
                {PRE_FIELDS.map((field) => (
                  <th key={field.key} className="whitespace-nowrap px-4 py-3">
                    {field.label}
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-3">目前進度</th>
                {POST_FIELDS.map((field) => (
                  <th key={field.key} className="whitespace-nowrap px-4 py-3">
                    {field.label}
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-3">報稅</th>
                {canSeeOthers && <th className="whitespace-nowrap px-4 py-3">負責律師</th>}
                <th className="whitespace-nowrap px-4 py-3">結案</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => handleRowClick(record.id)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  {PRE_FIELDS.map((field) => (
                    <ListCell key={field.key} field={field} record={record} />
                  ))}
                  <td
                    className="min-w-[18rem] max-w-[24rem] truncate px-4 py-3 text-slate-600"
                    title={latestProgress(record)}
                  >
                    {latestProgress(record) || '—'}
                  </td>
                  {POST_FIELDS.map((field) => (
                    <ListCell key={field.key} field={field} record={record} />
                  ))}
                  <td className="px-4 py-3">
                    {(() => {
                      const t = taxBadge(record.taxStatus);
                      return <Badge tone={t.tone}>{t.label}</Badge>;
                    })()}
                  </td>
                  {canSeeOthers && (
                    <td
                      className="max-w-[7rem] truncate px-4 py-3 text-slate-700"
                      title={record.responsibleLawyerName}
                    >
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

/**
 * 列表單一資料格。
 * - listFull 欄位（日期/類型/當事人）完整顯示不截斷。
 * - 其餘欄位截斷並以 title 提供滑鼠移上的完整內容提示。
 */
function ListCell({ field, record }: { field: FieldDef; record: CaseRecord }) {
  const value = record[field.key];
  const text = value ? String(value) : '';
  const legalAidTag = field.key === 'caseType' && record.legalAid && (
    <span className="mr-1 rounded bg-amber-100 px-1 text-xs text-amber-700">法扶</span>
  );

  if (field.listFull) {
    return (
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        {legalAidTag}
        {text || '—'}
      </td>
    );
  }
  return (
    <td className={`truncate px-4 py-3 text-slate-700 ${field.listWidthClass ?? 'max-w-[10rem]'}`} title={text}>
      {legalAidTag}
      {text || '—'}
    </td>
  );
}

/** 篩選用的可切換標籤。 */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-slate-800 bg-slate-800 text-white'
          : 'border-slate-300 text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
