import React, {FC, ReactNode, ReactElement, ChangeEvent, SelectHTMLAttributes} from 'react'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import {SxProps, Theme} from '@mui/material/styles'
import style from './index.module.css'

/**
 * FormInput Components - A collection of reusable form field components.
 *
 * Uses Material UI TextField with outlined variant for M3 design consistency.
 *
 * Components:
 * - FormRow: Grid container for form fields (typically 2 columns)
 * - FormGroup: Label + input wrapper (simplified for MUI)
 * - FormInput: Text/number/date input with read-only support
 * - FormSelect: Select dropdown
 * - FormTextarea: Multi-line text input
 * - FormDivider: Visual separator between form sections
 */

// Common sx styles for MUI TextField to match theme
const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: 'var(--theme-font-family, "Poppins", sans-serif)',
    fontSize: 'var(--theme-font-size-sm, 14px)',
    backgroundColor: 'var(--theme-form-input-bg, #FFFFFF)',
    borderRadius: 'var(--theme-form-input-radius, 6px)',
    '& fieldset': {
      borderColor: 'var(--theme-form-input-border, #d1d5db)',
      transition: 'border-color 0.2s',
    },
    '&:hover fieldset': {
      borderColor: 'var(--theme-form-input-border-hover, #9ca3af)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--theme-form-input-border-focus, #4f46e5)',
      borderWidth: '2px',
    },
    '&.Mui-disabled': {
      backgroundColor: 'var(--tw-gray-100, #E8E9EC)',
      '& fieldset': {
        borderColor: 'var(--tw-gray-200, #e5e7eb)',
      },
    },
    '& input': {
      padding: 'var(--theme-form-input-padding, 12px 14px)',
      color: 'var(--tw-gray-800, #1f2937)',
      height: 'auto',
      boxSizing: 'border-box',
      '&::placeholder': {
        color: 'var(--theme-text-tertiary, #9ca3af)',
        opacity: 1,
      },
      '&[type="date"]': {
        lineHeight: '1.4375em',
      },
    },
    '& .MuiSelect-select': {
      padding: 'var(--theme-form-input-padding, 12px 14px)',
      color: 'var(--tw-gray-800, #1f2937)',
    },
    '& textarea': {
      color: 'var(--tw-gray-800, #1f2937)',
      '&::placeholder': {
        color: 'var(--theme-text-tertiary, #9ca3af)',
        opacity: 1,
      },
    },
  },
  '& .MuiInputLabel-root': {
    fontFamily: 'var(--theme-font-family, "Poppins", sans-serif)',
    fontSize: 'var(--theme-font-size-sm, 14px)',
    color: 'var(--tw-gray-600, #4b5563)',
    '&.Mui-focused': {
      color: 'var(--theme-form-input-border-focus, #4f46e5)',
    },
    '&.Mui-error': {
      color: 'var(--tw-red-600, #DC2626)',
    },
  },
  '& .MuiFormHelperText-root': {
    fontFamily: 'var(--theme-font-family, "Poppins", sans-serif)',
    fontSize: 'var(--theme-font-size-xs, 12px)',
    marginLeft: 0,
    marginTop: '4px',
    '&.Mui-error': {
      color: 'var(--tw-red-600, #DC2626)',
    },
  },
}

const readOnlySx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'var(--theme-form-input-bg-readonly, transparent)',
    '& fieldset': {
      borderColor: 'var(--theme-form-input-border-readonly, transparent)',
    },
    '&:hover fieldset': {
      borderColor: 'var(--theme-form-input-border-readonly, transparent)',
    },
    '& input': {
      color: 'var(--tw-gray-700, #374151)',
      cursor: 'default',
    },
    '& .MuiSelect-select': {
      color: 'var(--tw-gray-700, #374151)',
      cursor: 'default',
    },
    '& textarea': {
      color: 'var(--tw-gray-700, #374151)',
      cursor: 'default',
    },
  },
}

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
  /** Label text (now passed to MUI TextField) */
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
  // Clone children and pass label/error/helperText props if it's a MUI TextField
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // Check if child accepts these props (MUI TextField, FormInput, etc.)
      const childProps: Record<string, unknown> = {}
      if (label !== undefined) childProps.label = label
      if (required !== undefined) childProps.required = required
      if (error !== undefined) {
        childProps.error = !!error
        childProps.helperText = error
      } else if (helperText !== undefined) {
        childProps.helperText = helperText
      }
      return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, childProps)
    }
    return child
  })

  return (
    <div className={`${style.group} ${fullWidth ? style.groupFull : ''} ${className || ''}`}>
      {enhancedChildren}
    </div>
  )
}

