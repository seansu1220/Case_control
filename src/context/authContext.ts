/**
 * 驗證狀態的 React Context 定義。
 * 與 Provider 分離，方便 hook 引用且不影響 Fast Refresh。
 */
import { createContext } from 'react';
import type { AppUser } from '../types/user';

export interface AuthContextValue {
  /** 目前登入者的應用程式資料；未登入為 null。 */
  user: AppUser | null;
  /** 是否仍在判斷登入狀態（初次載入）。 */
  loading: boolean;
  /** 是否為管理者。 */
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
