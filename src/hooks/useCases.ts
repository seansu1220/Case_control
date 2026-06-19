/**
 * 訂閱目前使用者可見案件的 hook。
 * 依角色（管理者/律師）自動套用查詢條件，並即時同步。
 */
import { useEffect, useState } from 'react';
import { subscribeCases } from '../services/caseService';
import type { CaseRecord } from '../types/case';
import type { AppUser } from '../types/user';

interface UseCasesResult {
  cases: CaseRecord[];
  loading: boolean;
  error: string | null;
}

export function useCases(user: AppUser | null): UseCasesResult {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeCases(
      user,
      (next) => {
        setCases(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  return { cases, loading, error };
}