// ============================================
// FormInput - Text/number/date input
// ============================================

export type FormInputType = 'text' | 'number' | 'date' | 'time' | 'email' | 'tel' | 'url' | 'password'

export interface FormInputProps {
  /** Input type */
  type?: FormInputType
  /** Current value */
  value?: string | number
  /** Change handler */
  onChange?: (value: string) => void
  /** Label text */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Read-only state (different styling from disabled) */
  readOnly?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Required field */
  required?: boolean
  /** Error state */
  error?: boolean
  /** Helper text */
  helperText?: string
  /** Additional CSS class */
  className?: string
  /** Start adornment (icon/text before input) */
  startAdornment?: ReactNode
  /** End adornment (icon/text after input) */
  endAdornment?: ReactNode
}

export const FormInput: FC<FormInputProps> = ({
  type = 'text',
  value,
  onChange,
  label,
  placeholder,
  readOnly = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  className,
  startAdornment,
  endAdornment,
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  // For date/time inputs, always shrink the label since native pickers have their own placeholder
  const isDateOrTimeType = type === 'date' || type === 'time'

  return (
    <TextField
      type={type}
      value={value ?? ''}
      onChange={handleChange}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      fullWidth
      variant="outlined"
      size="small"
      slotProps={{
        input: {
          readOnly: readOnly,
          startAdornment: startAdornment ? (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ) : undefined,
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined,
        },
        inputLabel: {
          shrink: isDateOrTimeType ? true : undefined,
        },
      }}
      sx={{
        ...textFieldSx,
        ...(readOnly ? readOnlySx : {}),
      }}
      className={className}
    />
  )
}

// ============================================
// FormNumberInput - Number input with parsing
// ============================================

export interface FormNumberInputProps {
  /** Current value */
  value?: number | null
  /** Change handler */
  onChange?: (value: number) => void
  /** Label text */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Decimal step (e.g., 0.01 for currency) */
  step?: number
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Read-only state */
  readOnly?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Required field */
  required?: boolean
  /** Error state */
  error?: boolean
  /** Helper text */
  helperText?: string
  /** Additional CSS class */
  className?: string
  /** Start adornment (e.g., currency symbol) */
  startAdornment?: ReactNode
  /** End adornment */
  endAdornment?: ReactNode
}

export const FormNumberInput: FC<FormNumberInputProps> = ({
  value,
  onChange,
  label,
  placeholder,
  step = 1,
  min,
  max,
  readOnly = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  className,
  startAdornment,
  endAdornment,
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value)
    onChange?.(isNaN(parsed) ? 0 : parsed)
  }

  return (
    <TextField
      type="number"
      value={value ?? ''}
      onChange={handleChange}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      fullWidth
      variant="outlined"
      size="small"
      slotProps={{
        input: {
          readOnly: readOnly,
          startAdornment: startAdornment ? (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ) : undefined,
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined,
        },
        htmlInput: {
          step: step,
          min: min,
          max: max,
        },
      }}
      sx={{
        ...textFieldSx,
        ...(readOnly ? readOnlySx : {}),
        // Hide number spinners
        '& input[type=number]': {
          MozAppearance: 'textfield',
        },
        '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
          WebkitAppearance: 'none',
          margin: 0,
        },
      }}
      className={className}
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
  /** Label text */
  label?: string
  /** Placeholder text when no value selected */
  placeholder?: string
  /** Read-only state (rendered as disabled with different style) */
  readOnly?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Required field */
  required?: boolean
  /** Error state */
  error?: boolean
  /** Helper text */
  helperText?: string
  /** Additional CSS class */
  className?: string
}

