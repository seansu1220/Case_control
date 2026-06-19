/**
 * 案件欄位表單（配置驅動）。
 * 依 CASE_FIELDS 自動產生輸入欄位；新增與編輯共用。
 *
 * 結案後（isClosed）僅 editableAfterClosed 的欄位（報稅）可編輯，其餘鎖定。
 */
import { CASE_FIELDS, type EditableCaseKey, type FieldDef } from '../config/caseFields';

interface CaseFormProps {
  values: Record<EditableCaseKey, string>;
  onChange: (key: EditableCaseKey, value: string) => void;
  /** 整張表單唯讀（僅檢視）。 */
  readOnly?: boolean;
  /** 案件已結案：只有報稅可改。 */
  isClosed?: boolean;
}

const FIELD_BASE =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';

export function CaseForm({ values, onChange, readOnly = false, isClosed = false }: CaseFormProps) {
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
            <FieldInput field={field} value={value} disabled={disabled} onChange={onChange} />
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
}: {
  field: FieldDef;
  value: string;
  disabled: boolean;
  onChange: (key: EditableCaseKey, value: string) => void;
}) {
  const common = { disabled, value, className: FIELD_BASE };

  if (field.inputType === 'textarea') {
    return (
      <textarea
        {...common}
        rows={2}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    );
  }

  if (field.inputType === 'select') {
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
  return (
    <input
      {...common}
      type={htmlType}
      onChange={(e) => onChange(field.key, e.target.value)}
    />
  );
}
