/**
 * 路由權限守衛。
 * 未登入導向登入頁；需管理者的頁面，非管理者導回首頁。
 */
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CenteredSpinner } from './ui';

interface ProtectedRouteProps {
  children: ReactNode;
  /** 是否限管理者存取。 */
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <CenteredSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
