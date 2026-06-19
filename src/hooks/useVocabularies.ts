/**
 * 訂閱詞彙清單（類型、委任範圍）的 hook，供表單下拉選單即時取得最新選項。
 * Firestore 尚無資料時自動以預設種子值填補。
 */
import { useEffect, useState } from 'react';
import {
  defaultVocabularyMap,
  subscribeVocabularies,
  type VocabularyMap,
} from '../services/vocabularyService';

interface UseVocabulariesResult {
  vocabularies: VocabularyMap;
  loading: boolean;
  error: string | null;
}

export function useVocabularies(): UseVocabulariesResult {
  const [vocabularies, setVocabularies] = useState<VocabularyMap>(defaultVocabularyMap);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeVocabularies(
      (map) => {
        setVocabularies(map);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { vocabularies, loading, error };
}
