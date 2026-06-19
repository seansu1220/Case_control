/**
 * 使用者與權限相關型別。
 * 對應 Firestore `users/{uid}` 文件。
 */

/**
 * 帳號角色：
 * - owner（所有人）：管理者全部權限，且不可被任何人修改/刪除。
 * - admin（管理者）：可管理使用者、看全部案件。
 * - lawyer（律師）：依 viewAllCases 決定可否看其他律師案件。
 */
export type UserRole = 'owner' | 'admin' | 'lawyer';

/** Firestore `users` 集合的文件結構。 */
export interface AppUser {
  /** Firebase Auth 的 uid，同時作為文件 ID。 */
  uid: string;
  /** 登入用 email。 */
  email: string;
  /** 顯示名稱（登入後右上角顯示）。 */
  displayName: string;
  /**
   * 律師姓名，作為案件「負責律師」的對應值。
   * 預設等於 displayName，管理者可調整。
   */
  lawyerName: string;
  /** 角色權限。 */
  role: UserRole;
  /**
   * 是否可檢視其他律師的案件（預設 true）。
   * 管理者 / 所有人不受此限（一律可看全部）；此旗標用於限制一般律師。
   */
  viewAllCases: boolean;
  /** 帳號是否啟用（管理者可停用）。 */
  active: boolean;
  /** 建立時間（ISO 字串）。 */
  createdAt: string;
}

/** 註冊表單輸入。 */
export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

/** 登入表單輸入。 */
export interface LoginInput {
  email: string;
  password: string;
}
