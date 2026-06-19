/** 註冊頁。註冊後預設為一般律師角色。 */
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { APP_NAME } from '../config/constants';
import { Button, Card, ErrorBanner } from '../components/ui';

export function RegisterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register({ email, password, displayName });
      // 註冊成功會自動登入，onAuthStateChanged 會更新狀態，導向首頁。
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-slate-800">{APP_NAME}</h1>
        <p className="mb-5 text-center text-sm text-slate-500">建立新帳號</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">姓名</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">密碼</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-slate-400">至少 6 碼</p>
          </div>
          <ErrorBanner message={error} />
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? '註冊中…' : '註冊'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          已有帳號？{' '}
          <Link to="/login" className="font-medium text-slate-800 underline">
            登入
          </Link>
        </p>
      </Card>
    </div>
  );
}
