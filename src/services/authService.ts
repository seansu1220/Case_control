/**
 * 驗證（Authentication）相關業務邏輯。
 * 不依賴任何 UI 框架，方便獨立測試或替換前端。
 */
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS, DEFAULT_ROLE } from '../config/constants';
import type { AppUser, LoginInput, RegisterInput } from '../types/user';

/** 將 Firebase 錯誤碼轉成中文訊息。 */
function toFriendlyMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/email-already-in-use': '此 email 已被註冊。',
    'auth/invalid-email': 'email 格式不正確。',
    'auth/weak-password': '密碼強度不足（至少 6 碼）。',
    'auth/user-not-found': '查無此帳號。',
    'auth/wrong-password': '密碼錯誤。',
    'auth/invalid-credential': 'email 或密碼錯誤。',
    'auth/too-many-requests': '嘗試次數過多，請稍後再試。',
    'auth/popup-closed-by-user': '已取消 Google 登入。',
    'auth/cancelled-popup-request': '已取消 Google 登入。',
    'auth/popup-blocked': '瀏覽器封鎖了登入彈出視窗，請允許彈出視窗後再試。',
    'auth/account-exists-with-different-credential':
      '此 email 已用其他方式註冊。請先用原本的方式登入，或在 Firebase 設定開啟「以相同 email 連結帳號」。',
  };
  return map[code] ?? `操作失敗（${code || (error as Error)?.message || '未知錯誤'}）`;
}

/**
 * 確保 users 文件存在；若不存在（例如首次以 Google 登入）則建立，
 * 預設為一般律師角色。已存在則不覆寫（保留既有角色設定）。
 */
async function ensureUserDoc(uid: string, email: string, displayName: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.users, uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;
  await setDoc(ref, {
    uid,
    email,
    displayName,
    lawyerName: displayName,
    role: DEFAULT_ROLE,
    viewAllCases: true,
    active: true,
    createdAt: serverTimestamp(),
  });
}

/**
 * 以 Google 帳號登入。
 * 若該 email 已有 email/密碼帳號，且 Firebase 已設定「以相同 email 連結帳號」，
 * 會自動連結為同一帳號（同一 uid、同一份案件資料）。
 */
export async function loginWithGoogle(): Promise<void> {
  try {
    const provider = new GoogleAuthProvider();
    // 每次都跳出「選擇帳號」畫面，避免自動沿用上次登入的同一帳號、無法切換。
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const { uid, email, displayName } = result.user;
    await ensureUserDoc(uid, email ?? '', displayName ?? email ?? '使用者');
  } catch (error) {
    throw new Error(toFriendlyMessage(error));
  }
}

/**
 * 註冊新帳號。
 * 同時在 users 集合建立對應文件，預設角色為一般律師、預設啟用。
 * 第一位管理者請於 Firebase 主控台手動將 role 改為 admin（見 README）。
 */
export async function register({ email, password, displayName }: RegisterInput): Promise<void> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = credential.user;
    await updateProfile(credential.user, { displayName });

    const userDoc: Omit<AppUser, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      uid,
      email,
      displayName,
      lawyerName: displayName,
      role: DEFAULT_ROLE,
      viewAllCases: true,
      active: true,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, COLLECTIONS.users, uid), userDoc);
  } catch (error) {
    throw new Error(toFriendlyMessage(error));
  }
}

/** 登入。 */
export async function login({ email, password }: LoginInput): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new Error(toFriendlyMessage(error));
  }
}

/** 登出。 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/** 讀取指定 uid 的使用者資料文件。 */
export async function fetchUserProfile(uid: string): Promise<AppUser | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    uid,
    email: data.email ?? '',
    displayName: data.displayName ?? '',
    lawyerName: data.lawyerName ?? data.displayName ?? '',
    role: data.role ?? DEFAULT_ROLE,
    viewAllCases: data.viewAllCases ?? true,
    active: data.active ?? true,
    createdAt:
      typeof data.createdAt?.toDate === 'function'
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt ?? ''),
  };
}
