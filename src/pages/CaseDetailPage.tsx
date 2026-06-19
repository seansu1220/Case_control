/**
 * 案件詳情頁：檢視/編輯欄位、進度管理、結案、報稅、刪除。
 *
 * 權限與不可變規則：
 * - 律師僅能檢視/編輯/刪除自己負責的案件（亦由安全規則把關）。
 * - 結案後除「報稅」外，所有欄位與進度紀錄皆鎖定不可修改。
 * - 重新開啟案件僅限管理者。
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  closeCase,
  deleteCase,
  reopenCase,
  subscribeCase,
  updateCaseFields,
  updateTaxStatus,
} from '../services/caseService';
import { extractEditableValues, type EditableCaseKey } from '../config/caseFields';
import type { CaseDraft, CaseRecord } from '../types/case';
import { CaseForm } from '../components/CaseForm';
import { ProgressSection } from '../components/ProgressSection';
import { Badge, Button, Card, CenteredSpinner, ErrorBanner } from '../components/ui';

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [values, setValues] = useState(() => extractEditableValues({} as CaseRecord));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // 訂閱單一案件即時更新。
  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    const unsubscribe = subscribeCase(
      caseId,
      (next) => {
        setRecord(next);
        setLoading(false);
      },
      (err) => {
        setLoadError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [caseId]);

  // 案件資料更新且使用者未編輯時，同步表單值。
  useEffect(() => {
    if (record && !dirty) {
      setValues(extractEditableValues(record));
    }
  }, [record, dirty]);

  if (loading) return <CenteredSpinner />;
  if (loadError) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={`${loadError}（可能無權限存取此案件）`} />
        <Button variant="secondary" onClick={() => navigate('/')}>
          回到列表
        </Button>
      </div>
    );
  }
  if (!record || !user) {
    return (
      <div className="space-y-4">
        <p className="text-slate-500">案件不存在或已被刪除。</p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          回到列表
        </Button>
      </div>
    );
  }

  const isOwnerOrAdmin = isAdmin || record.responsibleLawyerUid === user.uid;
  const isClosed = record.closed;

  function handleFieldChange(key: EditableCaseKey, value: string) {
    setDirty(true);
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!record) return;
    setSaving(true);
    setActionError(null);
    try {
      if (isClosed) {
        // 結案後僅報稅可改。
        await updateTaxStatus(record.id, values.taxStatus);
      } else {
        const fields: Partial<CaseDraft> = { ...values };
        await updateCaseFields(record.id, fields);
      }
      setDirty(false);
    } catch (err) {
      setActionError(`儲存失敗：${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    if (!record) return;
    if (!window.confirm('結案後除「報稅」外將無法再修改，確定結案？')) return;
    setActionError(null);
    try {
      if (dirty) await handleSave();
      await closeCase(record.id);
    } catch (err) {
      setActionError(`結案失敗：${(err as Error).message}`);
    }
  }

  async function handleReopen() {
    if (!record) return;
    if (!window.confirm('確定重新開啟此案件？')) return;
    try {
      await reopenCase(record.id);
    } catch (err) {
      setActionError(`重新開啟失敗：${(err as Error).message}`);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (!window.confirm(`確定刪除案件「${record.client}」？此動作無法復原。`)) return;
    try {
      await deleteCase(record.id);
      navigate('/', { replace: true });
    } catch (err) {
      setActionError(`刪除失敗：${(err as Error).message}`);
    }
  }

  return (
    <div className="space-y-5">
      {/* 標題列 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">{record.client || '（未命名當事人）'}</h1>
          {record.caseType && <Badge>{record.caseType}</Badge>}
          {isClosed ? <Badge tone="green">已結案</Badge> : <Badge tone="amber">進行中</Badge>}
          {isAdmin && (
            <span className="text-sm text-slate-400">負責律師：{record.responsibleLawyerName || '—'}</span>
          )}
        </div>
        <Button variant="secondary" onClick={() => navigate('/')}>
          回到列表
        </Button>
      </div>

      {isClosed && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          此案件已結案，僅「報稅」欄位可修改。
        </div>
      )}

      <ErrorBanner message={actionError} />

      {/* 案件欄位 */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-slate-700">案件資料</h2>
        <CaseForm
          values={values}
          onChange={handleFieldChange}
          readOnly={!isOwnerOrAdmin}
          isClosed={isClosed}
        />
        {isOwnerOrAdmin && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !dirty}>
              {saving ? '儲存中…' : '儲存變更'}
            </Button>
          </div>
        )}
      </Card>

      {/* 進度管理 */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-slate-700">進度管理</h2>
        <ProgressSection caseRecord={record} currentUser={user} locked={isClosed || !isOwnerOrAdmin} />
      </Card>

      {/* 結案 / 刪除 操作 */}
      {isOwnerOrAdmin && (
        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-slate-700">案件操作</h2>
          <div className="flex flex-wrap items-center gap-4">
            {!isClosed ? (
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" className="h-4 w-4" checked={false} onChange={handleClose} />
                結案（勾選後確認）
              </label>
            ) : (
              isAdmin && (
                <Button variant="secondary" onClick={handleReopen}>
                  重新開啟案件
                </Button>
              )
            )}
            <div className="flex-1" />
            <Button variant="danger" onClick={handleDelete}>
              刪除案件
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
