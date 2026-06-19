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

/** 角色常數。 */
export const ROLES = {
  admin: 'admin',
  lawyer: 'lawyer',
} as const;

/**
 * 第一個註冊的帳號自動成為管理者；其餘預設為一般律師。
 * （亦可由既有管理者於使用者管理頁調整。）
 */
export const FIRST_USER_ROLE = ROLES.admin;
export const DEFAULT_ROLE = ROLES.lawyer;

/** 應用程式名稱。 */
export const APP_NAME = '案件管理系統';