export const FormSelect: FC<FormSelectProps> = ({
  value,
  options,
  onChange,
  label,
  placeholder,
  readOnly = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  className,
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  // Additional styles to hide dropdown arrow and border when read-only
  const readOnlySelectSx: SxProps<Theme> = readOnly ? {
    '& .MuiSelect-icon': {
      display: 'none',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none',
    },
  } : {}

  return (
    <TextField
      select
      value={value ?? ''}
      onChange={handleChange}
      label={label}
      disabled={disabled || readOnly}
      required={required}
      error={error}
      helperText={helperText}
      fullWidth
      variant="outlined"
      size="small"
      slotProps={{
        input: {
          readOnly: readOnly,
        },
      }}
      sx={{
        ...textFieldSx,
        ...(readOnly ? readOnlySx : {}),
        ...readOnlySelectSx,
      }}
      className={className}
    >
      {placeholder && (
        <MenuItem value="" disabled>
          {placeholder}
        </MenuItem>
      )}
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  )
}

// ============================================
// FormTextarea - Multi-line text input
// ============================================

export interface FormTextareaProps {
  /** Current value */
  value?: string
  /** Change handler */
  onChange?: (value: string) => void
  /** Label text */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Read-only state */
  readOnly?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Number of rows */
  rows?: number
  /** Required field */
  required?: boolean
  /** Error state */
  error?: boolean
  /** Helper text */
  helperText?: string
  /** Additional CSS class */
  className?: string
}

export const FormTextarea: FC<FormTextareaProps> = ({
  value,
  onChange,
  label,
  placeholder,
  readOnly = false,
  disabled = false,
  rows = 3,
  required = false,
  error = false,
  helperText,
  className,
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <TextField
      value={value ?? ''}
      onChange={handleChange}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      fullWidth
      multiline
      rows={rows}
      variant="outlined"
      size="small"
      slotProps={{
        input: {
          readOnly: readOnly,
        },
      }}
      sx={{
        ...textFieldSx,
        ...(readOnly ? readOnlySx : {}),
      }}
      className={className}
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
  /** Icon to display before the title (ReactNode for SVG or icon component) */
  icon?: ReactNode
  /** Form field children */
  children: ReactNode
  /** Additional CSS class */
  className?: string
}

export const FormSection: FC<FormSectionProps> = ({
  title,
  description,
  icon,
  children,
  className,
}) => {
  return (
    <div className={`${style.section} ${className || ''}`}>
      {(title || icon) && (
        <div className={style.sectionHeader}>
          {icon && <span className={style.sectionIcon}>{icon}</span>}
          {title && <h4 className={style.sectionTitle}>{title}</h4>}
        </div>
      )}
      {description && <p className={style.sectionDescription}>{description}</p>}
      <div className={style.sectionContent}>
        {children}
      </div>
    </div>
  )
}

// ============================================
// InfoPanel - Blue outlined info box with checkmark
// ============================================

export interface InfoPanelProps {
  /** Optional header/title text (displayed bold on separate line) */
  header?: string
  /** Content to display */
  children: ReactNode
  /** Additional CSS class */
  className?: string
}

export const InfoPanel: FC<InfoPanelProps> = ({
  header,
  children,
  className,
}) => {
  return (
    <div className={`${style.infoPanel} ${className || ''}`}>
      <svg className={style.infoPanelIcon} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10.5" stroke="#0B81FF" strokeWidth="2" fill="none" />
        <path d="M12 11v4.5" stroke="#0B81FF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="8" r="1.25" fill="#0B81FF" />
      </svg>
      <div className={style.infoPanelContent}>
        {header && <span className={style.infoPanelHeader}>{header}</span>}
        <span>{children}</span>
      </div>
    </div>
  )
}

// ============================================
// StepHeader - Page header with icon, title, description
// ============================================

export interface StepHeaderProps {
  /** Page/step title */
  title: string
  /** Description text below the title */
  description?: string
  /** Icon to display (ReactNode for SVG) */
  icon?: ReactNode
  /** Additional CSS class */
  className?: string
}

export const StepHeader: FC<StepHeaderProps> = ({
  title,
  description,
  icon,
  className,
}) => {
  return (
    <div className={`${style.stepHeader} ${className || ''}`}>
      <h3 className={style.stepHeaderTitle}>
        {icon && <span className={style.stepHeaderIcon}>{icon}</span>}
        {title}
      </h3>
      {description && <p className={style.stepHeaderDescription}>{description}</p>}
    </div>
  )
}

// ============================================
// FileItem - Display a file with icon, name, metadata, and actions
// ============================================

/** Returns an SVG icon based on file content type */
export const getFileTypeIcon = (contentType: string, size: number = 24): ReactElement => {
  if (contentType.includes('pdf')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    )
  }
  if (contentType.includes('image')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    )
  }
  if (contentType.includes('xml')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13l2 2-2 2" />
        <path d="M16 13l-2 2 2 2" />
      </svg>
    )
  }
  // Default file icon
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  )
}

