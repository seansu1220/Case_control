/**
 * 登入後的主版面：頂部導覽列 + 內容區。
 * 響應式設計，桌機/平板/手機皆可用。
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/authService';
import { APP_NAME } from '../config/constants';
import { Button } from './ui';

export function Layout() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="text-lg font-bold text-slate-800">{APP_NAME}</span>
          <nav className="flex flex-1 items-center gap-1">
            <NavLink to="/" end className={navItemClass}>
              案件列表
            </NavLink>
            {isAdmin && (
              <NavLink to="/users" className={navItemClass}>
                使用者管理
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/vocabularies" className={navItemClass}>
                詞彙管理
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <NavLink to="/profile" className={navItemClass} title="個人設定（改名）">
              {user?.displayName}
              <span className="ml-1 text-xs text-slate-400">
                （{isAdmin ? '管理者' : '律師'}）
              </span>
            </NavLink>
            <Button variant="ghost" onClick={handleLogout}>
              登出
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
