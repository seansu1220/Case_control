/**
 * 全域常數。集中管理 Firestore 集合名稱、角色與預設值，
 * 避免在程式各處出現魔術字串。
 */

/** Firestore 集合名稱。 */
export const COLLECTIONS = {
  users: 'users',
  cases: 'cases',
  /** 詞彙清單（類型、委任範圍等可由管理者增減的選項）。 */
  vocabularies: 'vocabularies',
} as const;

/**
 * 角色常數。
 * - owner（所有人）：擁有管理者全部權限，且不可被任何人修改權限或刪除；
 *   僅能於 Firebase 主控台手動指派。
 * - admin（管理者）：可管理使用者、看全部案件。
 * - lawyer（律師）：預設可看全部案件（由管理者於使用者管理頁逐人調整）。
 */
export const ROLES = {
  owner: 'owner',
  admin: 'admin',
  lawyer: 'lawyer',
} as const;

/** 具管理權限（使用者管理、看全部案件）的角色。 */
export const ADMIN_ROLES: readonly string[] = [ROLES.owner, ROLES.admin];

/** 新帳號預設角色（一般律師）。第一位管理者/所有人請於主控台手動設定。 */
export const DEFAULT_ROLE = ROLES.lawyer;

/** 應用程式名稱。 */
export const APP_NAME = '案件管理系統';
