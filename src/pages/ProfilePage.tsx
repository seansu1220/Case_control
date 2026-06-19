/** 個人設定頁：修改自己的顯示名稱與律師姓名。 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateOwnProfile } from '../services/userService';
import { Button, Card, ErrorBanner } from '../components/ui';

export function ProfilePage() {
  const { user, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  // 顯示名稱與律師姓名統一為同一個「姓名」。
  const [name, setName] = useState(user?.lawyerName || user?.displayName || '');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('姓名不可空白。');
      return;
    }
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      // 顯示名稱與律師姓名設為一致。
      await updateOwnProfile(user.uid, { displayName: trimmed, lawyerName: trimmed });
      await refreshUser();
      setDone(true);
    } catch (err) {
      setError(`儲存失敗：${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">個人設定</h1>
        <Button variant="secondary" onClick={() => navigate('/')}>
          回到列表
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email（不可修改）</label>
            <input
              value={user.email}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              姓名
              <span className="ml-2 text-xs text-slate-400">同時作為右上角顯示與案件「負責律師」</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div className="text-xs text-slate-400">
            角色：{isAdmin ? '管理者' : '律師'}（如需調整角色請洽管理者）
          </div>

          <ErrorBanner message={error} />
          {done && <p className="text-sm text-green-600">已儲存。</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? '儲存中…' : '儲存'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
