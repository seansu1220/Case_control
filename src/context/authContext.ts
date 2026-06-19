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
  /** 是否具管理權限（管理者或所有人）。 */
  isAdmin: boolean;
  /** 是否為「所有人」（受保護、不可被修改/刪除的最高權限）。 */
  isOwner: boolean;
  /** 重新載入目前使用者的資料（例如改名後刷新顯示）。 */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
