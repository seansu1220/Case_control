/**
 * 使用者管理業務邏輯（供管理者使用）。
 */
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../config/constants';
import type { AppUser, UserRole } from '../types/user';

/** 取得所有使用者（依建立時間排序）。需管理者權限（由安全規則把關）。 */
export async function listUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.users), orderBy('createdAt', 'asc')));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      lawyerName: data.lawyerName ?? data.displayName ?? '',
      role: (data.role ?? 'lawyer') as UserRole,
      active: data.active ?? true,
      createdAt:
        typeof data.createdAt?.toDate === 'function'
          ? data.createdAt.toDate().toISOString()
          : (data.createdAt ?? ''),
    };
  });
}

/** 更新使用者角色。 */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.users, uid), { role });
}

/** 更新使用者的律師姓名（案件負責律師顯示用）。 */
export async function updateUserLawyerName(uid: string, lawyerName: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.users, uid), { lawyerName });
}

/** 啟用/停用帳號。 */
export async function updateUserActive(uid: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.users, uid), { active });
}
