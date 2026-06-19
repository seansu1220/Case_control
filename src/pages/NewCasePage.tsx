/** 新增案件頁。 */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVocabularies } from '../hooks/useVocabularies';
import { createCase } from '../services/caseService';
import { addVocabularyValue } from '../services/vocabularyService';
import { listUsers } from '../services/userService';
import { createEmptyCaseValues, type EditableCaseKey } from '../config/caseFields';
import type { CaseDraft } from '../types/case';
import type { AppUser } from '../types/user';
import { CaseForm } from '../components/CaseForm';
import { Button, Card, ErrorBanner } from '../components/ui';

export function NewCasePage() {
  const { user, isAdmin } = useAuth();
  const { vocabularies } = useVocabularies();
  const navigate = useNavigate();
  const [values, setValues] = useState(createEmptyCaseValues());
  const [legalAid, setLegalAid] = useState(false);
  const [lawyers, setLawyers] = useState<AppUser[]>([]);
  const [responsibleUid, setResponsibleUid] = useState(user?.uid ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 管理者可指派負責律師，載入啟用中的使用者清單。
  useEffect(() => {
    if (!isAdmin) return;
    listUsers()
      .then((all) => setLawyers(all.filter((item) => item.active)))
      .catch((err) => setError(`載入律師清單失敗：${(err as Error).message}`));
  }, [isAdmin]);

  function handleChange(key: EditableCaseKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!values.client.trim() || !values.caseType) {
      setError('「當事人」與「類型」為必填。');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // 律師只能指派給自己；管理者可指定他人。
      const responsible =
        isAdmin && responsibleUid !== user.uid
          ? lawyers.find((item) => item.uid === responsibleUid)
          : user;
      const draft: CaseDraft = {
        ...values,
        legalAid,
        responsibleLawyerUid: responsible?.uid ?? user.uid,
        responsibleLawyerName: responsible?.lawyerName ?? user.lawyerName,
      };
      const newId = await createCase(draft, user);
      navigate(`/cases/${newId}`, { replace: true });
    } catch (err) {
      setError(`新增失敗：${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">新增案件</h1>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          返回
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-5">
          {isAdmin && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">負責律師</label>
              <select
                value={responsibleUid}
                onChange={(e) => setResponsibleUid(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none sm:max-w-xs"
              >
                <option value={user?.uid}>{user?.lawyerName}（我）</option>
                {lawyers
                  .filter((item) => item.uid !== user?.uid)
                  .map((item) => (
                    <option key={item.uid} value={item.uid}>
                      {item.lawyerName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={legalAid}
              onChange={(e) => setLegalAid(e.target.checked)}
            />
            是否為法扶案件
          </label>

          <CaseForm
            values={values}
            onChange={handleChange}
            vocabularies={vocabularies}
            onAddVocabulary={addVocabularyValue}
          />
          <ErrorBanner message={error} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '儲存中…' : '建立案件'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
