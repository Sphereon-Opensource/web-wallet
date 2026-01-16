import React, {FC, ReactNode, ReactElement} from 'react'
import style from './index.module.css'

/**
 * BaseDetailPanel - A composable side panel component for detail views.
 *
 * Provides a responsive layout that:
 * - Displays as a fixed-width side panel on desktop
 * - Transforms to a full-screen modal on mobile
 *
 * Use the sub-components for building content:
 * - PanelHeader: Title bar with close button
 * - PanelBody: Scrollable content area
 * - PanelFooter: Action buttons
 * - PanelSection: Titled content section
 * - MetadataList: Label/value pairs
 */

export interface BaseDetailPanelProps {
  /** Panel content - typically PanelHeader, PanelBody, PanelFooter */
  children: ReactNode
  /** Additional CSS class */
  className?: string
  /** Width variant */
  width?: 'default' | 'narrow' | 'wide'
  /** Test ID for testing */
  testId?: string
}

export const BaseDetailPanel: FC<BaseDetailPanelProps> = ({
  children,
  className,
  width = 'default',
  testId,
}) => {
  const widthClass = width === 'narrow' ? style.panelNarrow : width === 'wide' ? style.panelWide : ''

  return (
    <aside
      className={`${style.panel} ${widthClass} ${className || ''}`}
      data-testid={testId}
    >
      {children}
    </aside>
  )
}

// ============================================
// PanelHeader
// ============================================

export interface PanelHeaderProps {
  /** Main title */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Close handler */
  onClose?: () => void
  /** Close button aria-label */
  closeLabel?: string
  /** Additional actions to render (right side) */
  actions?: ReactNode
  /** Additional CSS class */
  className?: string
}

export const PanelHeader: FC<PanelHeaderProps> = ({
  title,
  subtitle,
  onClose,
  closeLabel = 'Close',
  actions,
  className,
}) => {
  return (
    <header className={`${style.header} ${className || ''}`}>
      <div className={style.headerContent}>
        <h3 className={style.title}>{title}</h3>
        {subtitle && <span className={style.subtitle}>{subtitle}</span>}
      </div>
      <div className={style.headerActions}>
        {actions}
        {onClose && (
          <button
            type="button"
            className={style.closeButton}
            onClick={onClose}
            aria-label={closeLabel}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}

// ============================================
// PanelBody
// ============================================

export interface PanelBodyProps {
  /** Body content */
  children: ReactNode
  /** Additional CSS class */
  className?: string
  /** Padding variant */
  padding?: 'default' | 'none' | 'compact'
}

export const PanelBody: FC<PanelBodyProps> = ({
  children,
  className,
  padding = 'default',
}) => {
  const paddingClass = padding === 'none' ? style.bodyNoPadding : padding === 'compact' ? style.bodyCompact : ''

  return (
    <div className={`${style.body} ${paddingClass} ${className || ''}`}>
      {children}
    </div>
  )
}

// ============================================
// PanelFooter
// ============================================

export interface PanelFooterProps {
  /** Footer content - typically action buttons */
  children: ReactNode
  /** Additional CSS class */
  className?: string
  /** Layout direction */
  layout?: 'row' | 'column'
}

export const PanelFooter: FC<PanelFooterProps> = ({
  children,
  className,
  layout = 'row',
}) => {
  return (
    <footer className={`${style.footer} ${layout === 'column' ? style.footerColumn : ''} ${className || ''}`}>
      {children}
    </footer>
  )
}

// ============================================
// PanelSection
// ============================================

export interface PanelSectionProps {
  /** Section title */
  title?: string
  /** Optional count badge */
  count?: number
  /** Section content */
  children: ReactNode
  /** Additional CSS class */
  className?: string
  /** Add top border separator */
  separator?: boolean
}

export const PanelSection: FC<PanelSectionProps> = ({
  title,
  count,
  children,
  className,
  separator = false,
}) => {
  return (
    <section className={`${style.section} ${separator ? style.sectionSeparator : ''} ${className || ''}`}>
      {title && (
        <div className={style.sectionHeader}>
          <span className={style.sectionTitle}>{title}</span>
          {count !== undefined && count > 0 && (
            <span className={style.sectionCount}>{count}</span>
          )}
        </div>
      )}
      <div className={style.sectionContent}>
        {children}
      </div>
    </section>
  )
}

// ============================================
// MetadataList
// ============================================

export interface MetadataItem {
  /** Label for the metadata field */
  label: string
  /** Value to display */
  value: ReactNode
  /** Use monospace font for value */
  mono?: boolean
}

export interface MetadataListProps {
  /** Metadata items to display */
  items: MetadataItem[]
  /** Additional CSS class */
  className?: string
}

export const MetadataList: FC<MetadataListProps> = ({
  items,
  className,
}) => {
  return (
    <div className={`${style.metadataList} ${className || ''}`}>
      {items.map((item, index) => (
        <div key={index} className={style.metadataRow}>
          <span className={style.metadataLabel}>{item.label}</span>
          <span className={`${style.metadataValue} ${item.mono ? style.metadataValueMono : ''}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================
// ActionButton variants
// ============================================

export type ActionButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'

export interface ActionButtonProps {
  /** Button label */
  children: ReactNode
  /** Click handler */
  onClick?: () => void
  /** Button variant */
  variant?: ActionButtonVariant
  /** Disabled state */
  disabled?: boolean
  /** Full width button */
  fullWidth?: boolean
  /** Loading state */
  loading?: boolean
  /** Additional CSS class */
  className?: string
  /** Button type */
  type?: 'button' | 'submit'
}

export const ActionButton: FC<ActionButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  loading = false,
  className,
  type = 'button',
}) => {
  const variantClass = {
    primary: style.buttonPrimary,
    secondary: style.buttonSecondary,
    success: style.buttonSuccess,
    danger: style.buttonDanger,
    ghost: style.buttonGhost,
  }[variant]

  return (
    <button
      type={type}
      className={`${style.actionButton} ${variantClass} ${fullWidth ? style.buttonFullWidth : ''} ${className || ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <span className={style.buttonSpinner} />}
      {children}
    </button>
  )
}

// ============================================
// ContactCard (commonly used in detail panels)
// ============================================

export interface ContactCardProps {
  /** Label for the contact (e.g., "Sender", "Recipient") */
  label: string
  /** Contact display name */
  name: string
  /** Optional email */
  email?: string
  /** Click handler for viewing contact */
  onClick?: () => void
  /** Additional CSS class */
  className?: string
}

export const ContactCard: FC<ContactCardProps> = ({
  label,
  name,
  email,
  onClick,
  className,
}): ReactElement => {
  const Element = onClick ? 'button' : 'div'
  const elementProps = onClick
    ? {
        type: 'button' as const,
        onClick,
        'aria-label': `View ${label.toLowerCase()} details`,
      }
    : {}

  return (
    <Element
      className={`${style.contactCard} ${onClick ? style.contactCardClickable : ''} ${className || ''}`}
      {...elementProps}
    >
      <div className={style.contactCardBorder} />
      <div className={style.contactCardContent}>
        <div className={style.contactCardHeader}>
          <span className={style.contactCardLabel}>{label}</span>
          {onClick && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          )}
        </div>
        <div className={style.contactCardName}>{name}</div>
        {email && <div className={style.contactCardEmail}>{email}</div>}
      </div>
    </Element>
  )
}

// Export all components
export default BaseDetailPanel
