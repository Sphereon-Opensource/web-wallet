import React, {FC, ReactNode, ReactElement, ChangeEvent, SelectHTMLAttributes, InputHTMLAttributes} from 'react'
import style from './index.module.css'

/**
 * FormInput Components - A collection of reusable form field components.
 *
 * Components:
 * - FormRow: Grid container for form fields (typically 2 columns)
 * - FormGroup: Label + input wrapper
 * - FormInput: Text/number/date input with read-only support
 * - FormSelect: Select dropdown
 * - FormTextarea: Multi-line text input
 * - FormDivider: Visual separator between form sections
 */

// ============================================
// FormRow - Grid container for form fields
// ============================================

export interface FormRowProps {
  /** Form field children */
  children: ReactNode
  /** Number of columns (default: 2) */
  columns?: 1 | 2 | 3 | 4
  /** Additional CSS class */
  className?: string
}

export const FormRow: FC<FormRowProps> = ({
  children,
  columns = 2,
  className,
}) => {
  const columnsClass = {
    1: style.rowCols1,
    2: '',
    3: style.rowCols3,
    4: style.rowCols4,
  }[columns]

  return (
    <div className={`${style.row} ${columnsClass} ${className || ''}`}>
      {children}
    </div>
  )
}

// ============================================
// FormGroup - Label + input wrapper
// ============================================

export interface FormGroupProps {
  /** Label text */
  label?: string
  /** Show required indicator */
  required?: boolean
  /** Helper text below the input */
  helperText?: string
  /** Error message */
  error?: string
  /** Span full width in a row */
  fullWidth?: boolean
  /** Form field children */
  children: ReactNode
  /** Additional CSS class */
  className?: string
}

export const FormGroup: FC<FormGroupProps> = ({
  label,
  required = false,
  helperText,
  error,
  fullWidth = false,
  children,
  className,
}) => {
  return (
    <div className={`${style.group} ${fullWidth ? style.groupFull : ''} ${className || ''}`}>
      {label && (
        <label className={style.label}>
          {label}
          {required && <span className={style.required}>*</span>}
        </label>
      )}
      {children}
      {helperText && !error && (
        <span className={style.helperText}>{helperText}</span>
      )}
      {error && (
        <span className={style.errorText}>{error}</span>
      )}
    </div>
  )
}

// ============================================
// FormInput - Text/number/date input
// ============================================

export type FormInputType = 'text' | 'number' | 'date' | 'email' | 'tel' | 'url' | 'password'

export interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** Input type */
  type?: FormInputType
  /** Current value */
  value?: string | number
  /** Change handler */
  onChange?: (value: string) => void
  /** Read-only state (different styling from disabled) */
  readOnly?: boolean
  /** Additional CSS class */
  className?: string
}

export const FormInput: FC<FormInputProps> = ({
  type = 'text',
  value,
  onChange,
  readOnly = false,
  disabled = false,
  className,
  ...inputProps
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={handleChange}
      readOnly={readOnly}
      disabled={disabled}
      className={`${style.input} ${readOnly ? style.inputReadOnly : ''} ${className || ''}`}
      {...inputProps}
    />
  )
}

// ============================================
// FormNumberInput - Number input with parsing
// ============================================

export interface FormNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  /** Current value */
  value?: number | null
  /** Change handler */
  onChange?: (value: number) => void
  /** Decimal step (e.g., 0.01 for currency) */
  step?: number
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Read-only state */
  readOnly?: boolean
  /** Additional CSS class */
  className?: string
}

export const FormNumberInput: FC<FormNumberInputProps> = ({
  value,
  onChange,
  step = 1,
  min,
  max,
  readOnly = false,
  disabled = false,
  className,
  ...inputProps
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value)
    onChange?.(isNaN(parsed) ? 0 : parsed)
  }

  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={handleChange}
      step={step}
      min={min}
      max={max}
      readOnly={readOnly}
      disabled={disabled}
      className={`${style.input} ${readOnly ? style.inputReadOnly : ''} ${className || ''}`}
      {...inputProps}
    />
  )
}

// ============================================
// FormSelect - Dropdown select
// ============================================

export interface FormSelectOption {
  /** Option value */
  value: string
  /** Display label */
  label: string
  /** Disabled option */
  disabled?: boolean
}

export interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /** Current value */
  value?: string
  /** Available options */
  options: FormSelectOption[]
  /** Change handler */
  onChange?: (value: string) => void
  /** Placeholder text when no value selected */
  placeholder?: string
  /** Read-only state (rendered as disabled with different style) */
  readOnly?: boolean
  /** Additional CSS class */
  className?: string
}

export const FormSelect: FC<FormSelectProps> = ({
  value,
  options,
  onChange,
  placeholder,
  readOnly = false,
  disabled = false,
  className,
  ...selectProps
}) => {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <select
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled || readOnly}
      className={`${style.input} ${style.select} ${readOnly ? style.inputReadOnly : ''} ${className || ''}`}
      {...selectProps}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

// ============================================
// FormTextarea - Multi-line text input
// ============================================

export interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  /** Current value */
  value?: string
  /** Change handler */
  onChange?: (value: string) => void
  /** Read-only state */
  readOnly?: boolean
  /** Number of rows */
  rows?: number
  /** Additional CSS class */
  className?: string
}

export const FormTextarea: FC<FormTextareaProps> = ({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  rows = 3,
  className,
  ...textareaProps
}) => {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <textarea
      value={value ?? ''}
      onChange={handleChange}
      readOnly={readOnly}
      disabled={disabled}
      rows={rows}
      className={`${style.input} ${style.textarea} ${readOnly ? style.inputReadOnly : ''} ${className || ''}`}
      {...textareaProps}
    />
  )
}

// ============================================
// FormDivider - Visual separator
// ============================================

export interface FormDividerProps {
  /** Additional CSS class */
  className?: string
}

export const FormDivider: FC<FormDividerProps> = ({className}): ReactElement => {
  return <div className={`${style.divider} ${className || ''}`} />
}

// ============================================
// FormSection - Group of related fields
// ============================================

export interface FormSectionProps {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Form field children */
  children: ReactNode
  /** Additional CSS class */
  className?: string
}

export const FormSection: FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={`${style.section} ${className || ''}`}>
      {(title || description) && (
        <div className={style.sectionHeader}>
          {title && <h4 className={style.sectionTitle}>{title}</h4>}
          {description && <p className={style.sectionDescription}>{description}</p>}
        </div>
      )}
      <div className={style.sectionContent}>
        {children}
      </div>
    </div>
  )
}

// Default export
export default FormInput
