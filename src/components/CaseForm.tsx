/**
 * 案件欄位表單（配置驅動）。
 * 依 CASE_FIELDS 自動產生輸入欄位；新增與編輯共用。
 *
 * - 詞彙型 select（類型 / 委任範圍）選項來自 Firestore，可選「其他」自訂並加入清單。
 * - 收件日為日期選擇器；委任狀遞出時間為日期（必填）＋ 時間（選填）。
 * - 結案後（isClosed）僅 editableAfterClosed 的欄位（報稅）可編輯，其餘鎖定。
 */
import { CASE_FIELDS, type EditableCaseKey, type FieldDef } from '../config/caseFields';
import type { VocabularyMap } from '../services/vocabularyService';
import { SelectWithCustom } from './SelectWithCustom';

interface CaseFormProps {
  values: Record<EditableCaseKey, string>;
  onChange: (key: EditableCaseKey, value: string) => void;
  /** 詞彙清單（類型 / 委任範圍的可選項）。 */
  vocabularies: VocabularyMap;
  /** 將自訂值加入共用詞彙清單（供「其他」使用）。 */
  onAddVocabulary?: (key: keyof VocabularyMap, value: string) => Promise<void>;
  /** 整張表單唯讀（僅檢視）。 */
  readOnly?: boolean;
  /** 案件已結案：只有報稅可改。 */
  isClosed?: boolean;
}

const FIELD_BASE =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';

export function CaseForm({
  values,
  onChange,
  vocabularies,
  onAddVocabulary,
  readOnly = false,
  isClosed = false,
}: CaseFormProps) {
  function isFieldDisabled(field: FieldDef): boolean {
    if (readOnly) return true;
    if (isClosed) return !field.editableAfterClosed;
    return false;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {CASE_FIELDS.map((field) => {
        const disabled = isFieldDisabled(field);
        const value = values[field.key] ?? '';
        const isWide = field.inputType === 'textarea';
        return (
          <div key={field.key} className={isWide ? 'sm:col-span-2' : ''}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {field.label}
              {field.required && <span className="ml-0.5 text-red-500">*</span>}
              {isClosed && field.editableAfterClosed && (
                <span className="ml-2 text-xs text-amber-600">（結案後仍可修改）</span>
              )}
            </label>
            <FieldInput
              field={field}
              value={value}
              disabled={disabled}
              onChange={onChange}
              vocabularies={vocabularies}
              onAddVocabulary={onAddVocabulary}
            />
          </div>
        );
      })}
    </div>
  );
}

/** 依欄位類型渲染對應輸入元件。 */
function FieldInput({
  field,
  value,
  disabled,
  onChange,
  vocabularies,
  onAddVocabulary,
}: {
  field: FieldDef;
  value: string;
  disabled: boolean;
  onChange: (key: EditableCaseKey, value: string) => void;
  vocabularies: VocabularyMap;
  onAddVocabulary?: (key: keyof VocabularyMap, value: string) => Promise<void>;
}) {
  const common = { disabled, value, className: FIELD_BASE };

  if (field.inputType === 'textarea') {
    return <textarea {...common} rows={2} onChange={(e) => onChange(field.key, e.target.value)} />;
  }

  if (field.inputType === 'datetime') {
    return <DateTimeInput value={value} disabled={disabled} onChange={(v) => onChange(field.key, v)} />;
  }

  if (field.inputType === 'select') {
    // 詞彙型：動態選項 + 可自訂；固定型：沿用 field.options。
    if (field.vocabKey) {
      const options = vocabularies[field.vocabKey] ?? [];
      return (
        <SelectWithCustom
          value={value}
          options={options}
          disabled={disabled}
          onChange={(v) => onChange(field.key, v)}
          onAddOption={
            field.allowCustom && onAddVocabulary
              ? (v) => onAddVocabulary(field.vocabKey!, v)
              : undefined
          }
        />
      );
    }
    return (
      <select {...common} onChange={(e) => onChange(field.key, e.target.value)}>
        <option value="">— 請選擇 —</option>
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option || '（空白）'}
          </option>
        ))}
      </select>
    );
  }

  const htmlType = field.inputType === 'tel' ? 'tel' : field.inputType === 'date' ? 'date' : 'text';
  return <input {...common} type={htmlType} onChange={(e) => onChange(field.key, e.target.value)} />;
}

/**
 * 日期（必填）＋ 時間（選填）複合輸入。
 * 儲存格式：「yyyy-MM-dd」或「yyyy-MM-dd HH:mm」。
 */
function DateTimeInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [datePart = '', timePart = ''] = value.split(' ');

  function emit(nextDate: string, nextTime: string) {
    if (!nextDate) {
      onChange(''); // 沒有日期就整欄清空（時間不可獨立存在）。
      return;
    }
    onChange(nextTime ? `${nextDate} ${nextTime}` : nextDate);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="date"
        value={datePart}
        disabled={disabled}
        onChange={(e) => emit(e.target.value, timePart)}
        className={FIELD_BASE}
      />
      <input
        type="time"
        value={timePart}
        disabled={disabled || !datePart}
        onChange={(e) => emit(datePart, e.target.value)}
        className={`${FIELD_BASE} sm:w-36`}
        title={datePart ? '時間（選填）' : '請先選日期'}
      />
    </div>
  );
}
