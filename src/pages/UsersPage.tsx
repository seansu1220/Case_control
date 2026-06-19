/** 使用者管理頁（限管理者）：調整角色、律師姓名、啟用狀態。 */
import { useEffect, useState } from 'react';
import { listUsers, updateUserActive, updateUserLawyerName, updateUserRole } from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../config/constants';
import type { AppUser, UserRole } from '../types/user';
import { Badge, Card, CenteredSpinner, ErrorBanner } from '../components/ui';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      setUsers(await listUsers());
      setError(null);
    } catch (err) {
      setError(`載入使用者失敗：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  /** 包一層錯誤處理後重新載入。 */
  async function runUpdate(action: () => Promise<void>) {
    try {
      await action();
      await reload();
    } catch (err) {
      setError(`更新失敗：${(err as Error).message}`);
    }
  }

  if (loading) return <CenteredSpinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">使用者管理</h1>
      <ErrorBanner message={error} />

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">姓名 / Email</th>
              <th className="px-4 py-3">律師姓名</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((item) => {
              const isSelf = item.uid === currentUser?.uid;
              return (
                <tr key={item.uid}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {item.displayName}
                      {isSelf && <span className="ml-1 text-xs text-slate-400">（我）</span>}
                    </div>
                    <div className="text-xs text-slate-400">{item.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={item.lawyerName}
                      onBlur={(e) => {
                        if (e.target.value !== item.lawyerName) {
                          runUpdate(() => updateUserLawyerName(item.uid, e.target.value));
                        }
                      }}
                      className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.role}
                      disabled={isSelf}
                      onChange={(e) => runUpdate(() => updateUserRole(item.uid, e.target.value as UserRole))}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                    >
                      <option value={ROLES.lawyer}>律師</option>
                      <option value={ROLES.admin}>管理者</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <Badge tone="green">啟用中</Badge>
                    ) : (
                      <button
                        onClick={() => runUpdate(() => updateUserActive(item.uid, !item.active))}
                        className="text-sm underline"
                      >
                        {item.active ? <Badge tone="green">啟用中</Badge> : <Badge>已停用</Badge>}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-slate-400">
        提示：第一位管理者需於 Firebase 主控台手動將該帳號的 role 設為 admin；之後即可在此頁管理其他人。
      </p>
    </div>
  );
}
