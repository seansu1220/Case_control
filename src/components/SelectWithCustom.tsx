/**
 * 可自訂值的下拉選單。
 *
 * 行為：
 * - 列出既有選項；最後一項為「其他（手動輸入）」。
 * - 選「其他」時出現文字輸入框，輸入的值即存入案件欄位。
 * - 若提供 onAddOption，輸入框旁有「＋加入常用選項」按鈕，
 *   按下會把該值寫入共用詞彙清單，之後所有人都能在下拉直接選。
 */
import { useEffect, useState } from 'react';

const CUSTOM_SENTINEL = '__custom__';

const FIELD_BASE =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';

interface SelectWithCustomProps {
  value: string;
  options: readonly string[];
  disabled?: boolean;
  onChange: (value: string) => void;
  /** 提供時顯示「加入常用選項」，將自訂值寫入共用清單。 */
  onAddOption?: (value: string) => Promise<void>;
}

export function SelectWithCustom({
  value,
  options,
  disabled = false,
  onChange,
  onAddOption,
}: SelectWithCustomProps) {
  // 值不在選項清單中且非空 → 視為自訂值，自動進入「其他」模式。
  const valueIsCustom = value !== '' && !options.includes(value);
  const [customMode, setCustomMode] = useState(valueIsCustom);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // 外部值變成既有選項（例如剛被加入清單）時，退出自訂模式。
  useEffect(() => {
    if (value !== '' && options.includes(value)) setCustomMode(false);
  }, [value, options]);

  function handleSelectChange(selected: string) {
    if (selected === CUSTOM_SENTINEL) {
      setCustomMode(true);
      onChange(''); // 清空，待使用者於輸入框填寫。
    } else {
      setCustomMode(false);
      onChange(selected);
    }
  }

  async function handleAddOption() {
    if (!onAddOption) return;
    const trimmed = value.trim();
    if (!trimmed) {
      setAddError('請先輸入內容。');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await onAddOption(trimmed);
      // 寫入成功後，清單會經訂閱更新並包含此值；useEffect 會退出自訂模式。
    } catch (err) {
      setAddError(`加入失敗：${(err as Error).message}`);
    } finally {
      setAdding(false);
    }
  }

  const showCustomInput = customMode || valueIsCustom;
  const selectValue = showCustomInput ? CUSTOM_SENTINEL : value;
  const alreadyInList = value.trim() !== '' && options.includes(value.trim());

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        disabled={disabled}
        onChange={(e) => handleSelectChange(e.target.value)}
        className={FIELD_BASE}
      >
        <option value="">— 請選擇 —</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option || '（空白）'}
          </option>
        ))}
        <option value={CUSTOM_SENTINEL}>其他（手動輸入）…</option>
      </select>

      {showCustomInput && (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              disabled={disabled}
              placeholder="請輸入自訂內容"
              onChange={(e) => onChange(e.target.value)}
              className={FIELD_BASE}
            />
            {onAddOption && !disabled && (
              <button
                type="button"
                onClick={handleAddOption}
                disabled={adding || alreadyInList || value.trim() === ''}
                className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="把此值加入共用選項清單，之後可直接選擇"
              >
                {alreadyInList ? '已在清單' : adding ? '加入中…' : '＋加入常用選項'}
              </button>
            )}
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
        </div>
      )}
    </div>
  );
}