export interface FileItemProps {
  /** File name */
  name: string
  /** File content type / MIME type */
  contentType?: string
  /** File size in bytes */
  size?: number
  /** Optional badge text (e.g., "Supporting", "UBL Invoice") */
  badge?: string
  /** Badge variant for styling */
  badgeVariant?: 'default' | 'primary' | 'success'
  /** Remove button click handler */
  onRemove?: () => void
  /** Additional CSS class */
  className?: string
}

/** Format file size for display */
const formatFileSizeInternal = (bytes?: number): string => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const FileItem: FC<FileItemProps> = ({
  name,
  contentType = '',
  size,
  badge,
  badgeVariant = 'default',
  onRemove,
  className,
}) => {
  const badgeClass = {
    default: style.fileItemBadge,
    primary: `${style.fileItemBadge} ${style.fileItemBadgePrimary}`,
    success: `${style.fileItemBadge} ${style.fileItemBadgeSuccess}`,
  }[badgeVariant]

  return (
    <div className={`${style.fileItem} ${className || ''}`}>
      <div className={style.fileItemIcon}>{getFileTypeIcon(contentType)}</div>
      <div className={style.fileItemInfo}>
        <span className={style.fileItemName}>{name}</span>
        <span className={style.fileItemMeta}>
          {contentType || 'Unknown type'}
          {size ? ` • ${formatFileSizeInternal(size)}` : ''}
        </span>
      </div>
      {badge && <span className={badgeClass}>{badge}</span>}
      {onRemove && (
        <button className={style.fileItemRemove} onClick={onRemove} type="button" title="Remove">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ============================================
// LoadingIndicator - Spinner with text
// ============================================

export interface LoadingIndicatorProps {
  /** Loading message text */
  text?: string
  /** Size variant */
  size?: 'small' | 'medium'
  /** Additional CSS class */
  className?: string
}

export const LoadingIndicator: FC<LoadingIndicatorProps> = ({
  text,
  size = 'medium',
  className,
}) => {
  return (
    <div className={`${style.loadingIndicator} ${size === 'small' ? style.loadingIndicatorSmall : ''} ${className || ''}`}>
      <div className={style.spinner} />
      {text && <span className={style.loadingText}>{text}</span>}
    </div>
  )
}

// ============================================
// WarningCard - Warning/error display card
// ============================================

export interface WarningCardProps {
  /** Card title */
  title?: string
  /** Message content */
  message: string
  /** Variant for styling */
  variant?: 'warning' | 'error'
  /** Action button text */
  actionText?: string
  /** Action button click handler */
  onAction?: () => void
  /** Additional CSS class */
  className?: string
}

export const WarningCard: FC<WarningCardProps> = ({
  title,
  message,
  variant = 'warning',
  actionText,
  onAction,
  className,
}) => {
  const variantClass = variant === 'error' ? style.warningCardError : ''

  return (
    <div className={`${style.warningCard} ${variantClass} ${className || ''}`}>
      <div className={style.warningCardIcon}>
        {variant === 'error' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      </div>
      <div className={style.warningCardContent}>
        {title && <span className={style.warningCardTitle}>{title}</span>}
        <span className={style.warningCardMessage}>{message}</span>
      </div>
      {actionText && onAction && (
        <button className={style.warningCardAction} onClick={onAction} type="button">
          {actionText}
        </button>
      )}
    </div>
  )
}

// Default export
export default FormInput
