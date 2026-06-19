/**
 * 使用者管理頁（限管理者 / 所有人）：調整角色、律師姓名、可看全部案件、啟用狀態。
 *
 * 規則：
 * - 「所有人」角色受保護，任何人都不能改其角色/狀態或刪除（此頁該列鎖定）。
 * - 「所有人」僅能於 Firebase 主控台手動指派，此頁角色下拉只提供律師/管理者。
 * - 「可看全部案件」預設開啟；管理者/所有人本就看全部，故僅律師可調整。
 */
import { useEffect, useState } from 'react';
import {
  listUsers,
  updateUserActive,
  updateUserLawyerName,
  updateUserRole,
  updateUserViewAllCases,
} from '../services/userService';
import { fetchCaseCountsByLawyer, reassignAllCases } from '../services/caseService';
import { useAuth } from '../hooks/useAuth';
import { ADMIN_ROLES, ROLES } from '../config/constants';
import type { AppUser, UserRole } from '../types/user';
import { Badge, Button, Card, CenteredSpinner, ErrorBanner } from '../components/ui';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [counts, setCounts] = useState<Record<string, { total: number; open: number; closed: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const [allUsers, caseCounts] = await Promise.all([listUsers(), fetchCaseCountsByLawyer()]);
      setUsers(allUsers);
      setCounts(caseCounts);
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
              <th className="px-4 py-3">案件數</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">可看全部案件</th>
              <th className="px-4 py-3">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((item) => {
              const isSelf = item.uid === currentUser?.uid;
              const isOwnerRow = item.role === ROLES.owner;
              const isManagerRow = ADMIN_ROLES.includes(item.role);
              const count = counts[item.uid] ?? { total: 0, open: 0, closed: 0 };
              return (
                <tr key={item.uid}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {item.displayName}
                      {isSelf && <span className="ml-1 text-xs text-slate-400">（我）</span>}
                    </div>
                    <div className="text-xs text-slate-400">{item.email}</div>
                  </td>

                  {/* 律師姓名：所有人列鎖定為純文字 */}
                  <td className="px-4 py-3">
                    {isOwnerRow ? (
                      <span className="text-slate-700">{item.lawyerName}</span>
                    ) : (
                      <input
                        defaultValue={item.lawyerName}
                        onBlur={(e) => {
                          if (e.target.value !== item.lawyerName) {
                            runUpdate(() => updateUserLawyerName(item.uid, e.target.value));
                          }
                        }}
                        className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                      />
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-medium">{count.total}</span>
                    <span className="ml-1 text-xs text-slate-400">
                      （進行 {count.open} / 結案 {count.closed}）
                    </span>
                  </td>

                  {/* 角色：所有人列顯示鎖定徽章；其餘可選律師/管理者 */}
                  <td className="px-4 py-3">
                    {isOwnerRow ? (
                      <Badge tone="amber">所有人</Badge>
                    ) : (
                      <select
                        value={item.role}
                        disabled={isSelf}
                        onChange={(e) => runUpdate(() => updateUserRole(item.uid, e.target.value as UserRole))}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                      >
                        <option value={ROLES.lawyer}>律師</option>
                        <option value={ROLES.admin}>管理者</option>
                      </select>
                    )}
                  </td>

                  {/* 可看全部案件：管理者/所有人本就看全部；僅律師可調整 */}
                  <td className="px-4 py-3">
                    {isManagerRow ? (
                      <span className="text-xs text-slate-400">全部（管理權限）</span>
                    ) : (
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={item.viewAllCases !== false}
                          onChange={(e) =>
                            runUpdate(() => updateUserViewAllCases(item.uid, e.target.checked))
                          }
                        />
                        {item.viewAllCases !== false ? '可看全部' : '僅看自己'}
                      </label>
                    )}
                  </td>

                  {/* 狀態：所有人列與本人列鎖定 */}
                  <td className="px-4 py-3">
                    {isOwnerRow || isSelf ? (
                      item.active ? (
                        <Badge tone="green">啟用中</Badge>
                      ) : (
                        <Badge>已停用</Badge>
                      )
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
        提示：第一位管理者 / 所有人需於 Firebase 主控台手動設定該帳號的 role（admin / owner）；
        「所有人」為受保護的最高權限，無法於此頁修改或刪除。
      </p>

      <ReassignAllCard users={users} onError={setError} onDone={reload} />
    </div>
  );
}

/** 批次將所有案件的負責律師改為指定使用者。 */
function ReassignAllCard({
  users,
  onError,
  onDone,
}: {
  users: AppUser[];
  onError: (msg: string | null) => void;
  onDone: () => Promise<void>;
}) {
  const [targetUid, setTargetUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const candidates = users.filter((u) => u.active);
  const target = candidates.find((u) => u.uid === targetUid);

  async function handleReassign() {
    if (!target) {
      onError('請先選擇要指派的對象。');
      return;
    }
    if (
      !window.confirm(
        `將「所有案件」的負責律師改為「${target.lawyerName || target.displayName}」？此動作會覆蓋每一筆案件的負責律師，無法自動復原。`,
      )
    )
      return;
    setBusy(true);
    onError(null);
    setResult(null);
    try {
      const count = await reassignAllCases(target.uid, target.lawyerName || target.displayName);
      setResult(`已將 ${count} 筆案件的負責律師改為「${target.lawyerName || target.displayName}」。`);
      await onDone();
    } catch (err) {
      onError(`批次指派失敗：${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3 border-amber-200 bg-amber-50">
      <h2 className="text-base font-semibold text-slate-700">批次重新指派負責律師</h2>
      <p className="text-sm text-slate-600">
        將「所有案件」的負責律師一次改為指定的人。常用於轉移承辦或修正匯入時的負責律師。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={targetUid}
          onChange={(e) => setTargetUid(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="">— 選擇要指派的對象 —</option>
          {candidates.map((u) => (
            <option key={u.uid} value={u.uid}>
              {u.lawyerName || u.displayName}（{u.email}）
            </option>
          ))}
        </select>
        <Button onClick={handleReassign} disabled={busy || !targetUid}>
          {busy ? '指派中…' : '將所有案件指派給此人'}
        </Button>
      </div>
      {result && <p className="text-sm text-green-700">{result}</p>}
    </Card>
  );
}
