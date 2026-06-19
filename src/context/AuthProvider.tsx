/**
 * 驗證狀態 Provider。
 * 監聽 Firebase 登入狀態，載入對應的使用者資料文件，提供給整個 App。
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { fetchUserProfile } from '../services/authService';
import { ROLES } from '../config/constants';
import type { AppUser } from '../types/user';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await fetchUserProfile(firebaseUser.uid);
          // 帳號被停用者視同未登入。
          setUser(profile && profile.active ? profile : null);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('載入使用者資料失敗：', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAdmin: user?.role === ROLES.admin }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
