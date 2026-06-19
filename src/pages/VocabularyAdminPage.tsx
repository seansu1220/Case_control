/**
 * 詞彙管理頁（限管理者）。
 *
 * 管理「類型」「委任範圍」「地院/地檢」等下拉選項：新增、改名、刪除。
 * 刪除選項不影響已使用該值的案件，只是日後下拉不再提供。
 */
import { useState } from 'react';
import { useVocabularies } from '../hooks/useVocabularies';
import {
  addVocabularyValue,
  removeVocabularyValue,
  setVocabularyValues,
  VOCABULARY_KEYS,
  VOCABULARY_LABELS,
} from '../services/vocabularyService';
import type { VocabularyKey } from '../config/caseFields';
import { Button, Card, ErrorBanner } from '../components/ui';

export function VocabularyAdminPage() {
  const { vocabularies } = useVocabularies();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">詞彙管理</h1>
      <p className="text-sm text-slate-500">
        管理案件表單的下拉選項。律師於案件中選「其他」加入的值也會出現在這裡。
        刪除選項不會影響已套用該值的案件。
      </p>

      <ErrorBanner message={error} />

      {VOCABULARY_KEYS.map((key) => (
        <VocabularyEditor key={key} vocabKey={key} values={vocabularies[key] ?? []} onError={setError} />
      ))}
    </div>
  );
}

/** 單一詞彙清單的編輯卡片。 */
function VocabularyEditor({
  vocabKey,
  values,
  onError,
}: {
  vocabKey: VocabularyKey;
  values: string[];
  onError: (msg: string | null) => void;
}) {
  const [newValue, setNewValue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  async function handleAdd() {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      onError(`「${trimmed}」已存在於${VOCABULARY_LABELS[vocabKey]}。`);
      return;
    }
    try {
      onError(null);
      await addVocabularyValue(vocabKey, trimmed);
      setNewValue('');
    } catch (err) {
      onError(`新增失敗：${(err as Error).message}`);
    }
  }

  async function handleDelete(value: string) {
    if (!window.confirm(`確定從${VOCABULARY_LABELS[vocabKey]}刪除「${value}」？`)) return;
    try {
      onError(null);
      await removeVocabularyValue(vocabKey, value);
    } catch (err) {
      onError(`刪除失敗：${(err as Error).message}`);
    }
  }

  async function handleRename(oldValue: string) {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === oldValue) {
      setEditing(null);
      return;
    }
    if (values.includes(trimmed)) {
      onError(`「${trimmed}」已存在，無法改名。`);
      return;
    }
    try {
      onError(null);
      await setVocabularyValues(
        vocabKey,
        values.map((v) => (v === oldValue ? trimmed : v)),
      );
      setEditing(null);
    } catch (err) {
      onError(`改名失敗：${(err as Error).message}`);
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-base font-semibold text-slate-700">{VOCABULARY_LABELS[vocabKey]}</h2>

      <ul className="flex flex-wrap gap-2">
        {values.length === 0 && <li className="text-sm text-slate-400">尚無選項。</li>}
        {values.map((value) => (
          <li key={value} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm">
            {editing === value ? (
              <>
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(value);
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  className="w-28 rounded border border-slate-300 px-1 py-0.5 text-sm focus:outline-none"
                />
                <button onClick={() => handleRename(value)} className="px-1 text-xs text-green-600 hover:underline">
                  存
                </button>
                <button onClick={() => setEditing(null)} className="px-1 text-xs text-slate-400 hover:underline">
                  取消
                </button>
              </>
            ) : (
              <>
                <span className="text-slate-700">{value}</span>
                <button
                  onClick={() => {
                    setEditing(value);
                    setEditText(value);
                  }}
                  className="ml-1 rounded-full px-1.5 text-xs text-slate-500 hover:bg-slate-200"
                  title="改名"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(value)}
                  className="rounded-full px-1.5 text-xs text-red-500 hover:bg-red-100"
                  title="刪除"
                >
                  ✕
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder={`新增${VOCABULARY_LABELS[vocabKey]}選項`}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none sm:max-w-xs"
        />
        <Button onClick={handleAdd}>新增</Button>
      </div>
    </Card>
  );
}
